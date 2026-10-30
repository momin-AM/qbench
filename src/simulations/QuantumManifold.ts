import * as THREE from 'three';
import { ColorTheme } from '../types';

export class QuantumManifold {
  public group: THREE.Group;
  private manifoldMesh: THREE.LineSegments;
  private waveCloud: THREE.Points;
  private wavePositions: Float32Array;
  private waveColors: Float32Array;
  private initialRadii: Float32Array;
  private thetas: Float32Array;
  private phis: Float32Array;
  private quantumNumbers: Int8Array;

  private rot4D = 0;
  private particleCount: number;

  // Interactive Quantum Shockwave
  private shockOrigin: THREE.Vector3 | null = null;
  private shockRadius = 0;
  private shockIntensity = 0;
  private cursorPoint: THREE.Vector3 | null = null;

  constructor(particleCount = 20000) {
    this.particleCount = particleCount;
    this.group = new THREE.Group();

    // 1. Higher-Dimensional Calabi-Yau Parametric Lattice Grid
    this.manifoldMesh = this.generateCalabiYauWireframe();
    this.group.add(this.manifoldMesh);

    // 2. Quantum Probability Density Cloud
    const cloudGeo = new THREE.BufferGeometry();
    this.wavePositions = new Float32Array(this.particleCount * 3);
    this.waveColors = new Float32Array(this.particleCount * 3);
    this.initialRadii = new Float32Array(this.particleCount);
    this.thetas = new Float32Array(this.particleCount);
    this.phis = new Float32Array(this.particleCount);
    this.quantumNumbers = new Int8Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI;
      const phi = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.6) * 14;
      const qMode = Math.floor(Math.random() * 4);

      this.thetas[i] = theta;
      this.phis[i] = phi;
      this.initialRadii[i] = r;
      this.quantumNumbers[i] = qMode;

