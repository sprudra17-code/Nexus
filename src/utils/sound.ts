/**
 * Synthesized Web Audio API sound generator for incoming/outgoing chat events
 * No external audio files needed - 100% lightweight and instant.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const soundSettings = {
  get soundEnabled(): boolean {
    const val = localStorage.getItem('nexus_sound_enabled');
    return val === null ? true : val === 'true';
  },
  set soundEnabled(enabled: boolean) {
    localStorage.setItem('nexus_sound_enabled', enabled ? 'true' : 'false');
  },
  get soundOnlyInBackground(): boolean {
    const val = localStorage.getItem('nexus_sound_bg_only');
    return val === null ? false : val === 'true';
  },
  set soundOnlyInBackground(bgOnly: boolean) {
    localStorage.setItem('nexus_sound_bg_only', bgOnly ? 'true' : 'false');
  },
};

/**
 * Play a pleasant synthesized double-chime for incoming messages.
 * Automatically checks background state if configured.
 */
export function playIncomingMessageSound(force: boolean = false): void {
  if (!soundSettings.soundEnabled && !force) return;

  const isBackground = document.hidden || !document.hasFocus();
  if (soundSettings.soundOnlyInBackground && !isBackground && !force) {
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2: 880.00 Hz (A5), slight delay for harmonious ding
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.06);

    gain2.gain.setValueAtTime(0, now + 0.06);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.28);
  } catch (err) {
    console.debug('Audio context play muted or not allowed yet:', err);
  }
}

/**
 * Subtle soft pop for sent messages
 */
export function playSentMessageSound(): void {
  if (!soundSettings.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Ignore audio permission warnings
  }
}
