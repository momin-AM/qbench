import React, { useState, useEffect } from 'react';
import { Camera, Download, X, Check, Image as ImageIcon } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationMode: string;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  simulationMode,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [includeWatermark, setIncludeWatermark] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Grab canvas from DOM
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Create an offscreen canvas to compose watermark
    const offCanvas = document.createElement('canvas');
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    // Draw main WebGL frame
    ctx.drawImage(canvas, 0, 0);

    if (includeWatermark) {
      // Cyberpunk Watermark Banner
      const pad = 24;
      ctx.fillStyle = 'rgba(2, 4, 10, 0.75)';
      ctx.fillRect(pad, offCanvas.height - pad - 42, 340, 42);

      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad, offCanvas.height - pad - 42, 340, 42);

      ctx.fillStyle = '#00f3ff';
      ctx.font = 'bold 14px "Fira Code", monospace';
      ctx.fillText('AETHERIA // REALITY ENGINE', pad + 14, offCanvas.height - pad - 24);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillText(
        `[MODE: ${simulationMode.toUpperCase()}] • ${new Date().toISOString()}`,
        pad + 14,
        offCanvas.height - pad - 10
      );
    }

    setDataUrl(offCanvas.toDataURL('image/png'));
  }, [isOpen, includeWatermark, simulationMode]);

  if (!isOpen) return null;

  const downloadImage = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `AETHERIA-${simulationMode}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    soundEngine.playWarp();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-lg cyber-glass-glow rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/40 font-mono text-xs flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-cyan-500/30">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>EXPORT HIGH-RES REALITY SNAPSHOT</span>
          </div>
          <button
            onClick={() => {
              onClose();
              soundEngine.playBlip(1);
            }}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 flex flex-col gap-4">
          <div className="w-full aspect-video rounded-xl overflow-hidden border border-cyan-500/30 bg-black flex items-center justify-center">
            {dataUrl ? (
              <img src={dataUrl} alt="Snapshot Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-slate-500 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 animate-pulse" />
                Capturing Frame Buffer...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={includeWatermark}
                onChange={(e) => setIncludeWatermark(e.target.checked)}
                className="accent-cyan-400 rounded"
              />
              <span>Embed Cyberpunk Telemetry Watermark</span>
            </label>

            <button
              onClick={downloadImage}
              disabled={!dataUrl}
              className="cyber-button px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.4)] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
