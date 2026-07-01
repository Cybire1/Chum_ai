import { keccak256, toUtf8Bytes } from "ethers";

// A "Chum agent" = a user's personalized wingman, captured as portable, ownable
// data. This object IS the "intelligence" an ERC-7857 iNFT carries: persona,
// voice, system prompt, and which 0G Compute model runs it. Own it, carry it,
// (eventually) trade it — the rizz moves with the token.

export type Persona = "dry" | "goofy" | "smooth" | "nerdy";

export type ChumAgent = {
  version: 1;
  kind: "chum.wingman";
  persona: Persona;
  displayName: string;
  systemPrompt: string;
  voice: { tone: string; emojiBudget: number; signature: string };
  model: string; // the 0G Compute model the agent runs on
  createdAt: number;
};

const TRAITS: Record<Persona, { tone: string; signature: string }> = {
  dry: { tone: "deadpan, understated", signature: "cool. I'll allow it." },
  goofy: { tone: "silly, playful", signature: "say less — I'm already in 🤸" },
  smooth: { tone: "confident, warm", signature: "dinner first, then I'll show you." },
  nerdy: { tone: "clever, specific", signature: "V4 on a good day — bring proof." },
};

export function buildChumAgent(opts: {
  persona: Persona;
  displayName: string;
  createdAt: number;
  model?: string;
}): ChumAgent {
  const t = TRAITS[opts.persona];
  return {
    version: 1,
    kind: "chum.wingman",
    persona: opts.persona,
    displayName: opts.displayName,
    systemPrompt:
      `You are Chum, a witty ${t.tone} wingman texting on the owner's behalf to someone they're into. ` +
      `Reply in 1-2 lines, reference a specific detail, stay one notch bolder than their energy, ` +
      `SFW, at most one emoji.`,
    voice: { tone: t.tone, emojiBudget: 1, signature: t.signature },
    model: opts.model ?? "deepseek-v4-flash",
    createdAt: opts.createdAt,
  };
}

// The on-chain dataHash. For this demo we mint PUBLIC agent data — per the
// reference Verifier, the mint() proof for public data is the 32-byte dataHash
// itself. For a PRIVATE agent, encrypt the JSON, upload the ciphertext to 0G
// Storage, and hash the CIPHERTEXT instead (then seal the key per ERC-7857).
export function agentDataHash(agent: ChumAgent): string {
  return keccak256(toUtf8Bytes(JSON.stringify(agent)));
}
