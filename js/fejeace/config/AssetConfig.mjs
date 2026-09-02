const ROOT = "assets/fejeace";

export const AssetConfig = Object.freeze({
  logo: `${ROOT}/logo.webp`,
  bigJoker: `${ROOT}/big-joker.webp`,
  symbols: Object.freeze({
    ace: `${ROOT}/symbols/ace.webp`,
    king: `${ROOT}/symbols/king.webp`,
    queen: `${ROOT}/symbols/queen.webp`,
    jack: `${ROOT}/symbols/jack.webp`,
    goldenAce: `${ROOT}/symbols/golden-ace.webp`,
    goldenKing: `${ROOT}/symbols/golden-king.webp`,
    goldenQueen: `${ROOT}/symbols/golden-queen.webp`,
    goldenJack: `${ROOT}/symbols/golden-jack.webp`,
    heart: `${ROOT}/symbols/heart.webp`,
    diamond: `${ROOT}/symbols/diamond.webp`,
    club: `${ROOT}/symbols/club.webp`,
    spade: `${ROOT}/symbols/spade.webp`,
    scatter: `${ROOT}/symbols/scatter.webp`,
    wild: `${ROOT}/symbols/wild.webp`
  }),
  sounds: Object.freeze({
    click: `${ROOT}/sounds/ui-click.mp3`,
    betChange: `${ROOT}/sounds/bet-change.mp3`,
    error: `${ROOT}/sounds/error.mp3`,
    spin: `${ROOT}/sounds/spin.mp3`,
    reelStop: `${ROOT}/sounds/reel-stop.mp3`,
    symbolLand: `${ROOT}/sounds/symbol-land.mp3`,
    win: `${ROOT}/sounds/win.mp3`,
    cascade: `${ROOT}/sounds/cascade.mp3`,
    golden: `${ROOT}/sounds/golden.mp3`,
    wildTransform: `${ROOT}/sounds/wild-transform.mp3`,
    scatter: `${ROOT}/sounds/scatter.mp3`,
    anticipation: `${ROOT}/sounds/anticipation.mp3`,
    multiplier: `${ROOT}/sounds/multiplier.mp3`,
    freeSpins: `${ROOT}/sounds/free-spins.mp3`,
    retrigger: `${ROOT}/sounds/retrigger.mp3`,
    bigWin: `${ROOT}/sounds/big-win.mp3`,
    megaWin: `${ROOT}/sounds/mega-win.mp3`,
    epicWin: `${ROOT}/sounds/epic-win.mp3`
  })
});

const goldenAssetByFamily = Object.freeze({
  ace: "goldenAce",
  king: "goldenKing",
  queen: "goldenQueen",
  jack: "goldenJack"
});

export function symbolAsset(cell) {
  if (!cell) return "";
  if (cell.variant === "golden") return AssetConfig.symbols[goldenAssetByFamily[cell.family]];
  if (cell.family === "wild") return AssetConfig.symbols.wild;
  if (cell.family === "scatter") return AssetConfig.symbols.scatter;
  return AssetConfig.symbols[cell.family] || "";
}

export async function preloadImages() {
  const sources = [AssetConfig.logo, AssetConfig.bigJoker, ...Object.values(AssetConfig.symbols)];
  return Promise.allSettled(sources.map((source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(source);
    image.onerror = () => reject(new Error(`Unable to load ${source}`));
    image.src = source;
  })));
}
