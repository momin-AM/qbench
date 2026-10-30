import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SimulationMode, ColorTheme, CameraMode, SimulationParams, TelemetryData } from '../types';
import { BlackHoleSimulation } from '../simulations/BlackHoleSimulation';
import { NeuralConnectome } from '../simulations/NeuralConnectome';
import { QuantumManifold } from '../simulations/QuantumManifold';
import { CyberpunkGrid } from '../simulations/CyberpunkGrid';
import { StrangeAttractors } from '../simulations/StrangeAttractors';
import { soundEngine } from '../audio/SoundEngine';

interface ThreeCanvasProps {
  mode: SimulationMode;
  theme: ColorTheme;
  cameraMode: CameraMode;
  params: SimulationParams;
  audioFreq: number;
  onTelemetryUpdate: (data: TelemetryData) => void;
  onCameraInteracted?: () => void;
}

interface Spark {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  mode,
  theme,
  cameraMode,
  params,
  audioFreq,
  onTelemetryUpdate,
  onCameraInteracted,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live refs to eliminate stale closure bugs in animate & event listeners
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const themeRef = useRef(theme);
  themeRef.current = theme;

  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const audioFreqRef = useRef(audioFreq);
  audioFreqRef.current = audioFreq;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const blackHoleRef = useRef<BlackHoleSimulation | null>(null);
  const neuralRef = useRef<NeuralConnectome | null>(null);
  const quantumRef = useRef<QuantumManifold | null>(null);
  const cyberpunkRef = useRef<CyberpunkGrid | null>(null);
  const strangeRef = useRef<StrangeAttractors | null>(null);

  // 3D Raycasting & Holographic Reticle
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseNdcRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const interactionPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const reticleRef = useRef<THREE.Group | null>(null);
  const currentIntersectRef = useRef<THREE.Vector3 | null>(null);

  // Shockwave Rings & Burst Sparks
  const activeShockwavesRef = useRef<ShockwaveRing[]>([]);
  const activeSparksRef = useRef<Spark[]>([]);
  const sparkPointsRef = useRef<THREE.Points | null>(null);
  const sparkPositionsRef = useRef<Float32Array>(new Float32Array(300 * 3));
  const sparkColorsRef = useRef<Float32Array>(new Float32Array(300 * 3));

