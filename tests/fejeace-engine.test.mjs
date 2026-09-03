import test from "node:test";
import assert from "node:assert/strict";

import { GameConfig, bonusBuyCost, cascadeMultiplier } from "../js/fejeace/config/GameConfig.mjs";
import { ReelConfig } from "../js/fejeace/config/ReelConfig.mjs";
import { SequenceRNG, weightedPick } from "../js/fejeace/engine/RNG.mjs";
import { SeededRNG } from "../js/fejeace/engine/RNG.mjs";
import { ReelGenerator } from "../js/fejeace/engine/ReelGenerator.mjs";
import { evaluateWays } from "../js/fejeace/engine/WaysEvaluator.mjs";
import { calculateWins } from "../js/fejeace/engine/WinCalculator.mjs";
import { processCascade } from "../js/fejeace/engine/CascadeEngine.mjs";
import { evaluateScatters } from "../js/fejeace/engine/ScatterEngine.mjs";
import { RoundEngine } from "../js/fejeace/engine/RoundEngine.mjs";
import { GameState, GameStates } from "../js/fejeace/state/GameState.mjs";
import { BalanceState } from "../js/fejeace/state/BalanceState.mjs";
import { createScenario, SAFE_GRID } from "../js/fejeace/dev/ScenarioFactory.mjs";

const tokensToGrid = (tokens, prefix = "test") => tokens.map((reel, reelIndex) => reel.map((token, rowIndex) => {
  const golden = String(token).startsWith("golden:") || String(token).startsWith("g:");
  const family = golden ? String(token).split(":")[1] : String(token);
  return {
    uid: `${prefix}:${reelIndex}:${rowIndex}`,
    family,
    variant: golden ? "golden" : family === "wild" ? "wild" : family === "scatter" ? "scatter" : "normal",
    sticky: false
  };
}));

test("weighted selection honors configured ranges instead of equal choice", () => {
  const weights = { common: 90, rare: 10 };
  assert.equal(weightedPick(weights, new SequenceRNG([0.1])), "common");
  assert.equal(weightedPick(weights, new SequenceRNG([0.95])), "rare");
});

test("Golden generation is unavailable on reels 1 and 5 and configured on reels 2-4", () => {
  assert.equal(ReelConfig[0].goldenChance, 0);
  assert.ok(ReelConfig[1].goldenChance > 0);
  assert.ok(ReelConfig[2].goldenChance > ReelConfig[1].goldenChance);
  assert.ok(ReelConfig[3].goldenChance > 0);
  assert.equal(ReelConfig[4].goldenChance, 0);
});

test("five reels with four matching cells produce all 1,024 ways", () => {
  const grid = tokensToGrid(Array.from({ length: 5 }, () => Array(4).fill("ace")));
  const wins = evaluateWays(grid);
  assert.equal(wins.length, 1);
  assert.equal(wins[0].reels, 5);
  assert.equal(wins[0].ways, GameConfig.ways);
});

test("Ways evaluation cannot skip a missing reel", () => {
  const grid = tokensToGrid([
    ["ace", "king", "heart", "diamond"],
    ["queen", "jack", "club", "spade"],
    ["ace", "ace", "ace", "ace"],
    ["ace", "ace", "ace", "ace"],
    ["ace", "ace", "ace", "ace"]
  ]);
  assert.equal(evaluateWays(grid).length, 0);
});

test("an all-Wild first reel resolves to the highest-paying eligible family", () => {
  const grid = tokensToGrid([
    ["wild", "wild", "wild", "wild"],
    ["wild", "wild", "wild", "wild"],
    ["wild", "wild", "wild", "wild"],
    ["queen", "jack", "club", "spade"],
    ["heart", "diamond", "club", "spade"]
  ]);
  const wins = evaluateWays(grid);
  assert.equal(wins.length, 1);
  assert.equal(wins[0].family, "ace");
  assert.equal(wins[0].ways, 64);
});

test("payout calculation applies bet, payout factor, ways, and multiplier once", () => {
  const [win] = calculateWins([{ payoutFactor: 0.08, ways: 12 }], 100, 3);
  assert.equal(win.amount, 288);
});

test("a winning Golden symbol becomes a sticky Wild in the same location", () => {
  const tokens = [
    ["ace", "king", "heart", "diamond"],
    ["queen", "golden:ace", "club", "spade"],
    ["ace", "jack", "queen", "club"],
    ["king", "heart", "diamond", "club"],
    ["diamond", "heart", "king", "queen"]
  ];
  const grid = tokensToGrid(tokens);
  const wins = evaluateWays(grid);
  assert.equal(wins.length, 1);
  const generator = new ReelGenerator({ rng: new SequenceRNG([0]), idPrefix: "refill" });
  const result = processCascade(grid, wins, generator);
  assert.equal(result.goldenTransforms.length, 1);
  assert.equal(result.gridAfterRefill[1][1].family, "wild");
  assert.equal(result.gridAfterRefill[1][1].sticky, true);
});

test("base and Free Spin cascade multipliers follow the configured progressions", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 8].map((index) => cascadeMultiplier("base", index)), [1, 2, 3, 5, 5, 5]);
  assert.deepEqual([0, 1, 2, 3, 4, 8].map((index) => cascadeMultiplier("free", index)), [2, 4, 6, 10, 10, 10]);
});

