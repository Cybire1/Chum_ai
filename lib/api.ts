// huru relay client. When EXPO_PUBLIC_MOCK=1 (or no host configured) it uses a
// local mock so the UI runs offline. Otherwise it calls huru's LIVE 0G-backed
// /v1/chat/completions (TEE inference on 0G mainnet) with engineered prompts.
//
// NOTE: this is the interim single-shot path that proves the 0G connection end to
// end. The full grounding -> writer -> judge -> select pipeline lives server-side
// in huru (/v1/rizz/*) — see BUILD_BRIEF.md §6/§7 — and is the next upgrade.

import { clearSession, getConsumerId, getDeviceId, getToken, saveSession } from "./auth";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { uid } from "./format";
import { isPrivateMemoryEnabled, rememberPrivateMemoryRoot } from "./memory";
import type {
  DecodeResponse,
  DecodeVerdict,
  AgenticIdRecord,
  HuruMeta,
  Me,
  Opener,
  OpenerResponse,
  Persona,
  PrivateMemoryResponse,
  Reply,
  RizzReplyRequest,
  RizzReplyResponse,
  Turn,
} from "./types";

const RAW_BASE = (process.env.EXPO_PUBLIC_HURU_BASE ?? "").trim();
const KEY = process.env.EXPO_PUBLIC_HURU_KEY ?? "";

// Direct 0G compute (no relay): call a 0G provider's OpenAI-compatible endpoint
// with a signed app-sk access token. The token only authorizes that provider's
// funded sub-account — it is NOT the wallet private key.
const ZG_ENDPOINT = (process.env.EXPO_PUBLIC_0G_ENDPOINT ?? "").trim();
const ZG_TOKEN = (process.env.EXPO_PUBLIC_0G_TOKEN ?? "").trim();
const ZG_MODEL = (process.env.EXPO_PUBLIC_0G_MODEL ?? "deepseek-v4-flash").trim();
const ZG_VISION_MODEL = (process.env.EXPO_PUBLIC_0G_VISION_MODEL ?? "").trim();
const DIRECT = ZG_ENDPOINT !== "" && ZG_TOKEN !== "";

type ExpoConstantsShape = {
  expoConfig?: { hostUri?: string | null } | null;
  manifest?: { debuggerHost?: string | null; hostUri?: string | null } | null;
  manifest2?: {
    extra?: {
      expoGo?: { debuggerHost?: string | null } | null;
      expoClient?: { hostUri?: string | null } | null;
    } | null;
  } | null;
};

function trimSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function parseHost(value?: string | null): string | null {
  if (!value) return null;
  const withoutProtocol = value.replace(/^[a-z]+:\/\//i, "");
  const hostPart = withoutProtocol.split("/")[0]?.split("?")[0];
  if (!hostPart) return null;
  try {
    const parsed = new URL(`http://${hostPart}`);
    return parsed.hostname && !isLoopbackHost(parsed.hostname) ? parsed.hostname : null;
  } catch {
    return null;
  }
}

function expoDevHost(): string | null {
  const constants = Constants as unknown as ExpoConstantsShape;
  return (
    parseHost(constants.expoConfig?.hostUri) ??
    parseHost(constants.manifest?.debuggerHost) ??
    parseHost(constants.manifest?.hostUri) ??
    parseHost(constants.manifest2?.extra?.expoGo?.debuggerHost) ??
    parseHost(constants.manifest2?.extra?.expoClient?.hostUri)
  );
}

function resolveRelayBase(rawBase: string): string {
  const raw = trimSlash(rawBase);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!isLoopbackHost(url.hostname) || Platform.OS === "web") return raw;

    const devHost = expoDevHost();
    if (devHost) {
      url.hostname = devHost;
      return trimSlash(url.toString());
    }

    if (Platform.OS === "android") {
      url.hostname = "10.0.2.2";
      return trimSlash(url.toString());
    }

    return raw;
  } catch {
    return raw;
  }
}

const BASE = resolveRelayBase(RAW_BASE);
const MOCK = process.env.EXPO_PUBLIC_MOCK === "1" || (!DIRECT && BASE === "");

