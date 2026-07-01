# Chum Agent iNFT — deployment record

**Live on 0G mainnet** (verified on-chain 2026-07-01).

| | |
|---|---|
| Contract | `0xa3916cB180013170254C40a65A1fFA761667afE6` |
| Name / Symbol | Chum Agent / CHUM |
| Chain | 0G mainnet — chainId **16661** |
| RPC | `https://evmrpc.0g.ai` |
| Standard | ERC-7857 (AI Agents NFT with Private Metadata), beacon-proxy |
| Token 0 owner | `0x91CeF8C5b80f892861823689CC6878E349807882` |
| Mint tx (token 0) | `0x7ffdde28c5b3db7a0a257f8ccbde9ec795761513dcb39cc2a8a96d095a44bd5d` |
| Minted so far | 1 (token 0). `ownerOf(1)` reverts "Token not exist". |

## On-chain verification (read-only, no keys)

```bash
RPC=https://evmrpc.0g.ai
C=0xa3916cB180013170254C40a65A1fFA761667afE6
# code exists (proxy, ~283 bytes)
curl -s $RPC -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["'$C'","latest"]}' -H 'content-type: application/json'
# ownerOf(0)  -> 0x91CeF8…7882
curl -s $RPC -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"'$C'","data":"0x6352211e0000000000000000000000000000000000000000000000000000000000000000"},"latest"]}' -H 'content-type: application/json'
```

## Relay wiring

The huru relay points at this contract via `HURU_AGENT_NFT_ADDRESS`. Endpoint `/v1/chum/agent`
mints / updates a **per-consumer** Agentic ID. In the app, the **Own Your Chum** flow
(`app/own.tsx`) triggers the mint; `app/proof.tsx` + `components/ZeroGReceipt.tsx` surface the
contract / token / owner / explorer returned by the relay (not hardcoded in the app).

> Note: the `hardhat.config.ts` / `.env.example` in this folder still default to **testnet**
> (chainId 16602) for local dev + redeploys. This mainnet deployment is the production instance.
