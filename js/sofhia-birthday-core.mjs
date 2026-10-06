export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const span = (time, start, end) => end <= start ? Number(time >= end) : clamp((time - start) / (end - start));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOutCubic = t => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutBack = (t, overshoot = 1.45) => {
  t = clamp(t);
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const smoothPulse = (time, speed = 1, amount = 1) => (Math.sin(time * speed) * 0.5 + 0.5) * amount;

export const DEFAULT_TIMELINE = Object.freeze({
  introEnd: 6,
  bloomStart: 6,
  bloomEnd: 20,
  fillerStart: 20,
  fillerEnd: 30,
  ribbonStart: 30,
  celebrationAt: 38,
  fadeSeconds: 1.6,
});

export function timelineFrame(time, duration, timeline = DEFAULT_TIMELINE) {
  const t = Math.max(0, Number.isFinite(time) ? time : 0);
  const d = Number.isFinite(duration) && duration > 0 ? duration : 60;
  const messageAt = clamp(Number(timeline.celebrationAt) || 38, 1, Math.max(1, d - 0.5));
  const fadeSeconds = clamp(Number(timeline.fadeSeconds) || 1.6, 0.4, Math.min(5, d));
  const fadeStart = Math.max(messageAt, d - fadeSeconds);
  const audioVolume = t < fadeStart ? 1 : clamp((d - t) / Math.max(0.001, d - fadeStart));

  return {
    t,
    duration: d,
    welcomeOut: easeInOutCubic(span(t, 0, 0.85)),
    bouquetIn: easeOutCubic(span(t, 0.15, 1.25)),
    sparklesIn: easeOutCubic(span(t, 0.6, 4.2)),
    stems: easeInOutCubic(span(t, 0.8, timeline.introEnd)),
    blooms: easeOutCubic(span(t, timeline.bloomStart, timeline.bloomEnd)),
    filler: easeOutCubic(span(t, timeline.fillerStart, timeline.fillerEnd - 2)),
    wrap: easeInOutCubic(span(t, timeline.fillerStart + 4, timeline.fillerEnd)),
    ribbon: easeOutBack(span(t, timeline.ribbonStart, messageAt - 1.4)),
    finalGlow: easeOutCubic(span(t, timeline.ribbonStart + 2, messageAt)),
    message: easeOutBack(span(t, messageAt, messageAt + 1.35), 1.1),
    celebration: span(t, messageAt, d),
    audioVolume,
    ended: t >= d - 0.01,
    messageAt,
    fadeStart,
  };
}
