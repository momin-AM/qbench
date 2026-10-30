import React, { useState } from 'react';
import {
  SimulationParams,
  AudioEngineParams,
  CameraMode,
  ColorTheme,
} from '../types';
import {
  Sliders,
  Music,
  Eye,
  Video,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface ControlDeckProps {
  params: SimulationParams;
  onUpdateParams: (newParams: Partial<SimulationParams>) => void;
  audioParams: AudioEngineParams;
  onUpdateAudio: (newAudio: Partial<AudioEngineParams>) => void;
  cameraMode: CameraMode;
  onSelectCameraMode: (mode: CameraMode) => void;
  onApplyPreset: (presetId: string) => void;
}

type TabType = 'physics' | 'audio' | 'visuals' | 'camera' | 'presets';

export const ControlDeck: React.FC<ControlDeckProps> = ({
  params,
  onUpdateParams,
  audioParams,
  onUpdateAudio,
  cameraMode,
  onSelectCameraMode,
  onApplyPreset,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('physics');

  const themes: { id: ColorTheme; label: string; color: string }[] = [
    { id: 'cyan-matrix', label: 'Cyan Matrix', color: '#00f3ff' },
    { id: 'solar-plasma', label: 'Solar Plasma', color: '#ffaa00' },
    { id: 'deep-cosmos', label: 'Deep Cosmos', color: '#bf5af2' },
    { id: 'hyper-neon', label: 'Hyper Neon', color: '#00ff9d' },
    { id: 'void-monochrome', label: 'Void Monochrome', color: '#f8fafc' },
  ];

  const presets = [
    { id: 'singularity', name: 'Singularity Breach', desc: 'Gravitational collapse & sub-bass drone' },
    { id: 'neural_storm', name: 'Neural Hyper-Cascade', desc: 'Synaptic action potentials & alpha wave' },
    { id: 'quantum_leap', name: '6D Calabi-Yau Drift', desc: 'Higher dimensional manifold harmonic' },
    { id: 'cyber_overdrive', name: 'Cyber City Run', desc: 'Neon grid & high-tempo pulse' },
  ];

  return (
    <aside className="absolute bottom-5 right-5 z-20 w-84 sm:w-96 flex flex-col font-mono text-xs">
      {/* Deck Header / Collapse Toggle */}
      <div className="flex items-center justify-between px-3 py-2 cyber-glass-glow rounded-t-xl border-b border-cyan-500/30">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-300 animate-pulse" />
          <span className="font-bold text-cyan-200 tracking-wider">OMNI-DECK // CONTROLLER</span>
        </div>
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            soundEngine.playBlip(1.1);
          }}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Body */}
      {isOpen && (
        <div className="cyber-glass rounded-b-xl p-3.5 border-t-0 flex flex-col gap-3 shadow-2xl backdrop-blur-2xl">
          {/* Navigation Pill Tabs */}
          <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-lg border border-cyan-500/20 text-[10px]">
            {[
              { id: 'physics', icon: Sliders, label: 'Physics' },
              { id: 'audio', icon: Music, label: 'Synth' },
              { id: 'visuals', icon: Eye, label: 'Visuals' },
              { id: 'camera', icon: Video, label: 'Camera' },
              { id: 'presets', icon: Bookmark, label: 'Presets' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType);
                    soundEngine.playBlip(1.2);
                  }}
                  className={`flex flex-col items-center py-1.5 rounded transition-all ${
                    isActive
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mb-0.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: PHYSICS & UNIVERSE DYNAMICS */}
          {activeTab === 'physics' && (
            <div className="flex flex-col gap-3">
              {/* Speed Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Simulation Speed</span>
                  <span className="text-cyan-300 font-bold">{params.speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={params.speed}
                  onChange={(e) => onUpdateParams({ speed: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Gravitational Intensity / Chaos */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Singularity Pull / Curvature</span>
                  <span className="text-purple-300 font-bold">{params.gravitationalPull.toFixed(1)}G</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={params.gravitationalPull}
                  onChange={(e) => onUpdateParams({ gravitationalPull: parseFloat(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              {/* Audio Reactivity Multiplier */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Acoustic Wave Coupling</span>
                  <span className="text-emerald-300 font-bold">{(params.audioReactivity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={params.audioReactivity}
                  onChange={(e) => onUpdateParams({ audioReactivity: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SYNTHESIZER & AUDIO LAB */}
          {activeTab === 'audio' && (
            <div className="flex flex-col gap-3">
              {/* Master Volume */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Master Synth Output</span>
                  <span className="text-cyan-300 font-bold">
                    {Math.round(audioParams.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioParams.masterVolume}
                  onChange={(e) => onUpdateAudio({ masterVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Musical Scale Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-300">Generative Scale</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'cyberMinor', label: 'Cyber Minor' },
                    { id: 'lydian', label: 'Lydian Celestial' },
                    { id: 'hirajoshi', label: 'Hirajoshi' },
                    { id: 'dorian', label: 'Ancient Dorian' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onUpdateAudio({ scale: s.id as any });
                        soundEngine.playPluck(0.5);
                      }}
                      className={`px-2 py-1.5 rounded text-left transition-all ${
                        audioParams.scale === s.id
                          ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50 font-bold'
                          : 'bg-black/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drone & Binaural Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    onUpdateAudio({ synthDrone: !audioParams.synthDrone });
                    soundEngine.playBlip(1);
                  }}
                  className={`p-2 rounded border flex flex-col items-center gap-1 transition-all ${
                    audioParams.synthDrone
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-black/30 border-slate-700 text-slate-500'
                  }`}
                >
                  <span className="font-bold">Sub Drone Pad</span>
                  <span className="text-[9px]">{audioParams.synthDrone ? 'ACTIVE' : 'MUTED'}</span>
                </button>

                <button
                  onClick={() => {
                    onUpdateAudio({ binauralBeat: !audioParams.binauralBeat });
                    soundEngine.playBlip(1);
                  }}
                  className={`p-2 rounded border flex flex-col items-center gap-1 transition-all ${
                    audioParams.binauralBeat
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : 'bg-black/30 border-slate-700 text-slate-500'
                  }`}
                >
                  <span className="font-bold">Binaural 10Hz</span>
                  <span className="text-[9px]">{audioParams.binauralBeat ? 'ALPHA' : 'OFF'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: VISUAL FX & THEMES */}
          {activeTab === 'visuals' && (
            <div className="flex flex-col gap-3">
              {/* Palette Chooser */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300">Spectral Palette</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onUpdateParams({ colorTheme: t.id });
                        soundEngine.playBlip(1.1);
                      }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded transition-all ${
                        params.colorTheme === t.id
                          ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                          : 'bg-black/30 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ backgroundColor: t.color }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Shaders */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-cyan-500/20">
                <button
                  onClick={() =>
                    onUpdateParams({
                      postProcessing: {
                        ...params.postProcessing,
                        crtScanlines: !params.postProcessing.crtScanlines,
                      },
                    })
                  }
                  className={`p-2 rounded border text-center transition-all ${
                    params.postProcessing.crtScanlines
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-black/30 border-slate-700 text-slate-500'
                  }`}
                >
                  CRT Scanlines
                </button>
                <button
                  onClick={() =>
                    onUpdateParams({
                      postProcessing: {
                        ...params.postProcessing,
                        vignette: !params.postProcessing.vignette,
                      },
                    })
                  }
                  className={`p-2 rounded border text-center transition-all ${
                    params.postProcessing.vignette
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-black/30 border-slate-700 text-slate-500'
                  }`}
                >
                  Lens Vignette
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CAMERA DIRECTOR */}
          {activeTab === 'camera' && (
            <div className="flex flex-col gap-2">
              <label className="text-slate-300">Camera Trajectory</label>
              {[
                { id: 'orbit', label: 'Manual Orbit & Pitch', desc: 'Click & drag freely around viewport' },
                { id: 'cinematic', label: 'Cinematic Drone Tour', desc: 'Autonomous orbiting cinematic shot' },
                { id: 'flythrough', label: 'Supersonic Fly-Through', desc: 'High-speed directional glide' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectCameraMode(c.id as CameraMode);
                    soundEngine.playBlip(1.2);
                  }}
                  className={`p-2.5 rounded-lg text-left transition-all flex flex-col ${
                    cameraMode === c.id
                      ? 'bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 font-bold'
                      : 'bg-black/40 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="text-xs">{c.label}</span>
                  <span className="text-[10px] opacity-70 font-normal">{c.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* TAB 5: PRESETS VAULT */}
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-2">
              <label className="text-slate-300">Curated Reality Presets</label>
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onApplyPreset(p.id);
                    soundEngine.playWarp();
                  }}
                  className="cyber-button p-2.5 rounded-lg bg-black/40 hover:bg-cyan-950/30 border border-cyan-500/30 text-left transition-all flex flex-col group"
                >
                  <div className="flex items-center justify-between text-cyan-300 font-bold">
                    <span>{p.name}</span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
