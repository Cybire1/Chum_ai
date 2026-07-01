// Persisted user profile (just the name for now) — set once in onboarding,
// read by the Home greeting and the Profile screen. Survives app restarts.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

const KEY = "chum.profile.name.v1";

let name: string | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

// hydrate once at startup
AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v) {
      name = v;
      emit();
    }
  })
  .catch(() => {});

export function setName(next: string): void {
  const trimmed = next.trim();
  name = trimmed || null;
  emit();
  AsyncStorage.setItem(KEY, name ?? "").catch(() => {});
}

export function getName(): string | null {
  return name;
}

// First initial for avatars; falls back to a neutral glyph.
export function initialOf(n: string | null, fallback = "🙂"): string {
  const c = n?.trim()?.[0];
  return c ? c.toUpperCase() : fallback;
}

export function useName(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => name,
    () => name,
  );
}