      this.wavePositions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      this.wavePositions[i * 3 + 1] = r * Math.cos(theta);
      this.wavePositions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);

      this.waveColors[i * 3] = 0.2 + 0.8 * Math.abs(Math.cos(phi));
      this.waveColors[i * 3 + 1] = 0.5 + 0.5 * Math.sin(theta);
      this.waveColors[i * 3 + 2] = 0.9;
    }

    cloudGeo.setAttribute('position', new THREE.BufferAttribute(this.wavePositions, 3));
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(this.waveColors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(191,90,242,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const sprite = new THREE.CanvasTexture(canvas);

    const cloudMat = new THREE.PointsMaterial({
      size: 0.35,
      map: sprite,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.waveCloud = new THREE.Points(cloudGeo, cloudMat);
    this.group.add(this.waveCloud);
  }

  private generateCalabiYauWireframe(): THREE.LineSegments {
    const uSegments = 45;
    const vSegments = 45;
    const vertices: number[] = [];
    const colors: number[] = [];

    const evalCY = (u: number, v: number, alpha: number) => {
      const n = 5;
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const r1 = Math.pow(Math.abs(cosU), 2 / n);
      const r2 = Math.pow(Math.abs(sinU), 2 / n);

      const x = (r1 * cosV) * 8.5;
      const y = (r2 * sinV) * 8.5;
      const z = (Math.sin(u * n) * Math.cos(v * n) + Math.cos(alpha) * 2.5);

      return new THREE.Vector3(x, y, z);
    };

    for (let i = 0; i < uSegments; i++) {
      const u1 = (i / uSegments) * Math.PI;
      const u2 = ((i + 1) / uSegments) * Math.PI;

      for (let j = 0; j < vSegments; j++) {
        const v1 = (j / vSegments) * Math.PI * 2;
        const v2 = ((j + 1) / vSegments) * Math.PI * 2;

        const p00 = evalCY(u1, v1, 0);
        const p10 = evalCY(u2, v1, 0);
        const p01 = evalCY(u1, v2, 0);

        vertices.push(p00.x, p00.y, p00.z, p10.x, p10.y, p10.z);
        vertices.push(p00.x, p00.y, p00.z, p01.x, p01.y, p01.z);

        const col = 0.5 + 0.5 * Math.sin(u1 * 3);
        colors.push(0.1, 0.8, col, 0.1, 0.8, col);
        colors.push(0.8, 0.2, col, 0.8, 0.2, col);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    return new THREE.LineSegments(geo, mat);
  }

  // Interactive Quantum Shockwave
  public injectPerturbation(point: THREE.Vector3) {
    this.shockOrigin = point.clone();
    this.shockRadius = 0.1;
    this.shockIntensity = 1.0;
  }

  // Continuous cursor probe
  public setCursorInteraction(point: THREE.Vector3 | null) {
    this.cursorPoint = point ? point.clone() : null;
  }

  public update(delta: number, speedMultiplier: number, audioFreq: number) {
    const effectiveDelta = delta * speedMultiplier;
    this.rot4D += effectiveDelta * 0.7;

    // Expand shockwave
    if (this.shockIntensity > 0) {
      this.shockRadius += 32.0 * effectiveDelta;
      this.shockIntensity = Math.max(0, this.shockIntensity - effectiveDelta * 1.6);
    }

    // 4D Rotation of Calabi-Yau Wireframe + shock burst
    const rotSpeedBoost = 1.0 + this.shockIntensity * 3.0;
    this.manifoldMesh.rotation.x += 0.2 * effectiveDelta * rotSpeedBoost;
    this.manifoldMesh.rotation.y += 0.35 * effectiveDelta * rotSpeedBoost;
    this.manifoldMesh.rotation.z += 0.15 * effectiveDelta * rotSpeedBoost;

    const scale = 1.0 + audioFreq * 0.3 + this.shockIntensity * 0.4;
    this.manifoldMesh.scale.set(scale, scale, scale);

    const pos = this.wavePositions;
    const col = this.waveColors;
    const time = this.rot4D;
    const shockOrigin = this.shockOrigin;
    const shockR = this.shockRadius;
    const shockI = this.shockIntensity;
    const cursor = this.cursorPoint;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const th = this.thetas[i];
      const ph = this.phis[i] + time * 0.5;
      const baseR = this.initialRadii[i];
      const mode = this.quantumNumbers[i];

      let harmonicMod = 1.0;
      if (mode === 1) {
        harmonicMod = Math.abs(Math.cos(th)) * 2.2;
      } else if (mode === 2) {
        harmonicMod = Math.abs(3 * Math.cos(th) * Math.cos(th) - 1.0) * 1.5;
      } else if (mode === 3) {
        harmonicMod = Math.abs(Math.sin(3 * th) * Math.cos(3 * ph)) * 2.0;
      }

      const radialPulse = 1.0 + 0.3 * Math.sin(baseR * 0.8 - time * 2.5 + audioFreq * 4.0);
      let r = baseR * harmonicMod * radialPulse;

      let px = r * Math.sin(th) * Math.cos(ph);
      let py = r * Math.cos(th);
      let pz = r * Math.sin(th) * Math.sin(ph);

      // Interactive Shockwave displacement
      if (shockI > 0 && shockOrigin) {
        const dx = px - shockOrigin.x;
        const dy = py - shockOrigin.y;
        const dz = pz - shockOrigin.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const diff = Math.abs(d - shockR);
        if (diff < 3.0) {
          const push = (1.0 - diff / 3.0) * shockI * 6.0;
          px += (dx / (d + 0.1)) * push;
          py += (dy / (d + 0.1)) * push;
          pz += (dz / (d + 0.1)) * push;
        }
      }

      // Interactive Cursor probe deflection
      let nearCursor = false;
      if (cursor) {
        const cdx = px - cursor.x;
        const cdy = py - cursor.y;
        const cdz = pz - cursor.z;
        const cd = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
        if (cd < 8.0) {
          nearCursor = true;
          const force = (1.0 - cd / 8.0) * 3.5;
          px += (cdx / (cd + 0.1)) * force;
          py += (cdy / (cd + 0.1)) * force;
          pz += (cdz / (cd + 0.1)) * force;
        }
      }

      pos[idx] = px;
      pos[idx + 1] = py;
      pos[idx + 2] = pz;

      const phase = (Math.atan2(pz, px) + Math.PI) / (Math.PI * 2);
      if (nearCursor) {
        col[idx] = 1.0;
        col[idx + 1] = 1.0;
        col[idx + 2] = 1.0;
      } else {
        col[idx] = Math.sin(phase * Math.PI * 2 + time) * 0.5 + 0.5;
        col[idx + 1] = Math.sin(phase * Math.PI * 2 + time + 2.09) * 0.5 + 0.5;
        col[idx + 2] = Math.sin(phase * Math.PI * 2 + time + 4.18) * 0.5 + 0.5;
      }
    }

    this.waveCloud.geometry.attributes.position.needsUpdate = true;
    this.waveCloud.geometry.attributes.color.needsUpdate = true;
  }

  public setTheme(theme: ColorTheme) {
    const mat = this.waveCloud.material as THREE.PointsMaterial;
    if (theme === 'solar-plasma') {
      mat.color.setHex(0xffaa00);
    } else if (theme === 'deep-cosmos') {
      mat.color.setHex(0xbf5af2);
    } else if (theme === 'hyper-neon') {
      mat.color.setHex(0x00ff9d);
    } else if (theme === 'void-monochrome') {
      mat.color.setHex(0xffffff);
    } else {
      mat.color.setHex(0x00f3ff);
    }
  }

  public dispose() {
    this.manifoldMesh.geometry.dispose();
    (this.manifoldMesh.material as THREE.Material).dispose();
    this.waveCloud.geometry.dispose();
    (this.waveCloud.material as THREE.Material).dispose();
  }
}
