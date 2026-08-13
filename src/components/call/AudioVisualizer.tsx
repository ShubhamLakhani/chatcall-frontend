import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
}

export default function AudioVisualizer({ stream }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream) return;

    // Initialize Web Audio API
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[VISUALIZER] Web Audio API is not supported in this browser.');
      return;
    }

    const audioCtx = new AudioContextClass();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    try {
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);
    } catch (err) {
      console.warn('[VISUALIZER] Failed to connect audio stream source:', err);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvas || !ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate average volume to drive pulsation
      let total = 0;
      for (let i = 0; i < bufferLength; i++) {
        total += dataArray[i];
      }
      const averageVolume = total / bufferLength;
      const pulseScale = 1 + (averageVolume / 255) * 0.4; // up to 40% pulse

      // Draw pulsating ring
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.25;
      const currentRadius = baseRadius * pulseScale;

      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, 2 * Math.PI);

      // Ring glow gradient
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        currentRadius - 10,
        centerX,
        centerY,
        currentRadius + 20,
      );
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)'); // Indigo
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)'); // Violet
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0)'); // Pink fade

      ctx.fillStyle = gradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
      ctx.fill();

      // Reset shadows for bars
      ctx.shadowBlur = 0;

      // Draw frequency circular spectrum bars
      const barCount = 60;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const amplitude = dataArray[dataIndex];
        const barHeight = (amplitude / 255) * 45; // max 45px tall lines

        const startX = centerX + Math.cos(angle) * currentRadius;
        const startY = centerY + Math.sin(angle) * currentRadius;
        const endX = centerX + Math.cos(angle) * (currentRadius + barHeight);
        const endY = centerY + Math.sin(angle) * (currentRadius + barHeight);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);

        ctx.strokeStyle = `hsl(${(i / barCount) * 360}, 85%, 65%)`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch((err) => {
          console.warn('[VISUALIZER] AudioContext close error:', err);
        });
      }
    };
  }, [stream]);

  return (
    <div className="flex items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full max-w-[280px] aspect-square rounded-full bg-slate-900 border-4 border-indigo-100 shadow-xl"
      />
    </div>
  );
}
