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
	estimateVisionOcrCredits,
	runVisionOcr,
} from "@/lib/huru/runtime";
import {
	failRequest,
	finalizeRequest,
	preReserveConsumerCredits,
	releaseConsumerReservedCredits,
	saveRequest,
	settleConsumerCredits,
} from "@/lib/huru/store";
import type { HuruUsageRecord } from "@/lib/huru/types";

const MAX_IMAGES = 6;
const MAX_BASE64_CHARS_PER_IMAGE = 8_000_000;

const VISION_PROMPT =
	"Read these dating-chat screenshots and extract only the conversation. " +
	'Output one message per line. Prefix each line with "THEM:" for the other person ' +
	'and "ME:" for the user. Use visual bubble position and color to infer speaker: ' +
	"left/grey bubbles are usually THEM, right/colored bubbles are usually ME. " +
	"Ignore names, timestamps, UI chrome, reactions, suggestions, buttons, and commentary. " +
	"If a message is partially cut off, include only the readable text.";

function isFreeWingmanRequest(request: NextRequest): boolean {
	return request.headers.get("x-huru-feature")?.trim().toLowerCase() === "wingman";
}

function waiveUsageCredits(usage: HuruUsageRecord): HuruUsageRecord {
	return { ...usage, creditsUsed: 0 };
}

type RawImage =
	| string
	| {
			data?: string;
			base64?: string;
			mime_type?: string;
			mimeType?: string;
	  };

function normalizeBase64(value: string): string {
	const trimmed = value.trim();
	const comma = trimmed.indexOf(",");
	if (trimmed.startsWith("data:") && comma !== -1) {
		return trimmed.slice(comma + 1);
	}
	return trimmed;
}

function normalizeMimeType(value: unknown): string {
	const mimeType = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (mimeType === "image/png" || mimeType === "image/webp") return mimeType;
	return "image/jpeg";
}

function normalizeImages(input: unknown): Array<{ data: string; mimeType: string }> {
	if (!Array.isArray(input)) return [];
	return input
		.slice(0, MAX_IMAGES)
		.map((item: RawImage) => {
			if (typeof item === "string") {
				return { data: normalizeBase64(item), mimeType: "image/jpeg" };
			}
			const raw = item?.data ?? item?.base64 ?? "";
			return {
				data: normalizeBase64(String(raw)),
				mimeType: normalizeMimeType(item?.mime_type ?? item?.mimeType),
			};
		})
		.filter((image) => image.data.length > 0);
}

export async function POST(request: NextRequest) {
	const authResult = await resolveRequestAuth(request);
	if (isAuthError(authResult)) return authResult;
	const { project, consumer } = authResult;
	const creditsWaived = isFreeWingmanRequest(request);

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

	const payload = (await request.json().catch(() => null)) as {
		images?: unknown;
	} | null;
	const images = normalizeImages(payload?.images);

	if (images.length === 0) {
		return jsonError(
			400,
			"invalid_request",
			"missing_images",
			"At least one screenshot image is required.",
		);
	}

	if (images.some((image) => image.data.length > MAX_BASE64_CHARS_PER_IMAGE)) {
		return jsonError(
			413,
			"invalid_request",
			"image_too_large",
			"One of the screenshots is too large. Try selecting fewer or smaller screenshots.",
		);
	}

	const requestId = makeRequestId();
	const estimatedCredits = creditsWaived ? 0 : estimateVisionOcrCredits(images.length);
	if (!creditsWaived) {
		const reserveResult = await preReserveConsumerCredits(consumer, estimatedCredits, requestId);
		if (!reserveResult.ok) {
			const checkoutUrl = await createQuickCheckoutUrl(project, consumer).catch(
				() => "",
			);
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
	}

	try {
		await saveRequest(project, {
			id: requestId,
			projectId: project.publicId,
			endpoint: "/v1/vision/ocr",
			method: "POST",
			model: "huru/vision-ocr",
			status: "processing",
			createdAt: new Date().toISOString(),
			creditsReserved: estimatedCredits,
			consumerId: consumer.id,
			consumerEmail: consumer.email,
		});
	} catch (error) {
		if (!creditsWaived) {
			await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		}
		throw error;
	}

	try {
		const result = await runVisionOcr({
			images,
			prompt: VISION_PROMPT,
		});
		const chargedUsage = creditsWaived ? waiveUsageCredits(result.usage) : result.usage;
		if (!creditsWaived) {
			await settleConsumerCredits(
				consumer,
				requestId,
				result.usage.creditsUsed,
				estimatedCredits,
			);
		}
		await finalizeRequest(
			requestId,
			chargedUsage,
			result.verification,
			{
				...result.body,
				free: creditsWaived || undefined,
			},
		);

		return NextResponse.json(
			{
					...result.body,
					huru: {
						request_id: requestId,
						credits_used: chargedUsage.creditsUsed,
						free: creditsWaived || undefined,
						verified: result.verification.verified,
					verification_mode: result.verification.verificationMode,
					provider: result.verification.provider,
				},
			},
			{ headers: { "x-request-id": requestId, ...rateLimit.headers } },
		);
	} catch (error) {
		if (!creditsWaived) {
			await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		}
		await failRequest(
			requestId,
			"runtime_error",
			error instanceof Error ? error.message : String(error),
		);
		return jsonError(
			503,
			"provider_error",
			"vision_unavailable",
			error instanceof Error ? error.message : "Vision OCR unavailable.",
		);
	}
}
