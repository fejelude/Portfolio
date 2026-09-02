export class RoundState {
  constructor() {
    this.currentRound = null;
    this.lastCompletedRound = null;
  }

  begin(result) {
    if (this.currentRound) throw new Error("A FejeAce round is already active.");
    this.currentRound = result;
  }

  complete() {
    this.lastCompletedRound = this.currentRound;
    this.currentRound = null;
    return this.lastCompletedRound;
  }
}