export const isMock = MOCK;
export const isDirect = DIRECT;
export const huruBaseUrl = BASE;

// Screenshot reading is available through Huru relay by default. Direct 0G mode
// still requires an explicit vision-capable provider model.
export const visionAvailable = DIRECT ? ZG_VISION_MODEL !== "" : Boolean(BASE && KEY && !MOCK);

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export { ApiError };

function requestTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "the configured AI endpoint";
  }
}

export function describeApiError(
  error: unknown,
  fallback = "The AI is unavailable right now. Try again.",
): string {
  if (error instanceof ApiError) {
    if (error.code === "network_unreachable") {
      return `${error.message} If this is a phone build, keep the phone on the same Wi-Fi as this Mac and keep the Huru relay running.`;
    }
    if (error.code === "missing_huru_key") {
      return "The app is missing EXPO_PUBLIC_HURU_KEY. Add it to the Expo .env and restart Expo.";
    }
    if (error.code === "insufficient_credits") {
      return "This project needs credits before the AI can answer.";
    }
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function ensureAuth(): Promise<void> {
  if (MOCK || DIRECT || !BASE || !KEY) return;
  const existing = await getToken();
  const existingConsumer = await getConsumerId();
  if (existing && existingConsumer) return;

  const res = await fetch(`${BASE}/v1/consumers/device`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Huru-Api-Key": KEY,
    },
    body: JSON.stringify({ device_id: await getDeviceId() }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    consumer_id?: string;
    token?: string;
    error?: { code?: string; message?: string } | string;
  };
  if (!res.ok || !json.token || !json.consumer_id) {
    const code =
      typeof json.error === "string"
        ? json.error
        : (json.error?.code ?? `http_${res.status}`);
    throw new ApiError(res.status, code, String(code));
  }
  await saveSession(json.token, json.consumer_id);
}

async function consumerEmail(): Promise<string> {
  const id = await getDeviceId();
  return `${id.replace(/[^a-z0-9]/gi, "").slice(0, 24)}@chum.app`;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatResult = { content: string; huru: HuruMeta };
type ChatJson = HuruErrorPayload & {
  choices?: { message?: { content?: string } }[];
  huru?: unknown;
};

function normalizeHuruMeta(input: unknown): HuruMeta {
  const h = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    request_id: String(h.request_id ?? uid("req")),
    credits_used: Number(h.credits_used ?? 0) || 0,
    verified: Boolean(h.verified),
    verification_mode:
      h.verification_mode === undefined ? undefined : String(h.verification_mode),
    provider: h.provider === undefined ? undefined : String(h.provider),
    cached: h.cached === undefined ? undefined : Boolean(h.cached),
    idempotent_replay:
      h.idempotent_replay === undefined ? undefined : Boolean(h.idempotent_replay),
    storage_root_hash:
      h.storage_root_hash === undefined ? undefined : String(h.storage_root_hash),
    storage_tx_hash:
      h.storage_tx_hash === undefined ? undefined : String(h.storage_tx_hash),
    kv_tx_hash: h.kv_tx_hash === undefined ? undefined : String(h.kv_tx_hash),
    privacy:
      h.privacy === undefined
        ? Boolean(h.verified)
          ? "enclave"
          : "private"
        : String(h.privacy),
  };
}

type HuruFeature = "wingman";

type HuruErrorPayload = {
  error?: { code?: string; message?: string } | string;
};

function huruErrorCode(json: HuruErrorPayload, status: number): string {
  return typeof json.error === "string"
    ? json.error
    : (json.error?.code ?? `http_${status}`);
}

function huruErrorMessage(json: HuruErrorPayload, fallback: string): string {
  return typeof json.error === "object" && json.error?.message
    ? json.error.message
    : fallback;
}

function shouldRefreshConsumerSession(status: number, code: string): boolean {
  return (
    (status === 401 || status === 403 || status === 404) &&
    ["invalid_consumer_token", "token_project_mismatch", "consumer_not_found"].includes(code)
  );
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers as Record<string, string>;
}

async function huruHeaders(
  feature?: HuruFeature,
  refreshSession = false,
): Promise<Record<string, string>> {
  if (refreshSession) await clearSession();
  await ensureAuth().catch(() => {});
  const token = await getToken();
  if (token) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Huru-Api-Key": KEY,
      "Cache-Control": "no-store",
    };
    if (feature) headers["X-Huru-Feature"] = feature;
    return headers;
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${KEY}`,
    "X-Consumer-Email": await consumerEmail(),
    "Cache-Control": "no-store",
  };
  if (feature) headers["X-Huru-Feature"] = feature;
  return headers;
}

async function fetchHuruJson<T extends HuruErrorPayload>(
  path: string,
  init: RequestInit = {},
  feature?: HuruFeature,
): Promise<{ res: Response; json: T }> {
  const url = `${BASE}${path}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          ...(await huruHeaders(feature, attempt > 0)),
          ...normalizeHeaders(init.headers),
        },
      });
    } catch {
      throw new ApiError(
        0,
        "network_unreachable",
        `Can't reach Huru at ${requestTarget(url)}.`,
      );
    }

    const json = (await res.json().catch(() => ({}))) as T;
    if (!res.ok) {
      const code = huruErrorCode(json, res.status);
      if (attempt === 0 && shouldRefreshConsumerSession(res.status, code)) {
        continue;
      }
    }
    return { res, json };
  }
  throw new ApiError(401, "invalid_consumer_token", "Consumer token is invalid or expired.");
}

