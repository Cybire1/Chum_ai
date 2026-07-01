import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { ethers } from "ethers";

let tempDir = "";
let mirrorPath = "";
let mirror: typeof import("../src/lib/huru/kv-mirror");
let storage: typeof import("../src/lib/huru/storage");

const streamId = ethers.keccak256(
	new TextEncoder().encode("huru:kv:test-suite"),
);

before(async () => {
	tempDir = await mkdtemp(join(tmpdir(), "huru-kv-mirror-test-"));
	mirrorPath = join(tempDir, "mirror.json");

	process.env.HURU_KV_MIRROR_ENABLED = "true";
	process.env.HURU_KV_MIRROR_PATH = mirrorPath;
	process.env.HURU_KV_MIRROR_SECRET = "test-only-kv-mirror-secret";
	process.env.ZERO_G_KV_URL = "";
	process.env.ZERO_G_INDEXER_URL = "";
	process.env.ZERO_G_FLOW_CONTRACT = "";
	process.env.SUPABASE_URL = "";
	process.env.SUPABASE_SERVICE_ROLE_KEY = "";

	mirror = await import("../src/lib/huru/kv-mirror");
	storage = await import("../src/lib/huru/storage");
});

after(async () => {
	if (tempDir) {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test("Huru KV Mirror seals pointer values and raw keys at rest", async () => {
	const key = "chum:consumer-secret-id:memory:latest";
	const value = `0x${"ab".repeat(32)}`;

	const written = await mirror.kvMirrorPut(streamId, key, value);
	assert.equal(written.source, "huru-kv-mirror");
	assert.equal(written.backend, "local-file");
	assert.equal(written.version, 1);

	const read = await mirror.kvMirrorGet(streamId, key);
	assert.equal(read?.value, value);
	assert.equal(read?.source, "huru-kv-mirror");
	assert.equal(read?.backend, "local-file");
	assert.equal(read?.version, 1);

	const raw = await readFile(mirrorPath, "utf8");
	assert.equal(raw.includes(value), false);
	assert.equal(raw.includes(key), false);
	assert.equal(raw.includes("consumer-secret-id"), false);
	assert.equal(raw.includes("ciphertext"), true);
	assert.equal(raw.includes("value_sha256"), true);
});

test("Huru KV Mirror versions updates for the same stream/key", async () => {
	const key = "chum:versioned-consumer:agentic-id";
	const first = "token:0";
	const second = "token:1";

	const firstWrite = await mirror.kvMirrorPut(streamId, key, first);
	const secondWrite = await mirror.kvMirrorPut(streamId, key, second);
	const read = await mirror.kvMirrorGet(streamId, key);

	assert.equal(firstWrite.version, 1);
	assert.equal(secondWrite.version, 2);
	assert.equal(read?.value, second);
	assert.equal(read?.version, 2);
});

test("kvGetResilient falls back to Huru KV Mirror when official 0G KV URL is absent", async () => {
	const key = "chum:fallback-consumer:memory:latest";
	const value = `0x${"cd".repeat(32)}`;

	await mirror.kvMirrorPut(streamId, key, value);
	const result = await storage.kvGetResilient(streamId, key);

	assert.equal(result.value, value);
	assert.equal(result.source, "huru-kv-mirror");
	assert.equal(result.mirror?.backend, "local-file");
	assert.match(result.officialError ?? "", /ZERO_G_KV_URL/);
});

test("kvGetResilient returns a none source for missing keys", async () => {
	const result = await storage.kvGetResilient(
		streamId,
		"chum:missing-consumer:memory:latest",
	);

	assert.equal(result.value, null);
	assert.equal(result.source, "none");
	assert.match(result.officialError ?? "", /ZERO_G_KV_URL/);
});

test("kvPutResilient writes to Huru KV Mirror when official 0G KV write is not configured", async () => {
	const key = "chum:write-fallback-consumer:agentic-id";
	const value = JSON.stringify({ token_id: "7", status: "owned" });
	const wallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey);

	const written = await storage.kvPutResilient(streamId, key, value, wallet);
	const read = await mirror.kvMirrorGet(streamId, key);

	assert.equal(written.source, "huru-kv-mirror");
	assert.equal(written.txHash, null);
	assert.equal(written.rootHash, null);
	assert.equal(written.mirror?.backend, "local-file");
	assert.match(written.officialError ?? "", /0G KV write is not configured/);
	assert.equal(read?.value, value);
});

test("local mirror file is created only inside the configured test directory", () => {
	assert.equal(existsSync(mirrorPath), true);
	assert.equal(mirrorPath.startsWith(tempDir), true);
});