  // Interaction feedback toast state
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; time: number } | null>(null);

  // Interaction & Camera control state
  const mouseRef = useRef<{
    x: number;
    y: number;
    isDown: boolean;
    lastX: number;
    lastY: number;
    hasDragged: boolean;
  }>({
    x: 0,
    y: 0,
    isDown: false,
    lastX: 0,
    lastY: 0,
    hasDragged: false,
  });

  const cameraAnglesRef = useRef<{
    theta: number;
    phi: number;
    radius: number;
    targetTheta: number;
    targetPhi: number;
    targetRadius: number;
  }>({
    theta: 0.8,
    phi: 1.2,
    radius: 38,
    targetTheta: 0.8,
    targetPhi: 1.2,
    targetRadius: 38,
  });

  const isUserOrbitingRef = useRef(false);

  // Setup WebGL Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);
    scene.fog = new THREE.FogExp2(0x02040a, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 15, 38);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
      stencil: false,
      depth: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f3ff, 2.5, 100);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // 1. Holographic 3D Interactive Cursor Reticle
    const reticle = new THREE.Group();
    const reticleGeo = new THREE.RingGeometry(0.8, 0.95, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const reticleRing = new THREE.Mesh(reticleGeo, reticleMat);
    reticleRing.rotation.x = -Math.PI / 2;
    reticle.add(reticleRing);

    // Crosshairs
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.6, 0, 0),
      new THREE.Vector3(1.6, 0, 0),
      new THREE.Vector3(0, 0, -1.6),
      new THREE.Vector3(0, 0, 1.6),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00ff9d,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const crosshair = new THREE.LineSegments(lineGeo, lineMat);
    reticle.add(crosshair);

    reticle.position.set(0, -999, 0);
    scene.add(reticle);
    reticleRef.current = reticle;

    // 2. Burst Sparks Points
    const sparkGeo = new THREE.BufferGeometry();
    sparkPositionsRef.current.fill(9999);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositionsRef.current, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColorsRef.current, 3));

    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 32;
    sparkCanvas.height = 32;
    const sctx = sparkCanvas.getContext('2d')!;
    const sgrad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    sgrad.addColorStop(0, '#ffffff');
    sgrad.addColorStop(0.3, '#00f3ff');
    sgrad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 32, 32);
    const sparkTex = new THREE.CanvasTexture(sparkCanvas);

    const sparkMat = new THREE.PointsMaterial({
      size: 0.6,
      map: sparkTex,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkPoints);
    sparkPointsRef.current = sparkPoints;

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Spawn 3D Shockwave Ring Function
    const spawnShockwave = (origin: THREE.Vector3, color = 0x00f3ff) => {
      const ringGeo = new THREE.RingGeometry(0.2, 0.6, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(origin);
      ringMesh.rotation.x = -Math.PI / 2;
      scene.add(ringMesh);

      activeShockwavesRef.current.push({
        mesh: ringMesh,
        radius: 0.5,
        maxRadius: 28,
        alpha: 1.0,
      });

      // Spawn 40 Sparks
      for (let i = 0; i < 40; i++) {
        if (activeSparksRef.current.length >= 300) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = 8 + Math.random() * 22;
        activeSparksRef.current.push({
          position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.5)),
          velocity: new THREE.Vector3(Math.cos(angle) * speed, (Math.random() - 0.2) * 14, Math.sin(angle) * speed),
          life: 1.0,
          maxLife: 0.8 + Math.random() * 0.6,
          color: new THREE.Color(color).offsetHSL((Math.random() - 0.5) * 0.1, 0, 0.2),
        });
      }
    };

    // Pointer Interaction Listeners
    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDown = true;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
      mouseRef.current.hasDragged = false;
      isUserOrbitingRef.current = true;

      // Notify parent to switch camera mode from cinematic to orbit if user interacts
      if (onCameraInteracted) onCameraInteracted();

      // Trigger 3D interaction at raycast point
      const pt = currentIntersectRef.current || new THREE.Vector3(0, 0, 0);
      spawnShockwave(pt);

      const curMode = modeRef.current;
      if (curMode === 'blackhole' && blackHoleRef.current) {
        blackHoleRef.current.triggerGravitationalShockwave(pt);
        blackHoleRef.current.setCursorInteraction(pt, true);
        soundEngine.playSingularityPulse();
        setFeedbackToast({ text: '✦ GRAVITATIONAL SHOCKWAVE INJECTED', time: Date.now() });
      } else if (curMode === 'neural' && neuralRef.current) {
        neuralRef.current.triggerLocalBurst(pt, 80);
        soundEngine.playPluck(0.8);
        setFeedbackToast({ text: '✦ SYNAPTIC ACTION POTENTIAL CASCADE FIRED', time: Date.now() });
      } else if (curMode === 'quantum' && quantumRef.current) {
        quantumRef.current.injectPerturbation(pt);
        soundEngine.playWarp();
        setFeedbackToast({ text: '✦ QUANTUM WAVEFUNCTION PERTURBED', time: Date.now() });
      } else if (curMode === 'cyberpunk' && cyberpunkRef.current) {
        cyberpunkRef.current.triggerEMP(pt);
        soundEngine.playBlip(1.4);
        setFeedbackToast({ text: '✦ NEON EMP SHOCKWAVE PROPAGATED', time: Date.now() });
      } else if (curMode === 'chaos' && strangeRef.current) {
        strangeRef.current.injectChaosBurst(pt);
        strangeRef.current.setCursorInteraction(pt, true);
        soundEngine.playPluck(0.9);
        setFeedbackToast({ text: '✦ CHAOS ENTROPY IMPULSE APPLIED', time: Date.now() });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseNdcRef.current.set(ndcX, ndcY);

      // Raycast to interaction plane
      if (cameraRef.current) {
        raycasterRef.current.setFromCamera(mouseNdcRef.current, cameraRef.current);
        const intersectPt = new THREE.Vector3();
        const hit = raycasterRef.current.ray.intersectPlane(interactionPlaneRef.current, intersectPt);
        if (hit) {
          currentIntersectRef.current = intersectPt;
          if (reticleRef.current) {
            reticleRef.current.position.copy(intersectPt);
          }

          // Real-time cursor feedback into simulations using live modeRef
          const curMode = modeRef.current;
          if (curMode === 'blackhole' && blackHoleRef.current) {
            blackHoleRef.current.setCursorInteraction(intersectPt, mouseRef.current.isDown);
          } else if (curMode === 'neural' && neuralRef.current) {
            neuralRef.current.setCursorInteraction(intersectPt);
          } else if (curMode === 'quantum' && quantumRef.current) {
            quantumRef.current.setCursorInteraction(intersectPt);
          } else if (curMode === 'cyberpunk' && cyberpunkRef.current) {
            cyberpunkRef.current.setCursorInteraction(intersectPt);
          } else if (curMode === 'chaos' && strangeRef.current) {
            strangeRef.current.setCursorInteraction(intersectPt, mouseRef.current.isDown);
          }
        }
      }

      if (mouseRef.current.isDown) {
        mouseRef.current.hasDragged = true;
        const dx = e.clientX - mouseRef.current.lastX;
        const dy = e.clientY - mouseRef.current.lastY;

        // Smoothly adjust target camera orbit angles
        const angles = cameraAnglesRef.current;
        angles.targetTheta -= dx * 0.008;
        angles.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, angles.targetPhi - dy * 0.008));

        mouseRef.current.lastX = e.clientX;
        mouseRef.current.lastY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      mouseRef.current.isDown = false;
      const curMode = modeRef.current;
      if (curMode === 'blackhole' && blackHoleRef.current) {
        blackHoleRef.current.setCursorInteraction(currentIntersectRef.current, false);
      } else if (curMode === 'chaos' && strangeRef.current) {
        strangeRef.current.setCursorInteraction(currentIntersectRef.current, false);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      isUserOrbitingRef.current = true;
      if (onCameraInteracted) onCameraInteracted();

      const angles = cameraAnglesRef.current;
      angles.targetRadius = Math.max(8, Math.min(95, angles.targetRadius + e.deltaY * 0.04));
      soundEngine.playBlip(1.1);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Animation & Telemetry Loop
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimeAccum = 0;
    let measuredFps = 60;

    const animate = (time: number) => {
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const curMode = modeRef.current;
      const curSpeed = paramsRef.current.speed;
      const curAudio = audioFreqRef.current;
      const curCamMode = cameraModeRef.current;

      // Telemetry calculation
      frameCount++;
      fpsTimeAccum += delta;
      if (fpsTimeAccum >= 0.5) {
        measuredFps = Math.round(frameCount / fpsTimeAccum);
        frameCount = 0;
        fpsTimeAccum = 0;

        let activeParticles = 0;
        if (curMode === 'blackhole') activeParticles = 26000;
        else if (curMode === 'neural') activeParticles = 2200;
        else if (curMode === 'quantum') activeParticles = 20000;
        else if (curMode === 'cyberpunk') activeParticles = 8000;
        else if (curMode === 'chaos') activeParticles = 30000;

        const memInfo = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const memMb = memInfo ? Math.round(memInfo.usedJSHeapSize / (1024 * 1024)) : 72;

        onTelemetryUpdate({
          fps: measuredFps,
          frameTime: Math.round(delta * 1000 * 10) / 10,
          activeParticles,
          webglDrawCalls: renderer.info.render.calls,
          memoryUsageMb: memMb,
          audioFrequencyAverage: curAudio,
        });
      }

      // 3D Reticle rotation & pulsation
      if (reticleRef.current) {
        reticleRef.current.rotation.y += delta * 2.0;
        const rScale = 1.0 + Math.sin(time * 0.006) * 0.15 + (mouseRef.current.isDown ? 0.3 : 0);
        reticleRef.current.scale.set(rScale, rScale, rScale);
      }

      // Update Shockwaves
      const shockwaves = activeShockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += delta * 35.0;
        sw.alpha = Math.max(0, 1.0 - sw.radius / sw.maxRadius);
        sw.mesh.scale.set(sw.radius, sw.radius, sw.radius);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = sw.alpha * 0.8;

        if (sw.alpha <= 0) {
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          (sw.mesh.material as THREE.Material).dispose();
          shockwaves.splice(i, 1);
        }
      }

      // Update Sparks
      const sparks = activeSparksRef.current;
      const spPositions = sparkPositionsRef.current;
      const spColors = sparkColorsRef.current;

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life -= delta / sp.maxLife;

        if (sp.life <= 0) {
          sparks.splice(i, 1);
          spPositions[i * 3] = 9999;
          continue;
        }

        sp.position.addScaledVector(sp.velocity, delta);
        sp.velocity.y -= 15.0 * delta; // gravity
        sp.velocity.multiplyScalar(0.96); // drag

        spPositions[i * 3] = sp.position.x;
        spPositions[i * 3 + 1] = sp.position.y;
        spPositions[i * 3 + 2] = sp.position.z;

        spColors[i * 3] = sp.color.r * sp.life;
        spColors[i * 3 + 1] = sp.color.g * sp.life;
        spColors[i * 3 + 2] = sp.color.b * sp.life;
      }

      for (let i = sparks.length; i < 300; i++) {
        spPositions[i * 3] = 9999;
      }

      if (sparkPointsRef.current) {
        sparkPointsRef.current.geometry.attributes.position.needsUpdate = true;
        sparkPointsRef.current.geometry.attributes.color.needsUpdate = true;
      }

      // Camera Director movement
      if (cameraRef.current) {
        const cam = cameraRef.current;
        const angles = cameraAnglesRef.current;

        // Smooth camera damping / lerp
        angles.theta += (angles.targetTheta - angles.theta) * 0.12;
        angles.phi += (angles.targetPhi - angles.phi) * 0.12;
        angles.radius += (angles.targetRadius - angles.radius) * 0.12;

        if (curCamMode === 'cinematic' && !isUserOrbitingRef.current) {
          const t = time * 0.0003 * curSpeed;
          const r = 36 + Math.sin(t * 0.7) * 8;
          cam.position.x = Math.sin(t) * r;
          cam.position.z = Math.cos(t) * r;
          cam.position.y = 12 + Math.sin(t * 1.3) * 8;
          cam.lookAt(0, 0, 0);
        } else if (curCamMode === 'flythrough' && !isUserOrbitingRef.current) {
          const t = time * 0.0005 * curSpeed;
          cam.position.x = Math.sin(t * 0.5) * 15;
          cam.position.y = 3.5 + Math.sin(t) * 1.5;
          cam.position.z = (time * 0.02 * curSpeed) % 100 - 50;
          cam.lookAt(cam.position.x * 0.5, 4, cam.position.z + 25);
        } else {
          // Manual Orbit controls
          cam.position.x = angles.radius * Math.sin(angles.phi) * Math.sin(angles.theta);
          cam.position.y = angles.radius * Math.cos(angles.phi);
          cam.position.z = angles.radius * Math.sin(angles.phi) * Math.cos(angles.theta);
          cam.lookAt(0, 0, 0);
        }
      }

      // Update active simulation with live modeRef & speed
      if (blackHoleRef.current && curMode === 'blackhole') {
        blackHoleRef.current.update(delta, curSpeed, curAudio, camera);
      }
      if (neuralRef.current && curMode === 'neural') {
        neuralRef.current.update(delta, curSpeed, curAudio);
      }
      if (quantumRef.current && curMode === 'quantum') {
        quantumRef.current.update(delta, curSpeed, curAudio);
      }
      if (cyberpunkRef.current && curMode === 'cyberpunk') {
        cyberpunkRef.current.update(delta, curSpeed, curAudio);
      }
      if (strangeRef.current && curMode === 'chaos') {
        strangeRef.current.update(delta, curSpeed, curAudio);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      renderer.dispose();
    };
  }, []);

  // Handle Simulation Mode Switching
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (blackHoleRef.current) {
      scene.remove(blackHoleRef.current.group);
      blackHoleRef.current.dispose();
      blackHoleRef.current = null;
    }
    if (neuralRef.current) {
      scene.remove(neuralRef.current.group);
      neuralRef.current.dispose();
      neuralRef.current = null;
    }
    if (quantumRef.current) {
      scene.remove(quantumRef.current.group);
      quantumRef.current.dispose();
      quantumRef.current = null;
    }
    if (cyberpunkRef.current) {
      scene.remove(cyberpunkRef.current.group);
      cyberpunkRef.current.dispose();
      cyberpunkRef.current = null;
    }
    if (strangeRef.current) {
      scene.remove(strangeRef.current.group);
      strangeRef.current.dispose();
      strangeRef.current = null;
    }

    soundEngine.playWarp();

    if (mode === 'blackhole') {
      const sim = new BlackHoleSimulation();
      sim.setTheme(theme);
      scene.add(sim.group);
      blackHoleRef.current = sim;
    } else if (mode === 'neural') {
      const sim = new NeuralConnectome();
      sim.setTheme(theme);
      scene.add(sim.group);
      neuralRef.current = sim;
    } else if (mode === 'quantum') {
      const sim = new QuantumManifold();
      sim.setTheme(theme);
      scene.add(sim.group);
      quantumRef.current = sim;
    } else if (mode === 'cyberpunk') {
      const sim = new CyberpunkGrid();
      sim.setTheme(theme);
      scene.add(sim.group);
      cyberpunkRef.current = sim;
    } else if (mode === 'chaos') {
      const sim = new StrangeAttractors();
      sim.setTheme(theme);
      scene.add(sim.group);
      strangeRef.current = sim;
    }
  }, [mode]);

  useEffect(() => {
    if (blackHoleRef.current) blackHoleRef.current.setTheme(theme);
    if (neuralRef.current) neuralRef.current.setTheme(theme);
    if (quantumRef.current) quantumRef.current.setTheme(theme);
    if (cyberpunkRef.current) cyberpunkRef.current.setTheme(theme);
    if (strangeRef.current) strangeRef.current.setTheme(theme);
  }, [theme]);

  // Clear feedback toast after 2.5s
  useEffect(() => {
    if (!feedbackToast) return;
    const timer = setTimeout(() => {
      setFeedbackToast(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [feedbackToast]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden cursor-crosshair">
      <div ref={containerRef} className="w-full h-full block cursor-crosshair active:cursor-grabbing" />

      {/* Post Processing CRT scanlines effect */}
      {params.postProcessing.crtScanlines && (
        <div className="absolute inset-0 pointer-events-none crt-overlay z-10" />
      )}
      {/* Vignette */}
      {params.postProcessing.vignette && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle at center, transparent 40%, rgba(2, 4, 10, 0.85) 100%)',
          }}
        />
      )}

      {/* Dynamic Interaction Feedback HUD Pill */}
      {feedbackToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="cyber-glass-glow px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider text-cyan-300 border border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.4)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{feedbackToast.text}</span>
          </div>
        </div>
      )}

      {/* Interactive HUD Guide at bottom-center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none cyber-glass px-4 py-2 rounded-xl text-[11px] font-mono text-cyan-200 flex items-center gap-3 border border-cyan-500/30">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <strong className="text-white">CLICK & DRAG:</strong> Trigger Shockwaves & Orbit
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1.5">
          <strong className="text-white">SCROLL:</strong> Zoom
        </span>
      </div>
    </div>
  );
};
