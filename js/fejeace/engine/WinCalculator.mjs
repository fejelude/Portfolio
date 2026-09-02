const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function calculateWins(wins, bet, multiplier) {
  return wins.map((win) => ({
    ...win,
    amount: roundMoney(bet * win.payoutFactor * win.ways * multiplier)
  }));
}

export function totalWinAmount(wins) {
  return roundMoney(wins.reduce((total, win) => total + win.amount, 0));
}

export { roundMoney };
