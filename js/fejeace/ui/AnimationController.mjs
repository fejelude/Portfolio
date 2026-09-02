import { GameConfig, formatPeso, getWinTier } from "../config/GameConfig.mjs";
import { winningCellKeys } from "../engine/WaysEvaluator.mjs";

const uniqueKeys = (wins) => [...new Set(winningCellKeys(wins))];

export class AnimationController {
  constructor({ renderer, sound, hud, root = document }) {
    this.renderer = renderer;
    this.sound = sound;
    this.hud = hud;
    this.stage = root.querySelector("[data-game-stage]");
    this.fxLayer = root.querySelector("[data-fx-layer]");
    this.featureOverlay = root.querySelector("[data-feature-overlay]");
    this.featureArt = root.querySelector("[data-feature-art]");
    this.featureTitle = root.querySelector("[data-feature-title]");
    this.featureValue = root.querySelector("[data-feature-value]");
    this.featureMultiple = root.querySelector("[data-feature-multiple]");
    this.coinShower = root.querySelector("[data-coin-shower]");
    this.reduceEffects = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  setReducedEffects(value) {
    this.reduceEffects = Boolean(value);
    document.body.classList.toggle("reduced-effects", this.reduceEffects);
  }

  wait(milliseconds) {
    const duration = this.reduceEffects ? Math.min(90, milliseconds * 0.18) : milliseconds;
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

  async playInitialReveal(result) {
    this.renderer.clearEffects();
    this.renderer.renderGrid(result.initialGrid);
    this.sound.play("spin");
    const scatterBeforeLast = result.initialGrid.slice(0, 4)
      .flat()
      .filter((cell) => cell.family === "scatter").length;
    const lastHasScatter = result.initialGrid[4].some((cell) => cell.family === "scatter");
    const anticipation = scatterBeforeLast >= 2 && lastHasScatter;

    this.stage.classList.add("reels-in-motion");
    for (let reel = 0; reel < 5; reel += 1) {
      this.renderer.cellsForReel(reel).forEach((cell, row) => {
        cell.style.setProperty("--reel-delay", `${reel * 38 + row * 18}ms`);
        cell.classList.add("is-spinning");
      });
    }
    await this.wait(GameConfig.timings.reelSpin);

    for (let reel = 0; reel < 5; reel += 1) {
      if (reel === 4 && anticipation) {
        this.stage.classList.add("is-anticipating");
        this.renderer.cellsForReel(reel).forEach((cell) => cell.classList.add("is-anticipating"));
        this.sound.play("anticipation");
        await this.wait(GameConfig.timings.anticipationExtra);
      }
      this.renderer.cellsForReel(reel).forEach((cell) => cell.classList.remove("is-spinning", "is-anticipating"));
      this.sound.play("reelStop");
      await this.wait(GameConfig.timings.reelStagger);
    }
    this.sound.stop("spin");
    this.stage.classList.remove("is-anticipating", "reels-in-motion");

    const initialScatters = [];
    result.initialGrid.forEach((reel, reelIndex) => reel.forEach((cell, rowIndex) => {
      if (cell.family === "scatter") initialScatters.push({ key: `${reelIndex}:${rowIndex}` });
    }));
    if (initialScatters.length) {
      this.renderer.markScatter(initialScatters);
      initialScatters.forEach(() => this.sound.play("scatter"));
    }
  }

  async playCascade(cascade, runningWin, onPhase = () => {}) {
    const keys = uniqueKeys(cascade.wins);
    this.renderer.markWinning(keys);
    this.hud.setMessage(`${cascade.wins.reduce((total, win) => total + win.ways, 0)} ways · ${formatPeso(cascade.winAmount)}`, "win");
    this.hud.update({ win: runningWin, multiplier: cascade.multiplier });
    this.sound.play("win");
    this.stage.dataset.cascadeLevel = String(Math.min(4, cascade.index + 1));
    this.burst(keys, "win");
    await this.wait(GameConfig.timings.winHold);

    onPhase("eliminating");
    this.renderer.markEliminating(cascade.removedCells);
    this.stage.classList.add("cascade-impact");
    this.sound.play("cascade");
    await this.wait(GameConfig.timings.eliminate);
    this.stage.classList.remove("cascade-impact");

    if (cascade.goldenTransforms.length) {
      onPhase("golden");
      this.renderer.applyGoldenTransforms(cascade.goldenTransforms, cascade.gridAfterElimination);
      this.sound.play("golden");
      this.sound.play("wildTransform");
      this.burst(cascade.goldenTransforms.map(({ key }) => key), "golden");
      this.stage.classList.add("golden-impact");
      await this.wait(GameConfig.timings.goldenTransform);
      this.stage.classList.remove("golden-impact");
    }

    onPhase("refilling");
    this.renderer.renderGrid(cascade.gridAfterRefill, { addedCells: cascade.addedCells });
    this.sound.play("symbolLand");
    this.sound.play("multiplier");
    await this.wait(GameConfig.timings.refill);
    delete this.stage.dataset.cascadeLevel;
  }

  async playScatterResult(scatter) {
    if (!scatter.count) return;
    this.renderer.markScatter(scatter.cells);
    this.burst(scatter.cells.map(({ key }) => key), "scatter");
    scatter.cells.forEach(() => this.sound.play("scatter"));
    await this.wait(260);
  }

  burst(keys, type) {
    if (this.reduceEffects) return;
    const maxPerCell = matchMedia("(max-width: 700px)").matches ? 5 : 9;
    keys.slice(0, 12).forEach((key) => {
      const cell = this.renderer.cells.get(key);
      if (!cell) return;
      const stageRect = this.stage.getBoundingClientRect();
      const rect = cell.getBoundingClientRect();
      for (let index = 0; index < maxPerCell; index += 1) {
        const particle = document.createElement("i");
        particle.className = `fx-particle fx-${type}`;
        particle.style.left = `${rect.left - stageRect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top - stageRect.top + rect.height / 2}px`;
        particle.style.setProperty("--angle", `${(360 / maxPerCell) * index + (Number(key[0]) * 11)}deg`);
        particle.style.setProperty("--distance", `${44 + (index % 3) * 18}px`);
        this.fxLayer.appendChild(particle);
        particle.addEventListener("animationend", () => particle.remove(), { once: true });
      }
    });
  }

  async showFeature({ title, value, sound = "freeSpins", art = false, duration = GameConfig.timings.freeSpinIntro }) {
    this.featureTitle.textContent = title;
    this.featureValue.textContent = value;
    this.featureMultiple.textContent = "FEATURE UNLOCKED";
    this.featureArt.hidden = !art;
    this.featureOverlay.hidden = false;
    this.featureOverlay.classList.remove("is-visible");
    void this.featureOverlay.offsetWidth;
    this.featureOverlay.classList.add("is-visible");
    this.sound.play(sound);
    await this.wait(duration);
    this.featureOverlay.classList.remove("is-visible");
    await this.wait(180);
    this.featureOverlay.hidden = true;
  }

  async showWinPresentation(totalWin, bet) {
    const tier = getWinTier(totalWin, bet);
    if (tier.id === "win" || totalWin <= 0) return;
    const labels = { big: "BIG WIN", mega: "MEGA WIN", epic: "EPIC WIN", super: "SUPER WIN", ultimate: "ULTIMATE WIN" };
    this.featureTitle.textContent = labels[tier.id];
    this.featureValue.textContent = formatPeso(0);
    const multiple = totalWin / bet;
    this.featureMultiple.textContent = `${multiple.toLocaleString("en-US", { maximumFractionDigits: 2 })}× BET`;
    this.featureArt.hidden = !["epic", "super", "ultimate"].includes(tier.id);
    this.featureOverlay.dataset.tier = tier.id;
    this.featureOverlay.hidden = false;
    this.featureOverlay.classList.add("is-visible");
    this.stage.dataset.winTier = tier.id;
    this.buildCoinShower(tier.id);
    this.sound.play(["super", "ultimate"].includes(tier.id) ? "epicWin" : `${tier.id}Win`);

    const started = performance.now();
    const duration = this.reduceEffects ? 120 : GameConfig.timings.countUp;
    await new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.featureValue.textContent = formatPeso(totalWin * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    await this.wait({ big: 420, mega: 620, epic: 800, super: 1050, ultimate: 1300 }[tier.id]);
    this.featureOverlay.classList.remove("is-visible");
    await this.wait(180);
    this.featureOverlay.hidden = true;
    this.coinShower.replaceChildren();
    delete this.stage.dataset.winTier;
    delete this.featureOverlay.dataset.tier;
  }

  buildCoinShower(tier) {
    if (this.reduceEffects) return;
    const amount = { big: 18, mega: 28, epic: 42, super: 58, ultimate: 72 }[tier] || 18;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < amount; index += 1) {
      const coin = document.createElement("i");
      coin.style.setProperty("--x", `${(index * 47) % 100}vw`);
      coin.style.setProperty("--drift", `${((index * 29) % 180) - 90}px`);
      coin.style.setProperty("--delay", `${(index % 12) * -0.13}s`);
      coin.style.setProperty("--fall", `${1.15 + (index % 7) * 0.13}s`);
      fragment.appendChild(coin);
    }
    this.coinShower.replaceChildren(fragment);
  }
}
