import AsyncStorage from "@react-native-async-storage/async-storage";

// One-time UI flags (e.g. "has seen onboarding", "has seen X explainer").
export async function seen(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(`chum_flag_${key}`)) === "1";
  } catch {
    return false;
  }
}

export async function markSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`chum_flag_${key}`, "1");
  } catch {
    // ignore
  }
}

export async function clearFlag(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`chum_flag_${key}`);
  } catch {
    // ignore
  }
}
