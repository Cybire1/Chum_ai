import { type NextRequest, NextResponse } from "next/server";
import {
	jsonError,
	jsonErrorWithBody,
	jsonErrorWithHeaders,
} from "@/lib/huru/errors";
import { makeRequestId } from "@/lib/huru/http";
import { createQuickCheckoutUrl } from "@/lib/huru/paystack";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { isAuthError, resolveRequestAuth } from "@/lib/huru/resolve-auth";
import {
	agentPointerKey,
	buildChumAgentMetadata,
	computeAgentDataHash,
	decodeAgentPointer,
	encodeAgentPointer,
	isAgenticIdConfigured,
	memoryPointerKey,
	mintAgenticId,
	ownedRecord,
	setupRequiredRecord,
	updateAgenticId,
	type ChumAgentMetadata,
	type ChumPersona,
} from "@/lib/huru/agentic-id";
import { encryptManaged } from "@/lib/huru/encryption";
import {
	defaultStreamId,
	estimateKvReadCredits,
	estimateKvWriteCredits,
	estimateStorageUploadCredits,
	kvGetResilient,
	kvPutResilient,
	uploadFile,
} from "@/lib/huru/storage";
import {
	getConsumerEncryptionKey,
	getStorageWalletForConsumer,
} from "@/lib/huru/wallet-manager";
import {
	failRequest,
	finalizeRequest,
	preReserveConsumerCredits,
	releaseConsumerReservedCredits,
	saveRequest,
	settleConsumerCredits,
} from "@/lib/huru/store";

const PERSONAS = new Set(["dry", "goofy", "smooth", "nerdy"]);

function parsePersona(value: unknown): ChumPersona | undefined {
	return typeof value === "string" && PERSONAS.has(value)
		? (value as ChumPersona)
		: undefined;
}

function parsePreviousMetadata(value: string | null): Partial<ChumAgentMetadata> | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as Partial<ChumAgentMetadata>;
		return parsed.kind === "chum.agentic-id" ? parsed : null;
	} catch {
		return null;
	}
}

export async function GET(request: NextRequest) {
	const authResult = await resolveRequestAuth(request);
	if (isAuthError(authResult)) return authResult;
	const { project, consumer } = authResult;

	const rateLimit = checkRateLimit(project.publicId);
	if (!rateLimit.allowed) {
		return jsonErrorWithHeaders(
			429,
			"rate_limit_error",
			"rate_limit_exceeded",
			"Rate limit exceeded. Please retry later.",
			rateLimit.headers,
		);
	}

	if (!isAgenticIdConfigured()) {
		return NextResponse.json(
			{
				...setupRequiredRecord(),
				huru: { request_id: makeRequestId(), credits_used: 0 },
			},
			{ headers: rateLimit.headers },
		);
	}

	const requestId = makeRequestId();
	const estimatedCredits = estimateKvReadCredits();
	const reserveResult = await preReserveConsumerCredits(consumer, estimatedCredits, requestId);
	if (!reserveResult.ok) {
		const checkoutUrl = await createQuickCheckoutUrl(project, consumer).catch(() => "");
		return jsonErrorWithBody(
			402,
			"billing_error",
			"insufficient_credits",
			`Insufficient credits: ${reserveResult.balance} available, ${reserveResult.needed} needed.`,
			{
				credits_balance: reserveResult.balance,
				credits_needed: reserveResult.needed,
				...(checkoutUrl ? { checkout_url: checkoutUrl } : {}),
			},
		);
	}

	try {
		await saveRequest(project, {
			id: requestId,
			projectId: project.publicId,
			endpoint: "/v1/chum/agent",
			method: "GET",
			model: "0g/agentic-id",
			status: "processing",
			createdAt: new Date().toISOString(),
			creditsReserved: estimatedCredits,
			consumerId: consumer.id,
			consumerEmail: consumer.email,
		});
	} catch (error) {
		await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		throw error;
	}

	try {
		const pointer = await kvGetResilient(defaultStreamId(project.publicId), agentPointerKey(consumer.id));
		const record = decodeAgentPointer(pointer.value) ?? setupRequiredRecord();
		const creditsUsed = pointer.value ? estimateKvReadCredits() : 0;
		await settleConsumerCredits(consumer, requestId, creditsUsed, estimatedCredits);
		const responseBody: Record<string, unknown> = { ...record, kv_source: pointer.source };
		await finalizeRequest(
			requestId,
			{ promptTokens: 0, completionTokens: 0, totalTokens: 0, creditsUsed },
			{ verified: true, verificationMode: "unknown", provider: "0g-chain+huru-kv-mirror" },
			responseBody,
		);
		return NextResponse.json(
			{
				...record,
				kv_source: pointer.source,
				huru: {
					request_id: requestId,
					credits_used: creditsUsed,
					kv_source: pointer.source,
				},
			},
			{ headers: rateLimit.headers },
		);
	} catch (error) {
		await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		await failRequest(
			requestId,
			"agent_error",
			error instanceof Error ? error.message : String(error),
		);
		return jsonError(
			503,
			"provider_error",
			"agent_unavailable",
			error instanceof Error ? error.message : "Agentic ID unavailable.",
		);
	}
}

