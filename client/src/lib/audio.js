// POLARIS Tactical Audio Synthesizer (Web Audio API)
// 100% Zero external file dependencies — operates reliably over air-gapped polar satellite links.

let audioCtx = null;
let sirenOsc1 = null;
let sirenOsc2 = null;
let sirenGain = null;
let isSirenPlaying = false;
let isMuted = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setAudioMuted(muted) {
  isMuted = muted;
  if (muted && isSirenPlaying) {
    stopSiren();
  }
}

export function getAudioMuted() {
  return isMuted;
}

// Tactical Radio Beep / Squelch on Check-in / Telemetry Ping
export function playRadioChirp() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Rapid chirp from 880Hz to 1760Hz (high-tech radio confirmation)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch { /* ignore audio permission issues */ }
}

// Tactical Sonar / Proximity Radar Ping (Crevasse warning)
export function playRadarPing() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch { /* ignore */ }
}

// Emergency Two-Tone Military Klaxon Siren
export function startSiren() {
  if (isMuted || isSirenPlaying) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    sirenOsc1 = ctx.createOscillator();
    sirenOsc2 = ctx.createOscillator();
    sirenGain = ctx.createGain();

    sirenOsc1.type = 'sawtooth';
    sirenOsc2.type = 'sine';

    // Two-tone alternating frequency: 440Hz and 554Hz
    const now = ctx.currentTime;
    sirenOsc1.frequency.setValueAtTime(440, now);
    sirenOsc2.frequency.setValueAtTime(880, now);

    // LFO modulation for wailing effect
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 1.6; // 1.6Hz wail cycle
    lfoGain.gain.value = 180;

    lfo.connect(sirenOsc1.frequency);
    lfo.connect(sirenOsc2.frequency);
    lfo.start();

    sirenGain.gain.setValueAtTime(0.15, now);

    sirenOsc1.connect(sirenGain);
    sirenOsc2.connect(sirenGain);
    sirenGain.connect(ctx.destination);

    sirenOsc1.start();
    sirenOsc2.start();
    isSirenPlaying = true;
  } catch { /* ignore */ }
}

export function stopSiren() {
  try {
    if (sirenGain && audioCtx) {
      sirenGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      setTimeout(() => {
        if (sirenOsc1) { sirenOsc1.stop(); sirenOsc1.disconnect(); sirenOsc1 = null; }
        if (sirenOsc2) { sirenOsc2.stop(); sirenOsc2.disconnect(); sirenOsc2 = null; }
        sirenGain = null;
        isSirenPlaying = false;
      }, 250);
    } else {
      isSirenPlaying = false;
    }
  } catch {
    isSirenPlaying = false;
  }
}

export function isSirenActive() {
  return isSirenPlaying;
}
