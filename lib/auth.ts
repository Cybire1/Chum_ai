import * as SecureStore from "expo-secure-store";

// Per-device anonymous identity. No signup. Mirrors the per-device pattern from
// the founder's "The Bell" app. The device_id provisions an anonymous huru
// consumer (see api.ensureAuth); the ct_ token + consumer_id are cached here.

const K_DEVICE = "chum_device_id";
const K_TOKEN = "chum_consumer_token";
const K_CONSUMER = "chum_consumer_id";

function rand(): string {
  // RFC4122-ish v4 without extra deps.
  const h = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 32; i++) {
    s += h[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) s += "-";
  }
  return s;
}

async function get(k: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(k);
  } catch {
    return null;
  }
}
async function set(k: string, v: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(k, v);
  } catch {
    // ignore (web fallback handled by SecureStore on supported platforms)
  }
}

export async function getDeviceId(): Promise<string> {
  let id = await get(K_DEVICE);
  if (!id) {
    id = `dev_${rand()}`;
    await set(K_DEVICE, id);
  }
  return id;
}

export const getToken = () => get(K_TOKEN);
export const getConsumerId = () => get(K_CONSUMER);

export async function saveSession(token: string, consumerId: string) {
  await set(K_TOKEN, token);
  await set(K_CONSUMER, consumerId);
}

export async function resetIdentity() {
  for (const k of [K_DEVICE, K_TOKEN, K_CONSUMER]) {
    try {
      await SecureStore.deleteItemAsync(k);
    } catch {
      // ignore
    }
  }
}