export async function POST(request: NextRequest) {
	const authResult = await resolveRequestAuth(request);
	if (isAuthError(authResult)) return authResult;
	const { project, consumer } = authResult;

	const rateLimit = checkRateLimit(project.publicId);
	if (!rateLimit.allowed) {
		return jsonErrorWithHeaders(
			429,
			"rate_limit_error",
			"rate_limit_exceeded",
			"Rate limit exceeded. Please retry later.",
			rateLimit.headers,
		);
	}

	if (!isAgenticIdConfigured()) {
		return NextResponse.json(
			{
				...setupRequiredRecord(),
				huru: { request_id: makeRequestId(), credits_used: 0 },
			},
			{ status: 409, headers: rateLimit.headers },
		);
	}

	const payload = (await request.json().catch(() => null)) as {
		persona?: string;
		display_name?: string;
		model?: string;
	} | null;

	const requestId = makeRequestId();
	const estimatedCredits =
		estimateKvReadCredits() * 2 +
		estimateStorageUploadCredits(4096) +
		estimateKvWriteCredits() +
		8;
	const reserveResult = await preReserveConsumerCredits(consumer, estimatedCredits, requestId);
	if (!reserveResult.ok) {
		const checkoutUrl = await createQuickCheckoutUrl(project, consumer).catch(() => "");
		return jsonErrorWithBody(
			402,
			"billing_error",
			"insufficient_credits",
			`Insufficient credits: ${reserveResult.balance} available, ${reserveResult.needed} needed.`,
			{
				credits_balance: reserveResult.balance,
				credits_needed: reserveResult.needed,
				...(checkoutUrl ? { checkout_url: checkoutUrl } : {}),
			},
		);
	}

	try {
		await saveRequest(project, {
			id: requestId,
			projectId: project.publicId,
			endpoint: "/v1/chum/agent",
			method: "POST",
			model: "0g/agentic-id+0g/storage",
			status: "processing",
			createdAt: new Date().toISOString(),
			creditsReserved: estimatedCredits,
			consumerId: consumer.id,
			consumerEmail: consumer.email,
		});
	} catch (error) {
		await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		throw error;
	}

	try {
		const streamId = defaultStreamId(project.publicId);
		const [wallet, consumerKey, memoryPointer, existingPointer, previousMetadataPointer] =
			await Promise.all([
				getStorageWalletForConsumer(consumer),
				getConsumerEncryptionKey(consumer),
				kvGetResilient(streamId, memoryPointerKey(consumer.id)),
				kvGetResilient(streamId, agentPointerKey(consumer.id)),
				kvGetResilient(streamId, `chum:${consumer.id}:agentic-id:metadata`),
			]);
		const memoryRootHash = memoryPointer.value === "__deleted__" ? null : memoryPointer.value;
		const existing = decodeAgentPointer(existingPointer.value);
		const previousMetadata = parsePreviousMetadata(previousMetadataPointer.value);

		const metadataBase = buildChumAgentMetadata({
			consumer,
			ownerAddress: wallet.address,
			persona: parsePersona(payload?.persona),
			displayName: payload?.display_name,
			model: payload?.model,
			memoryRootHash,
			previous: previousMetadata,
		});
		const draft = Buffer.from(JSON.stringify(metadataBase), "utf8");
		const encryptedDraft = encryptManaged(draft, consumerKey);
		const upload = await uploadFile(encryptedDraft, wallet);
		const dataHash = computeAgentDataHash(encryptedDraft);
		const metadata: ChumAgentMetadata = {
			...metadataBase,
			storageRootHash: upload.rootHash,
			dataHash,
		};
		const metadataKv = await kvPutResilient(
			streamId,
			`chum:${consumer.id}:agentic-id:metadata`,
			JSON.stringify(metadata),
			wallet,
		);

		const chainResult = existing?.token_id
			? await updateAgenticId({
					signer: wallet,
					tokenId: existing.token_id,
					dataHash,
				}).then((r) => ({ tokenId: existing.token_id!, txHash: r.txHash }))
			: await mintAgenticId({
					signer: wallet,
					ownerAddress: wallet.address,
					dataHash,
					metadataRootHash: upload.rootHash,
					memoryRootHash,
				});

		const record = ownedRecord({
			tokenId: chainResult.tokenId,
			ownerAddress: wallet.address,
			metadataRootHash: upload.rootHash,
			memoryRootHash,
			dataHash,
			txHash: chainResult.txHash,
		});
		const pointerKv = await kvPutResilient(
			streamId,
			agentPointerKey(consumer.id),
			encodeAgentPointer(record),
			wallet,
		);

		const creditsUsed =
			estimateKvReadCredits() * 2 +
			estimateStorageUploadCredits(draft.length) +
			estimateKvWriteCredits() * 2 +
			8;
		await settleConsumerCredits(consumer, requestId, creditsUsed, estimatedCredits);
		const responseBody: Record<string, unknown> = {
			...record,
			kv_source: pointerKv.source,
			memory_kv_source: memoryPointer.source,
		};
		await finalizeRequest(
			requestId,
			{ promptTokens: 0, completionTokens: 0, totalTokens: 0, creditsUsed },
			{
				verified: true,
				verificationMode: "unknown",
				provider: "0g-agentic-id+0g-storage",
				verifiedAt: new Date().toISOString(),
			},
			responseBody,
		);

		return NextResponse.json(
			{
				...record,
				huru: {
					request_id: requestId,
					credits_used: creditsUsed,
					verified: true,
					verification_mode: "unknown",
					provider: "0g-agentic-id+0g-storage",
					storage_root_hash: upload.rootHash,
					kv_source: pointerKv.source,
					kv_tx_hash: pointerKv.txHash,
					metadata_kv_source: metadataKv.source,
					memory_kv_source: memoryPointer.source,
					kv_mirror: pointerKv.mirror
						? {
								backend: pointerKv.mirror.backend,
								version: pointerKv.mirror.version,
							}
						: null,
				},
			},
			{ headers: rateLimit.headers },
		);
	} catch (error) {
		await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		await failRequest(
			requestId,
			"agent_error",
			error instanceof Error ? error.message : String(error),
		);
		return jsonError(
			503,
			"provider_error",
			"agent_unavailable",
			error instanceof Error ? error.message : "Agentic ID unavailable.",
		);
	}
}
