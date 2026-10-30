import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Volume2, VolumeX, Sparkles, Navigation } from 'lucide-react';
import { SimulationMode } from '../types';
import { soundEngine } from '../audio/SoundEngine';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: SimulationMode) => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(true);

  const steps = [
    {
      title: 'AETHERIA REALITY LAB // ARCHITECT BRIEFING',
      mode: 'blackhole' as SimulationMode,
      text: 'Welcome to Aetheria. You are interfacing with an interactive quantum physics and generative audio-visual matrix. This system combines real-time WebGL shaders, ordinary differential equation solvers, procedural Web Audio synthesis, and multi-state cellular automata.',
    },
    {
      title: 'THE GARGANTUA SINGULARITY',
      mode: 'blackhole' as SimulationMode,
      text: 'Mode 1 simulates a supermassive spinning black hole with a relativistic Keplerian accretion disk. Notice how light is blue-shifted as it approaches your perspective, with an intense photon ring surrounding the event horizon and relativistic plasma jets shooting along polar magnetic axes.',
    },
    {
      title: 'BIOLUMINESCENT CONNECTOME',
      mode: 'neural' as SimulationMode,
      text: 'Mode 2 simulates a 3D neural brain network with hundreds of neuron soma clusters. When an action potential reaches threshold, sparks travel along quadratic bezier axons triggering cascaded firings across both cerebral hemispheres. Click the field to ignite a neurotransmitter burst.',
    },
    {
      title: '6D CALABI-YAU QUANTUM MANIFOLD',
      mode: 'quantum' as SimulationMode,
      text: 'Mode 3 computes higher-dimensional string theory Calabi-Yau manifold projections. Surrounding the manifold is a quantum probability cloud governed by Schrödinger wave packet harmonics, breathing and oscillating with complex phase rotation.',
    },
    {
      title: 'PROCEDURAL NEON MEGAPOLIS',
      mode: 'cyberpunk' as SimulationMode,
      text: 'Mode 4 constructs an infinite cyber grid with procedurally generated spires that equalize dynamically to the synthesized audio frequencies. Watch digital rain cascade as high-speed data streaks traverse the cyber pathways.',
    },
    {
      title: 'STRANGE ATTRACTORS & CHAOS LAB',
      mode: 'chaos' as SimulationMode,
      text: 'Mode 5 numerically integrates real-time non-linear differential equations (Lorenz, Aizawa, and Rössler attractors). 30,000 particles demonstrate sensitive dependence on initial conditions, tracing beautiful chromatic butterfly manifolds.',
    },
  ];

  const speakText = (text: string) => {
    if (!isSpeaking || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95; // Slightly robotic/cybernetic pitch

    // Prefer English voices
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isOpen) {
      speakText(steps[currentStep].text);
    } else {
      window.speechSynthesis?.cancel();
    }
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [isOpen, currentStep, isSpeaking]);

  if (!isOpen) return null;

  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      soundEngine.playBlip(1.2);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      soundEngine.playBlip(0.9);
    }
  };

  const handleWarpToMode = () => {
    onSelectMode(current.mode);
    soundEngine.playWarp();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
      <div className="w-full max-w-lg cyber-glass-glow rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/40 font-mono text-xs flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-cyan-500/30">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
            <span>AI QUANTUM ARCHITECT BRIEFING</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSpeaking(!isSpeaking);
                if (isSpeaking) window.speechSynthesis?.cancel();
                else speakText(current.text);
              }}
              title={isSpeaking ? 'Mute AI Voice' : 'Enable AI Voice'}
              className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
            >
              {isSpeaking ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                onClose();
                soundEngine.playBlip(1);
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between text-cyan-400 font-bold text-[11px]">
            <span>STEP {currentStep + 1} OF {steps.length}</span>
            <span className="text-purple-300 uppercase">[{current.mode}]</span>
          </div>

          <h3 className="text-sm font-black text-white tracking-wider">{current.title}</h3>

          <p className="text-slate-300 text-xs leading-relaxed bg-black/40 p-3.5 rounded-xl border border-cyan-500/20">
            {current.text}
          </p>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleWarpToMode}
              className="cyber-button px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 flex items-center gap-1.5 font-bold"
            >
              <Navigation className="w-3.5 h-3.5" />
              Warp To Mode Now
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="p-2 rounded-lg bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentStep === steps.length - 1}
                className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
