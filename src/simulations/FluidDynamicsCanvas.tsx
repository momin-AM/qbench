import React, { useRef, useEffect } from 'react';
import { soundEngine } from '../audio/SoundEngine';

interface FluidDynamicsCanvasProps {
  audioFreq: number;
  colorTheme: string;
}

export const FluidDynamicsCanvas: React.FC<FluidDynamicsCanvasProps> = ({ audioFreq }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Fluid Grid Setup
    const N = 72; // grid resolution
    const iter = 4;
    const size = (N + 2) * (N + 2);
    
    let u = new Float32Array(size); // velocity X
    let v = new Float32Array(size); // velocity Y
    let u_prev = new Float32Array(size);
    let v_prev = new Float32Array(size);
    let dens = new Float32Array(size); // dye density
    let dens_prev = new Float32Array(size);

    const IX = (x: number, y: number) => x + (N + 2) * y;

    const set_bnd = (b: number, x: Float32Array) => {
      for (let i = 1; i <= N; i++) {
        x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
        x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
        x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
        x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
      }
      x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
      x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
      x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
      x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);
    };

    const lin_solve = (b: number, x: Float32Array, x0: Float32Array, a: number, c: number) => {
      const cRecip = 1.0 / c;
      for (let k = 0; k < iter; k++) {
        for (let j = 1; j <= N; j++) {
          for (let i = 1; i <= N; i++) {
            x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) * cRecip;
          }
        }
        set_bnd(b, x);
      }
    };

    const diffuse = (b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) => {
      const a = dt * diff * (N - 2) * (N - 2);
      lin_solve(b, x, x0, a, 1 + 4 * a);
    };

    const advect = (b: number, d: Float32Array, d0: Float32Array, velocX: Float32Array, velocY: Float32Array, dt: number) => {
      const dt0 = dt * (N - 2);
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          let x = i - dt0 * velocX[IX(i, j)];
          let y = j - dt0 * velocY[IX(i, j)];

          if (x < 0.5) x = 0.5;
          if (x > N + 0.5) x = N + 0.5;
          const i0 = Math.floor(x);
          const i1 = i0 + 1;

          if (y < 0.5) y = 0.5;
          if (y > N + 0.5) y = N + 0.5;
          const j0 = Math.floor(y);
          const j1 = j0 + 1;

          const s1 = x - i0;
          const s0 = 1 - s1;
          const t1 = y - j0;
          const t0 = 1 - t1;

          d[IX(i, j)] =
            s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
            s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
        }
      }
      set_bnd(b, d);
    };

    const project = (velocX: Float32Array, velocY: Float32Array, p: Float32Array, div: Float32Array) => {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          div[IX(i, j)] = -0.5 * (velocX[IX(i + 1, j)] - velocX[IX(i - 1, j)] + velocY[IX(i, j + 1)] - velocY[IX(i, j - 1)]) / N;
          p[IX(i, j)] = 0;
        }
      }
      set_bnd(0, div);
      set_bnd(0, p);
      lin_solve(0, p, div, 1, 4);

      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          velocX[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) * N;
          velocY[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) * N;
        }
      }
      set_bnd(1, velocX);
      set_bnd(2, velocY);
    };

    let lastX = 0, lastY = 0, isInteracting = false;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isInteracting = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      lastX = clientX;
      lastY = clientY;
      soundEngine.playPluck(0.7);
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isInteracting) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - lastX;
      const dy = clientY - lastY;

      const gridX = Math.floor((clientX / width) * N);
      const gridY = Math.floor((clientY / height) * N);

      if (gridX > 1 && gridX < N && gridY > 1 && gridY < N) {
        const idx = IX(gridX, gridY);
        u[idx] += dx * 3.5;
        v[idx] += dy * 3.5;
        dens[idx] += 300;

        // Splatter nearby
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            dens[IX(gridX + ox, gridY + oy)] += 150;
          }
        }
      }

      lastX = clientX;
      lastY = clientY;
    };

    const handlePointerUp = () => {
      isInteracting = false;
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Render Loop
    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.02;

      // Autonomous swirling vortex injection
      const cx = Math.floor((N / 2) + Math.cos(t * 1.5) * (N * 0.3));
      const cy = Math.floor((N / 2) + Math.sin(t * 1.8) * (N * 0.3));
      if (cx > 1 && cx < N && cy > 1 && cy < N) {
        dens[IX(cx, cy)] += 80 + audioFreq * 180;
        u[IX(cx, cy)] += -Math.sin(t * 1.5) * 8;
        v[IX(cx, cy)] += Math.cos(t * 1.8) * 8;
      }

      // Step Fluid
      const dt = 0.15;
      diffuse(1, u_prev, u, 0.0001, dt);
      diffuse(2, v_prev, v, 0.0001, dt);
      project(u_prev, v_prev, u, v);
      advect(1, u, u_prev, u_prev, v_prev, dt);
      advect(2, v, v_prev, u_prev, v_prev, dt);
      project(u, v, u_prev, v_prev);

      diffuse(0, dens_prev, dens, 0.0001, dt);
      advect(0, dens, dens_prev, u, v, dt);

      // Render to off-screen image buffer for extreme speed
      const cellW = width / N;
      const cellH = height / N;

      ctx.fillStyle = 'rgba(2, 4, 10, 0.25)';
      ctx.fillRect(0, 0, width, height);

      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          const d = dens[IX(i, j)];
          // Decay density
          dens[IX(i, j)] *= 0.985;

          if (d > 2) {
            const intensity = Math.min(1.0, d / 200);
            const hue = (i / N * 180 + j / N * 180 + t * 40) % 360;
            ctx.fillStyle = `hsla(${hue}, 90%, ${40 + intensity * 40}%, ${intensity * 0.85})`;
            ctx.fillRect((i - 1) * cellW, (j - 1) * cellH, cellW + 1, cellH + 1);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [audioFreq]);

  return (
    <div className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
      <div className="absolute bottom-6 left-6 pointer-events-none cyber-glass p-3 rounded-lg text-xs font-mono text-cyan-300">
        <div>[NAVIER-STOKES FLUID CHAMBER]</div>
        <div className="text-slate-400">Click & Drag to inject dye and velocity vortices</div>
      </div>
    </div>
  );
};
