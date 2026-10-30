import React from 'react';
import {
  SimulationMode,
  TelemetryData,
  AudioEngineParams,
} from '../types';
import {
  Volume2,
  VolumeX,
  Terminal,
  Trophy,
  Camera,
  Maximize,
  Sparkles,
  Headphones,
  Cpu,
} from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { AudioVisualizer } from './AudioVisualizer';

interface TopBarProps {
  currentMode: SimulationMode;
  onSelectMode: (mode: SimulationMode) => void;
  telemetry: TelemetryData;
  audioParams: AudioEngineParams;
  onUpdateAudio: (params: Partial<AudioEngineParams>) => void;
  onOpenTerminal: () => void;
  onOpenBenchmark: () => void;
  onOpenSnapshot: () => void;
  onOpenTour: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  onSelectMode,
  telemetry,
  audioParams,
  onUpdateAudio,
  onOpenTerminal,
  onOpenBenchmark,
  onOpenSnapshot,
  onOpenTour,
}) => {
  const modes: { id: SimulationMode; label: string; badge: string }[] = [
    { id: 'blackhole', label: 'SINGULARITY', badge: '3D ASTRO' },
    { id: 'neural', label: 'CONNECTOME', badge: 'SYNAPSE' },
    { id: 'quantum', label: 'CALABI-YAU', badge: '6D QUANTUM' },
    { id: 'cyberpunk', label: 'CYBER GRID', badge: 'PROCEDURAL' },
    { id: 'chaos', label: 'ATTRACTOR', badge: 'CHAOS ODE' },
    { id: 'fluid', label: 'FLUID LAB', badge: 'NAVIER-STOKES' },
    { id: 'life', label: 'LIFE FORGE', badge: 'AUTOMATA' },
  ];

  const toggleMute = () => {
    onUpdateAudio({ isMuted: !audioParams.isMuted });
    soundEngine.playBlip(audioParams.isMuted ? 1.4 : 0.8);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    soundEngine.playBlip(1.2);
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return 'text-emerald-400';
    if (fps >= 30) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 cyber-glass border-b border-cyan-500/20 backdrop-blur-xl">
      {/* Brand & Telemetry HUD */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 p-[1.5px] shadow-[0_0_15px_rgba(0,243,255,0.4)]">
            <div className="w-full h-full bg-[#030712] rounded-[6px] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-cyan-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-widest bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-400 bg-clip-text text-transparent font-mono">
              AETHERIA
            </div>
            <div className="text-[9px] text-cyan-400/70 font-mono tracking-wider -mt-0.5">
              QUANTUM REALITY LAB
            </div>
          </div>
        </div>

        {/* Live Telemetry Pill */}
        <div className="hidden lg:flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-lg border border-cyan-500/15 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="text-slate-400">FPS:</span>
            <span className={`font-bold ${getFpsColor(telemetry.fps)}`}>{telemetry.fps}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Time:</span>
            <span className="text-cyan-300 font-medium">{telemetry.frameTime}ms</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Entities:</span>
            <span className="text-purple-300 font-medium">
              {telemetry.activeParticles.toLocaleString()}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Memory:</span>
            <span className="text-sky-300 font-medium">{telemetry.memoryUsageMb}MB</span>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-cyan-500/20">
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                onSelectMode(m.id);
                soundEngine.playBlip(1.1);
              }}
              className={`relative px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex flex-col items-center ${
                isActive
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,243,255,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className="font-bold tracking-wider">{m.label}</span>
              <span className="text-[8px] opacity-65 tracking-tight">{m.badge}</span>
              {isActive && (
                <div className="absolute -bottom-1 w-6 h-[2px] bg-cyan-400 rounded-full shadow-[0_0_6px_#00f3ff]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Controls & Visualizer */}
      <div className="flex items-center gap-2.5">
        {/* Real-time Web Audio Visualizer */}
        <div className="hidden sm:block">
          <AudioVisualizer />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-cyan-500/20">
          {/* Guided Tour Audio Speech */}
          <button
            onClick={() => {
              onOpenTour();
              soundEngine.playBlip(1.2);
            }}
            title="AI Cybernetic Briefing"
            className="p-1.5 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 rounded transition-colors"
          >
            <Headphones className="w-4 h-4" />
          </button>

          {/* Benchmark Suite */}
          <button
            onClick={() => {
              onOpenBenchmark();
              soundEngine.playBlip(1.2);
            }}
            title="Run Performance Benchmark"
            className="p-1.5 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 rounded transition-colors"
          >
            <Trophy className="w-4 h-4" />
          </button>

          {/* Snapshot Capture */}
          <button
            onClick={() => {
              onOpenSnapshot();
              soundEngine.playBlip(1.2);
            }}
            title="Export High-Res Canvas Snapshot"
            className="p-1.5 hover:bg-sky-500/20 text-sky-300 hover:text-sky-200 rounded transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Terminal Toggle */}
          <button
            onClick={() => {
              onOpenTerminal();
              soundEngine.playBlip(1.2);
            }}
            title="Toggle Command Terminal (`)"
            className="p-1.5 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 rounded transition-colors"
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Audio Mute */}
          <button
            onClick={toggleMute}
            title={audioParams.isMuted ? 'Unmute Audio Engine' : 'Mute Audio Engine'}
            className={`p-1.5 rounded transition-colors ${
              audioParams.isMuted
                ? 'text-rose-400 hover:bg-rose-500/20'
                : 'text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {audioParams.isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 animate-pulse" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 hover:bg-slate-700/40 text-slate-300 hover:text-white rounded transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
