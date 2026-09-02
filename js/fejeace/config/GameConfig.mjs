export const GameConfig = Object.freeze({
  reels: 5,
  rows: 4,
  ways: 1024,
  startingBalance: 10_000,
  betLevels: Object.freeze([10, 20, 50, 100, 200, 500, 1_000]),
  defaultBetIndex: 3,
  baseMultipliers: Object.freeze([1, 2, 3, 5]),
  freeSpinMultipliers: Object.freeze([2, 4, 6, 10]),
  freeSpinsAwarded: 10,
  freeSpinsRetriggered: 5,
  bonusBuyCostMultiple: 40.5,
  bonusBuyMaxQuantity: 99,
  maxWinMultiple: 10_000,
  maxCascades: 50,
  scatterPayouts: Object.freeze({ 3: 2, 4: 10, 5: 50 }),
  bigWinThresholds: Object.freeze([
    Object.freeze({ id: "win", minBetMultiple: 0 }),
    Object.freeze({ id: "big", minBetMultiple: 5 }),
    Object.freeze({ id: "mega", minBetMultiple: 15 }),
    Object.freeze({ id: "epic", minBetMultiple: 30 }),
    Object.freeze({ id: "super", minBetMultiple: 75 }),
    Object.freeze({ id: "ultimate", minBetMultiple: 150 })
  ]),
  timings: Object.freeze({
    reelSpin: 640,
    reelStagger: 115,
    anticipationExtra: 520,
    winHold: 420,
    eliminate: 250,
    goldenTransform: 470,
    refill: 360,
    freeSpinIntro: 1_050,
    retrigger: 820,
    countUp: 1_650
  })
});

export function cascadeMultiplier(mode, cascadeIndex) {
  const progression = mode === "free"
    ? GameConfig.freeSpinMultipliers
    : GameConfig.baseMultipliers;
  return progression[Math.min(cascadeIndex, progression.length - 1)];
}

export function bonusBuyCost(bet, quantity = 1) {
  const count = Math.min(GameConfig.bonusBuyMaxQuantity, Math.max(1, Math.trunc(Number(quantity) || 1)));
  return Math.round(Number(bet) * GameConfig.bonusBuyCostMultiple * count * 100) / 100;
}

export function formatPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

export function getWinTier(totalWin, bet) {
  const multiple = bet > 0 ? totalWin / bet : 0;
  return [...GameConfig.bigWinThresholds]
    .reverse()
    .find((tier) => multiple >= tier.minBetMultiple) || GameConfig.bigWinThresholds[0];
}
