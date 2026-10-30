export type SimulationMode = 
  | 'blackhole'    // Gargantua Singularity with relativistic accretion disk & gravitational lensing
  | 'neural'       // 3D Neural Connectome Synapse Matrix with firing impulse waves
  | 'quantum'      // Calabi-Yau 6D Manifold & Probability Wavefunction
  | 'cyberpunk'    // Neon Megacity Cyber Grid with flying light-cycles
  | 'chaos'        // Lorenz & Strange Attractors Particle Flow
  | 'fluid'        // 2D Real-time Navier-Stokes Fluid Chamber
  | 'life';        // Multi-rule Cellular Automata & Conway / Brian's Brain

export type ColorTheme = 'cyan-matrix' | 'solar-plasma' | 'deep-cosmos' | 'hyper-neon' | 'void-monochrome';

export type CameraMode = 'orbit' | 'cinematic' | 'fps' | 'flythrough';

export interface SimulationParams {
  speed: number;
  particleCount: number;
  gravitationalPull: number;
  chaosFactor: number;
  audioReactivity: number;
  bloomIntensity: number;
  wireframe: boolean;
  colorTheme: ColorTheme;
  postProcessing: {
    crtScanlines: boolean;
    chromaticAberration: boolean;
    bloom: boolean;
    vignette: boolean;
  };
}

export interface AudioEngineParams {
  isMuted: boolean;
  masterVolume: number;
  synthDrone: boolean;
  scale: 'cyberMinor' | 'lydian' | 'hirajoshi' | 'dorian' | 'pentatonic';
  tempoBpm: number;
  resonance: number;
  binauralBeat: boolean;
  binauralFreq: number; // Hz (e.g. 10Hz Alpha, 6Hz Theta, 40Hz Gamma)
}

export interface TelemetryData {
  fps: number;
  frameTime: number; // ms
  activeParticles: number;
  webglDrawCalls: number;
  memoryUsageMb: number;
  audioFrequencyAverage: number;
}

export interface BenchmarkResult {
  overallScore: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C';
  fpsScore: number;
  particleScore: number;
  mathStressScore: number;
  audioScore: number;
  timestamp: string;
  specs: {
    cores: number;
    platform: string;
    renderer: string;
  };
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  mode: SimulationMode;
  params: Partial<SimulationParams>;
  theme: ColorTheme;
}
