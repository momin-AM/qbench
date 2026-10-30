import * as THREE from 'three';
import { ColorTheme } from '../types';

interface Neuron {
  position: THREE.Vector3;
  cluster: number;
  charge: number; // 0 to 1
  baseColor: THREE.Color;
}

interface Synapse {
  fromIdx: number;
  toIdx: number;
  curve: THREE.QuadraticBezierCurve3;
}

interface Pulse {
  synapseIdx: number;
  progress: number; // 0 to 1
  speed: number;
  color: THREE.Color;
}

export class NeuralConnectome {
  public group: THREE.Group;
  private neurons: Neuron[] = [];
  private synapses: Synapse[] = [];
  private pulses: Pulse[] = [];

  private neuronMesh: THREE.InstancedMesh;
  private axonLines: THREE.LineSegments;
  private pulsePoints: THREE.Points;
  private pulsePositions: Float32Array;
  private pulseColors: Float32Array;

  private dummy = new THREE.Object3D();
  private maxPulses = 1500;
  private nearestNeuronIdx = -1;

  constructor(nodeCount = 380) {
    this.group = new THREE.Group();

    // 1. Generate Neuron soma clusters
    for (let i = 0; i < nodeCount; i++) {
      const hemisphere = Math.random() > 0.5 ? 1 : -1;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 14;

      const x = (r * Math.sin(phi) * Math.cos(theta) * 0.85) + hemisphere * 4.5;
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.75;
      const z = r * Math.cos(phi) * 1.25;

      const cluster = hemisphere === 1 ? 0 : 1;
      const baseCol = hemisphere === 1 ? new THREE.Color(0x00f3ff) : new THREE.Color(0xbf5af2);

      this.neurons.push({
        position: new THREE.Vector3(x, y, z),
        cluster,
        charge: Math.random() * 0.5,
        baseColor: baseCol
      });
    }

    // 2. Connect nearby neurons with Synapses
    const axonVertices: number[] = [];
    const axonColors: number[] = [];

    for (let i = 0; i < this.neurons.length; i++) {
      let connections = 0;
      for (let j = i + 1; j < this.neurons.length; j++) {
        const dist = this.neurons[i].position.distanceTo(this.neurons[j].position);
        const isCorpusCallosum = this.neurons[i].cluster !== this.neurons[j].cluster && dist < 12;
        if (dist < 5.2 || (isCorpusCallosum && connections < 2)) {
          const p1 = this.neurons[i].position;
          const p2 = this.neurons[j].position;

          const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          mid.add(new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5
          ));

          const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
          this.synapses.push({ fromIdx: i, toIdx: j, curve });

          axonVertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
          axonColors.push(0.0, 0.4, 0.8, 0.0, 0.4, 0.8);
          connections++;
          if (connections > 6) break;
        }
      }
    }

