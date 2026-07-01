import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { runtimeConfig } from "@/lib/huru/config";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/huru/supabase";

export type HuruKvMirrorBackend = "supabase" | "local-file";

export interface HuruKvMirrorPointer {
	value: string;
	source: "huru-kv-mirror";
	backend: HuruKvMirrorBackend;
	version: number;
	updatedAt: string;
}

export interface HuruKvMirrorWriteResult {
	source: "huru-kv-mirror";
	backend: HuruKvMirrorBackend;
	version: number;
	updatedAt: string;
}

export interface HuruKvMirrorWriteContext {
	officialTxHash?: string | null;
	officialRootHash?: string | null;
	source?: string;
}

interface MirrorRow {
	entry_id: string;
	stream_id: string;
	key_hash: string;
	key_preview: string;
	ciphertext: string;
	value_sha256: string;
	version: number;
	source: string;
	last_0g_tx_hash: string | null;
	last_0g_root_hash: string | null;
	created_at: string;
	updated_at: string;
}

interface LocalMirrorState {
	version: 1;
	updated_at: string;
	entries: Record<string, MirrorRow>;
}

const ENVELOPE_VERSION = "hkv1";
let localWriteQueue = Promise.resolve();

function mirrorPath(): string {
	return isAbsolute(runtimeConfig.kvMirrorPath)
		? runtimeConfig.kvMirrorPath
		: resolve(process.cwd(), runtimeConfig.kvMirrorPath);
}

function keyMaterial(): Buffer {
	return createHash("sha256")
		.update("huru-kv-mirror:v1\0")
		.update(runtimeConfig.kvMirrorSecret)
		.digest();
}

function entryId(streamId: string, key: string): string {
	return createHmac("sha256", keyMaterial())
		.update(streamId)
		.update("\0")
		.update(key)
		.digest("hex");
}

function keyHash(key: string): string {
	return createHmac("sha256", keyMaterial()).update("key\0").update(key).digest("hex");
}

