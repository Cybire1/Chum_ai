# 🌊 Wave Milestone — "One wingman → your whole life, now provable on 0G"

> Paste-ready for the DoraHacks **Milestone** box. Judged on **tangible progress vs. the previous submission**, so every line below is framed as a delta (was → now) and mapped to the scoring rubric.

**Since our last wave** we shipped a second pillar, removed the wallet entirely (pay in fiat), turned "verified" into a real cryptographic check, and kept our agent-ownership **iNFT live on 0G mainnet**. Every claim below is verifiable — in the app, or on-chain with the calls at the bottom.

---

### ✅ Now working — *was roadmap last wave* · Demo & Functionality (30%)
- **Coach pillar shipped** — AI workout generator → a **saved, reusable plan** → a **live guided session player** with per-set countdown timers and progress rings. Runs on device, not a mockup.
- **Wingman hardened** — screenshot/paste → 3 in-voice replies, plus Decode & Openers, an editable transcript, and a biometric app-lock.
- **Own Your Chum** works end-to-end — tap → mint your agent iNFT → see the receipts in Proof Mode.

### ⚙️ Deeper 0G integration — *the 30% that decides this* · 0G Tech Stack (30%)
- **Real per-call TEE attestation** — every response runs the 0G broker `processResponse` (response-signature verify) + a cached `verifyService` enclave attestation. Our "verified" badge is now a cryptographic result, **not a constant**.
- **iNFT live on 0G mainnet** — **ERC-7857** (AI-agent NFT with *encrypted* metadata). Contract `0xa3916cB180013170254C40a65A1fFA761667afE6` (chain **16661**), token 0 minted. No testnet, no mock.
- **Encrypted memory on 0G Storage + KV** — envelope-encrypted, KV pointer to the latest version. Model-agnostic routing across live 0G TEE models (**DeepSeek-v3, GLM-5, qwen3-VL** vision), auto-selecting the healthiest provider.

### 💸 Real use case & scale — *no wallet, pay in fiat* · Use Case & Scalability (10%)
- Users pay in **Naira or USD** (Paystack) from **₦100**. Huru holds a funded 0G wallet + **per-consumer HD wallets** and settles each call as an on-chain micropayment — **zero crypto UX**. This is the single biggest unlock for real consumer adoption of 0G.

### 🎨 Product & UX · Creativity & UX (15%)
- Full polish pass: chip-based onboarding that captures your name, a designed motion system (press/haptic/entrance animations), animated readiness + timer rings, and one consistent visual language. Reads like a launched App-Store app.

### 🗺️ What's next · Vision & Roadmap (10%)
- **Notes** (private journaling even we can't read) and **Money** (advice on your real salary/spend/debt) — same enclave, same on-chain metering. One private AI for your whole life.

---

## 🔗 On-chain proof — run these, don't trust us

**Chum Agent iNFT is deployed + minted on 0G mainnet.** These are read-only calls against 0G's public RPC — nothing we control.

```bash
RPC=https://evmrpc.0g.ai
C=0xa3916cB180013170254C40a65A1fFA761667afE6

# 1) name()  ->  "Chum Agent"
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"'$C'","data":"0x06fdde03"},"latest"]}'

# 2) symbol()  ->  "CHUM"
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"'$C'","data":"0x95d89b41"},"latest"]}'

# 3) ownerOf(0)  ->  0x…91CeF8C5b80f892861823689CC6878E349807882
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"'$C'","data":"0x6352211e0000000000000000000000000000000000000000000000000000000000000000"},"latest"]}'

# 4) chainId  ->  0x4115  (16661, 0G mainnet)
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
```

- **Contract:** `0xa3916cB180013170254C40a65A1fFA761667afE6` — `name()` = "Chum Agent", `symbol()` = "CHUM", ERC-7857 beacon proxy
- **Chain:** 0G mainnet, chainId **16661**, RPC `https://evmrpc.0g.ai`
- **Token 0 owner:** `0x91CeF8C5b80f892861823689CC6878E349807882`
- **Mint tx:** `0x7ffdde28c5b3db7a0a257f8ccbde9ec795761513dcb39cc2a8a96d095a44bd5d`

### What is / isn't on-chain (so this holds up under scrutiny)
- ✅ **On-chain & publicly verifiable:** the iNFT contract and `ownerOf(0)` above, the mint transaction, and per-call fee **settlement** through the 0G ledger contract.
- 🔒 **Cryptographic but verified off-chain (not a tx):** the **TEE attestation** — the 0G broker checks each response's signature (`processResponse`) and the provider's enclave attestation (`verifyService`). It's a real enclave proof, but it is *not* an on-chain transaction. We frame it as "TEE-verified," never as "on-chain verified."
- 🧭 **By design in the ERC-7857 standard (not a live demo we ran):** secure **re-encryption of an agent's private metadata on transfer**. We built on the standard that provides this; we have not staged a live transfer.

---

## Short form (for a tight Milestone field)

> **This wave:** shipped the **Coach** pillar (multi-pillar, same 0G enclave), added **no-wallet fiat payments** (Naira/USD via Paystack + per-consumer HD wallets — zero crypto UX), turned on **real per-call TEE attestation** (`processResponse` + `verifyService`), and kept the **Chum Agent iNFT live on 0G mainnet** — verify `ownerOf(0)` on `0xa3916cB180013170254C40a65A1fFA761667afE6` (chain 16661) → returns `0x91CeF8…7882`. One private AI for your whole life, provable on 0G.
