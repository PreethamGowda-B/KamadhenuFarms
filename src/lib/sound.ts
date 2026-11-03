'use client';

/**
 * Web Audio API synthesized alert chime.
 * Generates an organic, pleasant, crystal-clear 2-tone melodic chime.
 * Completely zero-asset, zero-network, works on modern desktop and mobile browsers.
 */
export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const isMuted = localStorage.getItem('khf_admin_sound_muted') === 'true';
    if (isMuted) return;

    // First attempt to play HTML5 audio if an audio asset is present
    try {
      const audio = new Audio('/sounds/order-chime.mp3');
      audio.volume = 0.75;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fall back directly to Web Audio API synthesis on error or missing asset
          synthesizeChime();
        });
        return;
      }
    } catch {
      // Audio element failed or not supported, synthesize directly
      synthesizeChime();
    }
  } catch (err) {
    console.warn('Audio alert skipped:', err);
  }
}

function synthesizeChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic Chord Notes: E5 (659.25 Hz) -> A5 (880 Hz) -> High sparkle E6 (1318.5 Hz)
    const tones = [
      { freq: 659.25, start: 0.0, dur: 0.35, gain: 0.22 },
      { freq: 880.00, start: 0.12, dur: 0.55, gain: 0.30 },
      { freq: 1318.5, start: 0.22, dur: 0.65, gain: 0.16 },
    ];

    tones.forEach(({ freq, start, dur, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
  } catch (err) {
    // Autoplay policy or unsupported
  }
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('khf_admin_sound_muted') === 'true';
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('khf_admin_sound_muted', muted ? 'true' : 'false');
}
