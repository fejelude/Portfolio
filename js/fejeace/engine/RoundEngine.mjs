import { GameConfig, cascadeMultiplier } from "../config/GameConfig.mjs";
import { CryptoRNG } from "./RNG.mjs";
import { ReelGenerator, cloneGrid } from "./ReelGenerator.mjs";
import { evaluateWays } from "./WaysEvaluator.mjs";
import { calculateWins, roundMoney, totalWinAmount } from "./WinCalculator.mjs";
import { processCascade } from "./CascadeEngine.mjs";
import { evaluateScatters } from "./ScatterEngine.mjs";
import { maxWinScenario, rngLevelProfile } from "../config/RNGLevelConfig.mjs";

let roundSequence = 0;

function debugRound(result) {
  console.groupCollapsed(`[FejeAce] ${result.spinId} · ${result.mode} · bet ${result.bet}`);
  console.info("Initial grid", result.initialGrid);
  result.cascades.forEach((cascade) => {
    console.groupCollapsed(`Cascade ${cascade.index + 1} · ×${cascade.multiplier}`);
    console.info("Winning ways", cascade.wins);
    console.info("Golden transformations", cascade.goldenTransforms);
    console.info("Joker substitutions", cascade.wins.flatMap((win) => win.wildSubstitutions));
    console.info("Cascade win", cascade.winAmount);
    console.groupEnd();
  });
  console.info("Scatter", result.scatter);
  console.info("Total payout", result.totalWin);
  console.info("Final balance", result.finalBalance);
  console.groupEnd();
}

export class RoundEngine {
  constructor({ rng = new CryptoRNG(), debug = false } = {}) {
    this.rng = rng;
    this.debug = debug;
  }

  generate({ bet, balance, mode = "base", forcedGrid = null, refillQueues = [], rngLevel = 0 } = {}) {
    if (!GameConfig.betLevels.includes(bet)) throw new Error("The selected bet is not configured.");
    if (!Number.isFinite(balance) || balance < 0) throw new Error("A valid balance is required.");
    const cost = mode === "base" ? bet : 0;
    if (balance < cost) throw new Error("INSUFFICIENT_BALANCE");

    const profile = rngLevelProfile(rngLevel);
    if (forcedGrid) return this.generateCandidate({ bet, balance, mode, forcedGrid, refillQueues, rngLevel: profile.level });
    if (profile.forceMaxWin) {
      return this.generateCandidate({ bet, balance, mode, ...maxWinScenario(), rngLevel: profile.level });
    }
    let best = null;
    for (let attempt = 0; attempt < profile.candidates; attempt += 1) {
      const candidate = this.generateCandidate({ bet, balance, mode, rngLevel: profile.level });
      const score = candidate.totalWin * 1_000 + candidate.cascades.length * 10 + candidate.scatter.count;
      const bestScore = best ? best.totalWin * 1_000 + best.cascades.length * 10 + best.scatter.count : -1;
      if (score > bestScore) best = candidate;
    }
    return best;
  }

  generateCandidate({ bet, balance, mode, forcedGrid = null, refillQueues = [], rngLevel = 0 }) {
    const cost = mode === "base" ? bet : 0;

    const spinId = `FA-${Date.now().toString(36).toUpperCase()}-${(++roundSequence).toString(36).toUpperCase()}`;
    const generator = new ReelGenerator({ rng: this.rng, idPrefix: spinId, refillQueues });
    const initialGrid = generator.buildGrid(forcedGrid);
    let currentGrid = cloneGrid(initialGrid);
    const cascades = [];
    let cascadeIndex = 0;

    while (cascadeIndex < GameConfig.maxCascades) {
      const rawWins = evaluateWays(currentGrid);
      if (!rawWins.length) break;
      const multiplier = cascadeMultiplier(mode, cascadeIndex);
      const wins = calculateWins(rawWins, bet, multiplier);
      const cascadeResult = processCascade(currentGrid, wins, generator);
      cascades.push({
        index: cascadeIndex,
        multiplier,
        gridBefore: cloneGrid(currentGrid),
        wins,
        winAmount: totalWinAmount(wins),
        ...cascadeResult
      });
      currentGrid = cloneGrid(cascadeResult.gridAfterRefill);
      cascadeIndex += 1;
    }

    if (cascadeIndex >= GameConfig.maxCascades && evaluateWays(currentGrid).length) {
      throw new Error("Cascade safety limit reached. Check the configured reel weights or forced test queue.");
    }

    const scatter = evaluateScatters(currentGrid, { mode, bet });
    const cascadeWin = roundMoney(cascades.reduce((total, cascade) => total + cascade.winAmount, 0));
    const uncappedWin = roundMoney(cascadeWin + scatter.payout);
    const maxWin = roundMoney(bet * GameConfig.maxWinMultiple);
    const totalWin = Math.min(uncappedWin, maxWin);
    const result = Object.freeze({
      spinId,
      mode,
      bet,
      cost,
      balanceBefore: balance,
      initialGrid: cloneGrid(initialGrid),
      cascades,
      finalGrid: cloneGrid(currentGrid),
      scatter,
      freeSpinsTriggered: scatter.triggered && mode === "base",
      freeSpinsRetriggered: scatter.triggered && mode === "free",
      totalWin,
      uncappedWin,
      maxWinReached: uncappedWin >= maxWin,
      rngLevel,
      finalBalance: roundMoney(balance - cost + totalWin)
    });

    if (this.debug) debugRound(result);
    return result;
  }
}
