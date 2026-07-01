import AsyncStorage from "@react-native-async-storage/async-storage";

const K_ENABLED = "chum_private_memory_enabled";
const K_LAST_ROOT = "chum_private_memory_last_root";
const K_LAST_SYNC = "chum_private_memory_last_sync";

export type PrivateMemoryState = {
  enabled: boolean;
  lastRootHash: string | null;
  lastSyncedAt: string | null;
};

export async function getPrivateMemoryState(): Promise<PrivateMemoryState> {
  const [enabled, lastRootHash, lastSyncedAt] = await Promise.all([
    AsyncStorage.getItem(K_ENABLED),
    AsyncStorage.getItem(K_LAST_ROOT),
    AsyncStorage.getItem(K_LAST_SYNC),
  ]);
  return {
    enabled: enabled !== "0",
    lastRootHash,
    lastSyncedAt,
  };
}

export async function isPrivateMemoryEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(K_ENABLED)) !== "0";
}

export async function setPrivateMemoryEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(K_ENABLED, enabled ? "1" : "0");
}

export async function rememberPrivateMemoryRoot(rootHash: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(K_LAST_ROOT, rootHash),
    AsyncStorage.setItem(K_LAST_SYNC, new Date().toISOString()),
  ]);
}

export async function forgetPrivateMemory(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(K_LAST_ROOT),
    AsyncStorage.removeItem(K_LAST_SYNC),
  ]);
}
