# 0G iNFT (ERC-7857) — Reference + Chum Build Plan

> Reference doc for the team building **Chum** — a private AI wingman + fitness coach mobile app whose AI runs on the 0G decentralized compute network — for the **Zero Cup 2026** hackathon. Sourced strictly from research briefs; anything not substantiated is marked **(unverified)**.

---

## 1. TL;DR

An **iNFT (Intelligent NFT / ERC-7857)** is an NFT where the metadata *is the AI agent itself* — encrypted model weights, persona, memory, prompts — rather than a public pointer to static JSON; ownership and the encrypted "intelligence" transfer together, with on-chain proof that the data was re-encrypted to the new owner. It differs from ERC-721 by storing metadata **encrypted off-chain** (on 0G Storage, only a `dataHash` on-chain) and adding a **verifiable re-encryption transfer** gated by a **TEE or ZKP oracle**.

**Hackathon verdict:** A minimal viable demo — **mint an encrypted Chum persona → run it on 0G Compute → transfer it with a *mock/stub* oracle** — is realistically shippable in **~3–4 days** by forking the official `0g-agent-nft` repo. A *cryptographically real* TEE re-encryption oracle is **not** buildable in that window (multi-week effort); scope it as a mock and say so in the pitch.

---

## 2. What ERC-7857 / iNFT actually is

**Canonical title:** *ERC-7857: AI Agents NFT with Private Metadata*. "Intelligent NFT / iNFT / INFT" is **0G Labs' marketing name**, not the EIP's own title. Current 0G docs further rebrand the concept as **"Agentic ID"** (used interchangeably with INFT) — terminology is in flux across blog/EIP ("iNFT") vs current docs ("Agentic ID").

**Status / provenance:**
- Status renders **Final** on eips.ethereum.org. *Caveat:* it reached Final fast; the Ethereum Magicians thread was still getting editorial/naming feedback as late as Sept 2025, so treat "Final" as the current page state, not evidence of a long review cycle.
- **Created:** 2025-01-02. **Authors:** Ming Wu, Jason Zeng, Wei Wu, Michael Heinrich (all 0G Labs; Heinrich is 0G Labs CEO). The EIP text itself does not name 0G Labs.
- Discussion thread opened 2025-01-02 by user "spark." Spec PR **`ethereum/ERCs` #824** (by Wei Wu / `Wilbert957`) **merged 2025-06-16**.

**The core idea (from the Abstract, verbatim):**
> "A standard interface for NFTs specifically designed for AI agents, where the metadata represents agent capabilities and requires privacy protection. Unlike traditional NFT standards that focus on static metadata, this standard introduces mechanisms for verifiable data ownership and secure transfer."

For an AI-agent NFT the metadata "has intrinsic value and is often the primary purpose of the transfer" and "requires encrypted storage to protect intellectual property" — so a plain ERC-721 `tokenURI` → public JSON is inadequate. ERC-7857 adds a way to **hand over encrypted data so only the new owner can decrypt it, and prove on-chain that the handover was honest.**

**How it differs from ERC-721 (Backwards Compatibility, verbatim):**
> "This EIP does not inherit from existing NFT standards to maintain its focus on functional data management. However, implementations can choose to additionally implement ERC-721 if traditional NFT compatibility is desired."

