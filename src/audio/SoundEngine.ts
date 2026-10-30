import { AudioEngineParams } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Drone oscillators
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneSub: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  // Binaural nodes
  private binauralLeft: OscillatorNode | null = null;
  private binauralRight: OscillatorNode | null = null;
  private binauralGain: GainNode | null = null;

  private isInitialized = false;
  private isPlaying = false;
  private freqDataArray: Uint8Array | null = null;
  private timeDataArray: Uint8Array | null = null;

  // Musical Scale Frequencies (Base C4)
  private scales = {
    cyberMinor: [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08, 261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16, 523.25],
    lydian: [130.81, 146.83, 164.81, 185.00, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25],
    hirajoshi: [130.81, 138.59, 174.61, 185.00, 233.08, 261.63, 277.18, 349.23, 369.99, 466.16, 523.25, 554.37, 698.46],
    dorian: [130.81, 146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 466.16, 523.25],
    pentatonic: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]
  };

  private currentScaleName: keyof typeof this.scales = 'cyberMinor';

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.85;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.freqDataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDataArray = new Uint8Array(this.analyser.fftSize);

      this.initDrone();
      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported or blocked:", e);
    }
  }

  private initDrone() {
    if (!this.ctx || !this.masterGain) return;

    // Resonant Filter
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(4, this.ctx.currentTime);

    // LFO to slowly sweep filter
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // 0.12 Hz slow pulse
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.droneFilter.frequency);
    this.lfo.start();

    // Drone Gain
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.001, this.ctx.currentTime); // Start low

    // Oscillators: Detuned Saw + Sine + Sub
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sawtooth';
    this.droneOsc2.frequency.setValueAtTime(65.75, this.ctx.currentTime); // subtle detune

    this.droneSub = this.ctx.createOscillator();
    this.droneSub.type = 'sine';
    this.droneSub.frequency.setValueAtTime(32.70, this.ctx.currentTime); // C1 sub-bass

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneSub.connect(this.droneFilter);

    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
    this.droneSub.start();

    // Setup Binaural generator
    this.initBinaural(10); // Alpha wave default
  }

  private initBinaural(freqDiff: number) {
    if (!this.ctx || !this.masterGain) return;
    const merger = this.ctx.createChannelMerger(2);
    
    this.binauralLeft = this.ctx.createOscillator();
    this.binauralLeft.type = 'sine';
    this.binauralLeft.frequency.setValueAtTime(216, this.ctx.currentTime); // 216Hz A3 subharmonic

    this.binauralRight = this.ctx.createOscillator();
    this.binauralRight.type = 'sine';
    this.binauralRight.frequency.setValueAtTime(216 + freqDiff, this.ctx.currentTime); // Beat

    const gainL = this.ctx.createGain();
    gainL.gain.setValueAtTime(0.5, this.ctx.currentTime);
    const gainR = this.ctx.createGain();
    gainR.gain.setValueAtTime(0.5, this.ctx.currentTime);

    this.binauralLeft.connect(gainL);
    this.binauralRight.connect(gainR);

    gainL.connect(merger, 0, 0); // left channel
    gainR.connect(merger, 0, 1); // right channel

    this.binauralGain = this.ctx.createGain();
    this.binauralGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    merger.connect(this.binauralGain);
    this.binauralGain.connect(this.masterGain);

    this.binauralLeft.start();
    this.binauralRight.start();
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateParams(params: AudioEngineParams) {
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    // Volume
    const targetGain = params.isMuted ? 0 : params.masterVolume;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);

    // Drone
    if (this.droneGain) {
      const droneTarget = params.synthDrone && !params.isMuted ? 0.35 : 0.0001;
      this.droneGain.gain.setTargetAtTime(droneTarget, this.ctx.currentTime, 0.2);
    }

    // Filter Resonance
    if (this.droneFilter) {
      this.droneFilter.Q.setTargetAtTime(params.resonance, this.ctx.currentTime, 0.1);
    }

    // Binaural
    if (this.binauralGain && this.binauralRight) {
      const binauralTarget = params.binauralBeat && !params.isMuted ? 0.08 : 0.0001;
      this.binauralGain.gain.setTargetAtTime(binauralTarget, this.ctx.currentTime, 0.1);
      this.binauralRight.frequency.setTargetAtTime(216 + params.binauralFreq, this.ctx.currentTime, 0.2);
    }

    this.currentScaleName = params.scale;
  }

  // Crystalline Pluck Synth Note
  public playPluck(indexRatio: number = 0.5) {
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    const scale = this.scales[this.currentScaleName] || this.scales.cyberMinor;
    const clampedRatio = Math.max(0, Math.min(1, indexRatio));
    const noteIdx = Math.floor(clampedRatio * (scale.length - 1));
    const freq = scale[noteIdx];

    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const noteGain = this.ctx.createGain();

    // FM Synthesis setup for shimmering bell/glass timbre
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.756, this.ctx.currentTime); // Non-integer harmonic ratio
    modGain.gain.setValueAtTime(freq * 1.5, this.ctx.currentTime);
    modGain.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.6);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    noteGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start();
    mod.start();
    osc.stop(this.ctx.currentTime + 1.25);
    mod.stop(this.ctx.currentTime + 1.25);
  }

  // Sci-Fi Mode Warp Whoosh
  public playWarp() {
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    
    // Sub drop
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.8);
    
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 0.85);

    // Resonant sweep
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.8);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.4);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
    filter.Q.setValueAtTime(8, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.85);
  }

  // Futuristic UI Blip
  public playBlip(pitchMultiplier = 1) {
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(1760 * pitchMultiplier, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Deep Bass Singularity Impact
  public playSingularityPulse() {
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 1.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.25);
  }

  // Telemetry & Frequency Analysis
  public getAudioTelemetry(): { averageFreq: number; frequencyData: Uint8Array; timeData: Uint8Array } {
    if (!this.analyser || !this.freqDataArray || !this.timeDataArray) {
      return { 
        averageFreq: 0, 
        frequencyData: new Uint8Array(0), 
        timeData: new Uint8Array(0) 
      };
    }

    this.analyser.getByteFrequencyData(this.freqDataArray as any);
    this.analyser.getByteTimeDomainData(this.timeDataArray as any);

    let sum = 0;
    for (let i = 0; i < this.freqDataArray.length; i++) {
      sum += this.freqDataArray[i];
    }
    const averageFreq = sum / (this.freqDataArray.length * 255);

    return {
      averageFreq,
      frequencyData: this.freqDataArray,
      timeData: this.timeDataArray
    };
  }
}

export const soundEngine = new SoundEngine();
