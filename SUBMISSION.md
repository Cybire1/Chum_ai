# Chum — the private AI you actually own, built on 0G

**One line:** Chum is a personal AI that helps with your most sensitive life stuff — your dating texts, your body, your habits — and unlike every other AI app, it runs in a **sealed enclave on 0G**, keeps your memory **encrypted on 0G Storage**, and hands you **ownership of your agent as an on-chain iNFT**. Your secrets can't be sold, because we never hold them.

---

## The problem

The AI you'd trust with your dating life or your body is exactly the AI you *shouldn't* hand to a centralized company. Every "AI wingman" and "AI coach" today pipes your most intimate data into someone else's servers + OpenAI, stores it in their database, and monetizes it. You don't own the model, the memory, or the relationship.

## The product

Chum is a polished consumer iOS app (Expo / React Native) with two pillars today and a clear roadmap:

- **Wingman** — screenshot or paste a conversation, and Chum writes replies that sound like *you* (tuned to your voice/persona).
- **Coach (VOLT)** — an AI workout planner + a live guided session player, plus a "Today" health view.
- **Own Your Chum** — mint your agent's identity + encrypted memory as a portable iNFT you control.

It looks and feels like a real App-Store product, not a demo — full onboarding, native iOS patterns, a designed motion system.

## Why 0G — the moat

Chum is **0G-native**, not a wrapper with a token bolted on. Four layers:

| 0G layer | What Chum uses it for |
|---|---|
| **Compute (TEE)** | Every reply + workout plan is generated on 0G's decentralized GPU marketplace, routed to **TEE (TeeML) providers**. The relay verifies **each response's signature** (`processResponse`) and the **provider's enclave attestation** (`verifyService`) — the "verified" flag is a *real* check, not a constant. |
| **Storage + KV** | Your **private memory** (distilled voice, preferences, boundaries) is encrypted on **0G Storage**, with a **0G KV** pointer to the latest version. |
| **Chain (iNFT / ERC-7857)** | Your agent's identity + encrypted metadata is an **iNFT you own** — portable, and impossible for us to take away. |
| **Proof Mode** | An in-app screen surfaces the receipts: request IDs, provider, storage root hashes, and the verification result. |

The app talks to **Huru**, our OpenAI-compatible 0G gateway (chat / STT / image / storage + a credit ledger, TEE-preferred routing). Consumers never see a wallet, gas, or the word "crypto" — the chain is invisible, the *ownership* is real.

---

## ✅ It's live on 0G mainnet — verify it yourself

The Chum Agent iNFT is **deployed and minted on 0G mainnet right now.** No testnet, no mock. A judge can confirm it in 10 seconds with a read-only call:

- **Contract:** `0xa3916cB180013170254C40a65A1fFA761667afE6` (name `Chum Agent`, symbol `CHUM`, ERC-7857 beacon proxy)
- **Chain:** 0G mainnet — chainId **16661** — RPC `https://evmrpc.0g.ai`
- **Token 0 owner:** `0x91CeF8C5b80f892861823689CC6878E349807882`
- **Mint tx:** `0x7ffdde28c5b3db7a0a257f8ccbde9ec795761513dcb39cc2a8a96d095a44bd5d`

```bash
RPC=https://evmrpc.0g.ai
C=0xa3916cB180013170254C40a65A1fFA761667afE6
# name() -> "Chum Agent"
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"'$C'","data":"0x06fdde03"},"latest"]}'
# ownerOf(0) -> 0x91CeF8…7882
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"'$C'","data":"0x6352211e0000000000000000000000000000000000000000000000000000000000000000"},"latest"]}'
```

When a user taps **"Make it yours,"** Huru mints *their* token against this same contract (`/v1/chum/agent`) — everyone becomes token 1, 2, 3…

---

## Architecture

```
iOS app (Expo/React Native)
   │  OpenAI-compatible calls
   ▼
Huru relay (Next.js, 0G gateway)  — credit ledger, TEE-preferred routing
   ├── 0G Compute  → TeeML providers  (per-call signature + attestation verify)
   ├── 0G Storage + KV → encrypted memory
   └── 0G Chain    → Chum Agent iNFT (ERC-7857, mainnet)
```

## Built with

Expo · React Native · expo-router · PixiJS-free RN animation (Reanimated) · react-native-svg · `@0glabs/0g-serving-broker` · Hardhat + `0g-agent-nft` (ERC-7857) · Next.js relay.

## What's next

- Redeploy the relay so the real per-call TEE attestation runs against live TeeML providers in production.
- Surface the attestation **quote hash** in Proof Mode.
- Wire the saved workout plan into the Coach home (build once → it shows up → start).
- Notes + Money pillars.

## Try it

1. Run the Expo app (`npx expo start`) and open on iOS.
2. **Wingman:** paste a convo → get three replies in your voice.
3. **Own Your Chum:** tap "Make it yours" → mint your agent on 0G.
4. **Proof Mode:** see the 0G receipts behind every action.

## Links

- Mainnet contract: `0xa3916cB180013170254C40a65A1fFA761667afE6` (0G explorer / `eth_call` above)
- App repo: this repository
- Relay (0G gateway): `huru`
