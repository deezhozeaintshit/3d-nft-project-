import React, { useState } from 'react';
import { X, ExternalLink, Play, Eye, Sparkles, Box, HardDrive, Settings2 } from 'lucide-react';
import { NFTManager } from './NFTManager';

export interface MintedNFTItem {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  animation_url: string;
  stylePreset: string;
  rarity: string;
  polyCount: number;
  ipfsUri: string;
  txHash: string;
  explorerUrl: string;
  audioTrack?: any;
  materialsConfig?: any;
}

interface GalleryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: MintedNFTItem[];
  onLoadIntoScene: (item: MintedNFTItem) => void;
  onPlayAudio: (track: any) => void;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onLoadIntoScene,
  onPlayAudio,
}) => {
  if (!isOpen) return null;

  return (
    <GalleryDrawerInner
      isOpen={isOpen}
      onClose={onClose}
      items={items}
      onLoadIntoScene={onLoadIntoScene}
      onPlayAudio={onPlayAudio}
    />
  );
};

const GalleryDrawerInner: React.FC<GalleryDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onLoadIntoScene,
  onPlayAudio,
}) => {
  const [managingTokenId, setManagingTokenId] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-md h-full bg-neutral-950 border-l border-neutral-800 p-5 shadow-2xl flex flex-col text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Minted 3D NFT Collection</h3>
              <p className="text-[11px] text-neutral-400">
                {items.length} {items.length === 1 ? 'Artifact' : 'Artifacts'} on Polygon
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NFT Cards List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No 3D NFTs minted yet. Generate an artifact and mint it on Polygon!
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.tokenId}
                className="group rounded-xl border border-neutral-800/80 bg-neutral-900/60 hover:border-purple-500/40 hover:bg-neutral-900 transition-all p-3 space-y-2.5"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 py-0.2 bg-black/80 text-purple-300 rounded border border-purple-500/20">
                      3D
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-purple-400 font-semibold">
                        Token #{item.tokenId}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                          item.rarity === 'Mythic'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : item.rarity === 'Legendary'
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {item.rarity || 'Common'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate mt-0.5">{item.name}</h4>
                    <p className="text-[11px] text-neutral-400 truncate">{item.description}</p>
                  </div>
                </div>

                {/* Traits Row */}
                <div className="flex items-center space-x-1.5 text-[9px] font-mono text-neutral-400 overflow-x-auto">
                  <span className="px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                    Style: {item.stylePreset}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                    {item.polyCount?.toLocaleString()} Polys
                  </span>
                  {item.audioTrack && (
                    <span className="px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-purple-400">
                      {item.audioTrack.bpm || 124} BPM
                    </span>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        onLoadIntoScene(item);
                        onClose();
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                      title="Inspect this 3D model in the main viewport"
                    >
                      <Eye className="w-3 h-3 text-purple-400" />
                      <span>Inspect 3D</span>
                    </button>

                    {item.audioTrack && (
                      <button
                        onClick={() => onPlayAudio(item.audioTrack)}
                        className="flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                        title="Listen to this NFT's generative soundtrack"
                      >
                        <Play className="w-3 h-3 text-emerald-400" />
                        <span>Sound</span>
                      </button>
                    )}

                    <button
                      onClick={() => setManagingTokenId(item.tokenId)}
                      className="flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      title="Update metadata URI or attach additional files (V2 contract)"
                    >
                      <Settings2 className="w-3 h-3 text-amber-400" />
                      <span>Manage</span>
                    </button>
                  </div>

                  <a
                    href={item.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-[10px] font-mono text-neutral-400 hover:text-purple-300 transition-colors"
                  >
                    <span>PolygonScan</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {managingTokenId !== null && (
        <NFTManager tokenId={managingTokenId} onClose={() => setManagingTokenId(null)} />
      )}
    </div>
  );
};
