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
	estimateChatCredits,
	runChatCompletion,
} from "@/lib/huru/runtime";
import {
	defaultStreamId,
	downloadFile,
	estimateKvReadCredits,
	estimateKvWriteCredits,
	estimateStorageDownloadCredits,
	estimateStorageUploadCredits,
	kvGetResilient,
	kvPutResilient,
	uploadFile,
} from "@/lib/huru/storage";
import { decryptIfEncrypted, encryptManaged } from "@/lib/huru/encryption";
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

type MemoryPayload = {
	event?: "reply" | "decode" | "opener" | "plan";
	conversation?: Array<{ speaker?: string; text?: string }>;
	context_note?: string;
	answer?: unknown;
};

type ChumMemory = {
	version: 1;
	summary: string;
	voice: string[];
	preferences: string[];
	boundaries: string[];
	facts: string[];
	updated_at: string;
	source_event: string;
};

function memoryKey(consumerId: string): string {
	return `chum:${consumerId}:memory:latest`;
}

function stripFences(value: string): string {
	return value.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 12);
}

function extractAssistantContent(body: Record<string, unknown>): string {
	const choices = body.choices;
	if (!Array.isArray(choices)) return "";
	const first = choices[0] as { message?: { content?: unknown } } | undefined;
	return typeof first?.message?.content === "string"
		? first.message.content
		: "";
}

function parseMemory(content: string, event: string): ChumMemory {
	try {
		const parsed = JSON.parse(stripFences(content)) as Partial<ChumMemory>;
		return {
			version: 1,
			summary: String(parsed.summary ?? "").slice(0, 600),
			voice: asStringArray(parsed.voice),
			preferences: asStringArray(parsed.preferences),
			boundaries: asStringArray(parsed.boundaries),
			facts: asStringArray(parsed.facts),
			updated_at: new Date().toISOString(),
			source_event: event,
		};
	} catch {
		return {
			version: 1,
			summary: content.slice(0, 600),
			voice: [],
			preferences: [],
			boundaries: [],
			facts: [],
			updated_at: new Date().toISOString(),
			source_event: event,
		};
	}
}

