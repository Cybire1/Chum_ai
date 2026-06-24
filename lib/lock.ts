import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const K_ENABLED = "wing_applock_enabled";

export async function canUseLock(): Promise<boolean> {
  try {
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hw && enrolled;
  } catch {
    return false;
  }
}

export async function isLockEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(K_ENABLED)) === "1";
  } catch {
    return false;
  }
}

export async function setLockEnabled(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(K_ENABLED, on ? "1" : "0");
  } catch {
    // ignore
  }
}

export async function authenticate(
  reason = "Unlock Wing",
): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      disableDeviceFallback: false,
    });
    return r.success;
  } catch {
    return true; // fail-open on unsupported platforms (web)
  }
}
