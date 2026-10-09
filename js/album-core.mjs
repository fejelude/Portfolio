export const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
export function timeLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—:—';
  const value = Math.floor(seconds);
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

// Crossfade the decoded tail into the head, then start after that head. The
// loop's final sample and first sample are consecutive in the original audio.
// BufferSource.loop handles sample-accurate repeats, without JS loop timers.
export function crossfadeChannel(samples, overlap) {
  const count = Math.min(Math.floor(overlap), Math.floor(samples.length / 4));
  if (count < 2) return samples.slice();
  const output = new Float32Array(samples.length - count);
  const body = samples.length - count * 2;
  output.set(samples.subarray(count, samples.length - count * 1));
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1), weight = t * t * (3 - 2 * t);
    output[body + i] = samples[samples.length - count + i] * (1 - weight) + samples[i] * weight;
  }
  return output;
}

export class TrackQueue {
  constructor(tracks, random = Math.random) {
    this.tracks = tracks; this.random = random; this.order = tracks.map(t => t.id);
    this.shuffle = false; this.repeat = 'off'; this.history = [];
  }
  playable(id, failed = new Set()) { return this.tracks.some(t => t.id === id && t.audio) && !failed.has(id); }
  first(failed) { return this.order.find(id => this.playable(id, failed)) ?? null; }
  remember(id) {
    if (this.history.at(-1) !== id) this.history.push(id);
    if (this.history.length > this.tracks.length * 2) this.history.shift();
  }
  setShuffle(enabled, current) {
    this.shuffle = enabled;
    this.order = this.tracks.map(t => t.id);
    if (!enabled) return;
    this.order = this.order.filter(id => id !== current);
    for (let i = this.order.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    }
    if (current) this.order.unshift(current);
  }
  next(current, failed = new Set(), automatic = false) {
    if (automatic && this.repeat === 'one' && this.playable(current, failed)) return current;
    const start = this.order.indexOf(current);
    // Bound the search even if every resource fails and repeat-all is enabled.
    for (let step = 1; step <= this.order.length; step++) {
      let index = start + step;
      if (index >= this.order.length) {
        if (this.repeat !== 'all') return null;
        index %= this.order.length;
      }
      const id = this.order[index];
      if (this.playable(id, failed)) return id;
    }
    return null;
  }
  previous(current, failed = new Set()) {
    if (this.history.at(-1) === current) this.history.pop();
    while (this.history.length) {
      const id = this.history.pop();
      if (this.playable(id, failed)) return id;
    }
    const index = this.order.indexOf(current);
    for (let i = index - 1; i >= 0; i--) if (this.playable(this.order[i], failed)) return this.order[i];
    return this.repeat === 'all' ? this.order.findLast(id => this.playable(id, failed)) ?? null : current;
  }
}
