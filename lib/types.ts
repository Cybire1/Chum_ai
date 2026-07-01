// Shared types — mirror the huru /v1/rizz/* API contract (see BUILD_BRIEF.md §6).

export type Speaker = "me" | "them";

export type Turn = { speaker: Speaker; text: string };

export type Vibe = "playful" | "smooth" | "bold" | "funny" | "sweet";

export const VIBES: Vibe[] = ["playful", "smooth", "bold", "funny", "sweet"];

export type Persona = "dry" | "goofy" | "smooth" | "nerdy" | null;

export type Goal = "reply" | "opener" | "revive" | "ask_out";

export type Reply = {
  id: string;
  text: string;
  angle: string; // e.g. "tease" | "smooth" | "callback" | "self_aware"
  device: string; // e.g. "callback" | "misdirection" | "self_deprecation"
};

export type RizzReplyRequest = {
  conversation: Turn[];
  context_note?: string;
  vibe: Vibe;
  spice: 1 | 2 | 3;
  goal?: Goal;
  platform?: string;
  persona?: Persona;
  exclude_ids?: string[];
  regenerate?: boolean;
};

export type HuruMeta = {
  request_id: string;
  credits_used: number;
  verified: boolean;
  verification_mode?: "tee" | "unknown" | string;
  provider?: string;
  cached?: boolean;
  idempotent_replay?: boolean;
  storage_root_hash?: string;
  storage_tx_hash?: string;
  kv_tx_hash?: string;
  privacy: "enclave" | string;
};

export type RizzReplyResponse = { replies: Reply[]; huru: HuruMeta };

export type DecodeVerdict =
  | "interested"
  | "testing"
  | "polite"
  | "losing_interest";

export type DecodeResponse = {
  verdict: DecodeVerdict;
  confidence: number; // 0..100
  evidence: string[];
  suggested_move: string;
  huru: HuruMeta;
};

export type Opener = { id: string; text: string; anchor: string };
export type OpenerResponse = { openers: Opener[]; huru: HuruMeta };

export type PrivateMemory = {
  summary: string;
  voice: string[];
  preferences: string[];
  boundaries: string[];
  facts: string[];
  updated_at: string;
  source_event: string;
};

export type PrivateMemoryResponse = {
  memory: PrivateMemory | null;
  root_hash: string | null;
  huru?: HuruMeta;
};

export type AgenticIdStatus = "owned" | "setup_required";

export type AgenticIdRecord = {
  object: "chum.agentic_id";
  status: AgenticIdStatus;
  token_id: string | null;
  owner_address: string | null;
  contract_address: string | null;
  metadata_root_hash: string | null;
  memory_root_hash: string | null;
  data_hash: string | null;
  tx_hash: string | null;
  updated_at: string | null;
  explorer_url: string | null;
  setup_reason?: string;
  huru?: HuruMeta;
};

export type Me = {
  consumer_id: string;
  email: string | null;
  credits_balance: number;
  subscription: { active: boolean; plan: string | null; expires_at?: string };
};

export type InsufficientCredits = {
  error: "insufficient_credits";
  balance: number;
  checkout_url?: string;
};
