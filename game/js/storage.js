// Device-local persistence: best score and the sound preference. Nothing
// leaves the machine.

import { SAVE_KEY } from './config.js';

const MUTE_KEY = `${SAVE_KEY}-muted`;

export function loadBest() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    localStorage.setItem(SAVE_KEY, String(score));
  } catch {
    // Private mode or blocked storage: the run still counts.
  }
}

export function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore.
  }
}
