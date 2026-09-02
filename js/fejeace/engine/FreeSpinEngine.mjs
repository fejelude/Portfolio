import { GameConfig } from "../config/GameConfig.mjs";
import { roundMoney } from "./WinCalculator.mjs";

export class FreeSpinEngine {
  constructor() {
    this.reset();
  }

  begin(bet, spins = GameConfig.freeSpinsAwarded) {
    this.active = true;
    this.bet = bet;
    this.remaining = spins;
    this.totalWin = 0;
    this.currentWin = 0;
    this.retriggers = 0;
    return this.snapshot();
  }

  consume() {
    if (!this.active || this.remaining <= 0) throw new Error("No Free Spin is available.");
    this.remaining -= 1;
    this.currentWin = 0;
    return this.remaining;
  }

  recordWin(amount) {
    this.currentWin = roundMoney(amount);
    this.totalWin = roundMoney(this.totalWin + this.currentWin);
  }

  retrigger(spins = GameConfig.freeSpinsRetriggered) {
    this.remaining += spins;
    this.retriggers += 1;
    return this.remaining;
  }

  complete() {
    this.active = false;
    return this.snapshot();
  }

  reset() {
    this.active = false;
    this.bet = 0;
    this.remaining = 0;
    this.totalWin = 0;
    this.currentWin = 0;
    this.retriggers = 0;
  }

  snapshot() {
    return Object.freeze({
      active: this.active,
      bet: this.bet,
      remaining: this.remaining,
      totalWin: this.totalWin,
      currentWin: this.currentWin,
      retriggers: this.retriggers
    });
  }
}
