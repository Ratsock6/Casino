import { useCallback } from 'react';

const createBeep = (ctx: AudioContext, freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
};

export const useSound = () => {
  const playBoxOpen = useCallback(() => {
    const ctx = new AudioContext();
    createBeep(ctx, 440, 0.1, 'sine', 0.2);
    setTimeout(() => createBeep(ctx, 660, 0.15, 'sine', 0.25), 100);
    setTimeout(() => createBeep(ctx, 880, 0.2, 'sine', 0.3), 220);
  }, []);

  const playReveal = useCallback((rarity: string) => {
    const ctx = new AudioContext();
    const freqs: Record<string, number[]> = {
      COMMON:    [330, 440],
      UNCOMMON:  [440, 550, 660],
      RARE:      [550, 660, 770, 880],
      EPIC:      [660, 770, 880, 990, 1100],
      LEGENDARY: [880, 990, 1100, 1210, 1320, 1430],
    };
    const notes = freqs[rarity] || freqs.COMMON;
    notes.forEach((freq, i) => {
      setTimeout(() => createBeep(ctx, freq, 0.15, 'sine', 0.2 + i * 0.05), i * 80);
    });
  }, []);

  const playVictory = useCallback(() => {
    const ctx = new AudioContext();
    const melody = [523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => createBeep(ctx, freq, 0.3, 'sine', 0.4), i * 150);
    });
    setTimeout(() => createBeep(ctx, 1047, 0.6, 'sine', 0.5), melody.length * 150);
  }, []);

  const playDefeat = useCallback(() => {
    const ctx = new AudioContext();
    [440, 370, 311].forEach((freq, i) => {
      setTimeout(() => createBeep(ctx, freq, 0.3, 'sawtooth', 0.2), i * 200);
    });
  }, []);

  const playCountdown = useCallback((n: number) => {
    const ctx = new AudioContext();
    const freq = n === 1 ? 880 : 440;
    createBeep(ctx, freq, 0.1, 'square', 0.2);
  }, []);

  return { playBoxOpen, playReveal, playVictory, playDefeat, playCountdown };
};