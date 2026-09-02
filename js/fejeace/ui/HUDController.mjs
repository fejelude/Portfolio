import { formatPeso } from "../config/GameConfig.mjs";

export class HUDController {
  constructor(root = document) {
    this.balance = [...root.querySelectorAll("[data-hud-balance]")];
    this.bet = [...root.querySelectorAll("[data-hud-bet]")];
    this.win = [...root.querySelectorAll("[data-hud-win]")];
    this.multiplier = root.querySelector("[data-hud-multiplier]");
    this.freeRemaining = root.querySelector("[data-free-remaining]");
    this.freeTotal = root.querySelector("[data-free-total]");
    this.freeBanner = root.querySelector("[data-free-banner]");
    this.state = root.querySelector("[data-game-state-label]");
    this.message = root.querySelector("[data-game-message]");
    this.spinButton = root.querySelector("[data-spin]");
  }

  update({ balance, bet, win = 0, multiplier = 1 } = {}) {
    if (balance !== undefined) this.balance.forEach((element) => { element.textContent = formatPeso(balance); });
    if (bet !== undefined) this.bet.forEach((element) => { element.textContent = formatPeso(bet); });
    if (win !== undefined) this.win.forEach((element) => { element.textContent = formatPeso(win); });
    if (multiplier !== undefined) {
      this.multiplier.textContent = `×${multiplier}`;
      this.multiplier.dataset.value = String(multiplier);
    }
  }

  updateFreeSpins(snapshot) {
    this.freeBanner.hidden = !snapshot.active;
    this.freeRemaining.textContent = String(snapshot.remaining);
    this.freeTotal.textContent = formatPeso(snapshot.totalWin);
  }

  setState(state) {
    // replaceAll is missing in older iOS Safari versions still used by some players.
    this.state.textContent = state === "IDLE" ? "READY" : state.replace(/_/g, " ");
    const locked = state !== "IDLE" && state !== "FREE_SPIN_ACTIVE";
    this.spinButton.disabled = locked;
    this.spinButton.setAttribute("aria-busy", String(locked));
  }

  setMessage(text, tone = "neutral") {
    this.message.textContent = text;
    this.message.dataset.tone = tone;
  }
}