async function chat(messages: ChatMessage[], feature?: HuruFeature): Promise<ChatResult> {
  if (!DIRECT && !KEY) {
    throw new ApiError(0, "missing_huru_key", "EXPO_PUBLIC_HURU_KEY is not set.");
  }
  const url = DIRECT ? `${ZG_ENDPOINT}/chat/completions` : `${BASE}/v1/chat/completions`;
  const payload = { model: DIRECT ? ZG_MODEL : "huru/chat-1", messages };
  let res: Response;
  let json: ChatJson;
  if (DIRECT) {
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ZG_TOKEN}` },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new ApiError(
        0,
        "network_unreachable",
        `Can't reach the 0G provider at ${requestTarget(url)}.`,
      );
    }
    json = (await res.json().catch(() => ({}))) as ChatJson;
  } else {
    ({ res, json } = await fetchHuruJson<ChatJson>(
      "/v1/chat/completions",
      { method: "POST", body: JSON.stringify(payload) },
      feature,
    ));
  }
  if (!res.ok) {
    const code = huruErrorCode(json, res.status);
    throw new ApiError(res.status, code, huruErrorMessage(json, String(code)));
  }
  return {
    content: json.choices?.[0]?.message?.content ?? "",
    huru: DIRECT ? { ...meta(false), provider: "direct-0g" } : normalizeHuruMeta(json.huru),
  };
}

// ---- Vision (direct 0G) -----------------------------------------------------
// Transcribe dating-chat screenshots into a ME/THEM transcript. The base64 image
// bytes are sent to the 0G provider's sealed enclave for OCR and never stored.

type VisionTextPart = { type: "text"; text: string };
type VisionImagePart = { type: "image_url"; image_url: { url: string } };
type VisionContentPart = VisionTextPart | VisionImagePart;
export type VisionInputImage = { data: string; mime_type?: string };

const VISION_PROMPT =
  "Transcribe this dating-chat screenshot. Output one message per line. " +
  'Prefix each line with "THEM:" for the other person (usually grey/left bubbles) ' +
  'or "ME:" for the user (usually coloured/right bubbles). ' +
  "Do not include names, timestamps, reactions, or any commentary — only the message text.";

