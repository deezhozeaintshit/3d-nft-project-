import React, { useState } from 'react';
import {
  Wand2,
  Palette,
  Music,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  Play,
  Pause,
  Volume2,
  Camera,
  Layers,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';

interface BottomDockProps {
  // Generation
  prompt: string;
  setPrompt: (p: string) => void;
  stylePreset: string;
  setStylePreset: (s: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;

  // Materials & Exploded view
  explodeFactor: number;
  setExplodeFactor: (f: number) => void;
  materialsConfig: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    roughness: number;
    metalness: number;
    emissiveIntensity: number;
  };
  setMaterialsConfig: React.Dispatch<React.SetStateAction<any>>;
  isWireframe: boolean;
  setIsWireframe: (w: boolean) => void;
  selectedPartName: string | null;

  // Audio / Soundtrack
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
  audioTrack: any;
  onRegenerateAudio: () => void;
  isGeneratingAudio: boolean;

  // Camera & Export
  isAutoRotate: boolean;
  setIsAutoRotate: (r: boolean) => void;
  onResetCamera: () => void;
  onDownloadGLB: () => void;
  onCaptureScreenshot: () => void;

  // Minting
  onOpenMintModal: () => void;
  isMinting: boolean;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  prompt,
  setPrompt,
  stylePreset,
  setStylePreset,
  onGenerate,
  isGenerating,
  explodeFactor,
  setExplodeFactor,
  materialsConfig,
  setMaterialsConfig,
  isWireframe,
  setIsWireframe,
  selectedPartName,
  isPlayingAudio,
  onToggleAudio,
  audioTrack,
  onRegenerateAudio,
  isGeneratingAudio,
  isAutoRotate,
  setIsAutoRotate,
  onResetCamera,
  onDownloadGLB,
  onCaptureScreenshot,
  onOpenMintModal,
  isMinting,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'materials' | 'audio' | 'export'>('generate');

  const styleOptions = [
    { id: 'cyberpunk', label: 'Cyberpunk Mech', badge: 'High-Tech' },
    { id: 'celestial', label: 'Celestial Monolith', badge: 'Astral' },
    { id: 'biotech', label: 'Biotech Core', badge: 'Neural' },
    { id: 'obsidian', label: 'Obsidian Void', badge: 'Void PBR' },
  ];

  const promptSuggestions = [
    'Sub-atomic mecha sentinel with neon hydraulic conduits',
    'Levitating golden quantum obelisk with sacred orbit rings',
    'Biomechanical synaptic processor with translucent neural dome',
    'Dark matter singularity core with faceted obsidian armor',
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-4xl select-none transition-all duration-300">
      {/* Dock Header & Collapse Toggle */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center space-x-1 px-4 py-1 rounded-t-lg bg-neutral-900 border border-b-0 border-neutral-800 text-[11px] font-mono tracking-wider uppercase text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shadow-lg"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Container */}
      {!isCollapsed && (
        <div className="rounded-xl border border-neutral-800/90 bg-neutral-950/95 shadow-2xl p-3 md:p-4 text-neutral-100">
          {/* Navigation Tabs & Primary Mint CTA */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-3 mb-3">
            <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
              <button
                onClick={() => setActiveTab('generate')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'generate'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI 3D Synthesis</span>
              </button>

              <button
                onClick={() => setActiveTab('materials')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'materials'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>PBR & Exploded</span>
              </button>

              <button
                onClick={() => setActiveTab('audio')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'audio'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Soundtrack</span>
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'export'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Inspect & Export</span>
              </button>
            </div>

            {/* Mint on Polygon Direct Action */}
            <button
              onClick={onOpenMintModal}
              disabled={isMinting}
              className="flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md hover:shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Pin IPFS & Mint NFT</span>
            </button>
          </div>

          {/* TAB 1: AI 3D GENERATOR */}
          {activeTab === 'generate' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your 3D digital artifact (e.g. Cyberpunk sentinel mech with glowing visor)..."
                    className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-800 focus:border-purple-500 focus:outline-none text-neutral-200 placeholder-neutral-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onGenerate();
                    }}
                  />
                </div>

                <button
                  onClick={onGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex items-center justify-center space-x-2 px-6 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md hover:shadow-purple-500/25 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-purple-200" />
                      <span>Generate 3D</span>
                    </>
                  )}
                </button>
              </div>

              {/* Style Presets and Quick Suggestions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-1.5 overflow-x-auto">
                  <span className="text-[11px] text-neutral-400 font-mono">Style:</span>
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setStylePreset(opt.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        stylePreset === opt.id
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Suggestions */}
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-neutral-500 hidden md:inline">Try prompt:</span>
                  <button
                    onClick={() =>
                      setPrompt(promptSuggestions[Math.floor(Math.random() * promptSuggestions.length)])
                    }
                    className="text-[10px] text-purple-400 hover:text-purple-300 underline font-mono cursor-pointer"
                  >
                    Random Idea
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PBR MATERIALS & EXPLODED VIEW */}
          {activeTab === 'materials' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Exploded View Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-neutral-300">Exploded View Expansion</span>
                  <span className="font-mono text-purple-400">{Math.round(explodeFactor * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={explodeFactor}
                  onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                  <span>Assembled</span>
                  <span>Dissected Assembly</span>
                </div>
              </div>

              {/* Color Swatches */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-neutral-300 block">PBR Finish Palette</span>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-1.5 text-[11px] text-neutral-400 cursor-pointer">
                    <input
                      type="color"
                      value={materialsConfig.primaryColor}
                      onChange={(e) =>
                        setMaterialsConfig((prev: any) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="w-5 h-5 rounded cursor-pointer border border-neutral-700 bg-transparent"
                    />
                    <span>Primary</span>
                  </label>

                  <label className="flex items-center space-x-1.5 text-[11px] text-neutral-400 cursor-pointer">
                    <input
                      type="color"
                      value={materialsConfig.secondaryColor}
                      onChange={(e) =>
                        setMaterialsConfig((prev: any) => ({ ...prev, secondaryColor: e.target.value }))
                      }
                      className="w-5 h-5 rounded cursor-pointer border border-neutral-700 bg-transparent"
                    />
                    <span>Secondary</span>
                  </label>

                  <label className="flex items-center space-x-1.5 text-[11px] text-neutral-400 cursor-pointer">
                    <input
                      type="color"
                      value={materialsConfig.accentColor}
                      onChange={(e) =>
                        setMaterialsConfig((prev: any) => ({ ...prev, accentColor: e.target.value }))
                      }
                      className="w-5 h-5 rounded cursor-pointer border border-neutral-700 bg-transparent"
                    />
                    <span>Emission</span>
                  </label>
                </div>
              </div>

              {/* Surface & Wireframe */}
              <div className="flex items-center justify-between space-x-3">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-neutral-400">Metalness</span>
                    <span className="text-purple-400">{materialsConfig.metalness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={materialsConfig.metalness}
                    onChange={(e) =>
                      setMaterialsConfig((prev: any) => ({
                        ...prev,
                        metalness: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <button
                  onClick={() => setIsWireframe(!isWireframe)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-colors ${
                    isWireframe
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  Wireframe
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GENERATIVE SOUNDTRACK */}
          {activeTab === 'audio' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={onToggleAudio}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                    isPlayingAudio
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                  title={isPlayingAudio ? 'Pause Soundtrack' : 'Play Generative Soundtrack'}
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white">
                      {audioTrack?.title || 'Generative Thematic Soundtrack'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-purple-400">
                      {audioTrack?.bpm || 124} BPM
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                      {audioTrack?.keySignature || 'D Minor'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 max-w-md truncate">
                    {audioTrack?.moodDescription || 'Synthesized PBR ambient drone synced to 3D rotation'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={onRegenerateAudio}
                  disabled={isGeneratingAudio}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isGeneratingAudio ? 'Composing...' : 'Re-Compose Audio'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: INSPECT & EXPORT */}
          {activeTab === 'export' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAutoRotate(!isAutoRotate)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isAutoRotate
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  Turntable Spin: {isAutoRotate ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={onResetCamera}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Reset Camera</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onCaptureScreenshot}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Snapshot PNG</span>
                </button>

                <button
                  onClick={onDownloadGLB}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export 3D .GLB</span>
                </button>
              </div>
            </div>
          )}

          {/* Selected Part Toast (if user clicked a part) */}
          {selectedPartName && (
            <div className="mt-2 pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-purple-400" />
                Selected Assembly Component: <span className="text-white font-semibold">{selectedPartName}</span>
              </span>
              <span className="text-[10px] text-neutral-500">PBR Filmic Material</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
