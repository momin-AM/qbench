import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Send, Sparkles } from 'lucide-react';
import { SimulationMode, ColorTheme, CameraMode } from '../types';
import { soundEngine } from '../audio/SoundEngine';

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSetMode: (mode: SimulationMode) => void;
  onSetTheme: (theme: ColorTheme) => void;
  onSetSpeed: (speed: number) => void;
  onSetCamera: (cam: CameraMode) => void;
  onRunBenchmark: () => void;
}

interface LogEntry {
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  isOpen,
  onClose,
  onSetMode,
  onSetTheme,
  onSetSpeed,
  onSetCamera,
  onRunBenchmark,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: 'system', text: 'AETHERIA KERNEL v4.12.0-STABLE INITIALIZED.' },
    { type: 'system', text: 'Type "help" to display the quantum command matrix.' },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  const handleCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Append to logs
    const newLogs: LogEntry[] = [...logs, { type: 'input', text: `AETHERIA://> ${trimmed}` }];
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);
    soundEngine.playBlip(1.3);

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg1 = parts[1]?.toLowerCase();

    switch (cmd) {
      case 'help':
        newLogs.push({
          type: 'output',
          text: `AVAILABLE COMMAND MATRIX:
  • mode <blackhole|neural|quantum|cyberpunk|chaos|fluid|life>
  • theme <cyan-matrix|solar-plasma|deep-cosmos|hyper-neon|void-monochrome>
  • speed <0.1 - 3.0>
  • camera <orbit|cinematic|flythrough>
  • warp                       (triggers dimensional jump)
  • benchmark                  (initiates hardware stress suite)
  • cascade                    (ignites synaptic storm)
  • sysinfo                    (displays hardware & renderer telemetry)
  • lore                       (Aetheria quantum archive narrative)
  • clear                      (resets console buffer)`,
        });
        break;

      case 'mode':
        if (['blackhole', 'neural', 'quantum', 'cyberpunk', 'chaos', 'fluid', 'life'].includes(arg1)) {
          onSetMode(arg1 as SimulationMode);
          newLogs.push({ type: 'output', text: `[OK] Simulation manifold switched to: ${arg1.toUpperCase()}` });
        } else {
          newLogs.push({ type: 'error', text: `[ERR] Invalid mode. Expected: blackhole, neural, quantum, cyberpunk, chaos, fluid, life` });
        }
        break;

      case 'theme':
        if (['cyan-matrix', 'solar-plasma', 'deep-cosmos', 'hyper-neon', 'void-monochrome'].includes(arg1)) {
          onSetTheme(arg1 as ColorTheme);
          newLogs.push({ type: 'output', text: `[OK] Spectral theme updated to: ${arg1}` });
        } else {
          newLogs.push({ type: 'error', text: `[ERR] Invalid theme. Expected: cyan-matrix, solar-plasma, deep-cosmos, hyper-neon, void-monochrome` });
        }
        break;

      case 'speed': {
        const val = parseFloat(arg1);
        if (!isNaN(val) && val >= 0.1 && val <= 5.0) {
          onSetSpeed(val);
          newLogs.push({ type: 'output', text: `[OK] Time dilation factor set to ${val}x` });
        } else {
          newLogs.push({ type: 'error', text: `[ERR] Invalid speed. Range: 0.1 to 5.0` });
        }
        break;
      }

      case 'camera':
        if (['orbit', 'cinematic', 'flythrough'].includes(arg1)) {
          onSetCamera(arg1 as CameraMode);
          newLogs.push({ type: 'output', text: `[OK] Camera flight trajectory set to: ${arg1}` });
        } else {
          newLogs.push({ type: 'error', text: `[ERR] Expected camera modes: orbit, cinematic, flythrough` });
        }
        break;

      case 'warp':
        soundEngine.playWarp();
        newLogs.push({ type: 'system', text: `[WARN] GRAVITATIONAL EVENT DETECTED. SPACETIME FOLDING ENGAGED.` });
        break;

      case 'cascade':
        soundEngine.playSingularityPulse();
        newLogs.push({ type: 'output', text: `[OK] Synaptic axon cascade triggered across neural lattice.` });
        break;

      case 'benchmark':
        onRunBenchmark();
        newLogs.push({ type: 'system', text: `[INIT] Automated benchmark suite dispatched.` });
        break;

      case 'sysinfo':
        newLogs.push({
          type: 'output',
          text: `SYSTEM HARDWARE DIAGNOSTICS:
  • Logical CPU Cores: ${navigator.hardwareConcurrency || 8}
  • Screen Resolution: ${window.screen.width}x${window.screen.height} (DPR: ${window.devicePixelRatio})
  • Audio Engine: Web Audio 32-bit float stereo with biquad resonance
  • WebGL Context: Hardware Accelerated ACES Filmic Tone-mapping
  • Memory Architecture: Unified Shader / CPU Buffer Pipeline`,
        });
        break;

      case 'lore':
        newLogs.push({
          type: 'output',
          text: `AETHERIA PROTOCOL ARCHIVE // YEAR 2094:
In the wake of the Great Dimensional Decoherence, humanity built the Aetheria Quantum Matrix: a synthetic laboratory capable of simulating higher-dimensional Calabi-Yau manifolds, biological neural connectomes, and relativistic black holes. You are operating the direct Omni-Console terminal.`,
        });
        break;

      case 'clear':
        setLogs([]);
        return;

      default:
        newLogs.push({
          type: 'error',
          text: `Unknown command "${cmd}". Type "help" for a list of available routines.`,
        });
    }

    setLogs(newLogs);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      if (history.length > 0) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < history.length) {
          setHistoryIdx(nextIdx);
          setInputVal(history[history.length - 1 - nextIdx]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(history[history.length - 1 - nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-2xl h-[480px] cyber-glass-glow rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-cyan-500/40 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 border-b border-cyan-500/30">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
            <TerminalIcon className="w-4 h-4 text-cyan-400" />
            <span>AETHERIA PROTOCOL // COMMAND LINE CONSOLE</span>
          </div>
          <button
            onClick={() => {
              onClose();
              soundEngine.playBlip(1);
            }}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logs Output Box */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2 text-xs">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`leading-relaxed whitespace-pre-wrap ${
                log.type === 'input'
                  ? 'text-cyan-300 font-bold'
                  : log.type === 'system'
                  ? 'text-purple-400 font-medium'
                  : log.type === 'error'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {log.text}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-black/70 border-t border-cyan-500/30 flex items-center gap-2">
          <span className="text-cyan-400 font-bold text-xs">AETHERIA://&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type command ('help', 'mode blackhole', 'benchmark', etc.)..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 outline-none text-xs"
          />
          <button
            onClick={() => handleCommand(inputVal)}
            className="p-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 rounded border border-cyan-500/40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