- **Does NOT inherit ERC-721** in the canonical EIP — it re-declares `approve` / `ownerOf` / etc. itself. (0G's *implementation* convenience interface does `is IERC721`; see §4 caveat.)
- ERC-721 metadata is public (`tokenURI` → open JSON); ERC-7857 metadata is **encrypted and IS the asset**.
- Adds **verifiable re-encryption on transfer** (`iTransfer` + proofs). ERC-721 moves only the token, never the underlying data securely.
- Adds **`iClone`** (copy the intelligence into a new token) and **`authorizeUsage`** (use without owning) — no ERC-721 equivalents.
- Adds a pluggable **TEE/ZKP verifier oracle** — absent from ERC-721.

**Encrypted-metadata + verifiable-transfer mechanism:**
1. Agent metadata (weights, prompts, memory, traits) is stored **encrypted off-chain** (on 0G Storage); only a content hash (`dataHash`) lives on-chain.
2. On transfer, a **trusted oracle** decrypts the original with the old key, **generates a new key, re-encrypts** the metadata, and **seals the new key to the recipient's public key** (only the new owner can unseal). The chain receives a **TransferValidityProof** proving (per the EIP): knowledge of original data pre-images; ability to decrypt with `oldKey` and re-encrypt with `newKey`; secure transmission of `newKey` using the recipient's public key; integrity of the new ciphertext matching the new `dataHash`. Verification runs through `IERC7857DataVerifier.verifyTransferValidity`.

**TEE vs ZKP oracle (the load-bearing security difference):**

| | TEE-based | ZKP-based |
|---|---|---|
| Where proof is produced | Prover runs in trusted hardware (enclave) | Prover generates cryptographic proofs |
| Keys | Can handle private keys securely; key never leaves enclave | Cannot handle multi-party private keys; **re-encryption key is known to the prover** |
| Re-encryption | Direct, inside enclave | Prover holds the rekey |
| Verifier checks | TEE **attestations** | The cryptographic proof |
| Forward-secrecy caveat | None | Because the prover/previous party knows the rekey, a token transferred/cloned via ZKP **"should be re-encrypted when next update, otherwise the new update is still visible to the previous owner"** — docs recommend the **receiver rotate keys post-transfer** |
| Cost | — | Computationally heavier |

TEE is the **primary/default** path in both docs and blog; the ZK path is *specified* (in the `erc7857` doc and the EIP) but **not given a working reference implementation**.

---

## 3. 0G architecture (how an iNFT composes the stack)

0G's pitch: a traditional NFT "only owns a pointer to some metadata — not the actual intelligence," so the AI doesn't transfer with the token. An iNFT/Agentic ID **embeds the encrypted agent itself** so "when transferred, the AI moves with it."

| Layer | Role in an iNFT |
|---|---|
| **0G Chain (ownership)** | Hosts the ERC-7857 contract; manages ownership state; verifies transfer proofs on-chain. |
| **0G Storage (encrypted metadata)** | Stores the encrypted agent metadata (weights, memory, traits) and serves it via URIs — replacing static IPFS. Cited at "3x redundancy / 99.999% durability." |
| **0G Compute / TEE (inference + oracle)** | Runs secure inference so the agent executes *without exposing the model*, and provides the **transfer oracle** that does re-encryption (TEE or ZKP modes, returning proofs). |
| **0G DA** | Guarantees availability of the transfer/metadata **proofs** used during verification. |

**The re-encryption oracle (six steps, from 0G docs):**
1. Owner encrypts + commits metadata with a hash proof.
2. Trusted oracle decrypts the original inside a secure environment.
3. Oracle generates a **new key** and re-encrypts for the receiver.
4. New key is **sealed using the receiver's public key** (only their private key opens it).
5. Contract verifies all proofs: sender access, the oracle's proof that the new ciphertext derives from the original, and the **receiver's signed acknowledgment** of the metadata hash.
6. On success, ownership transfers and the receiver gets the sealed key.

**Crypto details (from the 0G ERC-7857 doc):** **AES-256-GCM** for metadata, **RSA-4096 / ECC-P384** for key sealing, per-token keys, integrity hashes, a **1-hour proof-freshness window**, and reentrancy protection.

---

## 4. Interfaces

> ⚠️ **Two different "IERC7857" interfaces circulate.** The **canonical EIP** uses proof-array signatures. The **0G docs / reference repo** show simplified, divergent signatures. They are out of sync — **trust the repo/EIP signatures, not the docs' JS snippets.** Specifics below are marked by source.

### 4a. Canonical EIP signatures (eips.ethereum.org — authoritative)

The canonical functions are `iTransfer` / `iClone` (the "i" prefix distinguishes them from ERC-721's plain transfer). There is **no `transferPublic` and no `update`** in the canonical EIP — those appear only in third-party blog summaries and should be treated as **speculative / non-canonical**.

```solidity
enum OracleType { TEE, ZKP }

interface IERC7857DataVerifier {
    function verifyTransferValidity(
        TransferValidityProof[] calldata _proofs
    ) external returns (TransferValidityProofOutput[] memory);
}

interface IERC7857 {
    event Authorization(address indexed _from, address indexed _to, uint256 indexed _tokenId);
    event AuthorizationRevoked(address indexed _from, address indexed _to, uint256 indexed _tokenId);
    event Transferred(uint256 _tokenId, address indexed _from, address indexed _to);
    event Cloned(uint256 indexed _tokenId, uint256 indexed _newTokenId, address _from, address _to);
    event PublishedSealedKey(address indexed _to, uint256 indexed _tokenId, bytes[] _sealedKeys);
    event DelegateAccess(address indexed _user, address indexed _assistant);
    // (also Approval, ApprovalForAll)

    function verifier() external view returns (IERC7857DataVerifier);

    function iTransfer(address _to, uint256 _tokenId, TransferValidityProof[] calldata _proofs) external;
    function iClone(address _to, uint256 _tokenId, TransferValidityProof[] calldata _proofs) external returns (uint256 _newTokenId);

    function authorizeUsage(uint256 _tokenId, address _user) external;
    function revokeAuthorization(uint256 _tokenId, address _user) external;

    function approve(address _to, uint256 _tokenId) external;
    function setApprovalForAll(address _operator, bool _approved) external;
    function delegateAccess(address _assistant) external;

    function ownerOf(uint256 _tokenId) external view returns (address);
    function authorizedUsersOf(uint256 _tokenId) external view returns (address[] memory);
    function getApproved(uint256 _tokenId) external view returns (address);
    function isApprovedForAll(address _owner, address _operator) external view returns (bool);
    function getDelegateAccess(address _user) external view returns (address);
}

// Metadata interface
function name() external view returns (string memory);
function symbol() external view returns (string memory);
function intelligentDataOf(uint256 _tokenId) external view returns (IntelligentData[] memory);

// Supporting structs
struct IntelligentData { string dataDescription; bytes32 dataHash; }
struct AccessProof    { bytes32 oldDataHash; bytes32 newDataHash; bytes nonce; bytes encryptedPubKey; bytes proof; }
struct OwnershipProof { OracleType oracleType; bytes32 oldDataHash; bytes32 newDataHash; bytes sealedKey; bytes encryptedPubKey; bytes nonce; bytes proof; }
struct TransferValidityProof { AccessProof accessProof; OwnershipProof ownershipProof; }
struct TransferValidityProofOutput {
    bytes32 oldDataHash; bytes32 newDataHash;
    bytes sealedKey; bytes encryptedPubKey; bytes wantedKey;
    address accessAssistant; bytes accessProofNonce; bytes ownershipProofNonce;
}
```

**Function meanings:**
- **`iTransfer`** — secure ownership transfer *with metadata re-encryption*; submits proofs that data was re-encrypted to the recipient's key.
- **`iClone`** — mints a **new** tokenId carrying the *same* metadata, re-encrypted for the recipient, **without** changing ownership of the original (licensing/forking an agent).
- **`authorizeUsage` / `revokeAuthorization`** — grant/revoke a third party the right to *use* the agent's private capabilities **without** giving them raw data or ownership (the "rent/license the agent" primitive).
- **`delegateAccess` / `getDelegateAccess`** — delegate to an "assistant" address (an executor that runs the agent on the owner's behalf).
- **`approve` / `setApprovalForAll`** — ERC-721-style approval semantics, re-declared (interface does not inherit ERC-721).

*(Naming was still being tuned in Sept 2025 — reviewer SamWilsn flagged the redundant pluralization in `intelligentDatasOf`.)*

### 4b. Actual `0g-agent-nft` `main`-branch on-chain API (reference repo — what you'll actually call)

The repo's real signatures **differ from the docs' JS snippets** (`mint(recipient, encryptedURI, metadataHash)` / `transfer(from,to,tokenId,sealedKey,proof)`). The docs are out of sync; trust the contracts.

```solidity
// MINT — AgentNFT.mint, payable, charges mintFee; data is a struct array, not a URI string
function mint(IntelligentData[] calldata iDatas, address to) public payable returns (uint256 tokenId);
//   require to != 0, iDatas.length > 0, msg.value >= mintFee;
//   _safeMint; _updateData stores dataHashes (encrypted blob lives in 0G Storage); refunds excess.
//   Also mintWithRole(...) overloads gated by MINTER_ROLE (used by AgentMarket).

// TRANSFER — real function is iTransferFrom taking an ARRAY of proofs
function iTransferFrom(address from, address to, uint256 tokenId, TransferValidityProof[] calldata proofs) public;
//   _proofCheck → verifier.verifyTransferValidity; enforces proof count == data count,
//   each proofOutput.dataHash matches stored dataHash, signer is receiver or its delegated
//   accessAssistant, sealed key targets receiver's pubkey; emits PublishedSealedKey(to, tokenId, sealedKeys).

// AUTHORIZE (usage without ownership) — ERC7857AuthorizeUpgradeable
function authorizeUsage(uint256 tokenId, address to) public;     // emits Authorization(from, to, tokenId)
function revokeAuthorization(uint256 tokenId, address user) public;
function authorizedUsersOf(uint256 tokenId) external view returns (address[] memory);

// CLONE — ERC7857CloneableUpgradeable: mirrors transfer but mints a NEW token with same metadata.

// VERIFIER — TeeVerifier.sol: thin TEE attestation check against ONE trusted oracle ECDSA key
function verifyTEESignature(bytes32 dataHash, bytes calldata signature) external view returns (bool);
//   returns dataHash.recover(signature) == teeOracleAddress;  // single hard-coded oracle address
```

**On `transferPublic` / `update`:** **neither exists** in the canonical EIP or the reference repo. Treat as blog-summary inventions or unverified implementation extensions. **(unverified)**

---

## 5. Tooling status (honest maturity read)

**The spec is mature; the implementation is reference-grade / immature.**

| Resource | URL | What it is | Maturity |
|---|---|---|---|
| **`0g-agent-nft`** (canonical reference) | https://github.com/0gfoundation/0g-agent-nft | ERC-7857 reference Solidity + Hardhat deploy/test. `0glabs/0g-agent-nft` redirects here. | ~16★, 16 forks, **1 contributor**, ~39 commits, last push ~2026-03-04, 4 open issues (mostly support noise), CC0-1.0. |
| `0g-agent-nft@eip-7857-draft` | https://github.com/0glabs/0g-agent-nft/tree/eip-7857-draft | Older/simpler branch the **docs point to**; ships a **MockOracle** for testing. README models "an ideal oracle that always provides truthful responses." | Draft; `main` is more complete (adds `AgentMarket`, beacon-proxy upgradeability, authorize/clone extensions). |
| `0g-inft-oracle-server-ts` | https://github.com/0gfoundation/0g-inft-oracle-server-ts | Intended off-chain TEE oracle server | **Empty — README only.** Placeholder. |
| `0g-eliza` | https://github.com/0gfoundation/0g-eliza | ElizaOS agent you wrap as an iNFT in tutorials | ~13★; not itself ERC-7857 code. |
| `awesome-0g` | https://github.com/0gfoundation/awesome-0g | Ecosystem index; thin on iNFT examples | — |
| ERCs PR #824 | https://github.com/ethereum/ERCs/pull/824 | The ERC-7857 spec | **MERGED 2025-06-16.** |

**Contract layout (`main`):** `ERC7857Upgradeable.sol` (core), `AgentNFT.sol` (ERC721 + AccessControl + Pausable), `TeeVerifier.sol`, `AgentMarket.sol` (marketplace, MINTER_ROLE mint + fee distribution), `extensions/{ERC7857AuthorizeUpgradeable, ERC7857CloneableUpgradeable, ERC7857IDataStorageUpgradeable}.sol`, `interfaces/IERC7857*.sol`, `verifiers/Verifier.sol`, `proxy/{BeaconProxy,UpgradeableBeacon}.sol`.

**SDK / npm reality:**
- **There is NO `@0glabs/...` iNFT/ERC-7857 SDK on npm.** Names like `@0glabs/0g-agent-nft` / `@0glabs/inft-sdk` 404. The docs' "SDK" install line pulls the **generic 0G storage SDK** (for uploading encrypted metadata), not an iNFT SDK.
- Storage SDK you actually call: **`@0glabs/0g-ts-sdk`** (`Indexer`, `ZgFile`, browser `Blob`). *Note package-name drift:* docs cite `@0gfoundation/0g-storage-ts-sdk`; the real package is `@0glabs/0g-ts-sdk`. npm: https://www.npmjs.com/package/@0gfoundation/0g-ts-sdk **(unverified which name resolves — both forms appear across sources; verify on npm before pinning)**.
- Compute (to run the agent): **`@0glabs/0g-serving-broker`** — call `processResponse()` after each inference call.
- Community/other: `@0gfoundation/0g-compute-ts-sdk`, community `@0g-agentkit/identity@0.1.0`.

**Starter kits:**
- Storage: https://github.com/0gfoundation/0g-storage-ts-starter-kit
- Compute: https://github.com/0gfoundation/0g-compute-ts-starter-kit

**Install (no iNFT npm package — clone + Hardhat):**
```bash
git clone https://github.com/0gfoundation/0g-agent-nft.git
pnpm install              # uses pnpm-lock.yaml
npm run compile           # hardhat compile
npm run deploy zgTestnet  # hardhat deploy --network zgTestnet
```
Deps: `@openzeppelin/contracts@5.0.2`, `@openzeppelin/contracts-upgradeable@5.0.2`, `ethers@6`, `hardhat@2.22`, `hardhat-deploy`, `typechain`.

**Networks / addresses:**
- **No official deployed contract addresses are published anywhere** — docs call these "example contracts for testnet demonstration only"; no `deployments/` dir committed. You deploy your own instances.
- Configured via `hardhat.config.ts`: `zgTestnet` chainId **16602**, `zgMainnet` chainId **16661**; default RPC `https://evmrpc-testnet.0g.ai`, storage indexer `https://indexer-storage-testnet-turbo.0g.ai`. **(unverified / conflicting)** Other briefs cite the Galileo testnet as chainId **16601** — confirm the live chainId against the repo's `hardhat.config.ts` before deploying.

**Honest bottom line:** The standard is real and merged. The tooling is **example/early-stage**: one low-maturity reference repo, **no turnkey SDK**, **no deployed canonical contracts**, the off-chain oracle server is an **empty placeholder**, the **ZKP verifier is unimplemented**, on-chain trust is **one centralized TEE key**, and the docs' code is out of sync with the contracts. Anyone shipping to production must implement and run their own TEE oracle and get an audit ("audits coming soon"; stay on testnet). This aligns with the project-memory caveat that 0G iNFT tooling is exploratory and that `@0glabs/0g-serving-broker` (compute) is unrelated to ERC-7857.

---

## 6. Mint → transfer → authorize flow

**Off-chain client flow (from the integration guide — explicitly demo code: mock oracle, "audit before mainnet"):**

1. **Encrypt** the agent metadata client-side — **AES-256-GCM**; hash the plaintext (`keccak256`) for the on-chain integrity hash.
2. **Upload** the ciphertext to **0G Storage** via `@0glabs/0g-ts-sdk`; get a URI. *Verify the blob is retrievable before minting.*
3. **Mint** — `AgentNFT.mint(IntelligentData[] iDatas, address to)` (payable, `mintFee`), storing `dataHash`(es) on-chain. (Docs' simplified `contract.mint(recipient, encryptedURI, metadataHash)` does **not** match the actual contract — trust the repo.)
4. **Transfer** — call the oracle (`oracle.processTransfer(...)` in the demo) to decrypt → generate new key → re-encrypt → seal to recipient pubkey, returning `newDataHash` + `sealedKey` + proof. Submit on-chain via **`iTransferFrom(from, to, tokenId, TransferValidityProof[] proofs)`**. `_proofCheck` validates against the verifier; contract emits `PublishedSealedKey(to, tokenId, sealedKeys)`. New owner reads `sealedKey` and decrypts with their private key.
5. **Authorize usage (no ownership change)** — owner calls `authorizeUsage(tokenId, to)`; revoke with `revokeAuthorization(tokenId, user)`; list with `authorizedUsersOf(tokenId)`. This backs the AI-as-a-Service / leasing model.
6. **Clone** — `clone()` (in `ERC7857CloneableUpgradeable`) mints a new token with the same re-secured metadata instead of moving ownership.

**On-chain verifier (current state):** `TeeVerifier.verifyTEESignature` simply recovers the signer and checks it equals one hard-coded `teeOracleAddress`. **The ZKP oracle path described in the README is not implemented in code.** Trust is centralized on one off-chain TEE oracle key.

---

## 7. How Chum would use it

**What IS the agent (the iNFT's encrypted metadata):** a user's personalized **Chum** — its **persona/character** (rizz style, coaching voice, tone), **voice profile**, and **memory/history** (past conversations, the user's fitness profile, goals, preferences), plus the system prompt and any traits. This persona bundle (e.g. a `character.json`) is what gets encrypted (AES-256-GCM, keccak256 hash) and uploaded to **0G Storage**; only its `dataHash` lives on 0G Chain. At runtime, the app fetches + decrypts the persona and feeds it as the system prompt to a **0G Compute** chat call (`@0glabs/0g-serving-broker`, `processResponse()` per call) — proving the NFT *is a runnable agent*, not a static collectible. (This reuses the same 0G-Compute pattern already used by the huru/Recordly stack per project memory.)

**Where each piece lives:**
- Persona/voice/memory ciphertext → **0G Storage**.
- Ownership + `dataHash` + transfer proofs → **0G Chain** (ERC-7857 contract).
- Inference + (eventually) the re-encryption oracle → **0G Compute / TEE**.

**Mint/transfer/authorize UX:**
- **Mint:** "Create my Chum" → encrypt persona → upload → `mint`. Owner = the user's wallet.
- **Transfer:** "Gift/sell my Chum" → oracle re-encrypts to recipient → `iTransferFrom` → only the recipient can now decrypt + run it.
- **Authorize:** "Let a friend use my coach for a week" → `authorizeUsage(tokenId, friend)` → friend runs the agent without owning it; `revokeAuthorization` ends it.

**Three concrete product framings:**
1. **Own-your-wingman (privacy moat).** Your Chum's persona and intimate history are **encrypted, on-chain-owned, and only decryptable by you** — not held in a vendor's plaintext DB. Strong fit with Chum's privacy positioning; the iNFT is the user's sovereign, portable AI identity.
2. **Tradeable personas / coaches (marketplace).** Mint distinct Chum personas ("Hype-Man wingman," "Drill-sergeant coach," "Zen recovery coach") as iNFTs and **transfer or clone** them between users. `iClone` lets a popular coach be licensed/forked; the reference `AgentMarket.sol` already models mint-via-`MINTER_ROLE` + fee distribution (creator royalties on usage/transfers per 0G's marketing).
3. **Gated premium agents (lease, don't sell).** Keep ownership; grant time-boxed access to a premium Chum via **`authorizeUsage`** — the AI-as-a-Service / leasing primitive — so users rent an elite coach for a cut without ever exposing its weights/persona or transferring ownership.

---

## 8. Hackathon feasibility verdict (Zero Cup 2026)

**Recommended shippable scope ("Mint → Run → Transfer," oracle stubbed):**

| Component | Status for a few-days demo |
|---|---|
| Deploy `AgentNFT` + `MockOracle`/`Verifier` to 0G testnet, mint a token | ✅ Shippable — copy from repo |
| Client-side encrypt Chum persona (AES-256-GCM, keccak256 hash) | ✅ Shippable — standard `node:crypto` |
| Upload ciphertext to 0G Storage (`@0glabs/0g-ts-sdk`), store hash/URI on-chain | ✅ Shippable — well-trodden SDK path |
| Run the decrypted persona through 0G Compute (chat) | ✅ Shippable — `0g-serving-broker`, `processResponse()` per call; reuse existing huru/0G patterns |
| `iTransferFrom` with **MockOracle** (proof check stubbed/true) | ⚠️ Doable in ~1 day — repo ships a mock |
| **Real TEE re-encryption oracle** (enclave decrypts/rekeys/seals + on-chain attestation) | ❌ Aspirational — multi-week, out of scope |
| ZKP oracle path | ❌ Aspirational + unimplemented in the repo |
| Audited / mainnet | ❌ "Audits coming soon" — stay on testnet |

**Recommended demo (full lifecycle, nothing faked beyond the disclosed mock):**
1. Fork `0glabs/0g-agent-nft@eip-7857-draft`; deploy `AgentNFT` + `MockOracle`/`Verifier` to testnet.
2. Author `character.json` (Chum's rizz/coach persona). Encrypt AES-256-GCM client-side; `keccak256` the plaintext for the on-chain hash.
3. Upload ciphertext to 0G Storage; `mint(...)`.
4. **Show it runs:** fetch + decrypt persona → feed as system prompt to a 0G Compute chat call. This is the differentiator judges care about (the NFT *is* a runnable agent).
5. **Transfer Alice→Bob** via the mock oracle: re-seal the data key to Bob, `iTransferFrom(...)`, then show Bob — and only Bob — can decrypt + run the agent.
6. Frontend: mint button, "chat with my Chum," transfer button, contract address + chain/storage explorer links, <3-min demo video.

**The hard parts (where days disappear):**
1. **The re-encryption oracle is the whole point and the whole problem** — a real TEE oracle (provision SGX/TDX/Nitro, wire quote verification on-chain, match 0G's attestation format) is multi-week. **Use MockOracle and say so.**
2. **TEE attestation verification on-chain** — getting `Verifier` to accept a real quote vs the stub is fiddly and under-documented.
3. **Client-side key management** — sealing the AES-GCM data key to the recipient's wallet pubkey (ECIES-style) is easy to ship subtly broken (IV reuse, wrong curve). **Test the Alice→Bob decrypt round-trip first, before UI.**
4. **0G Storage upload reliability** — indexer/testnet flakiness, chunking; build retries + a "verify URI resolves" step before minting.
5. **Draft-repo friction** — chainID drift (16601 vs 16602), ts-node ESM loader (`node --loader ts-node/esm`), package-name drift, no audit. Pin versions; budget debugging time.

**Top risks (ranked):** (1) treating the oracle as "real" — it isn't, in this timeline; (2) testnet/SDK instability — get testnet 0G early, verify retrieval before minting, add retries; (3) draft-repo friction; (4) transfer-decryption correctness; (5) scope creep into `clone()`/`authorizeUsage()` — skip for the core demo, mint+run+transfer is enough.

**Effort estimate (one competent full-stack/Solidity dev):**
- Mint + encrypt + storage + on-chain: **0.5–1.5 days**
- 0G Compute "run the agent": **0.5–1 day** (reuse existing 0G-Compute patterns)
- Transfer with mock oracle + Bob-decrypts: **1–1.5 days**
- Frontend + polish + demo video: **1 day**
- **Total MVP: ~3–4 days**, plus ~0.5-day buffer for testnet/SDK flakiness.
- Real TEE oracle: **+1–3 weeks — out of scope.**

> *Hackathon-track note (from EthGlobal 0G context, a different event — treat as indicative, not Zero Cup 2026 rules):* judges typically want a public repo + README, deployed **contract addresses**, a live link, and a <3-min demo video, and reward "novel uses of iNFTs for ownership, composability, monetization." **Confirm Zero Cup 2026's actual submission rules separately — not substantiated by these briefs. (unverified)**

---

## 9. Sources

**Canonical spec & discussion**
- ERC-7857 EIP (status Final, created 2025-01-02, authors, interfaces, structs, Abstract, TEE/ZKP, ERC-721 compat): https://eips.ethereum.org/EIPS/eip-7857
- Ethereum Magicians discussion (opened 2025-01-02 by "spark"; ERC-7662 comparison; naming feedback): https://ethereum-magicians.org/t/erc-7857-an-nft-standard-for-ai-agents-with-private-metadata/22391
- ERCs PR #824 (Wei Wu / `Wilbert957`; merged 2025-06-16): https://github.com/ethereum/ERCs/pull/824

**0G official docs & blog**
- Concept page (Agentic ID): https://docs.0g.ai/concepts/inft
- iNFT overview: https://docs.0g.ai/developer-hub/building-on-0g/inft/inft-overview
- ERC-7857 standard doc (simplified IERC7857 variant, TEE/ZKP narrative, crypto details): https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857
- Integration guide (mint/transfer/authorize walkthrough, `IOracle.verifyProof`, AgenticID/TransferManager): https://docs.0g.ai/developer-hub/building-on-0g/inft/integration
- 0G blog "Introducing ERC-7857" (published 2025-01-17): https://0g.ai/blog/0g-introducing-erc-7857
- Stale path (now 404s): https://docs.0g.ai/build-with-0g/inft

**Reference implementation & tooling**
- `0g-agent-nft` (canonical reference repo): https://github.com/0gfoundation/0g-agent-nft
- `0g-agent-nft@eip-7857-draft` (branch docs point to; ships MockOracle): https://github.com/0glabs/0g-agent-nft/tree/eip-7857-draft
- `0g-inft-oracle-server-ts` (empty placeholder): https://github.com/0gfoundation/0g-inft-oracle-server-ts
- `0g-eliza`: https://github.com/0gfoundation/0g-eliza
- `awesome-0g`: https://github.com/0gfoundation/awesome-0g
- Storage SDK (npm): https://www.npmjs.com/package/@0gfoundation/0g-ts-sdk
- Storage SDK docs: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk
- Storage starter kit: https://github.com/0gfoundation/0g-storage-ts-starter-kit
- Compute starter kit: https://github.com/0gfoundation/0g-compute-ts-starter-kit

**Tutorials / explainers (secondary; framing only)**
- Medium step-by-step (clone repo + `0g-eliza`, deploy, mint from `character.json`): https://medium.com/@intriiga/deploy-your-inft-ai-agent-to-0g-chain-on-the-new-erc-7857-standard-and-upload-it-to-0g-storage-and-176a482f12d2
- thirdweb explainer: https://blog.thirdweb.com/erc-7857-intelligent-nfts-for-ai-agents/
- Mitosis University: https://university.mitosis.org/erc-7857-intelligent-nfts-for-ai-agents/
- NFT News Today guide: https://nftnewstoday.com/2025/05/27/erc-7857-explained-your-guide-to-creating-owning-and-evolving-intelligent-nfts
- NFT News Today (Jan 2025 piece): https://nftnewstoday.com/2025/01/28/transforming-ai-agents-intelligent-nfts-0g-labs-erc-7857-standard

**Hackathon context (indicative only — not Zero Cup 2026 rules; unverified for this event)**
- EthGlobal 0G prize track: https://ethglobal.com/events/openagents/prizes
- Shipped iNFT example ("ACL"): https://ethglobal.com/showcase/acl-6hwos