// Synthesized sound: a gentle music-box loop and one-shot effects, all
// generated with WebAudio. No audio files, no network.

let ctx = null;
let master = null;
let musicGain = null;
let muted = false;
let musicTimer = null;
let step = 0;

// A sunny little melody in C major, one note per eighth-note step.
const MELODY = [
  523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25, 0,
  783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 0,
  880.0, 783.99, 659.25, 783.99, 880.0, 1046.5, 783.99, 659.25,
  587.33, 659.25, 523.25, 0, 392.0, 523.25, 587.33, 659.25,
];
const BASS = [130.81, 196.0, 164.81, 196.0];

function ensure() {
  if (ctx) return true;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(master);
    return true;
  } catch {
    return false;
  }
}

function tone(freq, dur, type, vol, when = 0, dest = null) {
  if (!ctx || freq <= 0) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(dest || master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function playStep() {
  if (!ctx || muted) return;
  const note = MELODY[step % MELODY.length];
  if (note > 0) tone(note, 0.32, 'sine', 0.5, 0, musicGain);
  if (step % 8 === 0) tone(BASS[(step / 8) % BASS.length], 0.6, 'triangle', 0.3, 0, musicGain);
  step += 1;
}

export function startAudio() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (musicTimer === null) {
    musicTimer = setInterval(playStep, 240);
  }
}

export function setMuted(value) {
  muted = value;
  if (master && ctx) master.gain.value = muted ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

export function sfx(name) {
  if (!ensure() || muted) return;
  if (ctx.state === 'suspended') ctx.resume();
  switch (name) {
    case 'click':
      tone(880, 0.08, 'sine', 0.25);
      break;
    case 'place':
      tone(523.25, 0.12, 'triangle', 0.4);
      tone(783.99, 0.16, 'triangle', 0.35, 0.07);
      break;
    case 'chop':
      tone(180, 0.1, 'square', 0.3);
      tone(90, 0.14, 'triangle', 0.4, 0.02);
      break;
    case 'mine':
      tone(1200, 0.05, 'square', 0.18);
      tone(300, 0.1, 'triangle', 0.3, 0.02);
      break;
    case 'plant':
      tone(392, 0.12, 'sine', 0.35);
      tone(523.25, 0.14, 'sine', 0.3, 0.06);
      break;
    case 'water':
      tone(1200, 0.1, 'sine', 0.12);
      tone(1500, 0.1, 'sine', 0.1, 0.05);
      tone(1000, 0.12, 'sine', 0.12, 0.1);
      break;
    case 'harvest':
      tone(659.25, 0.1, 'triangle', 0.4);
      tone(783.99, 0.1, 'triangle', 0.4, 0.07);
      tone(1046.5, 0.18, 'triangle', 0.4, 0.14);
      break;
    case 'coin':
      tone(1046.5, 0.08, 'sine', 0.3);
      tone(1318.5, 0.14, 'sine', 0.3, 0.06);
      break;
    case 'goal':
      tone(523.25, 0.14, 'triangle', 0.4);
      tone(659.25, 0.14, 'triangle', 0.4, 0.1);
      tone(783.99, 0.14, 'triangle', 0.4, 0.2);
      tone(1046.5, 0.3, 'triangle', 0.45, 0.3);
      break;
    case 'error':
      tone(220, 0.16, 'square', 0.2);
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
        tone(f, 0.24, 'triangle', 0.4, i * 0.13);
      });
      break;
    default:
      break;
  }
}
