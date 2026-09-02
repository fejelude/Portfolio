import { AssetConfig } from "../config/AssetConfig.mjs";

const DEFAULT_VOLUMES = Object.freeze({
  click: 0.42, betChange: 0.35, error: 0.45, spin: 0.34, reelStop: 0.46,
  symbolLand: 0.35, win: 0.48, cascade: 0.52, golden: 0.64,
  wildTransform: 0.72, scatter: 0.56, anticipation: 0.5, multiplier: 0.55,
  freeSpins: 0.64, retrigger: 0.66, bigWin: 0.66, megaWin: 0.74, epicWin: 0.82
});

export class SoundController {
  constructor() {
    this.storage = this.getStorage();
    this.muted = this.storage?.getItem("fejeace-muted") === "true";
    this.audio = new Map();
    this.unlocked = false;
    this.activeSounds = new Set();
  }

  getStorage() {
    // Safari private browsing and embedded iOS webviews can expose sessionStorage
    // while throwing on access. Audio must never prevent the game from mounting.
    try {
      const storage = window.sessionStorage;
      storage.getItem("fejeace-audio-probe");
      return storage;
    } catch {
      return null;
    }
  }

  preload() {
    Object.entries(AssetConfig.sounds).forEach(([name, source]) => {
      const audio = new Audio(source);
      audio.preload = "auto";
      audio.volume = DEFAULT_VOLUMES[name] ?? 0.5;
      this.audio.set(name, audio);
    });
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    // iOS only permits media playback inside the original pointer/touch gesture.
    // Prime every element silently now so later async reel events can play sounds.
    this.audio.forEach((sound) => {
      const previousVolume = sound.volume;
      sound.volume = 0;
      const promise = sound.play();
      if (promise?.then) {
        promise.then(() => {
          sound.pause();
          sound.currentTime = 0;
          sound.volume = previousVolume;
        }).catch(() => { sound.volume = previousVolume; });
      } else {
        sound.pause();
        sound.currentTime = 0;
        sound.volume = previousVolume;
      }
    });
  }

  setMuted(value) {
    this.muted = Boolean(value);
    try { this.storage?.setItem("fejeace-muted", String(this.muted)); } catch { /* Storage is optional. */ }
    if (this.muted) this.stopAll();
    return this.muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  play(name, { volume = null, restart = true } = {}) {
    if (this.muted || !this.unlocked) return;
    const source = this.audio.get(name);
    if (!source) return;
    const sound = source.paused ? source : source.cloneNode();
    sound.volume = volume ?? DEFAULT_VOLUMES[name] ?? 0.5;
    if (restart) sound.currentTime = 0;
    this.activeSounds.add(sound);
    sound.addEventListener("ended", () => this.activeSounds.delete(sound), { once: true });
    const promise = sound.play();
    promise?.catch(() => this.activeSounds.delete(sound));
  }

  stop(name) {
    const sound = this.audio.get(name);
    if (!sound) return;
    sound.pause();
    sound.currentTime = 0;
  }

  stopAll() {
    new Set([...this.audio.values(), ...this.activeSounds]).forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
    this.activeSounds.clear();
  }
}
