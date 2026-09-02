export const SymbolConfig = Object.freeze({
  ace: Object.freeze({
    id: "ace", name: "Ace of Hearts", asset: "ace", goldenAsset: "goldenAce",
    canBeGolden: true, payouts: Object.freeze({ 3: 0.08, 4: 0.18, 5: 0.50 })
  }),
  king: Object.freeze({
    id: "king", name: "King of Spades", asset: "king", goldenAsset: "goldenKing",
    canBeGolden: true, payouts: Object.freeze({ 3: 0.06, 4: 0.14, 5: 0.35 })
  }),
  queen: Object.freeze({
    id: "queen", name: "Queen of Diamonds", asset: "queen", goldenAsset: "goldenQueen",
    canBeGolden: true, payouts: Object.freeze({ 3: 0.05, 4: 0.12, 5: 0.30 })
  }),
  jack: Object.freeze({
    id: "jack", name: "Jack of Clubs", asset: "jack", goldenAsset: "goldenJack",
    canBeGolden: true, payouts: Object.freeze({ 3: 0.04, 4: 0.10, 5: 0.25 })
  }),
  heart: Object.freeze({
    id: "heart", name: "Heart", asset: "heart", canBeGolden: false,
    payouts: Object.freeze({ 3: 0.025, 4: 0.06, 5: 0.16 })
  }),
  diamond: Object.freeze({
    id: "diamond", name: "Diamond", asset: "diamond", canBeGolden: false,
    payouts: Object.freeze({ 3: 0.022, 4: 0.05, 5: 0.14 })
  }),
  club: Object.freeze({
    id: "club", name: "Club", asset: "club", canBeGolden: false,
    payouts: Object.freeze({ 3: 0.018, 4: 0.04, 5: 0.11 })
  }),
  spade: Object.freeze({
    id: "spade", name: "Spade", asset: "spade", canBeGolden: false,
    payouts: Object.freeze({ 3: 0.015, 4: 0.035, 5: 0.09 })
  }),
  scatter: Object.freeze({
    id: "scatter", name: "Scatter", asset: "scatter", canBeGolden: false,
    payouts: Object.freeze({})
  }),
  wild: Object.freeze({
    id: "wild", name: "Joker Wild", asset: "wild", canBeGolden: false,
    payouts: Object.freeze({})
  })
});

export const RegularSymbolIds = Object.freeze([
  "ace", "king", "queen", "jack", "heart", "diamond", "club", "spade"
]);

export const GoldenSymbolIds = Object.freeze(["ace", "king", "queen", "jack"]);

export function isRegularSymbol(family) {
  return RegularSymbolIds.includes(family);
}
