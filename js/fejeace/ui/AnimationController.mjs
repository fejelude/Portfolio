import { GameConfig, formatPeso, getWinTier } from "../config/GameConfig.mjs";
import { winningCellKeys } from "../engine/WaysEvaluator.mjs";
import { RegularSymbolIds } from "../config/SymbolConfig.mjs";

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
    this.sound.play("spin");
    const scatterBeforeLast = result.initialGrid.slice(0, 4)
      .flat()
      .filter((cell) => cell.family === "scatter").length;
    const lastHasScatter = result.initialGrid[4].some((cell) => cell.family === "scatter");
    const anticipation = scatterBeforeLast >= 2 && lastHasScatter;

    this.stage.classList.add("reels-in-motion");
    // Keep the predetermined result out of the DOM until each reel stops. The
    // shuffle is presentation-only and never feeds back into game RNG or payout.
    const shuffledGrid = result.initialGrid.map((reel, reelIndex) => reel.map((cell, row) => ({
      uid: `shuffle:${reelIndex}:${row}`,
      family: RegularSymbolIds[(reelIndex * 3 + row * 2) % RegularSymbolIds.length],
      variant: "normal",
      sticky: false
    })));
    this.renderer.renderGrid(shuffledGrid);
    for (let reel = 0; reel < 5; reel += 1) {
      this.renderer.cellsForReel(reel).forEach((cell, row) => {
        cell.style.setProperty("--reel-delay", `${reel * 38 + row * 18}ms`);
        cell.classList.add("is-spinning");
      });
    }
    const shuffleStarted = performance.now();
    const shuffleDuration = this.reduceEffects ? 100 : GameConfig.timings.reelSpin;
    while (performance.now() - shuffleStarted < shuffleDuration) {
      shuffledGrid.forEach((column, reelIndex) => column.forEach((cell, row) => {
        const next = (RegularSymbolIds.indexOf(cell.family) + 1 + reelIndex + row) % RegularSymbolIds.length;
        cell.family = RegularSymbolIds[next];
        this.renderer.setCell(reelIndex, row, cell);
      }));
      await this.wait(58);
    }

    for (let reel = 0; reel < 5; reel += 1) {
      if (reel === 4 && anticipation) {
        this.stage.classList.add("is-anticipating");
        this.renderer.cellsForReel(reel).forEach((cell) => cell.classList.add("is-anticipating"));
        this.sound.play("anticipation");
        await this.wait(GameConfig.timings.anticipationExtra);
      }
      result.initialGrid[reel].forEach((cell, row) => this.renderer.setCell(reel, row, cell));
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

  async playCascade(cascade, runningWin, bet, onPhase = () => {}) {
    const winMultiple = bet > 0 ? runningWin / bet : 0;
    const intensity = winMultiple >= 5000 ? 5 : winMultiple >= 1000 ? 4 : winMultiple >= 250 ? 3 : winMultiple >= 50 ? 2 : 1;
    const keys = uniqueKeys(cascade.wins);
    this.renderer.markWinning(keys);
    this.hud.setMessage(`${cascade.wins.reduce((total, win) => total + win.ways, 0)} ways · ${formatPeso(cascade.winAmount)}`, "win");
    this.hud.update({ win: runningWin, multiplier: cascade.multiplier });
    this.sound.play("win");
    this.stage.dataset.cascadeLevel = String(Math.min(4, cascade.index + 1));
    this.stage.dataset.winIntensity = String(intensity);
    this.burst(keys, "win", intensity);
    if (intensity >= 3) this.sound.play("multiplier");
    await this.wait(GameConfig.timings.winHold + intensity * 45);

    onPhase("eliminating");
    this.renderer.markEliminating(cascade.removedCells);
    this.stage.classList.add("cascade-impact");
    this.sound.play("cascade");
    if (intensity >= 4) this.sound.play("bigWin");
    await this.wait(GameConfig.timings.eliminate);
    this.stage.classList.remove("cascade-impact");

    if (cascade.goldenTransforms.length) {
      onPhase("golden");
      this.renderer.applyGoldenTransforms(cascade.goldenTransforms, cascade.gridAfterElimination);
      this.sound.play("golden");
      this.sound.play("wildTransform");
      this.burst(cascade.goldenTransforms.map(({ key }) => key), "golden", Math.min(5, intensity + 1));
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
    delete this.stage.dataset.winIntensity;
  }

  async playScatterResult(scatter) {
    if (!scatter.count) return;
    this.renderer.markScatter(scatter.cells);
    this.burst(scatter.cells.map(({ key }) => key), "scatter");
    scatter.cells.forEach(() => this.sound.play("scatter"));
    await this.wait(260);
  }

  burst(keys, type, intensity = 1) {
    if (this.reduceEffects) return;
    const mobile = matchMedia("(max-width: 700px)").matches;
    const maxPerCell = (mobile ? 3 : 5) + Math.min(5, intensity) * (mobile ? 1 : 2);
    keys.slice(0, 8 + intensity * 3).forEach((key) => {
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

  async showFeature({ title, value, multiple = "FEATURE UNLOCKED", sound = "freeSpins", art = false, duration = GameConfig.timings.freeSpinIntro }) {
    this.featureTitle.textContent = title;
    this.featureValue.textContent = value;
    this.featureMultiple.textContent = multiple;
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
    if (totalWin <= 0) return;
    const durations = { win: 620, big: 1400, super: 2100, mega: 2800, insane: 3600, max: 5000 };
    if (tier.id === "win") {
      await this.hud.animateWin(totalWin, this.reduceEffects ? 100 : durations.win);
      return;
    }
    const labels = { big: "BIG WIN", super: "SUPER WIN", mega: "MEGA WIN", insane: "INSANE WIN", max: "MAX WIN" };
    if (tier.id === "max") {
      this.stage.dataset.winTier = "max-pending";
      this.hud.setMessage("MAX WIN LOCKED", "win");
      this.sound.play("anticipation");
      await this.wait(720);
      this.stage.classList.add("max-win-impact");
      this.sound.play("cascade");
      await this.wait(260);
      this.stage.classList.remove("max-win-impact");
    }
    this.featureTitle.textContent = labels[tier.id];
    this.featureValue.textContent = formatPeso(0);
    const multiple = totalWin / bet;
    this.featureMultiple.textContent = `${multiple.toLocaleString("en-US", { maximumFractionDigits: 2 })}× BET`;
    this.featureArt.hidden = !["mega", "insane", "max"].includes(tier.id);
    this.featureOverlay.dataset.tier = tier.id;
    this.featureOverlay.hidden = false;
    this.featureOverlay.classList.add("is-visible");
    this.stage.dataset.winTier = tier.id;
    this.buildCoinShower(tier.id);
    this.sound.play(["insane", "max"].includes(tier.id) ? "epicWin" : tier.id === "super" ? "megaWin" : `${tier.id}Win`);

    const started = performance.now();
    const duration = this.reduceEffects ? 120 : durations[tier.id];
    const hudCount = this.hud.animateWin(totalWin, duration);
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
    await hudCount;
    await this.wait({ big: 420, super: 650, mega: 850, insane: 1200, max: 1800 }[tier.id]);
    this.featureOverlay.classList.remove("is-visible");
    await this.wait(180);
    this.featureOverlay.hidden = true;
    this.coinShower.replaceChildren();
    delete this.stage.dataset.winTier;
    delete this.featureOverlay.dataset.tier;
  }

  buildCoinShower(tier) {
    if (this.reduceEffects) return;
    const amount = { big: 18, super: 30, mega: 44, insane: 64, max: 96 }[tier] || 18;
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
