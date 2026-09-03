/**
 * Developer luck profiles. Level zero is deliberately untouched production RNG.
 * Higher levels search more outcomes and may create a randomized "lucky thread":
 * a valid sequence of connected boards which is still evaluated by RoundEngine.
 */
export const RNGLevelConfig = Object.freeze([
  { level: 0, label: "Normal", candidates: 1, threadChance: 0 },
  { level: 1, label: "Slight Boost", candidates: 2, threadChance: .08, minStages: 1, maxStages: 2, maxWidth: 3 },
  { level: 2, label: "Lucky", candidates: 4, threadChance: .16, minStages: 1, maxStages: 3, maxWidth: 3 },
  { level: 3, label: "Hot", candidates: 7, threadChance: .28, minStages: 2, maxStages: 4, maxWidth: 4 },
  { level: 4, label: "Very Hot", candidates: 11, threadChance: .42, minStages: 3, maxStages: 5, maxWidth: 4 },
  { level: 5, label: "Crazy", candidates: 16, threadChance: .58, minStages: 4, maxStages: 6, maxWidth: 5 },
  { level: 6, label: "Wild", candidates: 23, threadChance: .72, minStages: 5, maxStages: 7, maxWidth: 5 },
  { level: 7, label: "Insane", candidates: 32, threadChance: .84, minStages: 6, maxStages: 9, maxWidth: 5 },
  { level: 8, label: "Extreme", candidates: 44, threadChance: .93, minStages: 7, maxStages: 11, maxWidth: 5 },
  { level: 9, label: "Near Max", candidates: 58, threadChance: .98, minStages: 8, maxStages: 13, maxWidth: 5 },
  { level: 10, label: "FORCE MAX WIN Scenario", candidates: 0, forceMaxWin: true }
].map(Object.freeze));

const SAFE = [
  ["ace", "king", "heart", "diamond"], ["queen", "jack", "club", "spade"],
  ["heart", "diamond", "ace", "king"], ["club", "spade", "queen", "jack"],
  ["diamond", "heart", "king", "ace"]
];
const PREMIUMS = ["ace", "king", "queen", "jack"];

export function rngLevelProfile(value) {
  return RNGLevelConfig[Math.min(10, Math.max(0, Math.trunc(Number(value) || 0)))];
}

const shuffled = (items, rng) => [...items].sort(() => rng.nextFloat() - .5);

function stageBoard({ primary, secondary, width, concentrated, golden, rng }) {
  return Array.from({ length: 5 }, (_, reel) => {
    if (reel >= width) return [...SAFE[reel]];
    const primaryCount = concentrated ? 4 : 2;
    const column = Array.from({ length: 4 }, (_, row) => row < primaryCount ? primary : secondary);
    const mixed = shuffled(column, rng);
    if (golden && reel > 0 && reel < 4) {
      const index = Math.floor(rng.nextFloat() * mixed.length);
      mixed[index] = `golden:${mixed[index]}`;
    } else if (concentrated && rng.nextFloat() < .24) {
      mixed[Math.floor(rng.nextFloat() * mixed.length)] = "wild";
    }
    return mixed;
  });
}

/** Build an auditable queue of real cascade boards, not a payout override. */
export function cascadeThread({ rng, stages, width = 5, maxWin = false, power = 0 }) {
  const boards = [];
  let previousGolden = Array.from({ length: 5 }, () => new Set());
  for (let index = 0; index < stages; index += 1) {
    const families = shuffled(PREMIUMS, rng);
    const stageWidth = maxWin ? 5 : width;
    const golden = index === 2 || (index > 2 && rng.nextFloat() < .22);
    const board = stageBoard({
      primary: families[0], secondary: families[1], width: stageWidth,
      concentrated: maxWin
        ? index >= Math.max(3, stages - 4)
        : power >= 5 && index > stages * .65 && rng.nextFloat() < power / 14,
      golden, rng
    });
    // A Golden winner remains at its row as a Wild for exactly the next board.
    previousGolden.forEach((rows, reel) => rows.forEach((row) => { board[reel][row] = "wild"; }));
    previousGolden = board.map((reel) => new Set(reel.map((token, row) => String(token).startsWith("golden:") ? row : -1).filter((row) => row >= 0)));
    boards.push(board);
  }

  const refillQueues = Array.from({ length: 5 }, () => []);
  let retained = boards[0].map((reel) => new Set(reel.map((token, row) => String(token).startsWith("golden:") ? row : -1).filter((row) => row >= 0)));
  for (let stage = 1; stage < boards.length; stage += 1) {
    boards[stage].forEach((reel, reelIndex) => reel.forEach((token, row) => {
      if (!retained[reelIndex].has(row)) refillQueues[reelIndex].push(token);
    }));
    retained = boards[stage].map((reel) => new Set(reel.map((token, row) => String(token).startsWith("golden:") ? row : -1).filter((row) => row >= 0)));
  }
  SAFE.forEach((reel, reelIndex) => reel.forEach((token, row) => {
    if (!retained[reelIndex].has(row)) refillQueues[reelIndex].push(token);
  }));
  return { forcedGrid: boards[0], refillQueues, scenarioVariant: boards.map((board) => board.flat().join(",")).join("|") };
}

export function boostedScenario(profile, rng) {
  if (!profile.threadChance || rng.nextFloat() >= profile.threadChance) return null;
  const span = profile.maxStages - profile.minStages + 1;
  const stages = profile.minStages + Math.floor(rng.nextFloat() * span);
  return cascadeThread({ rng, stages, width: profile.maxWidth, power: profile.level });
}

export function maxWinScenario(rng) {
  // Nine to eleven distinct stages create a paced ~10,000x journey; the ordinary
  // calculator and hard cap remain solely responsible for the final award.
  return cascadeThread({ rng, stages: 9 + Math.floor(rng.nextFloat() * 3), width: 5, maxWin: true });
}
