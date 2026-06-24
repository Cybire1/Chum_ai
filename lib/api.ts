// huru relay client. When EXPO_PUBLIC_MOCK=1 (or no host configured) it uses a
// local mock so the UI runs offline. Otherwise it calls huru's LIVE 0G-backed
// /v1/chat/completions (TEE inference on 0G mainnet) with engineered prompts.
//
// NOTE: this is the interim single-shot path that proves the 0G connection end to
// end. The full grounding -> writer -> judge -> select pipeline lives server-side
// in huru (/v1/rizz/*) — see BUILD_BRIEF.md §6/§7 — and is the next upgrade.

import { getDeviceId } from "./auth";
import { uid } from "./format";
import type {
  DecodeResponse,
  DecodeVerdict,
  Me,
  Opener,
  OpenerResponse,
  Reply,
  RizzReplyRequest,
  RizzReplyResponse,
  Turn,
} from "./types";

const BASE = (process.env.EXPO_PUBLIC_HURU_BASE ?? "").trim();
const KEY = process.env.EXPO_PUBLIC_HURU_KEY ?? "";
const MOCK = process.env.EXPO_PUBLIC_MOCK === "1" || BASE === "";

export const isMock = MOCK;

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

// ensureAuth is a no-op in the legacy (sk_ + email) path; kept for callers.
export async function ensureAuth(): Promise<void> {
  return;
}

async function consumerEmail(): Promise<string> {
  const id = await getDeviceId();
  return `${id.replace(/[^a-z0-9]/gi, "").slice(0, 24)}@wing.app`;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function chat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      "X-Consumer-Email": await consumerEmail(),
    },
    body: JSON.stringify({ model: "huru/chat-1", messages }),
  });
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

const meta = (verified = false) => ({
  request_id: uid("req"),
  credits_used: 0,
  verified,
  privacy: "enclave" as const,
});

// ---- Public API -------------------------------------------------------------

export async function rizzReply(
  req: RizzReplyRequest,
): Promise<RizzReplyResponse> {
  if (MOCK) return mockReply(req);
  const n = req.regenerate ? 1 : 3;
  const content = await chat([
    { role: "system", content: REPLY_SYSTEM(n) },
    { role: "user", content: renderConvo(req) },
  ]);
  const replies = parseReplies(content, n);
  if (!replies.length)
    throw new ApiError(502, "empty_reply", "No reply produced.");
  return { replies, huru: meta() };
}

export async function rizzDecode(
  conversation: Turn[],
  contextNote?: string,
): Promise<DecodeResponse> {
  if (MOCK) return mockDecode(conversation);
  const convo = conversation
    .map((t) => `${t.speaker === "me" ? "ME" : "THEM"}: ${t.text}`)
    .join("\n");
  const content = await chat([
    {
      role: "system",
      content:
        `Read this dating conversation and judge the other person's interest in ME. ` +
        `Output STRICT JSON only: {"verdict":"interested|testing|polite|losing_interest",` +
        `"confidence":0-100,"evidence":["short quote-based reason"],"suggested_move":"one concrete next move"}.`,
    },
    { role: "user", content: contextNote ? `${convo}\nContext: ${contextNote}` : convo },
  ]);
  try {
    const o = JSON.parse(stripFences(content)) as Partial<DecodeResponse>;
    const verdict = (
      ["interested", "testing", "polite", "losing_interest"] as DecodeVerdict[]
    ).includes(o.verdict as DecodeVerdict)
      ? (o.verdict as DecodeVerdict)
      : "testing";
    return {
      verdict,
      confidence: Math.max(0, Math.min(100, Number(o.confidence ?? 60))),
      evidence: Array.isArray(o.evidence) ? o.evidence.map(String).slice(0, 3) : [],
      suggested_move: String(o.suggested_move ?? "Keep the energy and suggest a plan."),
      huru: meta(),
    };
  } catch {
    return {
      verdict: "testing",
      confidence: 60,
      evidence: [content.slice(0, 120)],
      suggested_move: "Match their energy and suggest a low-stakes plan.",
      huru: meta(),
    };
  }
}

export async function rizzOpener(
  bioText: string,
  vibe: RizzReplyRequest["vibe"],
): Promise<OpenerResponse> {
  if (MOCK) return mockOpener(bioText);
  const content = await chat([
    {
      role: "system",
      content:
        `Write 3 flirty opening lines for a dating match, each anchored to a SPECIFIC detail in their bio. ` +
        `Vibe: ${vibe}. No generic pickup lines. SFW. ` +
        `Output STRICT JSON only: {"openers":[{"text":"...","anchor":"the bio detail"}]}`,
    },
    { role: "user", content: bioText },
  ]);
  try {
    const o = JSON.parse(stripFences(content)) as { openers?: Partial<Opener>[] };
    const openers = (o.openers ?? [])
      .map((x) => ({
        id: uid("o"),
        text: String(x.text ?? "").trim(),
        anchor: String(x.anchor ?? "their bio"),
      }))
      .filter((x) => x.text.length > 0)
      .slice(0, 3);
    if (openers.length) return { openers, huru: meta() };
  } catch {
    // fall through
  }
  const openers = stripFences(content)
    .split("\n")
    .map((s) => s.replace(/^[\d.)\-\s"]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((text) => ({ id: uid("o"), text, anchor: "their bio" }));
  return { openers, huru: meta() };
}

export async function getMe(): Promise<Me> {
  return {
    consumer_id: "con_legacy",
    email: null,
    credits_balance: 0,
    subscription: { active: false, plan: null },
  };
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