export async function visionExtract(images: VisionInputImage[]): Promise<string> {
  if (!visionAvailable) {
    throw new ApiError(
      0,
      "ocr_not_available",
      "Screenshot reading is not configured.",
    );
  }
  if (!DIRECT) {
    const { res, json } = await fetchHuruJson<{
      transcript?: string;
      error?: { code?: string; message?: string } | string;
    }>(
      "/v1/vision/ocr",
      { method: "POST", body: JSON.stringify({ images }) },
      "wingman",
    );
    if (!res.ok) {
      const code = huruErrorCode(json, res.status);
      throw new ApiError(res.status, code, huruErrorMessage(json, String(code)));
    }
    return json.transcript ?? "";
  }

  const content: VisionContentPart[] = [{ type: "text", text: VISION_PROMPT }];
  for (const image of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${image.mime_type ?? "image/jpeg"};base64,${image.data}` },
    });
  }
  const url = `${ZG_ENDPOINT}/chat/completions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZG_TOKEN}`,
      },
      body: JSON.stringify({
        model: ZG_VISION_MODEL,
        messages: [{ role: "user", content }],
      }),
    });
  } catch {
    throw new ApiError(
      0,
      "network_unreachable",
      `Can't reach the 0G provider at ${requestTarget(url)}.`,
    );
  }
  const json = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { code?: string; message?: string } | string;
  };
  if (!res.ok) {
    const code =
      typeof json.error === "string"
        ? json.error
        : (json.error?.code ?? `http_${res.status}`);
    throw new ApiError(res.status, code, String(code));
  }
  return json.choices?.[0]?.message?.content ?? "";
}

async function updatePrivateMemory(
  event: "reply" | "decode" | "opener" | "plan",
  payload: Record<string, unknown>,
): Promise<void> {
  if (MOCK || DIRECT || !BASE || !KEY) return;
  if (!(await isPrivateMemoryEnabled())) return;

  const { res, json } = await fetchHuruJson<{
    root_hash?: string;
    huru?: { storage_root_hash?: string };
    error?: { code?: string; message?: string } | string;
  }>("/v1/chum/memory", {
    method: "POST",
    body: JSON.stringify({ event, ...payload }),
  });
  if (!res.ok) return;
  const rootHash = json.root_hash ?? json.huru?.storage_root_hash;
  if (rootHash) await rememberPrivateMemoryRoot(rootHash);
}

