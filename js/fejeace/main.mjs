import { GameConfig, cascadeMultiplier, formatPeso } from "./config/GameConfig.mjs";
import { AssetConfig, preloadImages, symbolAsset } from "./config/AssetConfig.mjs";
import { SymbolConfig, RegularSymbolIds } from "./config/SymbolConfig.mjs";
import { RoundEngine } from "./engine/RoundEngine.mjs";
import { FreeSpinEngine } from "./engine/FreeSpinEngine.mjs";
import { BalanceState } from "./state/BalanceState.mjs";
import { GameState, GameStates } from "./state/GameState.mjs";
import { RoundState } from "./state/RoundState.mjs";
import { SoundController } from "./audio/SoundController.mjs";
import { ReelRenderer } from "./ui/ReelRenderer.mjs";
import { HUDController } from "./ui/HUDController.mjs";
import { AnimationController } from "./ui/AnimationController.mjs";
import { ModalController } from "./ui/ModalController.mjs";
import { ResponsiveController } from "./ui/ResponsiveController.mjs";
import { SAFE_GRID } from "./dev/ScenarioFactory.mjs";
import { TestControls, developmentControlsAllowed } from "./dev/TestControls.mjs";

class FejeAceApp {
  constructor(root = document) {
    this.root = root;
    this.hub = root.querySelector("[data-games-hub]");
    this.game = root.querySelector("[data-fejeace-game]");
    this.loader = root.querySelector("[data-loading]");
    this.betIndex = GameConfig.defaultBetIndex;
    this.balance = new BalanceState();
    this.gameState = new GameState();
    this.roundState = new RoundState();
    this.freeSpins = new FreeSpinEngine();
    this.sound = new SoundController();
    this.renderer = new ReelRenderer(root.querySelector("[data-reel-grid]"));
    this.hud = new HUDController(root);
    this.animation = new AnimationController({ renderer: this.renderer, sound: this.sound, hud: this.hud, root });
    this.engine = new RoundEngine({ debug: developmentControlsAllowed() });
    this.pendingScenario = null;
  }

  get bet() {
    return GameConfig.betLevels[this.betIndex];
  }

  async mount() {
    this.sound.preload();
    new ModalController(this.root).mount();
    new ResponsiveController().start();
    this.renderPaytable();
    this.renderIdleGrid();
    this.bindEvents();
    this.gameState.onChange(({ current }) => {
      document.body.dataset.gameState = current;
      this.hud.setState(current);
    });
    this.hud.update({ balance: this.balance.value, bet: this.bet, win: 0, multiplier: 1 });
    this.hud.setState(GameStates.IDLE);
    this.hud.setMessage("Choose your bet and spin.");
    this.updateSoundButtons();
    new TestControls(this.root.querySelector("[data-dev-controls]"), this).mount();

    const imageResults = await preloadImages();
    const failedImages = imageResults.filter((result) => result.status === "rejected").length;
    if (failedImages) this.hud.setMessage(`${failedImages} artwork file${failedImages === 1 ? "" : "s"} could not load. Safe symbol fallbacks are active.`, "error");
    this.loader.classList.add("is-ready");
    this.loader.addEventListener("transitionend", () => { this.loader.hidden = true; }, { once: true });

    if (new URLSearchParams(location.search).get("game") === "fejeace") this.launchGame(false);
  }

  bindEvents() {
    this.root.querySelectorAll("[data-launch-fejeace]").forEach((button) => {
      button.addEventListener("click", () => this.launchGame());
    });
    this.root.querySelector("[data-exit-game]").addEventListener("click", () => this.exitGame());
    this.root.querySelector("[data-spin]").addEventListener("click", () => this.runPaidSpin());
    this.root.querySelector("[data-bet-down]").addEventListener("click", () => this.changeBet(-1));
    this.root.querySelector("[data-bet-up]").addEventListener("click", () => this.changeBet(1));
    this.root.querySelectorAll("[data-toggle-sound]").forEach((button) => {
      button.addEventListener("click", () => {
        this.sound.unlock();
        this.sound.toggleMuted();
        this.updateSoundButtons();
      });
    });
    const soundSetting = this.root.querySelector("[data-setting-sound]");
    soundSetting.checked = !this.sound.muted;
    soundSetting.addEventListener("change", () => {
      this.sound.unlock();
      this.sound.setMuted(!soundSetting.checked);
      this.updateSoundButtons();
    });
    this.root.querySelector("[data-setting-effects]").addEventListener("change", (event) => {
      this.animation.setReducedEffects(event.target.value === "reduced");
    });
    window.addEventListener("keydown", (event) => {
      if (event.code !== "Space" || event.repeat || this.game.hidden) return;
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      this.runPaidSpin();
    });
    window.addEventListener("popstate", () => {
      const wantsGame = new URLSearchParams(location.search).get("game") === "fejeace";
      if (wantsGame && this.game.hidden) this.launchGame(false);
      else if (!wantsGame && !this.game.hidden && !this.gameState.isBusy) this.exitGame(false);
    });
  }