    // 3. Create Instanced Neuron Soma Spheres
    const sphereGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.8
    });
    this.neuronMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, this.neurons.length);
    
    for (let i = 0; i < this.neurons.length; i++) {
      this.dummy.position.copy(this.neurons[i].position);
      this.dummy.scale.setScalar(0.8 + Math.random() * 0.5);
      this.dummy.updateMatrix();
      this.neuronMesh.setMatrixAt(i, this.dummy.matrix);
      this.neuronMesh.setColorAt(i, this.neurons[i].baseColor);
    }
    this.neuronMesh.instanceMatrix.needsUpdate = true;
    if (this.neuronMesh.instanceColor) this.neuronMesh.instanceColor.needsUpdate = true;
    this.group.add(this.neuronMesh);

    // 4. Create Axon Lines
    const axonGeo = new THREE.BufferGeometry();
    axonGeo.setAttribute('position', new THREE.Float32BufferAttribute(axonVertices, 3));
    axonGeo.setAttribute('color', new THREE.Float32BufferAttribute(axonColors, 3));
    const axonMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    this.axonLines = new THREE.LineSegments(axonGeo, axonMat);
    this.group.add(this.axonLines);

    // 5. Action Potential Signal Pulses
    const pulseGeo = new THREE.BufferGeometry();
    this.pulsePositions = new Float32Array(this.maxPulses * 3);
    this.pulseColors = new Float32Array(this.maxPulses * 3);
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(this.pulsePositions, 3));
    pulseGeo.setAttribute('color', new THREE.BufferAttribute(this.pulseColors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(0,255,157,0.9)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const sprite = new THREE.CanvasTexture(canvas);

    const pulseMat = new THREE.PointsMaterial({
      size: 0.6,
      map: sprite,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.pulsePoints = new THREE.Points(pulseGeo, pulseMat);
    this.group.add(this.pulsePoints);

    // Initial pulses
    for (let i = 0; i < 350; i++) {
      this.spawnPulse();
    }
  }

  public spawnPulse(originNodeIdx?: number, speedBoost = 1.0) {
    if (this.pulses.length >= this.maxPulses || this.synapses.length === 0) return;
    
    let synapseIdx = 0;
    if (originNodeIdx !== undefined) {
      const matching = this.synapses
        .map((s, idx) => (s.fromIdx === originNodeIdx || s.toIdx === originNodeIdx) ? idx : -1)
        .filter(idx => idx !== -1);

      if (matching.length > 0) {
        synapseIdx = matching[Math.floor(Math.random() * matching.length)];
      } else {
        synapseIdx = Math.floor(Math.random() * this.synapses.length);
      }
    } else {
      synapseIdx = Math.floor(Math.random() * this.synapses.length);
    }

    const syn = this.synapses[synapseIdx];
    const col = this.neurons[syn.fromIdx].cluster === 0 
      ? new THREE.Color(0x00f3ff) 
      : new THREE.Color(0x00ff9d);

    this.pulses.push({
      synapseIdx,
      progress: 0,
      speed: (0.7 + Math.random() * 0.9) * speedBoost,
      color: col
    });
  }

  // Interactive Local Burst at cursor click position
  public triggerLocalBurst(worldPoint: THREE.Vector3, count = 70) {
    // Find closest neurons
    const sorted = this.neurons
      .map((n, idx) => ({ idx, dist: n.position.distanceTo(worldPoint) }))
      .sort((a, b) => a.dist - b.dist);

    const targetCount = Math.min(6, sorted.length);
    for (let k = 0; k < targetCount; k++) {
      const nodeIdx = sorted[k].idx;
      this.neurons[nodeIdx].charge = 2.5; // Super high charge

      for (let p = 0; p < Math.floor(count / targetCount); p++) {
        this.spawnPulse(nodeIdx, 1.6);
      }
    }
  }

  // Highlight nearest neuron under cursor
  public setCursorInteraction(worldPoint: THREE.Vector3 | null) {
    if (!worldPoint) {
      this.nearestNeuronIdx = -1;
      return;
    }

    let nearest = -1;
    let minDist = 12.0;

    for (let i = 0; i < this.neurons.length; i++) {
      const d = this.neurons[i].position.distanceTo(worldPoint);
      if (d < minDist) {
        minDist = d;
        nearest = i;
      }
    }

    this.nearestNeuronIdx = nearest;
    if (nearest !== -1) {
      this.neurons[nearest].charge = Math.min(2.0, this.neurons[nearest].charge + 0.3);
      if (Math.random() < 0.25) {
        this.spawnPulse(nearest);
      }
    }
  }

  public triggerCascade(count = 35) {
    for (let i = 0; i < count; i++) {
      const randNode = Math.floor(Math.random() * this.neurons.length);
      this.neurons[randNode].charge = 1.0;
      this.spawnPulse(randNode);
    }
  }

  public update(delta: number, speedMultiplier: number, audioFreq: number) {
    const effectiveDelta = delta * speedMultiplier;

    this.group.rotation.y += 0.12 * effectiveDelta;
    this.group.rotation.x = Math.sin(Date.now() * 0.0005) * 0.1;

    if (audioFreq > 0.45 && Math.random() < audioFreq * 0.7) {
      this.triggerCascade(Math.floor(audioFreq * 15));
    }

    const pos = this.pulsePositions;
    const col = this.pulseColors;
    const activePulseCount = this.pulses.length;

    for (let i = activePulseCount - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.progress += p.speed * effectiveDelta * 1.8;

      if (p.progress >= 1.0) {
        const syn = this.synapses[p.synapseIdx];
        this.neurons[syn.toIdx].charge = Math.min(1.2, this.neurons[syn.toIdx].charge + 0.5);
        
        if (Math.random() < 0.35) {
          this.spawnPulse(syn.toIdx);
        }

        this.pulses.splice(i, 1);
        pos[i * 3] = 99999;
        continue;
      }

      const syn = this.synapses[p.synapseIdx];
      const pt = syn.curve.getPoint(p.progress);

      pos[i * 3] = pt.x;
      pos[i * 3 + 1] = pt.y;
      pos[i * 3 + 2] = pt.z;

      col[i * 3] = p.color.r;
      col[i * 3 + 1] = p.color.g;
      col[i * 3 + 2] = p.color.b;
    }

    for (let i = this.pulses.length; i < this.maxPulses; i++) {
      pos[i * 3] = 99999;
    }

    this.pulsePoints.geometry.attributes.position.needsUpdate = true;
    this.pulsePoints.geometry.attributes.color.needsUpdate = true;

    // Update neuron brightness and scale
    for (let i = 0; i < this.neurons.length; i++) {
      const neuron = this.neurons[i];
      neuron.charge = Math.max(0, neuron.charge - effectiveDelta * 1.2);
      
      const isTargeted = i === this.nearestNeuronIdx;
      const boost = 1.0 + neuron.charge * 4.0 + audioFreq * 1.5 + (isTargeted ? 3.0 : 0);
      const boostedColor = neuron.baseColor.clone().multiplyScalar(boost);
      if (isTargeted) {
        boostedColor.add(new THREE.Color(0.4, 0.4, 0.4));
      }
      this.neuronMesh.setColorAt(i, boostedColor);
    }
    if (this.neuronMesh.instanceColor) this.neuronMesh.instanceColor.needsUpdate = true;
  }

  public setTheme(theme: ColorTheme) {
    let colA = new THREE.Color(0x00f3ff);
    let colB = new THREE.Color(0xbf5af2);

    if (theme === 'solar-plasma') {
      colA = new THREE.Color(0xffaa00);
      colB = new THREE.Color(0xff0055);
    } else if (theme === 'deep-cosmos') {
      colA = new THREE.Color(0xbf5af2);
      colB = new THREE.Color(0x3b82f6);
    } else if (theme === 'hyper-neon') {
      colA = new THREE.Color(0x00ff9d);
      colB = new THREE.Color(0x00f3ff);
    } else if (theme === 'void-monochrome') {
      colA = new THREE.Color(0xffffff);
      colB = new THREE.Color(0x888888);
    }

    this.neurons.forEach(n => {
      n.baseColor = n.cluster === 0 ? colA : colB;
    });
  }

  public dispose() {
    this.neuronMesh.geometry.dispose();
    (this.neuronMesh.material as THREE.Material).dispose();
    this.axonLines.geometry.dispose();
    (this.axonLines.material as THREE.Material).dispose();
    this.pulsePoints.geometry.dispose();
    (this.pulsePoints.material as THREE.Material).dispose();
  }
}
