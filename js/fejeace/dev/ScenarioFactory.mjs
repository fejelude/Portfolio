const SAFE_GRID = Object.freeze([
  Object.freeze(["ace", "king", "heart", "diamond"]),
  Object.freeze(["queen", "jack", "club", "spade"]),
  Object.freeze(["heart", "diamond", "ace", "king"]),
  Object.freeze(["club", "spade", "queen", "jack"]),
  Object.freeze(["diamond", "heart", "king", "ace"])
]);

const cloneTokens = (grid) => grid.map((reel) => [...reel]);

function safeRefills() {
  return cloneTokens(SAFE_GRID);
}

function scatterScenario(count, mode = "base") {
  const grid = cloneTokens(SAFE_GRID);
  const positions = [[0, 0], [2, 1], [4, 2], [1, 3], [3, 0]];
  positions.slice(0, count).forEach(([reel, row]) => { grid[reel][row] = "scatter"; });
  return { mode, forcedGrid: grid, refillQueues: [] };
}

function fullFamilyGrid(family, reelCount = 3) {
  const grid = cloneTokens(SAFE_GRID);
  for (let reel = 0; reel < reelCount; reel += 1) grid[reel] = Array(4).fill(family);
  return grid;
}

function refillAfterFullWin(reelCount = 3) {
  return Array.from({ length: 5 }, (_, reel) => reel < reelCount ? [...SAFE_GRID[reel]] : []);
}

export const DevelopmentScenarios = Object.freeze([
  Object.freeze({ id: "three-scatters", label: "Exactly 3 Scatters" }),
  Object.freeze({ id: "four-scatters", label: "4+ Scatters" }),
  Object.freeze({ id: "golden", label: "Golden Symbol" }),
  Object.freeze({ id: "multi-golden", label: "Multiple Golden Symbols" }),
  Object.freeze({ id: "joker", label: "Joker / Wild" }),
  Object.freeze({ id: "one-cascade", label: "One Cascade" }),
  Object.freeze({ id: "many-cascades", label: "4+ Cascades" }),
  Object.freeze({ id: "free-spins", label: "Free Spins Trigger" }),
  Object.freeze({ id: "retrigger", label: "Free Spin Retrigger" }),
  Object.freeze({ id: "no-win", label: "No Win" }),
  Object.freeze({ id: "large-win", label: "Large Win" }),
  Object.freeze({ id: "insufficient", label: "Insufficient Balance" })
]);

export function createScenario(id) {
  if (id === "three-scatters" || id === "free-spins") return scatterScenario(3);
  if (id === "four-scatters") return scatterScenario(4);
  if (id === "retrigger") return scatterScenario(3, "free");
  if (id === "no-win") return { mode: "base", forcedGrid: cloneTokens(SAFE_GRID), refillQueues: [] };
  if (id === "insufficient") return { mode: "special", action: "insufficient" };

  if (id === "golden" || id === "multi-golden") {
    const grid = fullFamilyGrid("ace", 3);
    grid[1][0] = "golden:ace";
    if (id === "multi-golden") {
      grid[1][1] = "golden:ace";
      grid[2][2] = "golden:ace";
    }
    return { mode: "base", forcedGrid: grid, refillQueues: refillAfterFullWin(3) };
  }

  if (id === "joker") {
    const grid = fullFamilyGrid("king", 3);
    grid[1][0] = "wild";
    grid[1][1] = "wild";
    return { mode: "base", forcedGrid: grid, refillQueues: refillAfterFullWin(3) };
  }

  if (id === "one-cascade") {
    return { mode: "base", forcedGrid: fullFamilyGrid("queen", 3), refillQueues: refillAfterFullWin(3) };
  }

  if (id === "large-win") {
    return { mode: "base", forcedGrid: fullFamilyGrid("ace", 5), refillQueues: safeRefills() };
  }

  if (id === "many-cascades") {
    const families = ["king", "queen", "jack", "heart"];
    const queues = Array.from({ length: 5 }, (_, reel) => {
      if (reel >= 3) return [];
      return [...families.flatMap((family) => Array(4).fill(family)), ...SAFE_GRID[reel]];
    });
    return { mode: "base", forcedGrid: fullFamilyGrid("ace", 3), refillQueues: queues };
  }

  throw new Error(`Unknown development scenario: ${id}`);
}

export function scenarioFromGridJson(value) {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.length !== 5 || parsed.some((reel) => !Array.isArray(reel) || reel.length !== 4)) {
    throw new Error("Use five reel arrays containing four symbol tokens each.");
  }
  return { mode: "base", forcedGrid: parsed, refillQueues: [] };
}

export { SAFE_GRID };
