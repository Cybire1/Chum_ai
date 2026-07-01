import { useSyncExternalStore } from "react";

import type { DecodeResponse, HuruMeta, Persona, Reply, Turn, Vibe } from "./types";

// In-flight session shared across the capture -> transcript -> reveal flow.
// Tiny external store (no extra deps). Local-only; nothing here is persisted.

export type Session = {
  conversation: Turn[];
  contextNote: string;
  platform: string | null;
  vibe: Vibe;
  spice: 1 | 2 | 3;
  persona: Persona;
  replies: Reply[];
  decode: DecodeResponse | null;
  lastReceipt: HuruMeta | null;
};

const initial: Session = {
  conversation: [],
  contextNote: "",
  platform: null,
  vibe: "playful",
  spice: 2,
  persona: null,
  replies: [],
  decode: null,
  lastReceipt: null,
};

let state: Session = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setSession(patch: Partial<Session>) {
  state = { ...state, ...patch };
  emit();
}

export function resetSession() {
  state = { ...initial };
  emit();
}

export function getSession(): Session {
  return state;
}

export function useSession(): Session {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
