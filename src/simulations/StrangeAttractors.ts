import * as THREE from 'three';
import { ColorTheme } from '../types';

export class StrangeAttractors {
  public group: THREE.Group;
  private particleCount: number;
  private particles: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private attractorType: 'lorenz' | 'aizawa' | 'rossler' = 'lorenz';

  // Interactive Chaos Injections
  private burstOrigin: THREE.Vector3 | null = null;
  private burstIntensity = 0;
  private cursorPoint: THREE.Vector3 | null = null;
  private isCursorDown = false;

  constructor(particleCount = 30000) {
    this.particleCount = particleCount;
    this.group = new THREE.Group();

    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);

    this.resetParticles();

    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

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
    const sprite = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 0.32,
      map: sprite,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  public resetParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      this.positions[idx] = (Math.random() - 0.5) * 5;
      this.positions[idx + 1] = (Math.random() - 0.5) * 5 + (this.attractorType === 'lorenz' ? 20 : 0);
      this.positions[idx + 2] = (Math.random() - 0.5) * 5 + (this.attractorType === 'lorenz' ? 25 : 0);

      this.colors[idx] = 0.1;
      this.colors[idx + 1] = 0.8;
      this.colors[idx + 2] = 0.9;
    }
  }

  // Interactive Chaos Blast Trigger
  public injectChaosBurst(point: THREE.Vector3) {
    this.burstOrigin = point.clone();
    this.burstIntensity = 1.0;
  }

  // Continuous Cursor interaction
  public setCursorInteraction(point: THREE.Vector3 | null, isDown: boolean) {
    this.cursorPoint = point ? point.clone() : null;
    this.isCursorDown = isDown;
  }

  public cycleAttractor() {
    if (this.attractorType === 'lorenz') this.attractorType = 'aizawa';
    else if (this.attractorType === 'aizawa') this.attractorType = 'rossler';
    else this.attractorType = 'lorenz';
    this.resetParticles();
  }

  public getAttractorName() {
    return this.attractorType.toUpperCase();
  }

  public update(delta: number, speedMultiplier: number, audioFreq: number) {
    const effectiveDt = Math.min(delta, 0.05) * speedMultiplier * 0.5;
    const p = this.positions;
    const c = this.colors;
    const count = this.particleCount;

    if (this.burstIntensity > 0) {
      this.burstIntensity = Math.max(0, this.burstIntensity - effectiveDt * 3.0);
    }

    const sigma = 10;
    const rho = 28;
    const beta = 8 / 3;
    const a = 0.95, b = 0.7, cz = 0.6, d = 3.5, e = 0.25, f = 0.1;

    const burstPt = this.burstOrigin;
    const burstI = this.burstIntensity;
    const cursor = this.cursorPoint;
    const isDown = this.isCursorDown;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let x = p[idx];
      let y = p[idx + 1];
      let z = p[idx + 2];

      let dx = 0, dy = 0, dz = 0;

      if (this.attractorType === 'lorenz') {
        const rawZ = z + 25;
        dx = sigma * (y - x);
        dy = x * (rho - rawZ) - y;
        dz = x * y - beta * rawZ;

        const dt = effectiveDt * 0.45;
        x += dx * dt;
        y += dy * dt;
        z = (rawZ + dz * dt) - 25;

        if (isNaN(x) || Math.abs(x) > 60 || Math.abs(y) > 60 || z > 55 || z < -35) {
          x = (Math.random() - 0.5) * 2;
          y = (Math.random() - 0.5) * 2;
          z = (20 + Math.random() * 5) - 25;
        }
      } else if (this.attractorType === 'aizawa') {
        const ax = x / 10;
        const ay = y / 10;
        const az = z / 10;
        const dt = effectiveDt * 0.75;
        dx = (az - b) * ax - d * ay;
        dy = d * ax + (az - b) * ay;
        dz = cz + a * az - (az * az * az) / 3 - (ax * ax + ay * ay) * (1 + e * az) + f * az * (ax * ax * ax);

        const nx = ax + dx * dt;
        const ny = ay + dy * dt;
        const nz = az + dz * dt;

        if (isNaN(nx) || Math.abs(nx) > 10 || Math.abs(ny) > 10 || Math.abs(nz) > 10) {
          x = 1.0;
          y = 0.0;
          z = 0.0;
        } else {
          x = nx * 10;
          y = ny * 10;
          z = nz * 10;
        }
      } else {
        const rx = x / 1.4;
        const ry = y / 1.4;
        const rz = (z + 10) / 1.4;
        const ra = 0.2, rb = 0.2, rc = 5.7;
        const dt = effectiveDt * 0.5;
        dx = -ry - rz;
        dy = rx + ra * ry;
        dz = rb + rz * (rx - rc);

        const nx = rx + dx * dt;
        const ny = ry + dy * dt;
        const nz = rz + dz * dt;

        if (isNaN(nx) || Math.abs(nx) > 30 || Math.abs(ny) > 30 || nz > 40) {
          x = 0.1;
          y = 0.1;
          z = 0.1;
        } else {
          x = nx * 1.4;
          y = ny * 1.4;
          z = nz * 1.4 - 10;
        }
      }

      // Interactive Click Blast impulse
      if (burstI > 0 && burstPt) {
        const bdx = x - burstPt.x;
        const bdy = y - burstPt.y;
        const bdz = z - burstPt.z;
        const dist = Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz);
        if (dist < 18.0) {
          const push = (1.0 - dist / 18.0) * burstI * 8.0;
          x += (bdx / (dist + 0.1)) * push;
          y += (bdy / (dist + 0.1)) * push;
          z += (bdz / (dist + 0.1)) * push;
        }
      }

      // Interactive Continuous Cursor deflection
      if (cursor) {
        const cdx = x - cursor.x;
        const cdy = y - cursor.y;
        const cdz = z - cursor.z;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
        if (cdist < 14.0) {
          const pull = (1.0 - cdist / 14.0) * (isDown ? -3.0 : 1.8);
          x += (cdx / (cdist + 0.1)) * pull;
          y += (cdy / (cdist + 0.1)) * pull;
          z += (cdz / (cdist + 0.1)) * pull;
        }
      }

      p[idx] = x;
      p[idx + 1] = y;
      p[idx + 2] = z;

      const speed = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const normSpeed = Math.min(1.0, speed / 35.0);

      c[idx] = 0.1 + normSpeed * 0.9;
      c[idx + 1] = 0.3 + (1.0 - normSpeed) * 0.6;
      c[idx + 2] = 0.9 - normSpeed * 0.4;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;

    this.group.rotation.y += 0.25 * effectiveDt;
    this.group.rotation.x = Math.sin(Date.now() * 0.0008) * 0.2;
  }

  public setTheme(theme: ColorTheme) {
    // Dynamically colored
  }

  public dispose() {
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}
