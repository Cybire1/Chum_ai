import { ethers } from "hardhat";

async function main() {
    // 1. Deploy new implementation for AgentNFT
    console.log("Deploying new AgentNFT implementation...");
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const newAgentNFTImplementation = await AgentNFT.deploy();
    await newAgentNFTImplementation.waitForDeployment();
    const agentNFTImplementationAddress = await newAgentNFTImplementation.getAddress();
    console.log("New AgentNFT implementation deployed to:", agentNFTImplementationAddress);

    // 2. Deploy new implementation for Verifier
    console.log("Deploying new Verifier implementation...");
    const Verifier = await ethers.getContractFactory("Verifier");
    const newVerifierImplementation = await Verifier.deploy("0x0000000000000000000000000000000000000000", 0);
    await newVerifierImplementation.waitForDeployment();
    const verifierAddress = await newVerifierImplementation.getAddress();
    console.log("New Verifier implementation deployed to:", verifierAddress);

    // 3. Get Beacon instance for AgentNFT
    const beaconAddress = "0x8c2ca9A0d52dD622668165Dc9F19d8C0Af4c5429"; // Beacon address
    console.log("Using Beacon at address:", beaconAddress);
    const beacon = await ethers.getContractAt("UpgradeableBeacon", beaconAddress);

    // 4. Upgrade the AgentNFT Beacon to the new implementation
    console.log("Upgrading AgentNFT Beacon...");
    const tx = await beacon.upgradeTo(agentNFTImplementationAddress);
    await tx.wait();
    console.log("AgentNFT Beacon upgrade complete");

    // 5. Get the proxy contract that uses the beacon
    const beaconProxyAddress = "0x5b8ef7960187b1acfc532c6eC2C058383FDe3143"; // Proxy address
    console.log("Using Beacon Proxy at address:", beaconProxyAddress);
    const proxyContract = await ethers.getContractAt("AgentNFT", beaconProxyAddress);

    // 6. Update the Verifier in the proxy contract
    console.log("Updating Verifier address in proxy contract...");
    const updateTx = await proxyContract.updateVerifier(verifierAddress);
    await updateTx.wait();
    console.log("Verifier address updated");

    // 7. Verify the upgrades
    const currentAgentNFTImpl = await beacon.implementation();
    
    // Get the current verifier address from the proxy contract
    const currentVerifierAddress = await proxyContract.verifier();
    
    console.log("Current AgentNFT implementation:", currentAgentNFTImpl);
    console.log("Current Verifier address:", currentVerifierAddress);
    
    // Check if upgrade was successful
    const isAgentNFTUpgraded = currentAgentNFTImpl === agentNFTImplementationAddress;
    const isVerifierUpdated = currentVerifierAddress === verifierAddress;
    
    console.log("AgentNFT implementation upgrade successful:", isAgentNFTUpgraded);
    console.log("Verifier update successful:", isVerifierUpdated);
    console.log("Overall upgrade successful:", isAgentNFTUpgraded && isVerifierUpdated);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });