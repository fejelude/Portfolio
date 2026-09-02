const reel = (weights, goldenChance = 0) => Object.freeze({
  weights: Object.freeze(weights),
  goldenChance
});

export const ReelConfig = Object.freeze([
  reel({ ace: 7, king: 8, queen: 9, jack: 10, heart: 14, diamond: 15, club: 17, spade: 16, scatter: 2, wild: 0 }),
  reel({ ace: 8, king: 9, queen: 10, jack: 11, heart: 13, diamond: 14, club: 15, spade: 15, scatter: 2.5, wild: 0 }, 0.08),
  reel({ ace: 9, king: 9, queen: 10, jack: 11, heart: 13, diamond: 14, club: 14, spade: 14, scatter: 3, wild: 0 }, 0.10),
  reel({ ace: 8, king: 9, queen: 10, jack: 11, heart: 13, diamond: 14, club: 15, spade: 15, scatter: 2.5, wild: 0 }, 0.08),
  reel({ ace: 7, king: 8, queen: 9, jack: 10, heart: 14, diamond: 15, club: 17, spade: 16, scatter: 2, wild: 0 })
]);

export function validateReelConfig(config = ReelConfig) {
  if (!Array.isArray(config) || config.length !== 5) {
    throw new Error("FejeAce requires exactly five reel configurations.");
  }
  config.forEach((entry, index) => {
    const total = Object.values(entry.weights).reduce((sum, weight) => sum + Number(weight || 0), 0);
    if (!(total > 0)) throw new Error(`Reel ${index + 1} has no positive symbol weights.`);
    if (entry.goldenChance < 0 || entry.goldenChance > 1) {
      throw new Error(`Reel ${index + 1} has an invalid Golden chance.`);
    }
  });
  return true;
}