test("Bonus Buy costs 40.5x the selected bet for each quantity", () => {
  assert.equal(bonusBuyCost(10, 1), 405);
  assert.equal(bonusBuyCost(100, 1), 4_050);
  assert.equal(bonusBuyCost(100, 3), 12_150);
  assert.equal(bonusBuyCost(100, 500), 400_950, "quantity is safely capped at 99");
});

test("bet configuration reaches ₱10,000 and all high-limit arithmetic stays exact", () => {
  assert.equal(Math.max(...GameConfig.betLevels), 10_000);
  assert.equal(bonusBuyCost(10_000), 405_000);
  assert.equal(bonusBuyCost(10_000, 99), 40_095_000);
});

test("RNG candidate levels are monotonically more favorable for the same random stream", () => {
  const totals = [0, 2, 5, 9].map((rngLevel) => new RoundEngine({ rng: new SeededRNG(20260902) }).generate({
    bet: 100,
    balance: 10_000,
    rngLevel
  }).totalWin);
  assert.deepEqual(totals, [...totals].sort((left, right) => left - right));
});

test("RNG Level 10 reaches the cap through calculated winning cascades", () => {
  const result = new RoundEngine({ rng: new SequenceRNG([0.42]) }).generate({
    bet: 10_000,
    balance: 10_000,
    rngLevel: 10
  });
  assert.equal(result.totalWin, 100_000_000);
  assert.equal(result.maxWinReached, true);
  assert.ok(result.uncappedWin >= result.totalWin);
  assert.ok(result.cascades.length >= 4);
  assert.equal(result.rngLevel, 10);
});

test("Bonus Buy debit is atomic and never allows a negative balance", () => {
  const balance = new BalanceState(10_000);
  assert.equal(balance.debit(bonusBuyCost(100, 2)), 1_900);
  assert.throws(() => balance.debit(bonusBuyCost(100, 1)), /INSUFFICIENT_BALANCE/);
  assert.equal(balance.value, 1_900);
});

test("the published maximum win is 10,000x and every generated result exposes its cap", () => {
  assert.equal(GameConfig.maxWinMultiple, 10_000);
  const result = new RoundEngine({ rng: new SequenceRNG([0.42]) }).generate({
    bet: 100,
    balance: 10_000,
    forcedGrid: SAFE_GRID
  });
  assert.equal(result.totalWin <= result.bet * 10_000, true);
  assert.equal(typeof result.maxWinReached, "boolean");
});

test("forced 4+ cascade scenario produces a complete predetermined timeline", () => {
  const scenario = createScenario("many-cascades");
  const result = new RoundEngine({ rng: new SequenceRNG([0.42]) }).generate({
    bet: 100,
    balance: 10_000,
    mode: "base",
    ...scenario
  });
  assert.equal(result.cascades.length, 5);
  assert.deepEqual(result.cascades.map((cascade) => cascade.multiplier), [1, 2, 3, 5, 5]);
});

test("Scatters trigger 10 base Free Spins and +5 retriggers independently of Ways", () => {
  const base = createScenario("three-scatters");
  const grid = tokensToGrid(base.forcedGrid);
  const trigger = evaluateScatters(grid, { mode: "base", bet: 100 });
  const retrigger = evaluateScatters(grid, { mode: "free", bet: 100 });
  assert.equal(trigger.count, 3);
  assert.equal(trigger.awardedSpins, 10);
  assert.equal(retrigger.awardedSpins, 5);
});

test("a paid round deducts once while a Free Spin does not deduct the bet", () => {
  const engine = new RoundEngine({ rng: new SequenceRNG([0.42]) });
  const base = engine.generate({ bet: 100, balance: 10_000, mode: "base", forcedGrid: SAFE_GRID });
  const free = engine.generate({ bet: 100, balance: 10_000, mode: "free", forcedGrid: SAFE_GRID });
  assert.equal(base.totalWin, 0);
  assert.equal(base.finalBalance, 9_900);
  assert.equal(free.totalWin, 0);
  assert.equal(free.finalBalance, 10_000);
});

test("the state machine rejects overlapping spin requests", () => {
  const state = new GameState();
  state.transition(GameStates.SPIN_REQUESTED);
  assert.throws(() => state.transition(GameStates.SPIN_REQUESTED), /Invalid FejeAce state transition/);
});

test("the explicit state machine accepts a full Golden cascade round", () => {
  const state = new GameState();
  [
    GameStates.SPIN_REQUESTED,
    GameStates.GENERATING,
    GameStates.REVEALING,
    GameStates.EVALUATING,
    GameStates.WIN,
    GameStates.ELIMINATING,
    GameStates.GOLDEN_TRANSFORM,
    GameStates.REFILLING,
    GameStates.EVALUATING_AGAIN,
    GameStates.FEATURE_CHECK,
    GameStates.ROUND_COMPLETE,
    GameStates.IDLE
  ].forEach((next) => state.transition(next));
  assert.equal(state.current, GameStates.IDLE);
});

test("Free Spins can retrigger repeatedly without a one-time gate", () => {
  const state = new GameState();
  state.transition(GameStates.FREE_SPIN_INTRO);
  state.transition(GameStates.FREE_SPIN_ACTIVE);
  for (let index = 0; index < 3; index += 1) {
    state.transition(GameStates.FREE_SPIN_RETRIGGER);
    state.transition(GameStates.FREE_SPIN_ACTIVE);
  }
  assert.equal(state.current, GameStates.FREE_SPIN_ACTIVE);
});
