import * as THREE from 'three';
import { ColorTheme } from '../types';

interface Building {
  mesh: THREE.Mesh;
  baseHeight: number;
  eqIndex: number;
  highlightIntensity: number;
}

export class CyberpunkGrid {
  public group: THREE.Group;
  private gridHelper: THREE.GridHelper;
  private buildings: Building[] = [];
  private lightCycleTrails: THREE.Line[];
  private rainParticles: THREE.Points;
  private rainPositions: Float32Array;
  private rainCount = 4000;

  // Interactive EMP wave
  private empOrigin: THREE.Vector3 | null = null;
  private empRadius = 0;
  private empIntensity = 0;
  private cursorPoint: THREE.Vector3 | null = null;

  constructor() {
    this.group = new THREE.Group();

    // 1. Neon Grid Floor
    const size = 300;
    const divisions = 60;
    this.gridHelper = new THREE.GridHelper(size, divisions, 0x00f3ff, 0x1e1b4b);
    this.gridHelper.position.y = -0.1;
    this.group.add(this.gridHelper);

    const floorGeo = new THREE.PlaneGeometry(size, size);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x030712,
      depthWrite: false
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.2;
    this.group.add(floor);

    // 2. Procedural City Spires
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const edgeGeo = new THREE.EdgesGeometry(buildingGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.85
    });

    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x070b19,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x020617,
    });

    const citySpread = 120;
    const buildingCount = 90;

    for (let i = 0; i < buildingCount; i++) {
      const x = (Math.random() - 0.5) * citySpread;
      const z = (Math.random() - 0.5) * citySpread;
      
      if (Math.abs(x) < 8 && Math.abs(z) < 20) continue;

      const baseHeight = 5 + Math.random() * 28;
      const width = 2.5 + Math.random() * 4;
      const depth = 2.5 + Math.random() * 4;

      const bMesh = new THREE.Mesh(buildingGeo, buildingMat.clone());
      bMesh.scale.set(width, baseHeight, depth);
      bMesh.position.set(x, baseHeight / 2, z);

      const edges = new THREE.LineSegments(edgeGeo, edgeMat.clone());
      bMesh.add(edges);

      this.group.add(bMesh);
      this.buildings.push({
        mesh: bMesh,
        baseHeight,
        eqIndex: i % 32,
        highlightIntensity: 0
      });
    }

    // 3. Digital Cyber Rain
    const rainGeo = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.rainCount * 3);
    const rainColors = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 140;
      this.rainPositions[i * 3 + 1] = Math.random() * 60;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 140;

      rainColors[i * 3] = 0.0;
      rainColors[i * 3 + 1] = 0.9;
      rainColors[i * 3 + 2] = 0.8;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    rainGeo.setAttribute('color', new THREE.BufferAttribute(rainColors, 3));

    const rainMat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.group.add(this.rainParticles);

    // 4. Light Cycle High-Speed Trails
    this.lightCycleTrails = [];
    const trailColors = [0x00f3ff, 0xbf5af2, 0x00ff9d, 0xff007f];
    for (let i = 0; i < 4; i++) {
      const pts = [
        new THREE.Vector3(-60 + i * 40, 0.4, -80),
        new THREE.Vector3(-60 + i * 40, 0.4, 80)
      ];
      const trailGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const trailMat = new THREE.LineBasicMaterial({
        color: trailColors[i % trailColors.length],
        linewidth: 3,
        blending: THREE.AdditiveBlending
      });
      const trail = new THREE.Line(trailGeo, trailMat);
      this.group.add(trail);
      this.lightCycleTrails.push(trail);
    }
  }

  // Interactive EMP Shockwave
  public triggerEMP(point: THREE.Vector3) {
    this.empOrigin = point.clone();
    this.empRadius = 1.0;
    this.empIntensity = 1.0;
  }

  // Continuous cursor hover detection
  public setCursorInteraction(point: THREE.Vector3 | null) {
    this.cursorPoint = point ? point.clone() : null;
  }

  public update(delta: number, speedMultiplier: number, audioFreq: number) {
    const effectiveDelta = delta * speedMultiplier;

    // Expand EMP wave
    if (this.empIntensity > 0) {
      this.empRadius += 40.0 * effectiveDelta;
      this.empIntensity = Math.max(0, this.empIntensity - effectiveDelta * 1.5);
    }

    // 1. Digital Rain falling
    const rPos = this.rainPositions;
    for (let i = 0; i < this.rainCount; i++) {
      const idx = i * 3;
      rPos[idx + 1] -= (25 + audioFreq * 20) * effectiveDelta;
      if (rPos[idx + 1] < 0) {
        rPos[idx + 1] = 60;
      }
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true;

    // 2. Skyscrapers equalize with audio spectrum + react to EMP and Cursor
    const cursor = this.cursorPoint;
    const empOrigin = this.empOrigin;
    const empR = this.empRadius;
    const empI = this.empIntensity;

    this.buildings.forEach((b) => {
      let extraHeight = 0;
      let isNearCursor = false;

      // EMP wave interaction
      if (empI > 0 && empOrigin) {
        const dx = b.mesh.position.x - empOrigin.x;
        const dz = b.mesh.position.z - empOrigin.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (Math.abs(dist - empR) < 6.0) {
          b.highlightIntensity = 1.0;
          extraHeight += empI * 20.0;
        }
      }

      // Cursor proximity interaction
      if (cursor) {
        const dx = b.mesh.position.x - cursor.x;
        const dz = b.mesh.position.z - cursor.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 15.0) {
          isNearCursor = true;
          const factor = 1.0 - dist / 15.0;
          extraHeight += factor * 14.0;
          b.highlightIntensity = Math.max(b.highlightIntensity, factor);
        }
      }

      b.highlightIntensity = Math.max(0, b.highlightIntensity - effectiveDelta * 2.0);

      const audioScale = 1.0 + Math.sin(Date.now() * 0.005 + b.eqIndex) * 0.15 + audioFreq * 0.7;
      const finalH = b.baseHeight * audioScale + extraHeight;
      b.mesh.scale.y = finalH;
      b.mesh.position.y = finalH / 2;

      // Highlight materials
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      if (b.highlightIntensity > 0.05) {
        mat.emissive.setRGB(0, 0.8 * b.highlightIntensity, 1.0 * b.highlightIntensity);
      } else {
        mat.emissive.setHex(0x020617);
      }
    });

    // 3. Grid pulsation
    this.gridHelper.position.z = (this.gridHelper.position.z + 18 * effectiveDelta) % 10;
  }

  public setTheme(theme: ColorTheme) {
    let col = 0x00f3ff;
    if (theme === 'solar-plasma') col = 0xffaa00;
    else if (theme === 'deep-cosmos') col = 0xbf5af2;
    else if (theme === 'hyper-neon') col = 0x00ff9d;
    else if (theme === 'void-monochrome') col = 0xffffff;

    this.gridHelper.material.dispose();
    this.group.remove(this.gridHelper);
    this.gridHelper = new THREE.GridHelper(300, 60, col, 0x1e1b4b);
    this.group.add(this.gridHelper);
  }

  public dispose() {
    this.gridHelper.geometry.dispose();
    this.buildings.forEach(b => {
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    });
    this.rainParticles.geometry.dispose();
    (this.rainParticles.material as THREE.Material).dispose();
  }
}
