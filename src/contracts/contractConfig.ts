import { parseAbi } from 'viem';

export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  // Polygon Mainnet (Chain ID 137)
  137: '0x71C0aA58B9361719b4F298F1c618c72834bB194D',
  // Polygon Amoy Testnet (Chain ID 80002)
  80002: '0x43De684bB6165F17eAb637A1792B215E0F7d0D54',
};

export const DEFAULT_CHAIN_ID = 80002; // Default to Polygon Amoy Testnet for risk-free testing

export const GENERATIVE_3D_NFT_ABI = parseAbi([
  'constructor(address initialOwner, uint256 initialMintPrice, uint256 collectionMaxSupply)',
  'event NFTMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI)',
  'event MintPriceUpdated(uint256 oldPrice, uint256 newPrice)',
  'event FundsWithdrawn(address indexed owner, uint256 amount)',
  'function mintNFT(address recipient, string tokenURI) external payable returns (uint256)',
  'function mintPrice() external view returns (uint256)',
  'function maxSupply() external view returns (uint256)',
  'function totalMinted() external view returns (uint256)',
  'function setMintPrice(uint256 newPrice) external',
  'function withdraw() external',
  'function owner() external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
] as const);

export const SUPPORTED_CHAINS = [
  {
    id: 137,
    name: 'Polygon Mainnet',
    nativeCurrency: { name: 'MATIC', symbol: 'POL', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://polygon-rpc.com'] },
    },
    blockExplorers: {
      default: { name: 'PolygonScan', url: 'https://polygonscan.com' },
    },
    contractAddress: CONTRACT_ADDRESSES[137],
    isTestnet: false,
  },
  {
    id: 80002,
    name: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'POL', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc-amoy.polygon.technology'] },
    },
    blockExplorers: {
      default: { name: 'PolygonScan Amoy', url: 'https://amoy.polygonscan.com' },
    },
    contractAddress: CONTRACT_ADDRESSES[80002],
    isTestnet: true,
  },
] as const;
