let audioCtx: AudioContext | null = null;

function initAudioContext(): AudioContext | null {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Resume AudioContext on first user interaction (click or touchstart)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = initAudioContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  };

  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
}

/**
 * Generates an embedded notification chime using the Web Audio API.
 * Does not load or depend on any external audio files.
 */
export function playNotificationBeep(): void {
  try {
    const ctx = initAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Two-tone pleasant notification chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    // Envelope: quick attack, smooth decay
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Gracefully ignore audio restrictions or environments without audio output
  }
}
