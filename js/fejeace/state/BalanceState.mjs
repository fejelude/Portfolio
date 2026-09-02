import { GameConfig } from "../config/GameConfig.mjs";
import { roundMoney } from "../engine/WinCalculator.mjs";

export class BalanceState {
  constructor(initialBalance = GameConfig.startingBalance) {
    this.value = roundMoney(initialBalance);
  }

  canAfford(bet) {
    return this.value >= bet;
  }

  applyRound(result) {
    if (roundMoney(result.balanceBefore) !== this.value) {
      throw new Error("Balance changed while the round was being processed.");
    }
    this.value = roundMoney(result.finalBalance);
    return this.value;
  }

  setForDevelopment(value) {
    this.value = roundMoney(Math.max(0, Number(value) || 0));
  }
}
