import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface CellularAutomataCanvasProps {
  audioFreq: number;
}

type RuleType = 'conway' | 'brian' | 'highlife' | 'langton';

export const CellularAutomataCanvas: React.FC<CellularAutomataCanvasProps> = ({ audioFreq }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rule, setRule] = useState<RuleType>('conway');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [generation, setGeneration] = useState<number>(0);
  const [population, setPopulation] = useState<number>(0);

  const gridCols = 120;
  const gridRows = 80;
  const gridRef = useRef<Uint8Array>(new Uint8Array(gridCols * gridRows));
  const nextGridRef = useRef<Uint8Array>(new Uint8Array(gridCols * gridRows));

  // Langton's Ant state
  const antRef = useRef<{ x: number; y: number; dir: number }>({
    x: Math.floor(gridCols / 2),
    y: Math.floor(gridRows / 2),
    dir: 0 // 0: up, 1: right, 2: down, 3: left
  });

  const randomizeGrid = () => {
    const grid = gridRef.current;
    let count = 0;
    for (let i = 0; i < grid.length; i++) {
      const alive = Math.random() < 0.22 ? 1 : 0;
      grid[i] = alive;
      if (alive) count++;
    }
    setPopulation(count);
    setGeneration(0);
    soundEngine.playWarp();
  };

  const clearGrid = () => {
    gridRef.current.fill(0);
    setPopulation(0);
    setGeneration(0);
    soundEngine.playBlip(0.8);
  };

  const spawnGliderGun = () => {
    clearGrid();
    const grid = gridRef.current;
    const setCell = (x: number, y: number) => {
      if (x >= 0 && x < gridCols && y >= 0 && y < gridRows) {
        grid[y * gridCols + x] = 1;
      }
    };

    // Gosper Glider Gun pattern
    const ox = 10, oy = 20;
    const coords = [
      [1, 5], [1, 6], [2, 5], [2, 6],
      [11, 5], [11, 6], [11, 7], [12, 4], [12, 8], [13, 3], [13, 9], [14, 3], [14, 9],
      [15, 6], [16, 4], [16, 8], [17, 5], [17, 6], [17, 7], [18, 6],
      [21, 3], [21, 4], [21, 5], [22, 3], [22, 4], [22, 5], [23, 2], [23, 6],
      [25, 1], [25, 2], [25, 6], [25, 7],
      [35, 3], [35, 4], [36, 3], [36, 4]
    ];

    coords.forEach(([px, py]) => setCell(ox + px, oy + py));
    soundEngine.playPluck(0.9);
  };

  useEffect(() => {
    randomizeGrid();
  }, [rule]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let isDrawing = false;
    const cellW = width / gridCols;
    const cellH = height / gridRows;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      drawCell(e);
      soundEngine.playBlip(1.2);
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      drawCell(e);
    };

    const handlePointerUp = () => {
      isDrawing = false;
    };

    const drawCell = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const gx = Math.floor(clientX / cellW);
      const gy = Math.floor(clientY / cellH);

      if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
        // Stamp brush
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
              gridRef.current[ny * gridCols + nx] = 1;
            }
          }
        }
      }
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('touchstart', handlePointerDown);
    canvas.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Simulation Loop
    let animId: number;
    let frameCounter = 0;

    const stepSimulation = () => {
      const cur = gridRef.current;
      const next = nextGridRef.current;
      let living = 0;

      if (rule === 'conway' || rule === 'highlife') {
        const isHighlife = rule === 'highlife';
        for (let y = 0; y < gridRows; y++) {
          for (let x = 0; x < gridCols; x++) {
            let neighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + gridCols) % gridCols;
                const ny = (y + dy + gridRows) % gridRows;
                if (cur[ny * gridCols + nx] === 1) neighbors++;
              }
            }

            const state = cur[y * gridCols + x];
            if (state === 1) {
              next[y * gridCols + x] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
            } else {
              const birth = neighbors === 3 || (isHighlife && neighbors === 6);
              next[y * gridCols + x] = birth ? 1 : 0;
            }

            if (next[y * gridCols + x] === 1) living++;
          }
        }
      } else if (rule === 'brian') {
        // Brian's Brain: 0 = Off, 1 = On (Firing), 2 = Dying (Refractory)
        for (let y = 0; y < gridRows; y++) {
          for (let x = 0; x < gridCols; x++) {
            const state = cur[y * gridCols + x];
            if (state === 1) {
              next[y * gridCols + x] = 2; // Firing -> Dying
              living++;
            } else if (state === 2) {
              next[y * gridCols + x] = 0; // Dying -> Off
            } else {
              // Off -> Firing if exactly 2 neighbors firing
              let firingNeighbors = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = (x + dx + gridCols) % gridCols;
                  const ny = (y + dy + gridRows) % gridRows;
                  if (cur[ny * gridCols + nx] === 1) firingNeighbors++;
                }
              }
              next[y * gridCols + x] = firingNeighbors === 2 ? 1 : 0;
              if (next[y * gridCols + x] === 1) living++;
            }
          }
        }
      } else if (rule === 'langton') {
        // Langton's Ant: steps fast
        next.set(cur);
        const ant = antRef.current;
        for (let step = 0; step < 16; step++) {
          const idx = ant.y * gridCols + ant.x;
          const cell = cur[idx];

          if (cell === 0) {
            ant.dir = (ant.dir + 1) % 4; // Turn right 90
            cur[idx] = 1;
            next[idx] = 1;
          } else {
            ant.dir = (ant.dir + 3) % 4; // Turn left 90
            cur[idx] = 0;
            next[idx] = 0;
          }

          // Move forward
          if (ant.dir === 0) ant.y = (ant.y - 1 + gridRows) % gridRows;
          else if (ant.dir === 1) ant.x = (ant.x + 1) % gridCols;
          else if (ant.dir === 2) ant.y = (ant.y + 1) % gridRows;
          else if (ant.dir === 3) ant.x = (ant.x - 1 + gridCols) % gridCols;
        }

        // Count living
        for (let i = 0; i < cur.length; i++) {
          if (cur[i] > 0) living++;
        }
      }

      // Swap buffers
      gridRef.current.set(next);
      setPopulation(living);
      setGeneration(g => g + 1);

      // Audio trigger if major population pulse
      if (living % 40 === 0 && living > 0) {
        soundEngine.playPluck((living % 200) / 200);
      }
    };

    const render = () => {
      frameCounter++;
      if (isRunning && frameCounter % 2 === 0) {
        stepSimulation();
      }

      // Draw grid
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, width, height);

      const grid = gridRef.current;
      for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridCols; x++) {
          const state = grid[y * gridCols + x];
          if (state === 1) {
            const glow = 0.5 + audioFreq * 0.5;
            ctx.fillStyle = rule === 'brian' ? '#00f3ff' : '#00ff9d';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = glow * 8;
            ctx.fillRect(x * cellW, y * cellH, cellW - 0.5, cellH - 0.5);
          } else if (state === 2) {
            // Brian's refractory state
            ctx.fillStyle = '#bf5af2';
            ctx.shadowBlur = 0;
            ctx.fillRect(x * cellW, y * cellH, cellW - 0.5, cellH - 0.5);
          }
        }
      }
      ctx.shadowBlur = 0;

      // Draw Langton's Ant
      if (rule === 'langton') {
        const ant = antRef.current;
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(ant.x * cellW - 2, ant.y * cellH - 2, cellW + 4, cellH + 4);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('touchstart', handlePointerDown);
      canvas.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [isRunning, rule, audioFreq]);

  return (
    <div className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* Automata Control Overlay */}
      <div className="absolute top-20 left-6 cyber-glass p-3 rounded-xl flex flex-col gap-3 z-20 text-xs font-mono max-w-xs">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <span className="text-cyan-400 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            CELLULAR AUTOMATA FORGE
          </span>
          <span className="text-slate-400">Gen {generation}</span>
        </div>

        {/* Rule selector buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'conway', label: "Conway's Life" },
            { id: 'brian', label: "Brian's Brain" },
            { id: 'highlife', label: "HighLife Replicator" },
            { id: 'langton', label: "Langton's Ant" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRule(r.id as RuleType);
                soundEngine.playBlip(1.1);
              }}
              className={`px-2 py-1.5 rounded text-left transition-all ${
                rule === r.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold'
                  : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => {
              setIsRunning(!isRunning);
              soundEngine.playBlip(1);
            }}
            className="flex-1 cyber-button bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 py-1.5 rounded flex items-center justify-center gap-1 text-cyan-200"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={randomizeGrid}
            title="Randomize"
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 text-slate-300"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={spawnGliderGun}
            title="Spawn Glider Gun"
            className="px-2 py-1.5 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/40 rounded text-purple-300"
          >
            Gun
          </button>
          <button
            onClick={clearGrid}
            title="Clear Matrix"
            className="p-1.5 bg-rose-950/40 hover:bg-rose-900/50 rounded border border-rose-800/40 text-rose-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 flex justify-between">
          <span>Active Cells: {population}</span>
          <span>Click & Drag to paint life</span>
        </div>
      </div>
    </div>
  );
};
