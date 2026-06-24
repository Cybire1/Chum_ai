# Chum AI — one private AI for your whole life

**Chum** is a private, all-in-one personal AI assistant — dating, fitness, notes, finance — where everything you tell it is processed inside a **0G TEE enclave**, so the operator physically can't read or store your data. One app, your whole life, actually private.

Built for **Zero Cup 2026** on the **0G** decentralized compute network.

> **Live today:** the *Wingman* — screenshot or paste a dating chat and get 2–3 replies that actually land, each generated privately on **0G mainnet**. Coach (gym), Notes, and Money run on the same private backend next.

---

## Why 0G is load-bearing (not decoration)

Every genuinely useful personal-AI task means handing over something intimate — your body, your private thoughts, your DMs, your money. People won't give that to a logged, centralized server. 0G fixes exactly that:

- **Private by design** — every request runs inside a **0G TeeML (TEE) enclave**; the operator can't read or retain it. A guarantee, not a "trust us."
- **Pay-per-call, on-chain** — each request is metered and settled as a micropayment on **0G mainnet** via the `@0glabs/0g-serving-broker` ledger. No centralized billing.
- **Model-agnostic** — we route across 0G's live TEE-attested models (DeepSeek-v3 for fast replies, GLM-5, qwen3-VL for vision) and auto-pick the healthiest provider.

A flirty-reply app is the *perfect* showcase for verifiable private compute, because the input is literally other people's private messages.

---

## Architecture

```
┌─────────────────────────────┐
│  Mobile app  (/)            │   Expo / React Native (iOS)
│  app/ · components/ · lib/  │   capture → reply reveal → copy
└──────────────┬──────────────┘
               │  HTTPS  /v1/chat/completions
               ▼
┌─────────────────────────────┐
│  Relay  (/relay)  "Huru"    │   Next.js — our 0G adoption layer
│  • holds the 0G broker+wallet│  • per-call micropayment settlement
│  • TEE provider selection    │  • OpenAI-compatible /v1 API
└──────────────┬──────────────┘
               │  @0glabs/0g-serving-broker (TEE-preferred)
               ▼
┌─────────────────────────────┐
│  0G Compute (mainnet, TEE)  │   DeepSeek-v3 · GLM-5 · qwen3-VL
└─────────────────────────────┘
```

This repo is a monorepo:

| Path | What it is |
|---|---|
| `app/`, `components/`, `lib/` | The **mobile app** (Expo / React Native). Onboarding, capture, editable transcript, the reply reveal, Decode, Openers, paywall, biometric lock — with polished micro-interactions. |
| `relay/` | **Huru** — the **0G integration**. An OpenAI-compatible gateway that holds the 0G broker + funded wallet, settles per-call micropayments, selects the best TEE provider, and exposes a clean `/v1` API so the app uses 0G compute **without touching crypto**. |

### Where the 0G code lives (for judges)
- **`relay/src/lib/huru/runtime.ts`** — the heart: creates the 0G broker, lists services, **TEE-preferred provider selection**, calls the provider's endpoint, and runs `processResponse()` for on-chain fee settlement.
- **`relay/src/lib/huru/wallet-manager.ts`** — the 0G funding wallet + per-consumer accounts.
- **`relay/src/lib/huru/model-tiers.ts`** — model/credit mapping.
- **`relay/src/app/v1/chat/completions/route.ts`** — request lifecycle (auth, credit pre-reserve → settle, logging).
- **App side:** `lib/api.ts` calls the relay's `/v1/chat/completions` with an engineered flirty-wingman prompt and parses the ranked replies.

---

## Run it

**Relay (0G gateway):**
```bash
cd relay
npm install
cp .env.example .env.local      # set ZERO_G_PRIVATE_KEY, HURU_RUNTIME_MODE=0g, ZERO_G_NETWORK=mainnet
npm run dev                      # serves http://localhost:3000
```

**Mobile app:**
```bash
npm install
npx expo install --fix
cp .env.example .env             # EXPO_PUBLIC_HURU_BASE=<relay url>, EXPO_PUBLIC_MOCK=0
npx expo start                   # press i for iOS simulator / scan in Expo Go
```
> The app ships with a built-in **mock backend** (`EXPO_PUBLIC_MOCK=1`) so the UI runs offline without the relay.

---

## Tech
React Native (Expo) · Reanimated · expo-secure-store / local-authentication · Next.js (Huru relay) · `@0glabs/0g-serving-broker` + ethers · **0G mainnet** (TeeML: DeepSeek-v3, GLM-5, qwen3-VL).

## Roadmap
- Ship **Coach**, **Notes**, and **Money** on the same private 0G backend.
- Zero-typing input via 0G's **qwen3-VL** vision model (screenshot → reply, in-enclave).
- Surface per-call **TEE attestation** in-app as a "verified private" receipt.

**Demo:** https://chumai.xyz