function stripFences(s: string): string {
  return s
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function renderConvo(req: RizzReplyRequest): string {
  const lines = req.conversation
    .map((t: Turn) => `${t.speaker === "me" ? "ME" : "THEM"}: ${t.text}`)
    .join("\n");
  const bits = [
    `Conversation so far (THEM = the person I'm into, ME = me):\n${lines}`,
    `Vibe: ${req.vibe}.`,
    `Boldness: ${req.spice}/3.`,
  ];
  if (req.persona) bits.push(`My texting style: ${req.persona}.`);
  if (req.context_note) bits.push(`Context: ${req.context_note}`);
  return bits.join("\n");
}

const REPLY_SYSTEM = (n: number) =>
  `You are the user's witty, confident friend texting on their behalf to someone they're attracted to. ` +
  `Write ${n} short flirty reply option${n > 1 ? "s" : ""} to send as their NEXT message.\n` +
  `Rules: each reply is 1-2 lines max; reference a SPECIFIC detail from the other person's last message; ` +
  `be exactly one notch bolder than their energy (if they're dry or short, add warmth — never escalate); ` +
  `end with a light hook; each option must use a DIFFERENT device (tease, callback, misdirection, playful self-deprecation); ` +
  `casual texting register, lowercase ok, at most one emoji; keep it SFW — flirty, never explicit or crude; never demeaning or pushy.\n` +
  `Output STRICT JSON only, no markdown, no commentary: ` +
  `{"replies":[{"text":"...","angle":"tease|smooth|callback|self_aware","device":"..."}]}`;

function parseReplies(content: string, n: number): Reply[] {
  const cleaned = stripFences(content);
  try {
    const obj = JSON.parse(cleaned) as
      | { replies?: { text?: string; angle?: string; device?: string }[] }
      | { text?: string }[];
    const arr = Array.isArray(obj) ? obj : (obj.replies ?? []);
    const out = arr
      .map((r) => ({
        id: uid("r"),
        text: String((r as { text?: string }).text ?? "").trim(),
        angle: String((r as { angle?: string }).angle ?? "reply"),
        device: String((r as { device?: string }).device ?? ""),
      }))
      .filter((r) => r.text.length > 0);
    if (out.length) return out.slice(0, n);
  } catch {
    // fall through to line parsing
  }
  return cleaned
    .split("\n")
    .map((s) => s.replace(/^[\d.)\-\s"]+/, "").replace(/"$/, "").trim())
    .filter(Boolean)
    .slice(0, n)
    .map((text) => ({ id: uid("r"), text, angle: "reply", device: "" }));
}

const meta = (verified = false): HuruMeta => ({
  request_id: uid("req"),
  credits_used: 0,
  verified,
  verification_mode: verified ? "tee" : "unknown",
  provider: verified ? "0g-compute" : "mock",
  privacy: "enclave" as const,
});

// ---- Public API -------------------------------------------------------------

export async function rizzReply(
  req: RizzReplyRequest,
): Promise<RizzReplyResponse> {
  if (MOCK) return mockReply(req);
  const n = req.regenerate ? 1 : 3;
  const result = await chat([
    { role: "system", content: REPLY_SYSTEM(n) },
    { role: "user", content: renderConvo(req) },
  ], "wingman");
  const replies = parseReplies(result.content, n);
  if (!replies.length)
    throw new ApiError(502, "empty_reply", "No reply produced.");
  updatePrivateMemory("reply", {
    conversation: req.conversation,
    context_note: req.context_note,
    answer: replies,
  }).catch(() => {});
  return { replies, huru: result.huru };
}

export async function rizzDecode(
  conversation: Turn[],
  contextNote?: string,
): Promise<DecodeResponse> {
  if (MOCK) return mockDecode(conversation);
  const convo = conversation
    .map((t) => `${t.speaker === "me" ? "ME" : "THEM"}: ${t.text}`)
    .join("\n");
  const result = await chat([
    {
      role: "system",
      content:
        `Read this dating conversation and judge the other person's interest in ME. ` +
        `Output STRICT JSON only: {"verdict":"interested|testing|polite|losing_interest",` +
        `"confidence":0-100,"evidence":["short quote-based reason"],"suggested_move":"one concrete next move"}.`,
    },
    { role: "user", content: contextNote ? `${convo}\nContext: ${contextNote}` : convo },
  ], "wingman");
  try {
    const o = JSON.parse(stripFences(result.content)) as Partial<DecodeResponse>;
    const verdict = (
      ["interested", "testing", "polite", "losing_interest"] as DecodeVerdict[]
    ).includes(o.verdict as DecodeVerdict)
      ? (o.verdict as DecodeVerdict)
      : "testing";
    const response: DecodeResponse = {
      verdict,
      confidence: Math.max(0, Math.min(100, Number(o.confidence ?? 60))),
      evidence: Array.isArray(o.evidence) ? o.evidence.map(String).slice(0, 3) : [],
      suggested_move: String(o.suggested_move ?? "Keep the energy and suggest a plan."),
      huru: result.huru,
    };
    updatePrivateMemory("decode", {
      conversation,
      context_note: contextNote,
      answer: response,
    }).catch(() => {});
    return response;
  } catch {
    const response: DecodeResponse = {
      verdict: "testing",
      confidence: 60,
      evidence: [result.content.slice(0, 120)],
      suggested_move: "Match their energy and suggest a low-stakes plan.",
      huru: result.huru,
    };
    updatePrivateMemory("decode", {
      conversation,
      context_note: contextNote,
      answer: response,
    }).catch(() => {});
    return response;
  }
}

export async function rizzOpener(
  bioText: string,
  vibe: RizzReplyRequest["vibe"],
): Promise<OpenerResponse> {
  if (MOCK) return mockOpener(bioText);
  const result = await chat([
    {
      role: "system",
      content:
        `Write 3 flirty opening lines for a dating match, each anchored to a SPECIFIC detail in their bio. ` +
        `Vibe: ${vibe}. No generic pickup lines. SFW. ` +
        `Output STRICT JSON only: {"openers":[{"text":"...","anchor":"the bio detail"}]}`,
    },
    { role: "user", content: bioText },
  ], "wingman");
  try {
    const o = JSON.parse(stripFences(result.content)) as { openers?: Partial<Opener>[] };
    const openers = (o.openers ?? [])
      .map((x) => ({
        id: uid("o"),
        text: String(x.text ?? "").trim(),
        anchor: String(x.anchor ?? "their bio"),
      }))
      .filter((x) => x.text.length > 0)
      .slice(0, 3);
    if (openers.length) {
      updatePrivateMemory("opener", {
        answer: { bio: bioText, openers },
      }).catch(() => {});
      return { openers, huru: result.huru };
    }
  } catch {
    // fall through
  }
  const openers = stripFences(result.content)
    .split("\n")
    .map((s) => s.replace(/^[\d.)\-\s"]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((text) => ({ id: uid("o"), text, anchor: "their bio" }));
  updatePrivateMemory("opener", {
    answer: { bio: bioText, openers },
  }).catch(() => {});
  return { openers, huru: result.huru };
}

// ---- Fitness / Coach (0G) ---------------------------------------------------

export type PlanExercise = { name: string; sets: number; reps: string; note?: string };
export type PlanDay = { day: string; focus: string; exercises: PlanExercise[] };
export type WorkoutPlan = { title: string; summary: string; days: PlanDay[]; huru?: HuruMeta };
export type PlanRequest = { goal: string; equipment: string; level: string; days: number };

const PLAN_SYSTEM =
  "You are an expert strength & conditioning coach. Design a concise, safe weekly workout plan. " +
  "Output STRICT JSON only, no markdown, no commentary: " +
  '{"title":"...","summary":"one motivating sentence","days":[{"day":"Day 1","focus":"e.g. Push","exercises":[{"name":"Bench Press","sets":4,"reps":"8-10","note":"optional short cue"}]}]}. ' +
  "Use common exercise names. 4-6 exercises per day. Respect the user's equipment and experience. The number of days must match the request.";

export async function generateWorkoutPlan(req: PlanRequest): Promise<WorkoutPlan> {
  if (MOCK) return mockPlan(req);
  const result = await chat([
    { role: "system", content: PLAN_SYSTEM },
    {
      role: "user",
      content: `Goal: ${req.goal}. Equipment available: ${req.equipment}. Experience level: ${req.level}. Days per week: ${req.days}.`,
    },
  ]);
  const plan = parsePlan(result.content);
  if (!plan.days.length) throw new ApiError(502, "empty_plan", "No plan produced.");
  updatePrivateMemory("plan", {
    answer: {
      goal: req.goal,
      equipment: req.equipment,
      level: req.level,
      days: req.days,
      title: plan.title,
    },
  }).catch(() => {});
  return { ...plan, huru: result.huru };
}

function parsePlan(content: string): WorkoutPlan {
  try {
    const o = JSON.parse(stripFences(content)) as Partial<WorkoutPlan>;
    const days: PlanDay[] = Array.isArray(o.days)
      ? o.days
          .map((d) => ({
            day: String(d?.day ?? "Day"),
            focus: String(d?.focus ?? ""),
            exercises: Array.isArray(d?.exercises)
              ? d.exercises
                  .map((e) => ({
                    name: String(e?.name ?? "").trim(),
                    sets: Number(e?.sets ?? 3) || 3,
                    reps: String(e?.reps ?? "10"),
                    note: e?.note ? String(e.note) : undefined,
                  }))
                  .filter((e) => e.name.length > 0)
              : [],
          }))
          .filter((d) => d.exercises.length > 0)
      : [];
    return { title: String(o.title ?? "Your plan"), summary: String(o.summary ?? ""), days };
  } catch {
    return { title: "Your plan", summary: "", days: [] };
  }
}

export async function getMe(): Promise<Me> {
  if (!MOCK && !DIRECT && BASE && KEY) {
    try {
      const { res, json } = await fetchHuruJson<{
        id?: string;
        email?: string | null;
        credits_balance?: number;
        error?: { code?: string; message?: string } | string;
      }>("/v1/auth/me");
      if (res.ok) {
        return {
          consumer_id: String(json.id ?? "con_device"),
          email: json.email ?? null,
          credits_balance: Number(json.credits_balance ?? 0) || 0,
          subscription: { active: false, plan: null },
        };
      }
    } catch {
      // fall back to the local legacy profile below
    }
  }
  return {
    consumer_id: "con_legacy",
    email: null,
    credits_balance: 0,
    subscription: { active: false, plan: null },
  };
}

export async function getPrivateMemoryRemote(): Promise<PrivateMemoryResponse> {
  if (MOCK || DIRECT || !BASE || !KEY) {
    return {
      memory: {
        summary: "Chum is ready to remember your voice once the live relay is connected.",
        voice: ["smooth, specific, low-pressure"],
        preferences: ["short replies", "SFW flirting"],
        boundaries: ["no pushy escalation"],
        facts: [],
        updated_at: new Date().toISOString(),
        source_event: "mock",
      },
      root_hash: null,
      huru: meta(),
    };
  }
  const { res, json } = await fetchHuruJson<PrivateMemoryResponse & {
    huru?: unknown;
    error?: { code?: string; message?: string } | string;
  }>("/v1/chum/memory");
  if (!res.ok) {
    const code = huruErrorCode(json, res.status);
    throw new ApiError(res.status, code, huruErrorMessage(json, String(code)));
  }
  return { ...json, huru: normalizeHuruMeta(json.huru) };
}

export async function forgetPrivateMemoryRemote(): Promise<void> {
  if (MOCK || DIRECT || !BASE || !KEY) return;
  await fetchHuruJson("/v1/chum/memory", {
    method: "DELETE",
  }).catch(() => {});
}

export async function getAgenticId(): Promise<AgenticIdRecord> {
  if (MOCK || DIRECT || !BASE || !KEY) {
    return {
      object: "chum.agentic_id",
      status: "setup_required",
      token_id: null,
      owner_address: null,
      contract_address: null,
      metadata_root_hash: null,
      memory_root_hash: null,
      data_hash: null,
      tx_hash: null,
      updated_at: null,
      explorer_url: null,
      setup_reason: "Connect the Huru relay to mint on 0G.",
      huru: meta(),
    };
  }
  const { res, json } = await fetchHuruJson<AgenticIdRecord & {
    huru?: unknown;
    error?: { code?: string; message?: string } | string;
  }>("/v1/chum/agent");
  if (!res.ok && res.status !== 409) {
    const code = huruErrorCode(json, res.status);
    throw new ApiError(res.status, code, huruErrorMessage(json, String(code)));
  }
  return { ...json, huru: normalizeHuruMeta(json.huru) };
}

export async function ownChum(input: {
  persona?: Exclude<Persona, null>;
  displayName?: string;
}): Promise<AgenticIdRecord> {
  if (MOCK || DIRECT || !BASE || !KEY) {
    return {
      object: "chum.agentic_id",
      status: "setup_required",
      token_id: null,
      owner_address: null,
      contract_address: null,
      metadata_root_hash: null,
      memory_root_hash: null,
      data_hash: null,
      tx_hash: null,
      updated_at: null,
      explorer_url: null,
      setup_reason: "Connect Huru with HURU_AGENT_NFT_ADDRESS to mint.",
      huru: meta(),
    };
  }
  const { res, json } = await fetchHuruJson<AgenticIdRecord & {
    huru?: unknown;
    error?: { code?: string; message?: string } | string;
  }>("/v1/chum/agent", {
    method: "POST",
    body: JSON.stringify({
      persona: input.persona,
      display_name: input.displayName,
    }),
  });
  if (!res.ok) {
    const code = huruErrorCode(json, res.status);
    throw new ApiError(res.status, code, huruErrorMessage(json, String(code)));
  }
  return { ...json, huru: normalizeHuruMeta(json.huru) };
}

// ---- Mock backend (only when MOCK) -----------------------------------------

function lastThem(req: RizzReplyRequest): string {
  for (let i = req.conversation.length - 1; i >= 0; i--) {
    const t = req.conversation[i];
    if (t && t.speaker === "them") return t.text;
  }
  return req.conversation.at(-1)?.text ?? "";
}

function mockReply(req: RizzReplyRequest): Promise<RizzReplyResponse> {
  const them = lastThem(req).toLowerCase();
  const bold = req.spice >= 3;
  const pool = [
    {
      text: them.includes("prove")
        ? "bold of you to assume i peak under pressure — i peak over coffee, thursday?"
        : "careful, that almost sounded like you wanted me to keep talking",
      angle: "tease",
      device: "misdirection",
    },
    {
      text: them.includes("?")
        ? "answering that costs one drink, minimum"
        : "you're trouble and i respect the commitment to the bit",
      angle: "smooth",
      device: "callback",
    },
    {
      text: bold
        ? "i'm choosing to read that as you asking me out. saving you the trouble."
        : "ok that made me smile and now i'm annoyed about it",
      angle: "self_aware",
      device: "self_deprecation",
    },
    {
      text: "plot twist: i'm exactly as interesting as that text suggests",
      angle: "playful",
      device: "exaggeration",
    },
  ];
  const n = req.regenerate ? 1 : 3;
  return Promise.resolve({
    replies: pool.slice(0, n).map((p) => ({ ...p, id: uid("m") })),
    huru: meta(),
  });
}

function mockDecode(conversation: Turn[]): Promise<DecodeResponse> {
  const last = [...conversation].reverse().find((t) => t.speaker === "them")?.text ?? "";
  const testing = /prove|really|sure|lol|ok\b/i.test(last);
  return Promise.resolve({
    verdict: testing ? "testing" : "interested",
    confidence: testing ? 71 : 64,
    evidence: [
      testing
        ? `"${last.slice(0, 40)}" reads as a challenge, not disinterest`
        : "she kept the thread going and matched your energy",
    ],
    suggested_move: testing
      ? "match the challenge, then pivot to a concrete low-stakes plan"
      : "raise the stakes a notch and suggest meeting",
    huru: meta(),
  });
}

function mockOpener(bio: string): Promise<OpenerResponse> {
  const anchor = bio.split(/[•,\n]/)[0]?.trim() || "your bio";
  return Promise.resolve({
    openers: [
      { id: uid("o"), text: `serious question about ${anchor.toLowerCase()} — personality or phase? need to know before i commit to being impressed`, anchor },
      { id: uid("o"), text: `i had a whole opener planned and then i read "${anchor}" and forgot all of it`, anchor },
      { id: uid("o"), text: `${anchor} is either a green flag or a trap. explain yourself.`, anchor },
    ],
    huru: meta(),
  });
}

function mockPlan(req: PlanRequest): Promise<WorkoutPlan> {
  const mk = (day: string, focus: string, exercises: PlanExercise[]): PlanDay => ({ day, focus, exercises });
  const all: PlanDay[] = [
    mk("Day 1", "Push", [
      { name: "Push-Up", sets: 4, reps: "12-15", note: "slow on the way down" },
      { name: "Dumbbell Bench Press", sets: 4, reps: "8-10" },
      { name: "Overhead Press", sets: 3, reps: "8-10" },
      { name: "Tricep Dips", sets: 3, reps: "12" },
    ]),
    mk("Day 2", "Pull", [
      { name: "Pull-Up", sets: 4, reps: "6-10" },
      { name: "Bent-Over Row", sets: 4, reps: "8-10" },
      { name: "Face Pull", sets: 3, reps: "15" },
      { name: "Bicep Curl", sets: 3, reps: "12" },
    ]),
    mk("Day 3", "Legs", [
      { name: "Goblet Squat", sets: 4, reps: "10-12" },
      { name: "Romanian Deadlift", sets: 4, reps: "8-10" },
      { name: "Walking Lunge", sets: 3, reps: "12 each" },
      { name: "Calf Raise", sets: 3, reps: "15" },
    ]),
    mk("Day 4", "Full body", [
      { name: "Kettlebell Swing", sets: 4, reps: "15" },
      { name: "Front Squat", sets: 4, reps: "8" },
      { name: "Incline Push-Up", sets: 3, reps: "15" },
      { name: "Plank", sets: 3, reps: "45s" },
    ]),
  ];
  const n = Math.max(1, Math.min(req.days || 3, all.length));
  return Promise.resolve({
    title: `${req.goal} plan`,
    summary: `A ${req.days}-day ${req.level.toLowerCase()} split built around ${req.equipment.toLowerCase()}.`,
    days: all.slice(0, n),
  });
}
