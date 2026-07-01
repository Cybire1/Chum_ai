// Persists the user's generated workout plan so it survives app restarts —
// they build it once on 0G and can reuse it without regenerating.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { WorkoutPlan } from "./api";

const KEY = "chum.workout.plan.v1";

type StoredPlan = { plan: WorkoutPlan; savedAt: number };

export async function savePlan(plan: WorkoutPlan): Promise<void> {
  try {
    const payload: StoredPlan = { plan, savedAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // best-effort; a failed save just means we regenerate next time
  }
}

export async function loadPlan(): Promise<StoredPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPlan;
    return parsed?.plan?.days?.length ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearPlan(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
