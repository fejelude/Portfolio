export const GameStates = Object.freeze({
  IDLE: "IDLE",
  SPIN_REQUESTED: "SPIN_REQUESTED",
  GENERATING: "GENERATING",
  REVEALING: "REVEALING",
  EVALUATING: "EVALUATING",
  WIN: "WIN",
  ELIMINATING: "ELIMINATING",
  GOLDEN_TRANSFORM: "GOLDEN_TRANSFORM",
  REFILLING: "REFILLING",
  EVALUATING_AGAIN: "EVALUATING_AGAIN",
  FEATURE_CHECK: "FEATURE_CHECK",
  ROUND_COMPLETE: "ROUND_COMPLETE",
  FREE_SPIN_INTRO: "FREE_SPIN_INTRO",
  FREE_SPIN_ACTIVE: "FREE_SPIN_ACTIVE",
  FREE_SPIN_RETRIGGER: "FREE_SPIN_RETRIGGER",
  FREE_SPIN_COMPLETE: "FREE_SPIN_COMPLETE"
});

const transitions = Object.freeze({
  IDLE: ["SPIN_REQUESTED", "FREE_SPIN_INTRO"],
  SPIN_REQUESTED: ["GENERATING"],
  GENERATING: ["REVEALING", "IDLE"],
  REVEALING: ["EVALUATING"],
  EVALUATING: ["WIN", "FEATURE_CHECK"],
  WIN: ["ELIMINATING"],
  ELIMINATING: ["GOLDEN_TRANSFORM", "REFILLING"],
  GOLDEN_TRANSFORM: ["REFILLING"],
  REFILLING: ["EVALUATING_AGAIN"],
  EVALUATING_AGAIN: ["WIN", "FEATURE_CHECK"],
  FEATURE_CHECK: ["ROUND_COMPLETE"],
  ROUND_COMPLETE: ["IDLE", "FREE_SPIN_INTRO", "FREE_SPIN_ACTIVE", "FREE_SPIN_COMPLETE"],
  FREE_SPIN_INTRO: ["FREE_SPIN_ACTIVE"],
  FREE_SPIN_ACTIVE: ["SPIN_REQUESTED", "FREE_SPIN_RETRIGGER", "FREE_SPIN_COMPLETE"],
  FREE_SPIN_RETRIGGER: ["FREE_SPIN_ACTIVE"],
  FREE_SPIN_COMPLETE: ["IDLE"]
});

export class GameState {
  constructor() {
    this.current = GameStates.IDLE;
    this.listeners = new Set();
  }

  get isBusy() {
    return this.current !== GameStates.IDLE;
  }

  transition(next, detail = {}) {
    const allowed = transitions[this.current] || [];
    if (!allowed.includes(next)) throw new Error(`Invalid FejeAce state transition: ${this.current} → ${next}`);
    const previous = this.current;
    this.current = next;
    this.listeners.forEach((listener) => listener({ previous, current: next, detail }));
    return next;
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  recover(detail = {}) {
    const previous = this.current;
    this.current = GameStates.IDLE;
    this.listeners.forEach((listener) => listener({ previous, current: GameStates.IDLE, detail: { ...detail, recovered: true } }));
  }
}