  launchGame(updateHistory = true) {
    this.sound.unlock();
    this.sound.play("click");
    this.hub.hidden = true;
    this.game.hidden = false;
    document.body.classList.add("game-open");
    if (updateHistory) history.pushState({ game: "fejeace" }, "", "?game=fejeace");
    requestAnimationFrame(() => this.root.querySelector("[data-spin]").focus({ preventScroll: true }));
  }

  exitGame(updateHistory = true) {
    if (this.gameState.isBusy) {
      this.showMessage("Finish the current round before leaving the table.", "error");
      return;
    }
    this.sound.play("click");
    this.game.hidden = true;
    this.hub.hidden = false;
    document.body.classList.remove("game-open");
    if (updateHistory) history.pushState({}, "", location.pathname);
    this.root.querySelector("[data-launch-fejeace]")?.focus({ preventScroll: true });
  }

  changeBet(direction) {
    if (this.gameState.isBusy) return;
    this.betIndex = Math.min(GameConfig.betLevels.length - 1, Math.max(0, this.betIndex + direction));
    this.hud.update({ bet: this.bet });
    this.sound.play("betChange");
  }

  async runPaidSpin() {
    if (this.gameState.current !== GameStates.IDLE) return;
    this.sound.unlock();
    if (!this.balance.canAfford(this.bet)) {
      this.sound.play("error");
      this.showMessage(`You need ${formatPeso(this.bet)} to spin. Refresh the page to restore the demo balance.`, "error");
      return;
    }
    const scenario = this.pendingScenario;
    this.pendingScenario = null;
    try {
      const result = await this.executeRound("base", scenario);
      await this.animation.showWinPresentation(result.totalWin, result.bet);
      if (result.freeSpinsTriggered) await this.startFreeSpins(result.bet);
      else this.gameState.transition(GameStates.IDLE);
    } catch (error) {
      this.handleRoundError(error);
    }
  }

  async executeRound(mode, scenario = null) {
    this.gameState.transition(GameStates.SPIN_REQUESTED, { mode });
    this.gameState.transition(GameStates.GENERATING, { mode });
    const result = this.engine.generate({
      bet: this.bet,
      balance: this.balance.value,
      mode,
      forcedGrid: scenario?.forcedGrid || null,
      refillQueues: scenario?.refillQueues || []
    });
    this.roundState.begin(result);
    this.hud.update({ balance: this.balance.value - result.cost, win: 0, multiplier: cascadeMultiplier(mode, 0) });

    this.gameState.transition(GameStates.REVEALING, { spinId: result.spinId });
    await this.animation.playInitialReveal(result);
    this.gameState.transition(GameStates.EVALUATING);

    let runningWin = 0;
    for (const cascade of result.cascades) {
      this.gameState.transition(GameStates.WIN, { cascade: cascade.index });
      runningWin = Math.min(result.bet * GameConfig.maxWinMultiple, Math.round((runningWin + cascade.winAmount) * 100) / 100);
      await this.animation.playCascade(cascade, runningWin, (phase) => {
        if (phase === "eliminating") this.gameState.transition(GameStates.ELIMINATING);
        if (phase === "golden") this.gameState.transition(GameStates.GOLDEN_TRANSFORM);
        if (phase === "refilling") {
          if (this.gameState.current === GameStates.ELIMINATING || this.gameState.current === GameStates.GOLDEN_TRANSFORM) {
            this.gameState.transition(GameStates.REFILLING);
          }
        }
      });
      this.gameState.transition(GameStates.EVALUATING_AGAIN);
    }

    this.gameState.transition(GameStates.FEATURE_CHECK);
    await this.animation.playScatterResult(result.scatter);
    this.gameState.transition(GameStates.ROUND_COMPLETE);
    this.balance.applyRound(result);
    this.roundState.complete();
    this.hud.update({ balance: this.balance.value, win: result.totalWin });
    this.hud.setMessage(result.totalWin > 0 ? `Round win ${formatPeso(result.totalWin)}` : "No win this time. Ready again.", result.totalWin > 0 ? "win" : "neutral");
    return result;
  }

  async startFreeSpins(bet, forcedScenario = null, spins = GameConfig.freeSpinsAwarded) {
    this.gameState.transition(GameStates.FREE_SPIN_INTRO);
    this.freeSpins.begin(bet, spins);
    this.hud.updateFreeSpins(this.freeSpins.snapshot());
    await this.animation.showFeature({ title: "FREE SPINS", value: `${spins} SPINS · MULTIPLIERS START AT ×2`, art: true });
    this.gameState.transition(GameStates.FREE_SPIN_ACTIVE);
    await this.runFreeSpinSequence(forcedScenario);
  }

