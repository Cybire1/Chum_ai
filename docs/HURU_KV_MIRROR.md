# Huru KV Mirror

Huru KV Mirror is Huru's server-side key-value pointer layer for persistent agent memory and ownership records.

It exists because the current public 0G mainnet docs expose the chain RPC, storage indexer, and Flow contract, but do not publish a stable production `KvClient` read gateway URL. Huru still uses 0G as the core stack:

- encrypted memory and agent metadata are uploaded to 0G Storage;
- Agentic ID/iNFT ownership is minted on 0G Chain;
- Huru KV Mirror stores only the latest pointer values needed for clean UX;
- when an official 0G KV read gateway is configured, Huru can read from it first and keep the mirror as fallback.

## Data Model

The mirror stores:

```txt
stream_id + key -> encrypted pointer value
```

Example logical values:

```txt
chum:<consumer_id>:memory:latest -> 0G Storage root hash
chum:<consumer_id>:agentic-id -> AgentNFT token record
chum:<consumer_id>:agentic-id:metadata -> latest metadata pointer
```

It does not store plaintext memory or chat history. Actual private data remains encrypted and stored by root hash on 0G Storage.

## Backends

Production backend:

```txt
Supabase table: huru_kv_mirror
```

Local/hackathon backend:

```txt
relay/.huru/kv-mirror.json
```

Both backends store values sealed with AES-256-GCM. Lookup identifiers are deterministic hashes/HMACs of the stream and key so raw key material is not needed for database indexing.

## Runtime Behavior

Writes:

```txt
1. try official 0G KV write when configured
2. always write Huru KV Mirror when enabled
3. return source: 0g-kv, huru-kv-mirror, or 0g-kv+huru-kv-mirror
```

Reads:

```txt
1. try official 0G KV read when ZERO_G_KV_URL is configured
2. fallback to Huru KV Mirror
3. return kv_source in API responses
```

This keeps the app usable today while preserving a clean migration path to native 0G KV once the read gateway is available.

## Env

```bash
HURU_KV_MIRROR_ENABLED=true
HURU_KV_MIRROR_PATH=.huru/kv-mirror.json
HURU_KV_MIRROR_SECRET=
ZERO_G_KV_URL=
```

`HURU_KV_MIRROR_SECRET` should be stable across deployments. If it changes, previously mirrored encrypted pointers cannot be decrypted.

## Grant Angle

Huru KV Mirror is a UX bridge for 0G adoption: developers can ship user-friendly persistent AI agents now, without exposing chain/storage complexity to users, while keeping 0G Storage and 0G Chain as the verifiable system of record.
