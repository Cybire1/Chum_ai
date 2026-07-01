create table if not exists public.huru_kv_mirror (
  entry_id text primary key,
  stream_id text not null,
  key_hash text not null,
  key_preview text not null,
  ciphertext text not null,
  value_sha256 text not null,
  version bigint not null default 1,
  source text not null default 'huru-kv-mirror',
  last_0g_tx_hash text,
  last_0g_root_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists huru_kv_mirror_stream_idx
  on public.huru_kv_mirror(stream_id);

create unique index if not exists huru_kv_mirror_stream_key_hash_uniq
  on public.huru_kv_mirror(stream_id, key_hash);
