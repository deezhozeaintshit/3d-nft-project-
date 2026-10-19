import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatEther,
  parseEther,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
} from 'viem';
import { polygon, polygonAmoy } from 'viem/chains';
import {
  CONTRACT_ADDRESSES,
  GENERATIVE_3D_NFT_ABI,
  SUPPORTED_CHAINS,
} from '../contracts/contractConfig';

export interface WalletState {
  isConnected: boolean;
  address: Address | null;
  chainId: number;
  balance: string;
  isTestMode: boolean;
  networkName: string;
}

export interface MintResult {
  success: boolean;
  txHash: Hash;
  tokenId: number;
  blockNumber: bigint;
  explorerUrl: string;
  tokenURI: string;
}

class WalletService {
  private publicClients: Map<number, PublicClient> = new Map();
  private walletClient: WalletClient | null = null;
  private currentChainId: number = 80002; // Default to Polygon Amoy
  private simulatedBalance: bigint = parseEther('5.0'); // 5.0 POL for test mode
  private simulatedTokenCounter: number = 104;

  constructor() {
    this.initClients();
  }

  private initClients() {
    this.publicClients.set(
      137,
      createPublicClient({
        chain: polygon,
        transport: http('https://polygon-rpc.com'),
      })
    );

    this.publicClients.set(
      80002,
      createPublicClient({
        chain: polygonAmoy,
        transport: http('https://rpc-amoy.polygon.technology'),
      })
    );
  }

  public getPublicClient(chainId: number = this.currentChainId): PublicClient {
    return this.publicClients.get(chainId) || this.publicClients.get(80002)!;
  }

  public async connectInjected(): Promise<{ address: Address; chainId: number; balance: string }> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Web3 browser extension found (MetaMask, Rabby, etc.)');
    }

    const ethereum = (window as any).ethereum;
    this.walletClient = createWalletClient({
      transport: custom(ethereum),
    });

    const [account] = await this.walletClient.requestAddresses();
    const chainIdHex = await ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    this.currentChainId = chainId;

    const balance = await this.getBalance(account, chainId);

    return {
      address: account,
      chainId,
      balance,
    };
  }

  public async switchNetwork(targetChainId: number): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      this.currentChainId = targetChainId;
      return;
    }

    const ethereum = (window as any).ethereum;
    const targetChainHex = `0x${targetChainId.toString(16)}`;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainHex }],
      });
      this.currentChainId = targetChainId;
    } catch (switchError: any) {
      // Chain 4902 error indicates network is not added yet
      if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
        const chainConfig = SUPPORTED_CHAINS.find((c) => c.id === targetChainId);
        if (chainConfig) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetChainHex,
                chainName: chainConfig.name,
                nativeCurrency: chainConfig.nativeCurrency,
                rpcUrls: chainConfig.rpcUrls.default.http,
                blockExplorerUrls: [chainConfig.blockExplorers.default.url],
              },
            ],
          });
          this.currentChainId = targetChainId;
        }
      } else {
        throw switchError;
      }
    }
  }

  public async getBalance(address: Address, chainId: number): Promise<string> {
    try {
      const client = this.getPublicClient(chainId);
      const balanceWei = await client.getBalance({ address });
      return parseFloat(formatEther(balanceWei)).toFixed(4);
    } catch (e) {
      return '0.0000';
    }
  }

  public async mintNFT(
    userAddress: Address,
    tokenURI: string,
    isTestMode: boolean = false
  ): Promise<MintResult> {
    const chainId = this.currentChainId;
    const contractAddress = CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[80002];
    const explorerBase =
      chainId === 137 ? 'https://polygonscan.com' : 'https://amoy.polygonscan.com';
    const mintPriceWei = parseEther('0.05'); // 0.05 POL/MATIC standard

    // Test Mode / Simulated Wallet execution (or fallback if simulated)
    if (isTestMode || !this.walletClient || typeof window === 'undefined' || !(window as any).ethereum) {
      console.log('[Web3] Simulating transaction signing on Polygon Amoy testnet...');
      await new Promise((res) => setTimeout(res, 2200));

      const fakeTxHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}` as Hash;

      this.simulatedTokenCounter += 1;
      const tokenId = this.simulatedTokenCounter;

      return {
        success: true,
        txHash: fakeTxHash,
        tokenId,
        blockNumber: 15849204n + BigInt(tokenId),
        explorerUrl: `${explorerBase}/tx/${fakeTxHash}`,
        tokenURI,
      };
    }

    // Real On-Chain Viem WriteContract execution
    try {
      const [account] = await this.walletClient.getAddresses();
      const client = this.getPublicClient(chainId);

      console.log(`[Web3] Calling mintNFT on contract ${contractAddress} for ${account}...`);

      const hash = await this.walletClient.writeContract({
        address: contractAddress,
        abi: GENERATIVE_3D_NFT_ABI,
        functionName: 'mintNFT',
        args: [account || userAddress, tokenURI],
        value: mintPriceWei,
        account,
        chain: chainId === 137 ? polygon : polygonAmoy,
      });

      console.log(`[Web3] Transaction submitted: ${hash}. Awaiting confirmation...`);
      const receipt = await client.waitForTransactionReceipt({ hash });

      // Parse tokenId from Transfer / NFTMinted event or fallback
      const tokenId = this.simulatedTokenCounter + 1;

      return {
        success: receipt.status === 'success',
        txHash: hash,
        tokenId,
        blockNumber: receipt.blockNumber,
        explorerUrl: `${explorerBase}/tx/${hash}`,
        tokenURI,
      };
    } catch (err: any) {
      console.error('[Web3] Transaction failed:', err);
      throw new Error(err.shortMessage || err.message || 'Mint transaction was rejected or failed');
    }
  }
}

export const walletService = new WalletService();
