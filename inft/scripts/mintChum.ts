import { ethers } from "hardhat";

import { agentDataHash, buildChumAgent, type Persona } from "../lib/chumAgent";

// Mint a Chum-wingman iNFT (ERC-7857) for the connected wallet.
// Run: npx hardhat run scripts/mintChum.ts --network zgTestnet
async function main() {
  const addr = process.env.AGENT_NFT_ADDRESS;
  if (!addr) throw new Error("Set AGENT_NFT_ADDRESS in inft/.env (run deploy.ts first).");

  const [owner] = await ethers.getSigners();
  const persona = (process.env.CHUM_PERSONA as Persona) || "smooth";

  const agent = buildChumAgent({
    persona,
    displayName: `${owner.address.slice(0, 6)}'s Chum`,
    createdAt: Math.floor(Date.now() / 1000),
  });
  const dataHash = agentDataHash(agent);
  console.log(`Chum agent → persona=${agent.persona}  model=${agent.model}`);
  console.log("dataHash     :", dataHash);

  // For PRIVATE agents: encrypt `agent`, upload the ciphertext to 0G Storage via
  // @0glabs/0g-ts-sdk, hash the CIPHERTEXT, then updateURLS(tokenId, [uri]).
  // Public-data demo: the mint() proof is the 32-byte dataHash itself.
  const nft = await ethers.getContractAt("AgentNFT", addr);
  const proofs = [dataHash]; // bytes32 data hash as the preimage proof
  const descriptions = [`Chum wingman · persona=${agent.persona}`];

  // mint() returns the tokenId — read it via staticCall, then send the tx.
  const tokenId: bigint = await nft.mint.staticCall(proofs, descriptions, owner.address);
  const tx = await nft.mint(proofs, descriptions, owner.address);
  const rc = await tx.wait();

  console.log("\n✅ minted Chum iNFT");
  console.log("tokenId :", tokenId.toString());
  console.log("owner   :", owner.address);
  console.log("tx      :", rc?.hash);
  console.log("hashes  :", await nft.dataHashesOf(tokenId));
  console.log("descr   :", await nft.dataDescriptionsOf(tokenId));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
