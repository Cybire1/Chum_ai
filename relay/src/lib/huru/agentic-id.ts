import { ethers } from "ethers";
import { runtimeConfig } from "@/lib/huru/config";
import type { HuruConsumerRecord } from "@/lib/huru/types";

const zeroGRpcByNetwork = {
	mainnet: "https://evmrpc.0g.ai",
	testnet: "https://evmrpc-testnet.0g.ai",
} as const;

export type ChumPersona = "dry" | "goofy" | "smooth" | "nerdy";

export interface ChumAgentMetadata {
	version: 1;
	kind: "chum.agentic-id";
	displayName: string;
	persona: ChumPersona;
	model: string;
	privateMemory: boolean;
	memoryRootHash: string | null;
	storageRootHash: string | null;
	dataHash: string | null;
	ownerAddress: string;
	consumerId: string;
	createdAt: string;
	updatedAt: string;
	rights: {
		ownerControlsMemory: true;
		usageCanBeAuthorized: true;
		portableAcross0GApps: true;
	};
};

export interface AgenticIdRecord {
	object: "chum.agentic_id";
	status: "owned" | "setup_required";
	token_id: string | null;
	owner_address: string | null;
	contract_address: string | null;
	metadata_root_hash: string | null;
	memory_root_hash: string | null;
	data_hash: string | null;
	tx_hash: string | null;
	updated_at: string | null;
	explorer_url: string | null;
	setup_reason?: string;
}

const AGENT_NFT_ABI = [
	"function mint(bytes[] proofs,string[] dataDescriptions,address to) payable returns (uint256)",
	"function update(uint256 tokenId,bytes[] proofs)",
	"function ownerOf(uint256 tokenId) view returns (address)",
	"function dataHashesOf(uint256 tokenId) view returns (bytes32[])",
	"function dataDescriptionsOf(uint256 tokenId) view returns (string[])",
	"function tokenURI(uint256 tokenId) view returns (string)",
	"function authorizeUsage(uint256 tokenId,address user)",
	"event Minted(uint256 indexed _tokenId,address indexed _creator,address indexed _owner,bytes32[] _dataHashes,string[] _dataDescriptions)",
	"event Updated(uint256 indexed _tokenId,bytes32[] _oldDataHashes,bytes32[] _newDataHashes)",
] as const;

function rpcUrl(): string {
	const network = runtimeConfig.zeroGNetwork === "mainnet" ? "mainnet" : "testnet";
	return zeroGRpcByNetwork[network];
}

export function isAgenticIdConfigured(): boolean {
	return ethers.isAddress(runtimeConfig.agentNftAddress);
}

export function agentSetupReason(): string | undefined {
	if (!runtimeConfig.agentNftAddress) {
		return "HURU_AGENT_NFT_ADDRESS is not configured.";
	}
	if (!ethers.isAddress(runtimeConfig.agentNftAddress)) {
		return "HURU_AGENT_NFT_ADDRESS is not a valid address.";
	}
	return undefined;
}

export function agentPointerKey(consumerId: string): string {
	return `chum:${consumerId}:agentic-id`;
}

export function memoryPointerKey(consumerId: string): string {
	return `chum:${consumerId}:memory:latest`;
}

export function buildChumAgentMetadata(input: {
	consumer: HuruConsumerRecord;
	ownerAddress: string;
	persona?: ChumPersona;
	displayName?: string;
	model?: string;
	memoryRootHash?: string | null;
	previous?: Partial<ChumAgentMetadata> | null;
}): ChumAgentMetadata {
	const now = new Date().toISOString();
	const previousCreatedAt =
		typeof input.previous?.createdAt === "string" ? input.previous.createdAt : now;
	const persona = input.persona ?? input.previous?.persona ?? "smooth";
	const displayName =
		input.displayName?.trim() ||
		input.previous?.displayName ||
		`${input.ownerAddress.slice(0, 6)}'s Chum`;

	return {
		version: 1,
		kind: "chum.agentic-id",
		displayName,
		persona,
		model: input.model ?? input.previous?.model ?? "huru/chat-1",
		privateMemory: true,
		memoryRootHash: input.memoryRootHash ?? input.previous?.memoryRootHash ?? null,
		storageRootHash: null,
		dataHash: null,
		ownerAddress: input.ownerAddress,
		consumerId: input.consumer.id,
		createdAt: previousCreatedAt,
		updatedAt: now,
		rights: {
			ownerControlsMemory: true,
			usageCanBeAuthorized: true,
			portableAcross0GApps: true,
		},
	};
}

export function computeAgentDataHash(encryptedPayload: Buffer): string {
	return ethers.keccak256(encryptedPayload);
}

export function encodeAgentPointer(record: AgenticIdRecord): string {
	return JSON.stringify(record);
}

