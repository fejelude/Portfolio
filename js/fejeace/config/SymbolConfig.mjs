export const SymbolConfig = Object.freeze({
  ace: Object.freeze({
    id: "ace", name: "Ace of Hearts", asset: "ace", goldenAsset: "goldenAce",
    canBeGolden: true, payouts: Object.freeze({ 3: 0.176, 4: 0.396, 5: 1.10 })
  }),
  king: Object.freeze({
    id: "king", name: "King of Spades", asset: "king", goldenAsset: "goldenKing",
    canBeGolden: true, payouts: Object.freeze({ 3: 0.132, 4: 0.308, 5: 0.77 })
  }),
  queen: Object.freeze({
    id: "queen", name: "Queen of Diamonds", asset: "queen", goldenAsset: "goldenQueen",
    canBeGolden: true, payouts: Object.freeze({ 3: 0.11, 4: 0.264, 5: 0.66 })
  }),
  jack: Object.freeze({
    id: "jack", name: "Jack of Clubs", asset: "jack", goldenAsset: "goldenJack",
    canBeGolden: true, payouts: Object.freeze({ 3: 0.088, 4: 0.22, 5: 0.55 })
  }),
  heart: Object.freeze({
    id: "heart", name: "Heart", asset: "heart", canBeGolden: false,
    payouts: Object.freeze({ 3: 0.055, 4: 0.132, 5: 0.352 })
  }),
  diamond: Object.freeze({
    id: "diamond", name: "Diamond", asset: "diamond", canBeGolden: false,
    payouts: Object.freeze({ 3: 0.0484, 4: 0.11, 5: 0.308 })
  }),
  club: Object.freeze({
    id: "club", name: "Club", asset: "club", canBeGolden: false,
    payouts: Object.freeze({ 3: 0.0396, 4: 0.088, 5: 0.242 })
  }),
  spade: Object.freeze({
    id: "spade", name: "Spade", asset: "spade", canBeGolden: false,
    payouts: Object.freeze({ 3: 0.033, 4: 0.077, 5: 0.198 })
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
