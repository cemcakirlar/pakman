/** Persistent game settings (localStorage). */

const LS_MUTED = "pakman_opt_muted";
const LS_VOLUME = "pakman_opt_volume";
const LS_HINTS = "pakman_opt_hints";
const LS_VIBRATE = "pakman_opt_vibrate";

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(LS_MUTED) === "1";
  } catch {
    return false;
  }
}

export function saveMuted(value: boolean): void {
  try {
    localStorage.setItem(LS_MUTED, value ? "1" : "0");
  } catch {
    /* private mode */
  }
}

/** Linear volume 0–1; default 1. */
export function loadVolume(): number {
  try {
    const v = Number(localStorage.getItem(LS_VOLUME));
    if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
  } catch {
    /* ignore */
  }
  return 1;
}

export function saveVolume(value: number): void {
  try {
    localStorage.setItem(LS_VOLUME, String(Math.min(1, Math.max(0, value))));
  } catch {
    /* ignore */
  }
}

/** Bottom control hints row; default on. */
export function loadShowHints(): boolean {
  try {
    return localStorage.getItem(LS_HINTS) !== "0";
  } catch {
    return true;
  }
}

export function saveShowHints(value: boolean): void {
  try {
    localStorage.setItem(LS_HINTS, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Short vibration when eating a dot on touch devices (if supported). */
export function loadVibrate(): boolean {
  try {
    return localStorage.getItem(LS_VIBRATE) === "1";
  } catch {
    return false;
  }
}

export function saveVibrate(value: boolean): void {
  try {
    localStorage.setItem(LS_VIBRATE, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}
