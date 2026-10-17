'use client';
import { useEffect, useRef } from 'react';

export function useScanSound() {
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    const unlock = () => {
      try {
        audio.current ??= new AudioContext();
        if (audio.current.state === 'suspended') void audio.current.resume().catch(() => {});
      } catch { /* Audio is optional. */ }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock, true);
      void audio.current?.close().catch(() => {});
      audio.current = null;
    };
  }, []);
  return (success: boolean) => {
    try {
      const context = audio.current;
      if (!context || context.state !== 'running') return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(success ? 880 : 220, context.currentTime);
      oscillator.frequency.setValueAtTime(success ? 1175 : 165, context.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
      oscillator.start(); oscillator.stop(context.currentTime + 0.26);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Never make sound a prerequisite for verification. */ }
  };
}