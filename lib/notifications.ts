import { useSyncExternalStore } from "react";

// Lightweight notifications store for the VOLT side — seeded with coach/training
// nudges. Local + in-memory (read-state lives for the session); swap the seed for
// a real feed + AsyncStorage/expo-notifications when the backend is wired.

export type Notif = {
  id: string;
  icon: string; // Ionicons glyph name
  title: string;
  body: string;
  time: string; // human relative label
  read: boolean;
};

let state: Notif[] = [
  { id: "n1", icon: "barbell", title: "Today's workout is ready", body: "Upper Power · 8 moves · ~45 min, AI-adapted for sore shoulders.", time: "2m", read: false },
  { id: "n2", icon: "flame", title: "14-day streak — keep it lit", body: "Train today to make it 15. You've got this.", time: "1h", read: false },
  { id: "n3", icon: "trophy", title: "New PR within reach", body: "You're 2.5 kg off your bench press record. Coach says go for it.", time: "5h", read: true },
  { id: "n4", icon: "pulse", title: "Recovery looks good", body: "You're well rested — a strong day to push intensity.", time: "Yesterday", read: true },
  { id: "n5", icon: "sparkles", title: "Coach tip", body: "Prioritise sleep tonight and add a warm-up set tomorrow to protect your shoulders.", time: "Yesterday", read: true },
];

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function countUnread() {
  return state.reduce((n, x) => n + (x.read ? 0 : 1), 0);
}

export function useNotifs(): Notif[] {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

// Returns a number — useSyncExternalStore compares with Object.is, so a stable
// count won't loop.
export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, countUnread, countUnread);
}

export function markRead(id: string) {
  if (state.some((n) => n.id === id && !n.read)) {
    state = state.map((n) => (n.id === id ? { ...n, read: true } : n));
    emit();
  }
}

export function markAllRead() {
  if (state.some((n) => !n.read)) {
    state = state.map((n) => (n.read ? n : { ...n, read: true }));
    emit();
  }
}
