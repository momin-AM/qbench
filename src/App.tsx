import React, { useState, useEffect, useCallback } from 'react';
import {
  SimulationMode,
  ColorTheme,
  CameraMode,
  SimulationParams,
  AudioEngineParams,
  TelemetryData,
} from './types';
import { soundEngine } from './audio/SoundEngine';
import { ThreeCanvas } from './viewport/ThreeCanvas';
import { FluidDynamicsCanvas } from './simulations/FluidDynamicsCanvas';
import { CellularAutomataCanvas } from './simulations/CellularAutomataCanvas';
import { TopBar } from './components/TopBar';
import { ControlDeck } from './components/ControlDeck';
import { TerminalDrawer } from './components/TerminalDrawer';
import { BenchmarkModal } from './components/BenchmarkModal';
import { GuidedTourModal } from './components/GuidedTourModal';
import { SnapshotModal } from './components/SnapshotModal';

export const App: React.FC = () => {
  // 1. Core State
  const [mode, setMode] = useState<SimulationMode>('blackhole');
  const [theme, setTheme] = useState<ColorTheme>('cyan-matrix');
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');

  const [simParams, setSimParams] = useState<SimulationParams>({
    speed: 1.0,
    particleCount: 26000,
    gravitationalPull: 1.8,
    chaosFactor: 1.0,
    audioReactivity: 1.0,
    bloomIntensity: 1.2,
    wireframe: false,
    colorTheme: 'cyan-matrix',
    postProcessing: {
      crtScanlines: true,
      chromaticAberration: true,
      bloom: true,
      vignette: true,
    },
  });

  const [audioParams, setAudioParams] = useState<AudioEngineParams>({
    isMuted: false,
    masterVolume: 0.65,
    synthDrone: true,
    scale: 'cyberMinor',
    tempoBpm: 120,
    resonance: 3.5,
    binauralBeat: true,
    binauralFreq: 10,
  });

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    fps: 60,
    frameTime: 16.6,
    activeParticles: 26000,
    webglDrawCalls: 6,
    memoryUsageMb: 85,
    audioFrequencyAverage: 0,
  });

  // Modal Dialog states
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  // Audio Engine Lifecycle
  useEffect(() => {
    soundEngine.init();
    soundEngine.updateParams(audioParams);

    // Auto-resume audio on first user gesture
    const handleFirstGesture = () => {
      soundEngine.resume();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const updateSimParams = (newParams: Partial<SimulationParams>) => {
    setSimParams((prev) => {
      const updated = { ...prev, ...newParams };
      if (newParams.colorTheme) setTheme(newParams.colorTheme);
      return updated;
    });
  };

  const updateAudioParams = (newAudio: Partial<AudioEngineParams>) => {
    setAudioParams((prev) => {
      const updated = { ...prev, ...newAudio };
      soundEngine.updateParams(updated);
      return updated;
    });
  };

  const applyPreset = (presetId: string) => {
    if (presetId === 'singularity') {
      setMode('blackhole');
      setTheme('cyan-matrix');
      updateSimParams({ speed: 1.2, gravitationalPull: 2.5 });
      updateAudioParams({ synthDrone: true, scale: 'cyberMinor', binauralFreq: 6 });
    } else if (presetId === 'neural_storm') {
      setMode('neural');
      setTheme('hyper-neon');
      updateSimParams({ speed: 1.4 });
      updateAudioParams({ scale: 'dorian', binauralFreq: 10 });
    } else if (presetId === 'quantum_leap') {
      setMode('quantum');
      setTheme('deep-cosmos');
      updateSimParams({ speed: 0.8 });
      updateAudioParams({ scale: 'lydian', binauralFreq: 40 });
    } else if (presetId === 'cyber_overdrive') {
      setMode('cyberpunk');
      setTheme('solar-plasma');
      updateSimParams({ speed: 1.6 });
      updateAudioParams({ scale: 'hirajoshi' });
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '`' || e.key === 't' || e.key === 'T') {
        setIsTerminalOpen((v) => !v);
      } else if (e.key === 'b' || e.key === 'B') {
        setIsBenchmarkOpen((v) => !v);
      } else if (e.key === 'm' || e.key === 'M') {
        updateAudioParams({ isMuted: !audioParams.isMuted });
      } else if (e.key === 'c' || e.key === 'C') {
        setCameraMode((cur) =>
          cur === 'cinematic' ? 'orbit' : cur === 'orbit' ? 'flythrough' : 'cinematic'
        );
        soundEngine.playBlip(1.2);
      } else if (e.key === ' ') {
        e.preventDefault();
        updateSimParams({ speed: simParams.speed === 0 ? 1.0 : 0 });
        soundEngine.playBlip(1.0);
      } else if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        const modesMap: SimulationMode[] = [
          'blackhole',
          'neural',
          'quantum',
          'cyberpunk',
          'chaos',
          'fluid',
          'life',
        ];
        const idx = parseInt(e.key, 10) - 1;
        setMode(modesMap[idx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioParams.isMuted, simParams.speed]);

  const handleTelemetryUpdate = useCallback((data: TelemetryData) => {
    setTelemetry(data);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#02040a] select-none text-slate-100 font-sans">
      {/* Top Header & Telemetry Bar */}
      <TopBar
        currentMode={mode}
        onSelectMode={setMode}
        telemetry={telemetry}
        audioParams={audioParams}
        onUpdateAudio={updateAudioParams}
        onOpenTerminal={() => setIsTerminalOpen(true)}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenSnapshot={() => setIsSnapshotOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="absolute inset-0 w-full h-full">
        {mode === 'fluid' ? (
          <FluidDynamicsCanvas
            audioFreq={telemetry.audioFrequencyAverage}
            colorTheme={theme}
          />
        ) : mode === 'life' ? (
          <CellularAutomataCanvas audioFreq={telemetry.audioFrequencyAverage} />
        ) : (
          <ThreeCanvas
            key={mode}
            mode={mode}
            theme={theme}
            cameraMode={cameraMode}
            params={simParams}
            audioFreq={telemetry.audioFrequencyAverage}
            onTelemetryUpdate={handleTelemetryUpdate}
            onCameraInteracted={() => setCameraMode('orbit')}
          />
        )}
      </main>

      {/* Floating Control Deck */}
      <ControlDeck
        params={simParams}
        onUpdateParams={updateSimParams}
        audioParams={audioParams}
        onUpdateAudio={updateAudioParams}
        cameraMode={cameraMode}
        onSelectCameraMode={setCameraMode}
        onApplyPreset={applyPreset}
      />

      {/* Interactive Command Terminal */}
      <TerminalDrawer
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        onSetMode={setMode}
        onSetTheme={setTheme}
        onSetSpeed={(s) => updateSimParams({ speed: s })}
        onSetCamera={setCameraMode}
        onRunBenchmark={() => {
          setIsTerminalOpen(false);
          setIsBenchmarkOpen(true);
        }}
      />

      {/* Benchmark Performance Suite Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      {/* AI Cybernetic Guided Tour */}
      <GuidedTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onSelectMode={setMode}
      />

      {/* Snapshot Exporter Modal */}
      <SnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        simulationMode={mode}
      />

      {/* Bottom-left Keyboard Quick Guide */}
      <div className="hidden md:flex absolute bottom-4 left-4 z-10 cyber-glass px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-400 items-center gap-3 pointer-events-none">
        <div><span className="text-cyan-300 font-bold">1-7</span> Modes</div>
        <div><span className="text-cyan-300 font-bold">SPACE</span> Pause</div>
        <div><span className="text-cyan-300 font-bold">C</span> Camera</div>
        <div><span className="text-cyan-300 font-bold">M</span> Mute</div>
        <div><span className="text-cyan-300 font-bold">T / `</span> Terminal</div>
        <div><span className="text-cyan-300 font-bold">B</span> Benchmark</div>
      </div>
    </div>
  );
};

export default App;