function valueHash(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function aad(streamId: string, key: string): Buffer {
	return Buffer.from(`${streamId}\0${key}`, "utf8");
}

function sealValue(streamId: string, key: string, value: string): string {
	const nonce = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", keyMaterial(), nonce);
	cipher.setAAD(aad(streamId, key));
	const ciphertext = Buffer.concat([
		cipher.update(Buffer.from(value, "utf8")),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return [
		ENVELOPE_VERSION,
		nonce.toString("base64url"),
		tag.toString("base64url"),
		ciphertext.toString("base64url"),
	].join(".");
}

function openValue(streamId: string, key: string, envelope: string): string {
	const [version, nonce64, tag64, ciphertext64] = envelope.split(".");
	if (version !== ENVELOPE_VERSION || !nonce64 || !tag64 || !ciphertext64) {
		throw new Error("Invalid Huru KV mirror envelope.");
	}
	const decipher = createDecipheriv(
		"aes-256-gcm",
		keyMaterial(),
		Buffer.from(nonce64, "base64url"),
	);
	decipher.setAAD(aad(streamId, key));
	decipher.setAuthTag(Buffer.from(tag64, "base64url"));
	const plaintext = Buffer.concat([
		decipher.update(Buffer.from(ciphertext64, "base64url")),
		decipher.final(),
	]);
	return plaintext.toString("utf8");
}

function emptyLocalState(): LocalMirrorState {
	return {
		version: 1,
		updated_at: new Date().toISOString(),
		entries: {},
	};
}

function asLocalState(value: unknown): LocalMirrorState {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return emptyLocalState();
	}
	const record = value as Partial<LocalMirrorState>;
	if (record.version !== 1 || !record.entries || typeof record.entries !== "object") {
		return emptyLocalState();
	}
	return {
		version: 1,
		updated_at: typeof record.updated_at === "string" ? record.updated_at : new Date().toISOString(),
		entries: record.entries as Record<string, MirrorRow>,
	};
}

async function readLocalState(): Promise<LocalMirrorState> {
	try {
		const raw = await readFile(mirrorPath(), "utf8");
		return asLocalState(JSON.parse(raw));
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			return emptyLocalState();
		}
		throw error;
	}
}

async function writeLocalState(state: LocalMirrorState): Promise<void> {
	const path = mirrorPath();
	const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
	await mkdir(dirname(path), { recursive: true, mode: 0o700 });
	await writeFile(tempPath, JSON.stringify(state, null, 2), { mode: 0o600 });
	await rename(tempPath, path);
}

async function withLocalWrite<T>(fn: () => Promise<T>): Promise<T> {
	const next = localWriteQueue.then(fn, fn);
	localWriteQueue = next.then(
		() => undefined,
		() => undefined,
	);
	return next;
}

function toPointer(row: MirrorRow, streamId: string, key: string, backend: HuruKvMirrorBackend): HuruKvMirrorPointer {
	const value = openValue(streamId, key, row.ciphertext);
	const digest = valueHash(value);
	if (digest !== row.value_sha256) {
		throw new Error("Huru KV mirror value hash mismatch.");
	}
	return {
		value,
		source: "huru-kv-mirror",
		backend,
		version: row.version,
		updatedAt: row.updated_at,
	};
}

function buildRow(
	streamId: string,
	key: string,
	value: string,
	version: number,
	createdAt: string,
	context: HuruKvMirrorWriteContext = {},
): MirrorRow {
	const now = new Date().toISOString();
	return {
		entry_id: entryId(streamId, key),
		stream_id: streamId,
		key_hash: keyHash(key),
		key_preview: `hash:${keyHash(key).slice(0, 12)}`,
		ciphertext: sealValue(streamId, key, value),
		value_sha256: valueHash(value),
		version,
		source: context.source ?? "huru-kv-mirror",
		last_0g_tx_hash: context.officialTxHash ?? null,
		last_0g_root_hash: context.officialRootHash ?? null,
		created_at: createdAt,
		updated_at: now,
	};
}

async function getFromSupabase(streamId: string, key: string): Promise<HuruKvMirrorPointer | null> {
	const supabase = getSupabaseAdmin();
	if (!supabase) return null;

	const result = await supabase
		.from("huru_kv_mirror")
		.select("entry_id, stream_id, key_hash, key_preview, ciphertext, value_sha256, version, source, last_0g_tx_hash, last_0g_root_hash, created_at, updated_at")
		.eq("entry_id", entryId(streamId, key))
		.maybeSingle();

	if (result.error) {
		throw result.error;
	}
	if (!result.data) {
		return null;
	}

	return toPointer(result.data as MirrorRow, streamId, key, "supabase");
}

async function putToSupabase(
	streamId: string,
	key: string,
	value: string,
	context?: HuruKvMirrorWriteContext,
): Promise<HuruKvMirrorWriteResult> {
	const supabase = getSupabaseAdmin();
	if (!supabase) {
		throw new Error("Supabase is not configured.");
	}

	const id = entryId(streamId, key);
	const existing = await supabase
		.from("huru_kv_mirror")
		.select("version, created_at")
		.eq("entry_id", id)
		.maybeSingle();

	if (existing.error) {
		throw existing.error;
	}

	const existingRow = existing.data as Pick<MirrorRow, "version" | "created_at"> | null;
	const row = buildRow(
		streamId,
		key,
		value,
		(existingRow?.version ?? 0) + 1,
		existingRow?.created_at ?? new Date().toISOString(),
		context,
	);
	const write = await supabase.from("huru_kv_mirror").upsert(row, { onConflict: "entry_id" });
	if (write.error) {
		throw write.error;
	}

	return {
		source: "huru-kv-mirror",
		backend: "supabase",
		version: row.version,
		updatedAt: row.updated_at,
	};
}

async function getFromLocal(streamId: string, key: string): Promise<HuruKvMirrorPointer | null> {
	const state = await readLocalState();
	const row = state.entries[entryId(streamId, key)];
	return row ? toPointer(row, streamId, key, "local-file") : null;
}

async function putToLocal(
	streamId: string,
	key: string,
	value: string,
	context?: HuruKvMirrorWriteContext,
): Promise<HuruKvMirrorWriteResult> {
	return withLocalWrite(async () => {
		const state = await readLocalState();
		const id = entryId(streamId, key);
		const existing = state.entries[id];
		const row = buildRow(
			streamId,
			key,
			value,
			(existing?.version ?? 0) + 1,
			existing?.created_at ?? new Date().toISOString(),
			context,
		);
		state.entries[id] = row;
		state.updated_at = row.updated_at;
		await writeLocalState(state);
		return {
			source: "huru-kv-mirror",
			backend: "local-file",
			version: row.version,
			updatedAt: row.updated_at,
		};
	});
}

export function kvMirrorStatus() {
	return {
		enabled: runtimeConfig.kvMirrorEnabled,
		backend: hasSupabaseAdminConfig() ? "supabase" : "local-file",
		path: hasSupabaseAdminConfig() ? null : runtimeConfig.kvMirrorPath,
		encrypted_at_rest: true,
	};
}

export async function kvMirrorGet(
	streamId: string,
	key: string,
): Promise<HuruKvMirrorPointer | null> {
	if (!runtimeConfig.kvMirrorEnabled) {
		return null;
	}

	if (hasSupabaseAdminConfig()) {
		try {
			const pointer = await getFromSupabase(streamId, key);
			if (pointer) return pointer;
		} catch (error) {
			console.warn(
				"Huru KV mirror Supabase read failed; falling back to local file.",
				error instanceof Error ? error.message : String(error),
			);
		}
	}

	return getFromLocal(streamId, key);
}

export async function kvMirrorPut(
	streamId: string,
	key: string,
	value: string,
	context?: HuruKvMirrorWriteContext,
): Promise<HuruKvMirrorWriteResult> {
	if (!runtimeConfig.kvMirrorEnabled) {
		throw new Error("Huru KV mirror is disabled.");
	}

	if (hasSupabaseAdminConfig()) {
		try {
			return await putToSupabase(streamId, key, value, context);
		} catch (error) {
			console.warn(
				"Huru KV mirror Supabase write failed; falling back to local file.",
				error instanceof Error ? error.message : String(error),
			);
		}
	}

	return putToLocal(streamId, key, value, context);
}
