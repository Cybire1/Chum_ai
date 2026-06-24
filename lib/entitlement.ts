import AsyncStorage from "@react-native-async-storage/async-storage";

// Consumer-facing entitlement (subscription active). In v0 the paywall flips this
// locally to demo the gate; production wires it to the IAP receipt -> huru
// /v1/consumers/{id}/iap response (see BUILD_BRIEF.md §6.6).

const K = "wing_entitled";
let cached = false;
const listeners = new Set<() => void>();

export async function loadEntitlement(): Promise<boolean> {
  try {
    cached = (await AsyncStorage.getItem(K)) === "1";
  } catch {
    cached = false;
  }
  return cached;
}

export function isEntitled(): boolean {
  return cached;
}

export async function setEntitled(on: boolean): Promise<void> {
  cached = on;
  try {
    await AsyncStorage.setItem(K, on ? "1" : "0");
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

export function subscribeEntitlement(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