function buildMemoryMessages(payload: MemoryPayload) {
	const conversation = (payload.conversation ?? [])
		.map((turn) => `${turn.speaker === "me" ? "ME" : "THEM"}: ${String(turn.text ?? "").slice(0, 500)}`)
		.join("\n");
	const answer = JSON.stringify(payload.answer ?? null).slice(0, 2500);
	const context = String(payload.context_note ?? "").slice(0, 800);
	const user = [
		`Event: ${payload.event ?? "reply"}`,
		conversation ? `Conversation:\n${conversation}` : "",
		context ? `Context:\n${context}` : "",
		answer ? `Assistant output:\n${answer}` : "",
	].filter(Boolean).join("\n\n");

	return [
		{
			role: "system",
			content:
				"You update private memory for Chum, a personal AI companion. " +
				"Extract only durable details that help future replies or coaching: user voice, explicit preferences, boundaries, goals, and stable facts. " +
				"Do not infer sensitive traits. Do not store the full conversation. " +
				'Output strict JSON: {"summary":"...","voice":["..."],"preferences":["..."],"boundaries":["..."],"facts":["..."]}.',
		},
		{ role: "user", content: user },
	];
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

	const requestId = makeRequestId();
	const estimatedCredits = estimateKvReadCredits() + estimateStorageDownloadCredits();
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
			endpoint: "/v1/chum/memory",
			method: "GET",
			model: "0g/storage",
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
		const key = memoryKey(consumer.id);
		const pointer = await kvGetResilient(streamId, key);
		const rootHash = pointer.value;

		if (!rootHash || rootHash === "__deleted__") {
			await settleConsumerCredits(consumer, requestId, 0, estimatedCredits);
			const responseBody = {
				object: "chum.memory",
				memory: null,
				root_hash: null,
				kv_source: pointer.source,
			};
			await finalizeRequest(
				requestId,
				{ promptTokens: 0, completionTokens: 0, totalTokens: 0, creditsUsed: 0 },
				{ verified: true, verificationMode: "unknown", provider: "0g-storage+huru-kv-mirror" },
				responseBody,
			);
			return NextResponse.json(
				{
					...responseBody,
					huru: {
						request_id: requestId,
						credits_used: 0,
						kv_source: pointer.source,
					},
				},
				{ headers: rateLimit.headers },
			);
		}

		const encrypted = await downloadFile(rootHash);
		const consumerKey = await getConsumerEncryptionKey(consumer);
		const { plaintext } = decryptIfEncrypted(encrypted, consumerKey);
		const memory = JSON.parse(plaintext.toString("utf8")) as ChumMemory;
		const creditsUsed = estimatedCredits;

		await settleConsumerCredits(consumer, requestId, creditsUsed, estimatedCredits);
		const responseBody = {
			object: "chum.memory",
			memory,
			root_hash: rootHash,
			kv_source: pointer.source,
		};
		await finalizeRequest(
			requestId,
			{ promptTokens: 0, completionTokens: 0, totalTokens: 0, creditsUsed },
			{ verified: true, verificationMode: "unknown", provider: "0g-storage+huru-kv-mirror" },
			responseBody,
		);
		return NextResponse.json(
			{
				...responseBody,
				huru: {
					request_id: requestId,
					credits_used: creditsUsed,
					storage_root_hash: rootHash,
					kv_source: pointer.source,
				},
			},
			{ headers: rateLimit.headers },
		);
	} catch (error) {
		await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		await failRequest(
			requestId,
			"memory_error",
			error instanceof Error ? error.message : String(error),
		);
		return jsonError(
			503,
			"provider_error",
			"memory_unavailable",
			error instanceof Error ? error.message : "Memory unavailable.",
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

	const payload = (await request.json().catch(() => null)) as MemoryPayload | null;
	if (!payload?.event) {
		return jsonError(
			400,
			"invalid_request",
			"missing_event",
			"A memory event is required.",
		);
	}

	const messages = buildMemoryMessages(payload);
	const requestId = makeRequestId();
	const estimatedCredits =
		estimateChatCredits(messages, 1200, "huru/chat-1") +
		estimateStorageUploadCredits(4096) +
		estimateKvWriteCredits();

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
			endpoint: "/v1/chum/memory",
			method: "POST",
			model: "huru/chat-1+0g/storage",
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
		const compute = await runChatCompletion({
			model: "huru/chat-1",
			messages,
		});
		const content = extractAssistantContent(compute.body);
		const memory = parseMemory(content, payload.event);
		const plaintext = Buffer.from(JSON.stringify(memory), "utf8");
		const consumerKey = await getConsumerEncryptionKey(consumer);
		const encrypted = encryptManaged(plaintext, consumerKey);
		const wallet = await getStorageWalletForConsumer(consumer);
		const upload = await uploadFile(encrypted, wallet);
		const streamId = defaultStreamId(project.publicId);
		const key = memoryKey(consumer.id);
		const kv = await kvPutResilient(streamId, key, upload.rootHash, wallet);

		const storageCredits = estimateStorageUploadCredits(plaintext.length) + estimateKvWriteCredits();
		const creditsUsed = compute.usage.creditsUsed + storageCredits;
		await settleConsumerCredits(consumer, requestId, creditsUsed, estimatedCredits);

		const verified =
			compute.verification.verified &&
			compute.verification.verificationMode === "tee";
		const provider = `${compute.verification.provider}+0g-storage`;
		const responseBody = {
			object: "chum.memory" as const,
			memory,
			root_hash: upload.rootHash,
			tx_hash: upload.txHash,
			kv_tx_hash: kv.txHash,
			kv_source: kv.source,
			stream_id: streamId,
			key,
		};

		await finalizeRequest(
			requestId,
			{
				promptTokens: compute.usage.promptTokens,
				completionTokens: compute.usage.completionTokens,
				totalTokens: compute.usage.totalTokens,
				creditsUsed,
			},
			{
				verified,
				verificationMode: compute.verification.verificationMode,
				provider,
				verifiedAt: new Date().toISOString(),
			},
			responseBody,
		);

		return NextResponse.json(
			{
				...responseBody,
				huru: {
					request_id: requestId,
					credits_used: creditsUsed,
					verified,
					verification_mode: compute.verification.verificationMode,
					provider,
					storage_root_hash: upload.rootHash,
					storage_tx_hash: upload.txHash,
					kv_tx_hash: kv.txHash,
					kv_source: kv.source,
					kv_mirror: kv.mirror
						? {
								backend: kv.mirror.backend,
								version: kv.mirror.version,
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
			"memory_error",
			error instanceof Error ? error.message : String(error),
		);
		return jsonError(
			503,
			"provider_error",
			"memory_unavailable",
			error instanceof Error ? error.message : "Memory unavailable.",
		);
	}
}

export async function DELETE(request: NextRequest) {
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

	const requestId = makeRequestId();
	const estimatedCredits = estimateKvWriteCredits();
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
			endpoint: "/v1/chum/memory",
			method: "DELETE",
			model: "0g/kv",
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
		const wallet = await getStorageWalletForConsumer(consumer);
		const streamId = defaultStreamId(project.publicId);
		const key = `chum:${consumer.id}:memory:latest`;
		const result = await kvPutResilient(streamId, key, "__deleted__", wallet);
		const creditsUsed = estimateKvWriteCredits();
		await settleConsumerCredits(consumer, requestId, creditsUsed, estimatedCredits);
		const responseBody = {
			object: "chum.memory" as const,
			memory: null,
			root_hash: null,
			kv_tx_hash: result.txHash,
			kv_source: result.source,
		};
		await finalizeRequest(
			requestId,
			{ promptTokens: 0, completionTokens: 0, totalTokens: 0, creditsUsed },
			{ verified: true, verificationMode: "unknown", provider: "0g-kv+huru-kv-mirror" },
			responseBody,
		);
		return NextResponse.json(
			{
				...responseBody,
				huru: {
					request_id: requestId,
					credits_used: creditsUsed,
					kv_tx_hash: result.txHash,
					kv_source: result.source,
				},
			},
			{ headers: rateLimit.headers },
		);
	} catch (error) {
		await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		await failRequest(
			requestId,
			"memory_error",
			error instanceof Error ? error.message : String(error),
		);
		return jsonError(
			503,
			"provider_error",
			"memory_unavailable",
			error instanceof Error ? error.message : "Memory unavailable.",
		);
	}
}
