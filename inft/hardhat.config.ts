import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
dotenv.config();

const ZG_RPC_URL = process.env.ZG_RPC_URL;
const ZG_TESTNET_PRIVATE_KEY = process.env.ZG_TESTNET_PRIVATE_KEY;
const ZG_MAINNET_RPC_URL = process.env.ZG_MAINNET_RPC_URL;
const ZG_MAINNET_PRIVATE_KEY = process.env.ZG_MAINNET_PRIVATE_KEY;
const ZG_AGENT_NFT_CREATOR_PRIVATE_KEY = process.env.ZG_AGENT_NFT_CREATOR_PRIVATE_KEY;
const ZG_AGENT_NFT_ALICE_PRIVATE_KEY = process.env.ZG_AGENT_NFT_ALICE_PRIVATE_KEY;
const ZG_AGENT_NFT_BOB_PRIVATE_KEY = process.env.ZG_AGENT_NFT_BOB_PRIVATE_KEY;

// Only include keys that are actually set + valid length, so `compile` works
// without a .env and Hardhat doesn't reject empty-string keys.
const isKey = (k?: string): k is string => typeof k === "string" && k.replace(/^0x/, "").length === 64;
const hardhatAccounts = [
  ZG_AGENT_NFT_CREATOR_PRIVATE_KEY,
  ZG_AGENT_NFT_ALICE_PRIVATE_KEY,
  ZG_AGENT_NFT_BOB_PRIVATE_KEY,
]
  .filter(isKey)
  .map((privateKey) => ({ privateKey, balance: "1000000000000000000000" }));
const zgTestnetAccounts = isKey(ZG_TESTNET_PRIVATE_KEY) ? [ZG_TESTNET_PRIVATE_KEY] : [];
const zgMainnetKey = isKey(ZG_MAINNET_PRIVATE_KEY)
  ? ZG_MAINNET_PRIVATE_KEY
  : ZG_TESTNET_PRIVATE_KEY;
const zgMainnetAccounts = isKey(zgMainnetKey) ? [zgMainnetKey] : [];

const config: HardhatUserConfig = {
  paths: {
    artifacts: "build/artifacts",
    cache: "build/cache",
    sources: "contracts",
    deploy: "scripts/deploy",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      allowBlocksWithSameTimestamp: true,
      blockGasLimit: 30000000,
      ...(hardhatAccounts.length ? { accounts: hardhatAccounts } : {}),
      live: false,
      saveDeployments: true,
      tags: ["test", "local"]
    },
    zgTestnet: {
      url: ZG_RPC_URL || "https://evmrpc-testnet.0g.ai",
      accounts: zgTestnetAccounts,
      // Verified from https://evmrpc-testnet.0g.ai via eth_chainId on 2026-06-30.
      chainId: Number(process.env.ZG_CHAIN_ID) || 16602,
      live: true,
      saveDeployments: true,
      tags: ["staging"]
    },
    zgMainnet: {
      url: ZG_MAINNET_RPC_URL || ZG_RPC_URL || "https://evmrpc.0g.ai",
      accounts: zgMainnetAccounts,
      // Verified from https://evmrpc.0g.ai via eth_chainId on 2026-06-30.
      chainId: Number(process.env.ZG_MAINNET_CHAIN_ID || process.env.ZG_CHAIN_ID) || 16661,
      live: true,
      saveDeployments: true,
      tags: ["mainnet"]
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
      hardhat: 0,
      zgTestnet: 0,
      zgMainnet: 0,
    },
    creator: {
      default: 0,
      hardhat: 0,
      zgTestnet: 0,
      zgMainnet: 0,
    },
    alice: {
      default: 1,
      hardhat: 1,
    },
    bob: {
      default: 2,
      hardhat: 2,
    },
  },
  external: {
    contracts: [
      {
        artifacts: "build/artifacts",
      },
    ],
    deployments: {
      hardhat: ["deployments/hardhat"],
      zgTestnet: ["deployments/zgTestnet"],
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  }
};

export default config;