  async runFreeSpinSequence(firstScenario = null) {
    let scenario = firstScenario;
    while (this.freeSpins.remaining > 0) {
      this.freeSpins.consume();
      this.hud.updateFreeSpins(this.freeSpins.snapshot());
      const result = await this.executeRound("free", scenario);
      scenario = null;
      this.freeSpins.recordWin(result.totalWin);
      this.hud.updateFreeSpins(this.freeSpins.snapshot());
      await this.animation.showWinPresentation(result.totalWin, result.bet);

      this.gameState.transition(GameStates.FREE_SPIN_ACTIVE);
      if (result.freeSpinsRetriggered) {
        this.gameState.transition(GameStates.FREE_SPIN_RETRIGGER);
        this.freeSpins.retrigger(result.scatter.awardedSpins);
        this.hud.updateFreeSpins(this.freeSpins.snapshot());
        await this.animation.showFeature({
          title: "RETRIGGER",
          value: `+${result.scatter.awardedSpins} FREE SPINS`,
          sound: "retrigger",
          duration: GameConfig.timings.retrigger
        });
        this.gameState.transition(GameStates.FREE_SPIN_ACTIVE);
      }
      this.hud.spinButton.disabled = true;
    }

    this.gameState.transition(GameStates.FREE_SPIN_COMPLETE);
    const completed = this.freeSpins.complete();
    await this.animation.showFeature({ title: "FREE SPINS COMPLETE", value: formatPeso(completed.totalWin), art: true, duration: 1_000 });
    this.hud.updateFreeSpins(this.freeSpins.snapshot());
    this.gameState.transition(GameStates.IDLE);
  }

  async runDevelopmentScenario(scenario) {
    if (this.gameState.isBusy) return;
    if (scenario.action === "insufficient") {
      this.balance.setForDevelopment(0);
      this.hud.update({ balance: this.balance.value });
      this.showMessage("Development balance forced to ₱0.00.", "error");
      return;
    }
    if (scenario.mode === "free") {
      try {
        await this.startFreeSpins(this.bet, scenario, 1);
      } catch (error) {
        this.handleRoundError(error);
      }
      return;
    }
    this.pendingScenario = scenario;
    await this.runPaidSpin();
  }

  showMessage(message, tone = "neutral") {
    this.hud.setMessage(message, tone);
  }

  handleRoundError(error) {
    console.error("[FejeAce] Round failed", error);
    this.roundState.currentRound = null;
    this.freeSpins.reset();
    this.gameState.recover({ error: error.message });
    this.sound.play("error");
    this.hud.updateFreeSpins(this.freeSpins.snapshot());
    this.hud.update({ balance: this.balance.value, bet: this.bet });
    this.showMessage(error.message === "INSUFFICIENT_BALANCE" ? "Insufficient demo balance." : "The round was safely cancelled. Try again.", "error");
  }

  updateSoundButtons() {
    this.root.querySelectorAll("[data-toggle-sound]").forEach((button) => {
      button.dataset.muted = String(this.sound.muted);
      button.setAttribute("aria-label", this.sound.muted ? "Turn sound on" : "Mute sound");
      button.querySelector("span").textContent = this.sound.muted ? "Sound off" : "Sound on";
    });
    const setting = this.root.querySelector("[data-setting-sound]");
    if (setting) setting.checked = !this.sound.muted;
  }

  renderIdleGrid() {
    this.renderer.renderGrid(SAFE_GRID.map((reel) => reel.map((family, index) => ({
      uid: `idle:${family}:${index}`,
      family,
      variant: "normal",
      sticky: false
    }))));
  }

  renderPaytable() {
    const table = this.root.querySelector("[data-paytable]");
    table.innerHTML = RegularSymbolIds.map((family) => {
      const symbol = SymbolConfig[family];
      const source = symbolAsset({ family, variant: "normal" });
      return `<div class="paytable-row">
        <img src="${source}" alt="${symbol.name}">
        <strong>${symbol.name}</strong>
        <span>3 reels ×${symbol.payouts[3]}</span>
        <span>4 reels ×${symbol.payouts[4]}</span>
        <span>5 reels ×${symbol.payouts[5]}</span>
      </div>`;
    }).join("");
    this.root.querySelectorAll("[data-logo-source]").forEach((image) => { image.src = AssetConfig.logo; });
    this.root.querySelector("[data-feature-art]").src = AssetConfig.bigJoker;
  }
}

const app = new FejeAceApp();
app.mount().catch((error) => {
  console.error("[FejeAce] Startup failed", error);
  document.querySelector("[data-loading-message]").textContent = "FejeAce could not start. Refresh to try again.";
});

export { FejeAceApp };
