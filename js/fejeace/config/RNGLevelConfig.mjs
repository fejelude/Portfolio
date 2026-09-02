/**
 * Test-luck profiles. Level 0 makes exactly one normal RNG outcome. Levels 1–9
 * draw progressively larger candidate pools and keep the most valuable complete
 * round (payout first, then cascades/scatters). This preserves all payout math
 * while making every higher level a strict superset of the previous search.
 * Level 10 uses a real, auditable cascade timeline that reaches the hard cap.
 */
export const RNGLevelConfig = Object.freeze([
  { level: 0, label: "Normal", candidates: 1 },
  { level: 1, label: "Slight boost", candidates: 2 },
  { level: 2, label: "Lucky", candidates: 3 },
  { level: 3, label: "Noticeably lucky", candidates: 5 },
  { level: 4, label: "Strong results", candidates: 7 },
  { level: 5, label: "High-luck mode", candidates: 10 },
  { level: 6, label: "Very strong wins", candidates: 14 },
  { level: 7, label: "Frequent huge wins", candidates: 20 },
  { level: 8, label: "Extremely lucky", candidates: 28 },
  { level: 9, label: "Ridiculous wins", candidates: 40 },
  { level: 10, label: "FORCE MAX WIN", candidates: 0, forceMaxWin: true }
].map(Object.freeze));

export function rngLevelProfile(value) {
  const level = Math.min(10, Math.max(0, Math.trunc(Number(value) || 0)));
  return RNGLevelConfig[level];
}

export function maxWinScenario() {
  const fullAces = Array.from({ length: 5 }, () => Array(4).fill("ace"));
  const safe = [
    ["ace", "king", "heart", "diamond"], ["queen", "jack", "club", "spade"],
    ["heart", "diamond", "ace", "king"], ["club", "spade", "queen", "jack"],
    ["diamond", "heart", "king", "ace"]
  ];
  return {
    forcedGrid: fullAces,
    refillQueues: Array.from({ length: 5 }, (_, reel) => [
      ...Array(12).fill("ace"), ...safe[reel]
    ])
  };
}