export function decodeAgentPointer(value: string | null): AgenticIdRecord | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as Partial<AgenticIdRecord>;
		if (parsed.object !== "chum.agentic_id") return null;
		return {
			object: "chum.agentic_id",
			status: parsed.status === "owned" ? "owned" : "setup_required",
			token_id: parsed.token_id ? String(parsed.token_id) : null,
			owner_address: parsed.owner_address ? String(parsed.owner_address) : null,
			contract_address: parsed.contract_address ? String(parsed.contract_address) : null,
			metadata_root_hash: parsed.metadata_root_hash ? String(parsed.metadata_root_hash) : null,
			memory_root_hash: parsed.memory_root_hash ? String(parsed.memory_root_hash) : null,
			data_hash: parsed.data_hash ? String(parsed.data_hash) : null,
			tx_hash: parsed.tx_hash ? String(parsed.tx_hash) : null,
			updated_at: parsed.updated_at ? String(parsed.updated_at) : null,
			explorer_url: parsed.explorer_url ? String(parsed.explorer_url) : null,
			setup_reason: parsed.setup_reason ? String(parsed.setup_reason) : undefined,
		};
	} catch {
		return null;
	}
}

function explorerUrl(txHash: string | null): string | null {
	if (!txHash) return null;
	const base = runtimeConfig.agentNftChainExplorerBase.replace(/\/$/, "");
	return `${base}/tx/${txHash}`;
}

function contract(signer: ethers.Signer): ethers.Contract {
	if (!isAgenticIdConfigured()) {
		throw new Error(agentSetupReason() ?? "AgentNFT is not configured.");
	}
	return new ethers.Contract(runtimeConfig.agentNftAddress, AGENT_NFT_ABI, signer);
}

function description(rootHash: string, memoryRootHash: string | null): string {
	const payload = {
		kind: "chum.agentic-id",
		metadata: `0g://${rootHash}`,
		memory: memoryRootHash ? `0g://${memoryRootHash}` : null,
		encrypted: true,
	};
	return JSON.stringify(payload);
}

export async function mintAgenticId(input: {
	signer: ethers.Wallet;
	ownerAddress: string;
	dataHash: string;
	metadataRootHash: string;
	memoryRootHash: string | null;
}): Promise<{ tokenId: string; txHash: string }> {
	const nft = contract(input.signer);
	const proofs = [input.dataHash];
	const descriptions = [description(input.metadataRootHash, input.memoryRootHash)];
	const tokenId = (await nft.mint.staticCall(
		proofs,
		descriptions,
		input.ownerAddress,
	)) as bigint;
	const tx = await nft.mint(proofs, descriptions, input.ownerAddress);
	const receipt = await tx.wait();
	return { tokenId: tokenId.toString(), txHash: receipt?.hash ?? tx.hash };
}

export async function updateAgenticId(input: {
	signer: ethers.Wallet;
	tokenId: string;
	dataHash: string;
}): Promise<{ txHash: string }> {
	const nft = contract(input.signer);
	const tx = await nft.update(BigInt(input.tokenId), [input.dataHash]);
	const receipt = await tx.wait();
	return { txHash: receipt?.hash ?? tx.hash };
}

export async function readAgenticId(input: {
	provider?: ethers.Provider;
	tokenId: string;
}): Promise<{
	owner: string;
	dataHashes: string[];
	dataDescriptions: string[];
	tokenURI: string;
}> {
	if (!isAgenticIdConfigured()) {
		throw new Error(agentSetupReason() ?? "AgentNFT is not configured.");
	}
	const provider = input.provider ?? new ethers.JsonRpcProvider(rpcUrl());
	const nft = new ethers.Contract(runtimeConfig.agentNftAddress, AGENT_NFT_ABI, provider);
	const [owner, dataHashes, dataDescriptions, tokenURI] = await Promise.all([
		nft.ownerOf(BigInt(input.tokenId)) as Promise<string>,
		nft.dataHashesOf(BigInt(input.tokenId)) as Promise<string[]>,
		nft.dataDescriptionsOf(BigInt(input.tokenId)) as Promise<string[]>,
		nft.tokenURI(BigInt(input.tokenId)) as Promise<string>,
	]);
	return { owner, dataHashes, dataDescriptions, tokenURI };
}

export function ownedRecord(input: {
	tokenId: string;
	ownerAddress: string;
	metadataRootHash: string;
	memoryRootHash: string | null;
	dataHash: string;
	txHash: string;
}): AgenticIdRecord {
	return {
		object: "chum.agentic_id",
		status: "owned",
		token_id: input.tokenId,
		owner_address: input.ownerAddress,
		contract_address: runtimeConfig.agentNftAddress || null,
		metadata_root_hash: input.metadataRootHash,
		memory_root_hash: input.memoryRootHash,
		data_hash: input.dataHash,
		tx_hash: input.txHash,
		updated_at: new Date().toISOString(),
		explorer_url: explorerUrl(input.txHash),
	};
}

export function setupRequiredRecord(): AgenticIdRecord {
	return {
		object: "chum.agentic_id",
		status: "setup_required",
		token_id: null,
		owner_address: null,
		contract_address: runtimeConfig.agentNftAddress || null,
		metadata_root_hash: null,
		memory_root_hash: null,
		data_hash: null,
		tx_hash: null,
		updated_at: null,
		explorer_url: null,
		setup_reason: agentSetupReason(),
	};
}
