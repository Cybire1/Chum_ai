# Chum iNFT (ERC-7857) workspace

Vendored from the official **`0gfoundation/0g-agent-nft`** reference (`eip-7857-draft`
branch, CC0) + Chum-specific scripts. This makes a user's **personalized Chum
wingman** an **ownable, on-chain agent** (ERC-7857 "AI Agents NFT with Private
Metadata") on **0G testnet**.

See `../docs/0G_INFT.md` for the full standard + architecture reference.

## What's here

| File | What it is |
|---|---|
| `contracts/` | The reference ERC-7857 stack: `AgentNFT.sol`, `Verifier.sol`, interfaces, OZ beacon proxy. |
| `lib/chumAgent.ts` | **The Chum agent** — persona / voice / system-prompt / 0G model + its `dataHash`. This is the "intelligence" the token carries. |
| `scripts/deploy.ts` | Deploy Verifier → AgentNFT (beacon proxy) to 0G testnet. |
| `scripts/mintChum.ts` | Mint a Chum-wingman iNFT for your wallet. |

## Honest scope (read this)

- **Mint works for real.** The reference `Verifier.verifyPreimage` accepts a 32-byte
  `dataHash` as a valid proof, so minting a (public-data) Chum agent needs **no oracle**.
- **The transfer oracle is a mock.** A cryptographically real TEE re-encryption oracle
  is a multi-week build — out of scope for a hackathon. `transfer()` runs against the
  permissive reference verifier; say so in the pitch.
- **Testnet only.** No audits. Don't put real value or your mainnet key here.
- **Private agents** (encrypt the JSON → upload ciphertext to 0G Storage via
  `@0glabs/0g-ts-sdk` → hash the ciphertext → `updateURLS`) are stubbed as TODOs in
  `mintChum.ts` — the public-data path is enough to demo ownership.

## Run

```bash
cd inft
npm install
cp .env.example .env          # fill in a FUNDED 0G testnet key (see faucet below)
# ⚠️ verify ZG_CHAIN_ID against current 0G docs — the draft repo shipped a stale 80087
npx hardhat compile
npx hardhat run scripts/deploy.ts   --network zgTestnet   # → prints AGENT_NFT_ADDRESS
# paste AGENT_NFT_ADDRESS into .env, then:
npx hardhat run scripts/mintChum.ts --network zgTestnet   # → mints your Chum iNFT
```

**You provide:** a 0G **testnet** wallet funded from the 0G faucet, and a confirmed
testnet `chainId` (the draft config's `80087` is stale; 0G Galileo testnet was `16601`).

## How Chum uses it (product)

- **Own your wingman** — your Chum (your voice/persona, eventually your memory) is an
  agent you own, encrypted, portable across apps.
- **Tradeable personas/coaches** — mint premium wingman/coach packs as iNFTs.
- **Gated premium agents** — `authorizeUsage(tokenId, addr)` lets someone *use* an agent
  without owning it.

All of it runs the agent on **0G Compute** and stores it on **0G Storage** — same
"your data is yours, sealed on 0G" thesis as the app.
