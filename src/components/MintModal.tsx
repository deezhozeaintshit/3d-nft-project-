import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Loader2,
  Settings,
} from 'lucide-react';
import { NFTMintingInterface } from './NFTMintingInterface';

interface MintModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftName: string;
  setNftName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  previewImage: string;
  stylePreset: string;
  prompt: string;
  polyCount: number;
  audioTrack: any;
  rarity?: string;
  onConfirmMint: () => Promise<void>;
  mintStep: 'idle' | 'rendering' | 'pinning' | 'minting' | 'success' | 'error';
  mintResult: any;
  errorMessage: string | null;
  chainId: number;
}

export const MintModal: React.FC<MintModalProps> = ({
  isOpen,
  onClose,
  nftName,
  setNftName,
  description,
  setDescription,
  previewImage,
  stylePreset,
  prompt,
  polyCount,
  audioTrack,
  rarity = 'Mythic',
  onConfirmMint,
  mintStep,
  mintResult,
  errorMessage,
  chainId,
}) => {
  const [modalTab, setModalTab] = useState<'quick' | 'wagmi_terminal'>('quick');

  if (!isOpen) return null;

  const isWorking = mintStep === 'rendering' || mintStep === 'pinning' || mintStep === 'minting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl text-neutral-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ERC-721 3D NFT Minting Studio</h2>
              <p className="text-xs text-neutral-400">
                Polygon Network • IPFS Decentralized Storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isWorking}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Quick Studio Mint and Wagmi Terminal */}
        <div className="flex items-center space-x-2 pt-3 pb-1 border-b border-neutral-900">
          <button
            onClick={() => setModalTab('quick')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              modalTab === 'quick'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Studio IPFS Pipeline
          </button>
          <button
            onClick={() => setModalTab('wagmi_terminal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              modalTab === 'wagmi_terminal'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Wagmi Hooks Terminal (Quantity & Custom Recipient)
          </button>
        </div>

        {/* Tab 2: Wagmi Advanced Minting Interface Component */}
        {modalTab === 'wagmi_terminal' ? (
          <div className="pt-4">
            <NFTMintingInterface
              defaultTokenURI={`ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xednzrqoj3dwfe8528956/${stylePreset}_metadata.json`}
              defaultNFTName={nftName}
              previewImageUrl={previewImage}
              onMintSuccess={(tokenId, txHash, uri) => {
                console.log('[Wagmi Mint Complete]:', tokenId, txHash, uri);
              }}
            />
          </div>
        ) : (
          /* Tab 1: Studio Pipeline */
          <>
            {mintStep === 'success' ? (
              // Success State
              <div className="py-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">NFT Minted Successfully!</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Your 3D digital artifact has been minted on Polygon and verified on IPFS.
                  </p>
                </div>

                {/* Token & TX Details */}
                <div className="bg-neutral-900/80 rounded-xl p-4 border border-neutral-800 text-left space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-sans">Token ID</span>
                    <span className="text-purple-300 font-bold">#{mintResult?.tokenId || '105'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-sans">Transaction Hash</span>
                    <span className="text-neutral-300 truncate max-w-[240px]">
                      {mintResult?.txHash}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-sans">IPFS Metadata URI</span>
                    <span className="text-purple-400 truncate max-w-[240px]">
                      {mintResult?.tokenURI}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-sans">Block Height</span>
                    <span className="text-neutral-300">
                      {mintResult?.blockNumber?.toString() || '15,849,205'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center space-x-3 pt-2">
                  {mintResult?.explorerUrl && (
                    <a
                      href={mintResult.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-white transition-colors"
                    >
                      <span>View on PolygonScan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              // Form and Progress
              <div className="py-4 space-y-4">
                {/* NFT Card Preview and Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt="NFT Snapshot"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                          <Cpu className="w-8 h-8 mb-1" />
                          <span>3D Preview</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-purple-300 border border-purple-500/30">
                        3D .GLB Embedded
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">
                        NFT Artifact Name
                      </label>
                      <input
                        type="text"
                        value={nftName}
                        onChange={(e) => setNftName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-800 focus:border-purple-500 focus:outline-none text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-800 focus:border-purple-500 focus:outline-none text-neutral-300 resize-none"
                      />
                    </div>

                    {/* Metadata Traits pill badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold flex items-center space-x-1 ${
                          rarity === 'Mythic'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : rarity === 'Legendary'
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        <Sparkles className="w-2.5 h-2.5 mr-1 inline" />
                        <span>Rarity: {rarity}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                        Style: {stylePreset}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-purple-400">
                        Polys: {polyCount.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-emerald-400">
                        Soundtrack: {audioTrack?.bpm || 124} BPM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mint Progress Pipeline Steps */}
                {isWorking && (
                  <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-purple-500/30 space-y-2">
                    <div className="flex items-center space-x-2 text-xs text-purple-300 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span>
                        {mintStep === 'rendering' && 'Step 1/3: Rendering 3D snapshot & packaging GLB model...'}
                        {mintStep === 'pinning' && 'Step 2/3: Pinning ERC-721 metadata to Pinata IPFS Gateway...'}
                        {mintStep === 'minting' && 'Step 3/3: Submitting Polygon on-chain mint transaction (0.05 POL)...'}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width:
                            mintStep === 'rendering' ? '33%' : mintStep === 'pinning' ? '66%' : '95%',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300">
                    {errorMessage}
                  </div>
                )}

                {/* Fees and Mint Action */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Total Mint Cost</span>
                    <span className="text-sm font-bold text-white font-mono">0.05 POL</span>
                    <span className="text-[10px] text-neutral-500 ml-1.5">(Polygon Gas Fee ≈ &lt; $0.01)</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={onClose}
                      disabled={isWorking}
                      className="px-3.5 py-1.5 text-xs rounded-lg text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onConfirmMint}
                      disabled={isWorking}
                      className="flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all disabled:opacity-50"
                    >
                      {isWorking ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Minting...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm & Mint NFT</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
