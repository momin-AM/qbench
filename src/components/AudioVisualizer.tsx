import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../audio/SoundEngine';
import { Activity, Radio, Disc } from 'lucide-react';

export const AudioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [vizMode, setVizMode] = useState<'circular' | 'waveform' | 'bars'>('circular');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const { frequencyData, timeData } = soundEngine.getAudioTelemetry();
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (frequencyData.length === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      if (vizMode === 'circular') {
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(w, h) * 0.28;

        // Outer frequency ring
        ctx.beginPath();
        const numPoints = 64;
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const val = (frequencyData[i % frequencyData.length] / 255) * 24;
          const r = baseRadius + val;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 6;
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(191, 90, 242, 0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(191, 90, 242, 0.6)';
        ctx.stroke();
      } else if (vizMode === 'waveform') {
        // Oscilloscope waveform line
        ctx.beginPath();
        const sliceWidth = w / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.strokeStyle = '#00ff9d';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ff9d';
        ctx.shadowBlur = 8;
        ctx.stroke();
      } else {
        // Equalizer frequency bars
        const barCount = 32;
        const barWidth = (w / barCount) - 2;

        for (let i = 0; i < barCount; i++) {
          const val = frequencyData[i * 2] / 255;
          const barHeight = val * (h - 8);
          const x = i * (barWidth + 2);
          const y = h - barHeight;

          const grad = ctx.createLinearGradient(0, y, 0, h);
          grad.addColorStop(0, '#00f3ff');
          grad.addColorStop(1, '#bf5af2');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [vizMode]);

  return (
    <div className="cyber-glass rounded-xl p-2.5 flex items-center gap-3">
      <div className="flex flex-col items-center">
        <canvas ref={canvasRef} width={100} height={44} className="block rounded" />
      </div>

      {/* Mode mini buttons */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => {
            setVizMode('circular');
            soundEngine.playBlip(1.3);
          }}
          title="Circular Polar Visualizer"
          className={`p-1 rounded text-[10px] transition-colors ${
            vizMode === 'circular' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setVizMode('waveform');
            soundEngine.playBlip(1.3);
          }}
          title="Oscilloscope Waveform"
          className={`p-1 rounded text-[10px] transition-colors ${
            vizMode === 'waveform' ? 'bg-emerald-500/30 text-emerald-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setVizMode('bars');
            soundEngine.playBlip(1.3);
          }}
          title="Spectrum Bars"
          className={`p-1 rounded text-[10px] transition-colors ${
            vizMode === 'bars' ? 'bg-purple-500/30 text-purple-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
