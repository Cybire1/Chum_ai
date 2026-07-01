import { ethers } from "hardhat";

// Deploy the ERC-7857 AgentNFT stack to 0G testnet:
//   Verifier (TEE mode) → AgentNFT impl → UpgradeableBeacon → BeaconProxy(init).
// The reference Verifier accepts 32-byte data-hash proofs as valid (mock-grade,
// fine for the hackathon). Run: npx hardhat run scripts/deploy.ts --network zgTestnet
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);
  console.log("balance :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "OG");

  const chainURL = process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const indexerURL = process.env.ZG_INDEXER_URL || "https://indexer-storage-testnet-turbo.0g.ai";

  // 1) Verifier — VerifierType.TEE = 0. attestation addr is unused on mock paths.
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy(deployer.address, 0);
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log("Verifier        :", verifierAddr);

  // 2) AgentNFT implementation
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const impl = await AgentNFT.deploy();
  await impl.waitForDeployment();
  console.log("AgentNFT impl   :", await impl.getAddress());

  // 3) Beacon (OZ UpgradeableBeacon(implementation, initialOwner))
  const Beacon = await ethers.getContractFactory("UpgradeableBeacon");
  const beacon = await Beacon.deploy(await impl.getAddress(), deployer.address);
  await beacon.waitForDeployment();
  console.log("Beacon          :", await beacon.getAddress());

  // 4) Proxy — initialize(name, symbol, verifier, chainURL, indexerURL)
  const initData = AgentNFT.interface.encodeFunctionData("initialize", [
    "Chum Agent",
    "CHUM",
    verifierAddr,
    chainURL,
    indexerURL,
  ]);
  const Proxy = await ethers.getContractFactory("BeaconProxy");
  const proxy = await Proxy.deploy(await beacon.getAddress(), initData);
  await proxy.waitForDeployment();
  const agentNFT = await proxy.getAddress();

  console.log("\n✅ AgentNFT (proxy):", agentNFT);
  console.log("→ add to inft/.env:  AGENT_NFT_ADDRESS=" + agentNFT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
