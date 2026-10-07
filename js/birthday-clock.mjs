export const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
export const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
export const between = (time, start, end) => ease((time - start) / (end - start));

// Media is authoritative until it ends. The short, silent coda and genuine
// playback-failure fallback are resumable clocks, never wall-clock deadlines.
export class StoryClock {
  constructor(duration = 60) { this.duration = duration; this.reset(); }
  reset() { this.mode = 'media'; this.time = 0; this.running = false; this.offset = 0; this.anchor = 0; }
  read(now, mediaTime = this.time) {
    if (this.running) {
      const next = this.mode === 'media' ? mediaTime : this.offset + Math.max(0, now - this.anchor) / 1000;
      if (Number.isFinite(next)) this.time = clamp(Math.max(this.time, next), 0, this.duration);
      if (this.time > this.duration - 1e-9) this.time = this.duration;
    }
    return this.time;
  }
  start(now) { this.offset = this.time; this.anchor = now; this.running = true; }
  pause(now, mediaTime) { this.read(now, mediaTime); this.running = false; }
  switchMode(mode, now, mediaTime) {
    this.read(now, mediaTime);
    this.mode = mode;
    this.offset = this.time;
    this.anchor = now;
  }
  ended(now, mediaTime) {
    // ended can arrive after visibilitychange already stopped this clock.
    this.time = clamp(Math.max(this.time, Number.isFinite(mediaTime) ? mediaTime : 0), 0, this.duration);
    this.switchMode('tail', now, this.time);
  }
  get complete() { return this.time >= this.duration; }
}
