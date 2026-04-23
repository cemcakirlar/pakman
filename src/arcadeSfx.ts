/**
 * Synthesized cabinet-style SFX (no Namco ROM samples — copyright).
 * Web Audio square waves, short envelopes.
 */

import * as gameOptions from "./gameOptions";

type OscType = OscillatorType;

function getAudioContextClass(): typeof AudioContext {
  return window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
}

function playTone(
  ctx: AudioContext,
  destination: AudioNode,
  startAt: number,
  duration: number,
  frequency: number,
  type: OscType,
  peak: number,
): void {
  const t0 = ctx.currentTime + startAt;
  const t1 = t0 + Math.max(0.004, duration);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  const safePeak = Math.max(0.0001, Math.min(0.3, peak));
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(safePeak, t0 + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0008, t1);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

export class ArcadeSfx {
  private ctx: AudioContext | null = null;
  private outputGain: GainNode | null = null;
  /** Alternating waka (two-tone). */
  private wakaHigh = true;
  private muted = false;
  /** 0–1 linear gain when not muted. */
  private volumeLinear = 1;

  constructor() {
    this.muted = gameOptions.loadMuted();
    this.volumeLinear = gameOptions.loadVolume();
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (getAudioContextClass())();
    }
    return this.ctx;
  }

  /** All tones route through here (mute / volume). */
  private getOutput(): GainNode {
    const c = this.getCtx();
    if (!this.outputGain) {
      this.outputGain = c.createGain();
      this.outputGain.connect(c.destination);
      this.applyOutputGain();
    }
    return this.outputGain;
  }

  private applyOutputGain(): void {
    if (!this.outputGain) return;
    const g = this.muted ? 0 : this.volumeLinear * 0.35;
    this.outputGain.gain.value = g;
  }

  setMuted(value: boolean): void {
    this.muted = value;
    gameOptions.saveMuted(value);
    this.applyOutputGain();
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** 0 = silent, 1 = full (when not muted). */
  setVolumeLinear(value: number): void {
    this.volumeLinear = Math.min(1, Math.max(0, value));
    gameOptions.saveVolume(this.volumeLinear);
    this.applyOutputGain();
  }

  getVolumeLinear(): number {
    return this.volumeLinear;
  }

  /** Browsers start audio suspended; call after first user gesture (START, key). */
  resume(): void {
    const c = this.getCtx();
    if (c.state === "suspended") {
      void c.resume();
    }
    this.getOutput();
  }

  private canPlay(): boolean {
    return !this.muted && this.volumeLinear > 0.001;
  }

  /** Small dot — alternating two-tone waka. */
  playMunch(): void {
    if (!this.canPlay()) return;
    const ctx = this.getCtx();
    const out = this.getOutput();
    this.wakaHigh = !this.wakaHigh;
    const hz = this.wakaHigh ? 400 : 200;
    playTone(ctx, out, 0, 0.05, hz, "square", 0.1 * this.volumeLinear);
  }

  /** Power pellet — low double blip. */
  playPowerPellet(): void {
    if (!this.canPlay()) return;
    const ctx = this.getCtx();
    const out = this.getOutput();
    const p = 0.1 * this.volumeLinear;
    playTone(ctx, out, 0, 0.1, 160, "square", p);
    playTone(ctx, out, 0.04, 0.1, 200, "square", 0.09 * this.volumeLinear);
  }

  /** Ghost eaten — fast rising four-note phrase. */
  playGhostEaten(): void {
    if (!this.canPlay()) return;
    const ctx = this.getCtx();
    const out = this.getOutput();
    const notes = [400, 500, 600, 800];
    const p = 0.11 * this.volumeLinear;
    notes.forEach((f, i) => {
      playTone(ctx, out, i * 0.05, 0.07, f, "square", p);
    });
  }

  /** Death — four descending blips. */
  playDeath(): void {
    if (!this.canPlay()) return;
    const ctx = this.getCtx();
    const out = this.getOutput();
    const p = 0.1 * this.volumeLinear;
    [380, 300, 220, 160].forEach((f, i) => {
      playTone(ctx, out, i * 0.12, 0.12, f, "square", p);
    });
  }

  /** Round clear — short upward arpeggio. */
  playWinJingle(): void {
    if (!this.canPlay()) return;
    const ctx = this.getCtx();
    const out = this.getOutput();
    const p = 0.09 * this.volumeLinear;
    [523, 659, 784, 1047].forEach((f, i) => {
      playTone(ctx, out, i * 0.08, 0.1, f, "square", p);
    });
  }
}
