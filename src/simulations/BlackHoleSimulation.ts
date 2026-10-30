import * as THREE from 'three';
import { ColorTheme } from '../types';

export class BlackHoleSimulation {
  public group: THREE.Group;
  private diskParticles: THREE.Points;
  private diskPositions: Float32Array;
  private diskVelocities: Float32Array;
  private diskRadii: Float32Array;
  private diskAngles: Float32Array;
  private diskSpeeds: Float32Array;
  private diskColors: Float32Array;

  private jetParticles: THREE.Points;
  private jetPositions: Float32Array;
  private jetVelocities: Float32Array;

  private spacetimeGrid: THREE.LineSegments;
  private eventHorizon: THREE.Mesh;
  private photonSphere: THREE.Mesh;
  private particleCount: number;

  // Interactive Gravitational Shockwave & Cursor Well
  private shockwaveOrigin: THREE.Vector3 | null = null;
  private shockwaveRadius = 0;
  private shockwaveIntensity = 0;
  private cursorPoint: THREE.Vector3 | null = null;
  private isCursorDown = false;

  constructor(particleCount: number = 24000) {
    this.particleCount = particleCount;
    this.group = new THREE.Group();

    // 1. Event Horizon (Solid black abyss)
    const horizonGeo = new THREE.SphereGeometry(3.2, 64, 64);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.eventHorizon = new THREE.Mesh(horizonGeo, horizonMat);
    this.group.add(this.eventHorizon);

    // 2. Photon Sphere (Intense luminous gravitational glow around horizon)
    const photonGeo = new THREE.SphereGeometry(3.45, 64, 64);
    const photonMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x00f3ff) },
        viewVector: { value: new THREE.Vector3() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 glowColor;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float intensity = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0) * 1.8;
          gl_FragColor = vec4(glowColor * intensity, intensity * 0.9);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    this.photonSphere = new THREE.Mesh(photonGeo, photonMat);
    this.group.add(this.photonSphere);

    // 3. Relativistic Accretion Disk Particles
    const diskGeo = new THREE.BufferGeometry();
    this.diskPositions = new Float32Array(this.particleCount * 3);
    this.diskVelocities = new Float32Array(this.particleCount);
    this.diskRadii = new Float32Array(this.particleCount);
    this.diskAngles = new Float32Array(this.particleCount);
    this.diskSpeeds = new Float32Array(this.particleCount);
    this.diskColors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const r = 3.6 + Math.pow(Math.random(), 1.8) * 22;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (0.15 + (r - 3.6) * 0.08);

      this.diskRadii[i] = r;
      this.diskAngles[i] = angle;
      this.diskSpeeds[i] = (2.2 / Math.sqrt(r)) * (0.95 + Math.random() * 0.1);

      this.diskPositions[i * 3] = Math.cos(angle) * r;
      this.diskPositions[i * 3 + 1] = height;
      this.diskPositions[i * 3 + 2] = Math.sin(angle) * r;

      const heat = Math.max(0, 1.0 - (r - 3.6) / 22);
      this.diskColors[i * 3] = 0.1 + heat * 0.9;
      this.diskColors[i * 3 + 1] = 0.4 + heat * 0.6;
      this.diskColors[i * 3 + 2] = 0.9 + heat * 0.1;
    }

    diskGeo.setAttribute('position', new THREE.BufferAttribute(this.diskPositions, 3));
    diskGeo.setAttribute('color', new THREE.BufferAttribute(this.diskColors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(0,243,255,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(canvas);

    const diskMat = new THREE.PointsMaterial({
      size: 0.32,
      map: particleTexture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });

    this.diskParticles = new THREE.Points(diskGeo, diskMat);
    this.group.add(this.diskParticles);

    // 4. Relativistic Polar Jets
    const jetCount = 2000;
    const jetGeo = new THREE.BufferGeometry();
    this.jetPositions = new Float32Array(jetCount * 3);
    this.jetVelocities = new Float32Array(jetCount * 3);
    const jetColors = new Float32Array(jetCount * 3);

    for (let i = 0; i < jetCount; i++) {
      const isNorth = Math.random() > 0.5 ? 1 : -1;
      const progress = Math.random();
      const height = (3.5 + progress * 30) * isNorth;
      const spread = (0.2 + progress * 2.5);
      const theta = Math.random() * Math.PI * 2;

      this.jetPositions[i * 3] = Math.cos(theta) * spread;
      this.jetPositions[i * 3 + 1] = height;
      this.jetPositions[i * 3 + 2] = Math.sin(theta) * spread;

      this.jetVelocities[i * 3] = (Math.random() - 0.5) * 0.1;
      this.jetVelocities[i * 3 + 1] = isNorth * (0.4 + Math.random() * 0.6);
      this.jetVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

      jetColors[i * 3] = 0.6 + Math.random() * 0.4;
      jetColors[i * 3 + 1] = 0.2;
      jetColors[i * 3 + 2] = 0.9;
    }

    jetGeo.setAttribute('position', new THREE.BufferAttribute(this.jetPositions, 3));
    jetGeo.setAttribute('color', new THREE.BufferAttribute(jetColors, 3));

    const jetMat = new THREE.PointsMaterial({
      size: 0.35,
      map: particleTexture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });
    this.jetParticles = new THREE.Points(jetGeo, jetMat);
    this.group.add(this.jetParticles);

    // 5. Spacetime Curvature Grid (Gravitational Well)
    this.spacetimeGrid = this.createSpacetimeGrid();
    this.group.add(this.spacetimeGrid);
  }

  private createSpacetimeGrid(): THREE.LineSegments {
    const gridSize = 44;
    const divisions = 44;
    const vertices: number[] = [];
    const colors: number[] = [];

    const getWellDepth = (x: number, z: number) => {
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 3.2) return -7;
      return -18 / Math.pow(dist, 0.95);
    };

    const half = gridSize / 2;
    const step = gridSize / divisions;

    for (let i = 0; i <= divisions; i++) {
      const z = -half + i * step;
      for (let j = 0; j < divisions; j++) {
        const x1 = -half + j * step;
        const x2 = x1 + step;
        const y1 = getWellDepth(x1, z);
        const y2 = getWellDepth(x2, z);

        vertices.push(x1, y1 - 2.5, z, x2, y2 - 2.5, z);
        const alpha1 = Math.min(1, Math.abs(y1) / 5);
        colors.push(0.0, 0.4 + alpha1 * 0.5, 0.8, 0.0, 0.4 + alpha1 * 0.5, 0.8);
      }
    }

    for (let i = 0; i <= divisions; i++) {
      const x = -half + i * step;
      for (let j = 0; j < divisions; j++) {
        const z1 = -half + j * step;
        const z2 = z1 + step;
        const y1 = getWellDepth(x, z1);
        const y2 = getWellDepth(x, z2);

        vertices.push(x, y1 - 2.5, z1, x, y2 - 2.5, z2);
        const alpha1 = Math.min(1, Math.abs(y1) / 5);
        colors.push(0.0, 0.4 + alpha1 * 0.5, 0.8, 0.0, 0.4 + alpha1 * 0.5, 0.8);
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

  // Interactive Trigger: Spawns expanding gravitational shockwave
  public triggerGravitationalShockwave(point: THREE.Vector3) {
    this.shockwaveOrigin = point.clone();
    this.shockwaveRadius = 0.5;
    this.shockwaveIntensity = 1.0;
  }

  // Continuous Cursor Gravitational Well
  public setCursorInteraction(point: THREE.Vector3 | null, isDown: boolean) {
    this.cursorPoint = point ? point.clone() : null;
    this.isCursorDown = isDown;
  }

  public update(
    delta: number,
    speedMultiplier: number,
    audioFreq: number,
    camera: THREE.Camera
  ) {
    const effectiveDelta = delta * speedMultiplier;

    // Expand shockwave
    if (this.shockwaveIntensity > 0) {
      this.shockwaveRadius += 28.0 * effectiveDelta;
      this.shockwaveIntensity = Math.max(0, this.shockwaveIntensity - effectiveDelta * 1.5);
    }

    // 1. Orbit Accretion Disk Particles with relativistic Doppler effect + interactive gravitational pull
    const pos = this.diskPositions;
    const count = this.particleCount;
    const camPos = camera.position;
    const cursor = this.cursorPoint;
    const shockOrigin = this.shockwaveOrigin;
    const shockR = this.shockwaveRadius;
    const shockI = this.shockwaveIntensity;

    for (let i = 0; i < count; i++) {
      this.diskAngles[i] += this.diskSpeeds[i] * effectiveDelta * 0.8;
      let r = this.diskRadii[i];
      let a = this.diskAngles[i];

      let x = Math.cos(a) * r;
      let z = Math.sin(a) * r;
      let y = pos[i * 3 + 1];

      // Interactive Shockwave perturbation
      if (shockI > 0 && shockOrigin) {
        const dx = x - shockOrigin.x;
        const dz = z - shockOrigin.z;
        const distToShock = Math.sqrt(dx * dx + dz * dz);
        const diff = Math.abs(distToShock - shockR);
        if (diff < 3.5) {
          const waveHeight = (1.0 - diff / 3.5) * shockI * 4.5;
          y += Math.sin(diff * 2.0) * waveHeight;
        }
      }

      // Interactive Cursor Attraction Well
      if (cursor) {
        const cdx = cursor.x - x;
        const cdz = cursor.z - z;
        const cdist = Math.sqrt(cdx * cdx + cdz * cdz);
        if (cdist < 14) {
          const force = (1.0 - cdist / 14) * (this.isCursorDown ? 2.5 : 1.0);
          x += (cdx / (cdist + 0.1)) * force * 1.2;
          z += (cdz / (cdist + 0.1)) * force * 1.2;
          y += Math.sin(cdist * 1.5) * force * 0.8;
        }
      }

      // Audio reactive undulation
      const audioWave = Math.sin(a * 4 + r * 0.5) * (audioFreq * 0.6);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y + audioWave;
      pos[i * 3 + 2] = z;

      // Doppler beaming calculation
      const vx = -Math.sin(a);
      const vz = Math.cos(a);
      const toCamX = camPos.x - x;
      const toCamZ = camPos.z - z;
      const len = Math.sqrt(toCamX * toCamX + toCamZ * toCamZ) || 1;
      const dot = (vx * (toCamX / len) + vz * (toCamZ / len));

      const dopplerBoost = 1.0 + dot * 0.45;
      const heat = Math.max(0, 1.0 - (r - 3.6) / 22);

      // Boost brightness near shockwave or cursor
      let shockBoost = 1.0;
      if (shockI > 0 && shockOrigin) {
        const dx = x - shockOrigin.x;
        const dz = z - shockOrigin.z;
        const distToShock = Math.sqrt(dx * dx + dz * dz);
        if (Math.abs(distToShock - shockR) < 3.0) {
          shockBoost = 1.0 + shockI * 1.8;
        }
      }

      this.diskColors[i * 3] = THREE.MathUtils.clamp((0.15 + heat * 0.85) * (dopplerBoost < 1 ? 1.3 : 0.8) * shockBoost, 0, 1);
      this.diskColors[i * 3 + 1] = THREE.MathUtils.clamp((0.4 + heat * 0.6) * dopplerBoost * shockBoost, 0, 1);
      this.diskColors[i * 3 + 2] = THREE.MathUtils.clamp((0.9 + heat * 0.1) * (dopplerBoost > 1 ? 1.4 : 0.7) * shockBoost, 0, 1);
    }

    this.diskParticles.geometry.attributes.position.needsUpdate = true;
    this.diskParticles.geometry.attributes.color.needsUpdate = true;

    // 2. Animate Relativistic Polar Jets
    const jetP = this.jetPositions;
    const jetCount = jetP.length / 3;
    for (let i = 0; i < jetCount; i++) {
      const idx = i * 3;
      jetP[idx + 1] += this.jetVelocities[idx + 1] * effectiveDelta * 12;

      const rad = Math.sqrt(jetP[idx] * jetP[idx] + jetP[idx + 2] * jetP[idx + 2]);
      const curAngle = Math.atan2(jetP[idx + 2], jetP[idx]) + 0.05 * effectiveDelta * 10;
      jetP[idx] = Math.cos(curAngle) * rad;
      jetP[idx + 2] = Math.sin(curAngle) * rad;

      if (Math.abs(jetP[idx + 1]) > 35) {
        const isNorth = jetP[idx + 1] > 0 ? 1 : -1;
        jetP[idx + 1] = isNorth * 3.4;
        jetP[idx] = (Math.random() - 0.5) * 0.4;
        jetP[idx + 2] = (Math.random() - 0.5) * 0.4;
      }
    }
    this.jetParticles.geometry.attributes.position.needsUpdate = true;

    // 3. Photon sphere pulse
    const scale = 1.0 + Math.sin(Date.now() * 0.003) * 0.02 + audioFreq * 0.08 + (this.shockwaveIntensity * 0.3);
    this.photonSphere.scale.set(scale, scale, scale);

    // Slowly rotate gravitational grid
    this.spacetimeGrid.rotation.y += 0.02 * effectiveDelta;
  }

  public setTheme(theme: ColorTheme) {
    let photonCol = new THREE.Color(0x00f3ff);
    if (theme === 'solar-plasma') photonCol = new THREE.Color(0xffaa00);
    else if (theme === 'deep-cosmos') photonCol = new THREE.Color(0xbf5af2);
    else if (theme === 'hyper-neon') photonCol = new THREE.Color(0x00ff9d);
    else if (theme === 'void-monochrome') photonCol = new THREE.Color(0xffffff);

    const mat = this.photonSphere.material as THREE.ShaderMaterial;
    if (mat.uniforms && mat.uniforms.glowColor) {
      mat.uniforms.glowColor.value = photonCol;
    }
  }

  public dispose() {
    this.diskParticles.geometry.dispose();
    (this.diskParticles.material as THREE.Material).dispose();
    this.jetParticles.geometry.dispose();
    (this.jetParticles.material as THREE.Material).dispose();
    this.eventHorizon.geometry.dispose();
    (this.eventHorizon.material as THREE.Material).dispose();
    this.photonSphere.geometry.dispose();
    (this.photonSphere.material as THREE.Material).dispose();
    this.spacetimeGrid.geometry.dispose();
    (this.spacetimeGrid.material as THREE.Material).dispose();
  }
}
