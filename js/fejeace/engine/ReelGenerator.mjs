import { GameConfig } from "../config/GameConfig.mjs";
import { ReelConfig, validateReelConfig } from "../config/ReelConfig.mjs";
import { SymbolConfig } from "../config/SymbolConfig.mjs";
import { weightedPick } from "./RNG.mjs";

export function cloneGrid(grid) {
  return grid.map((reel) => reel.map((cell) => cell ? { ...cell } : null));
}

export class ReelGenerator {
  constructor({ rng, reelConfig = ReelConfig, idPrefix = "round", refillQueues = [] }) {
    if (!rng?.nextFloat) throw new Error("ReelGenerator requires an RNG implementation.");
    validateReelConfig(reelConfig);
    this.rng = rng;
    this.reelConfig = reelConfig;
    this.idPrefix = idPrefix;
    this.refillQueues = Array.from({ length: GameConfig.reels }, (_, index) => [...(refillQueues[index] || [])]);
    this.sequence = 0;
  }

  createCell(family, reelIndex, variant = null) {
    if (!SymbolConfig[family]) throw new Error(`Unknown symbol family: ${family}`);
    const stickyWild = variant === "wild-sticky";
    const resolvedVariant = stickyWild ? "wild" : variant || (family === "scatter" ? "scatter" : family === "wild" ? "wild" : "normal");
    return {
      uid: `${this.idPrefix}:${reelIndex}:${this.sequence++}`,
      family,
      variant: resolvedVariant,
      sticky: stickyWild,
      generatedOnReel: reelIndex
    };
  }

  createCellFromToken(token, reelIndex) {
    if (typeof token === "object" && token?.family) {
      return { ...token, uid: token.uid || `${this.idPrefix}:${reelIndex}:${this.sequence++}` };
    }
    const value = String(token || "").trim().toLowerCase();
    if (value.startsWith("golden:")) return this.createCell(value.slice(7), reelIndex, "golden");
    if (value.startsWith("g:")) return this.createCell(value.slice(2), reelIndex, "golden");
    if (value === "wild-sticky") return this.createCell("wild", reelIndex, "wild-sticky");
    return this.createCell(value, reelIndex);
  }

  generateCell(reelIndex) {
    const config = this.reelConfig[reelIndex];
    const family = weightedPick(config.weights, this.rng);
    if (SymbolConfig[family].canBeGolden && config.goldenChance > 0 && this.rng.nextFloat() < config.goldenChance) {
      return this.createCell(family, reelIndex, "golden");
    }
    return this.createCell(family, reelIndex);
  }

  nextCell(reelIndex) {
    const queue = this.refillQueues[reelIndex];
    if (queue?.length) return this.createCellFromToken(queue.shift(), reelIndex);
    return this.generateCell(reelIndex);
  }

  buildGrid(forcedGrid = null) {
    if (forcedGrid) {
      if (forcedGrid.length !== GameConfig.reels || forcedGrid.some((reel) => reel.length !== GameConfig.rows)) {
        throw new Error("A forced FejeAce grid must contain five reels with four cells each.");
      }
      return forcedGrid.map((reel, reelIndex) => reel.map((token) => this.createCellFromToken(token, reelIndex)));
    }
    return Array.from({ length: GameConfig.reels }, (_, reelIndex) =>
      Array.from({ length: GameConfig.rows }, () => this.generateCell(reelIndex))
    );
  }
}
