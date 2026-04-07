import { DIRECTIONS } from "@/lib/empire/config";
import { getTerrainMoveCost } from "@/lib/empire/game";
import type { GameState, Side, Tile, Unit } from "@/lib/empire/types";

export type AiThreatenedSite = {
  x: number;
  y: number;
  name: string;
  threatScore: number;
};

export type AiThreatSummary = {
  threatenedSites: AiThreatenedSite[];
  knownEnemyCityCount: number;
  knownEnemyUnitCount: number;
  knownEnemyNearFrontCount: number;
  unexploredTileCount: number;
};

export type AiStrategicGoalType =
  | "defend-city"
  | "capture-neutral-city"
  | "attack-enemy-city"
  | "scout-unexplored"
  | "reinforce-front"
  | "intercept-air-threat";

export type AiStrategicGoal = {
  type: AiStrategicGoalType;
  score: number;
  x: number;
  y: number;
  summary: string;
};

export type AiOperationType =
  | "defense"
  | "expansion"
  | "offense"
  | "recon"
  | "naval-control"
  | "amphibious-assault";

export type AiOperationStage = "forming" | "staging" | "executing";

export type AiOperation = {
  id: string;
  type: AiOperationType;
  priority: number;
  targetX: number;
  targetY: number;
  stagingX: number;
  stagingY: number;
  approachX?: number;
  approachY?: number;
  requiresTransport: boolean;
  requiresEscort: boolean;
  stage: AiOperationStage;
  goalType: AiStrategicGoalType | "fallback";
  summary: string;
};

export type AiUnitRole =
  | "garrison"
  | "line-attacker"
  | "scout"
  | "interceptor"
  | "raider"
  | "bombardment"
  | "fleet-screen"
  | "fleet-strike"
  | "carrier-core"
  | "transport-support"
  | "specialist";

export type AiUnitMissionType =
  | "hold-site"
  | "advance-on-city"
  | "capture-city"
  | "scout-sector"
  | "intercept-threat"
  | "support-front"
  | "strike-target"
  | "screen-fleet"
  | "stage-assault"
  | "escort-expedition";

export type AiUnitMission = {
  unitId: number;
  unitType: Unit["type"];
  role: AiUnitRole;
  missionType: AiUnitMissionType;
  targetX: number;
  targetY: number;
  goalType: AiStrategicGoalType | "fallback";
  operationId: string | null;
  operationType: AiOperationType | null;
  stagingX?: number;
  stagingY?: number;
  approachX?: number;
  approachY?: number;
  requiresTransport?: boolean;
  summary: string;
};

function distance(a: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">, b: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function nearestDistance(units: Unit[], tile: Pick<Tile, "x" | "y">, predicate?: (unit: Unit) => boolean) {
  const candidates = predicate ? units.filter(predicate) : units;
  if (candidates.length === 0) return 99;
  return Math.min(...candidates.map((unit) => distance(unit, tile)));
}

function getLocationLabel(tile: Tile | Pick<Tile, "x" | "y">) {
  return `(${tile.x + 1}, ${tile.y + 1})`;
}

function inBounds(x: number, y: number, width: number, height: number) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function createProbeUnit(type: Unit["type"], x: number, y: number, owner: Side = "ai"): Unit {
  return {
    id: -1,
    owner,
    type,
    x,
    y,
    hp: 10,
    moveSpent: 0,
    fortified: false,
    entrenched: false,
    sentry: false,
    concealed: false,
    turnsAwayFromBase: 0,
    bombsRemaining: null,
    torpedoesRemaining: null,
    cruiseMissilesRemaining: null,
    droneTargetX: null,
    droneTargetY: null,
    carriedSpecialOps: null,
    carriedTroops: null,
  };
}

function getDetectedEnemyUnits(state: GameState, side: Side) {
  const visible = side === "ai" ? state.aiVisible : state.playerVisible;
  const detectedIds = new Set(side === "ai" ? state.aiDetectedUnitIds : state.playerDetectedUnitIds);

  return state.units.filter((unit) => {
    if (unit.owner === side) return false;
    if (!visible[unit.y]?.[unit.x]) return false;
    return detectedIds.has(unit.id);
  });
}

function getKnownTiles(state: GameState, side: Side) {
  return (side === "ai" ? state.aiIntel : state.playerIntel).flat().filter((tile): tile is Tile => Boolean(tile));
}

function scoreThreatAtSite(site: Tile, enemyUnits: Unit[]) {
  let threatScore = 0;

  for (const enemyUnit of enemyUnits) {
    const range = distance(site, enemyUnit);
    if (range > 6) continue;
    threatScore += Math.max(0, 7 - range);
  }

  return threatScore;
}

function hasAdjacentWater(state: GameState, x: number, y: number) {
  return DIRECTIONS.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return inBounds(nx, ny, state.mapWidth, state.mapHeight) && state.map[ny][nx].terrain === "water";
  });
}

function getCoastalAiSites(state: GameState) {
  return state.map.flat().filter((tile) => {
    if (tile.owner !== "ai") return false;
    if (!(tile.city || tile.improvement?.type === "port" || tile.improvement?.type === "airfield")) return false;
    return hasAdjacentWater(state, tile.x, tile.y);
  });
}

function hasLandRouteIgnoringUnits(state: GameState, start: Pick<Tile, "x" | "y">, target: Pick<Tile, "x" | "y">, unitType: Unit["type"]) {
  const frontier = [{ x: start.x, y: start.y, cost: 0 }];
  const bestCost = new Map<string, number>([[`${start.x},${start.y}`, 0]]);
  const probe = createProbeUnit(unitType, start.x, start.y);

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift();
    if (!current) break;
    if (current.x === target.x && current.y === target.y) return true;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!inBounds(nx, ny, state.mapWidth, state.mapHeight)) continue;
      const tile = state.map[ny][nx];
      const moveCost = getTerrainMoveCost(state, probe, tile);
      if (moveCost >= 999) continue;
      const totalCost = current.cost + moveCost;
      const tileKey = `${nx},${ny}`;
      const previous = bestCost.get(tileKey);
      if (previous !== undefined && previous <= totalCost) continue;
      bestCost.set(tileKey, totalCost);
      frontier.push({ x: nx, y: ny, cost: totalCost });
    }
  }

  return false;
}

function findBestFriendlyStagingSite(state: GameState, target: Pick<Tile, "x" | "y">) {
  const coastalSites = getCoastalAiSites(state);
  if (coastalSites.length === 0) return null;
  return [...coastalSites].sort((a, b) => distance(a, target) - distance(b, target))[0] ?? null;
}

function findLandingPlan(state: GameState, target: Pick<Tile, "x" | "y">, stagingSite: Pick<Tile, "x" | "y">) {
  let bestLanding: { x: number; y: number } | null = null;
  let bestApproach: { x: number; y: number } | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const row of state.map) {
    for (const tile of row) {
      if (tile.terrain === "water") continue;
      if (!hasAdjacentWater(state, tile.x, tile.y)) continue;
      if (!hasLandRouteIgnoringUnits(state, tile, target, "infantry")) continue;

      const approachTiles = DIRECTIONS
        .map(([dx, dy]) => ({ x: tile.x + dx, y: tile.y + dy }))
        .filter((candidate) => inBounds(candidate.x, candidate.y, state.mapWidth, state.mapHeight))
        .filter((candidate) => state.map[candidate.y][candidate.x].terrain === "water");
      if (approachTiles.length === 0) continue;

      const approach = approachTiles.sort((a, b) => distance(a, stagingSite) - distance(b, stagingSite))[0];
      const score = distance(tile, target) * 4 + distance(approach, stagingSite);
      if (score < bestScore) {
        bestScore = score;
        bestLanding = { x: tile.x, y: tile.y };
        bestApproach = approach;
      }
    }
  }

  if (!bestLanding || !bestApproach) return null;
  return { landing: bestLanding, approach: bestApproach };
}

function createObjectiveOperation(state: GameState, goal: AiStrategicGoal, aiUnits: Unit[]): AiOperation {
  const captureUnits = aiUnits.filter((unit) => ["infantry", "tank", "scout", "engineer", "special-ops"].includes(unit.type));
  const reachableByLand = captureUnits.some((unit) => hasLandRouteIgnoringUnits(state, unit, goal, unit.type));
  const stagingSite = findBestFriendlyStagingSite(state, goal);
  const landingPlan = !reachableByLand && stagingSite ? findLandingPlan(state, goal, stagingSite) : null;
  const requiresTransport = !reachableByLand && Boolean(stagingSite && landingPlan);
  const stage =
    !requiresTransport
      ? "executing"
      : state.units.some((unit) => unit.owner === "ai" && unit.type === "troop-transport")
        ? "staging"
        : "forming";

  return {
    id: `${goal.type}:${goal.x},${goal.y}`,
    type:
      goal.type === "capture-neutral-city"
        ? requiresTransport
          ? "amphibious-assault"
          : "expansion"
        : requiresTransport
          ? "amphibious-assault"
          : "offense",
    priority: goal.score + (requiresTransport ? 10 : 0),
    targetX: goal.x,
    targetY: goal.y,
    stagingX: stagingSite?.x ?? goal.x,
    stagingY: stagingSite?.y ?? goal.y,
    approachX: landingPlan?.approach.x,
    approachY: landingPlan?.approach.y,
    requiresTransport,
    requiresEscort: requiresTransport,
    stage,
    goalType: goal.type,
    summary:
      requiresTransport && stagingSite && landingPlan
        ? `${goal.summary}; stage from ${getLocationLabel(stagingSite)} and land via ${getLocationLabel(landingPlan.landing)}`
        : goal.summary,
  };
}

function createNavalControlOperations(state: GameState, aiUnits: Unit[], operations: AiOperation[]) {
  const enemySeaUnits = getDetectedEnemyUnits(state, "ai").filter((unit) =>
    ["destroyer", "troop-transport", "carrier", "submarine", "ssbn", "fighter", "bomber", "chopper", "drone-swarm"].includes(unit.type)
  );
  const navalOperations: AiOperation[] = [];
  const aiSeaPower = aiUnits.filter((unit) => ["destroyer", "troop-transport", "carrier", "submarine", "ssbn"].includes(unit.type));

  if (enemySeaUnits.length > 0 && aiSeaPower.length > 0) {
    const focal = [...enemySeaUnits].sort((a, b) => distance(aiSeaPower[0], a) - distance(aiSeaPower[0], b))[0];
    navalOperations.push({
      id: `naval-control:${focal.x},${focal.y}`,
      type: "naval-control",
      priority: 74,
      targetX: focal.x,
      targetY: focal.y,
      stagingX: focal.x,
      stagingY: focal.y,
      requiresTransport: false,
      requiresEscort: false,
      stage: "executing",
      goalType: "fallback",
      summary: `Contest enemy naval pressure near ${getLocationLabel(focal)}`,
    });
  }

  for (const operation of operations.filter((candidate) => candidate.requiresEscort)) {
    navalOperations.push({
      id: `escort:${operation.id}`,
      type: "naval-control",
      priority: operation.priority - 4,
      targetX: operation.approachX ?? operation.targetX,
      targetY: operation.approachY ?? operation.targetY,
      stagingX: operation.stagingX,
      stagingY: operation.stagingY,
      approachX: operation.approachX,
      approachY: operation.approachY,
      requiresTransport: false,
      requiresEscort: false,
      stage: operation.stage,
      goalType: operation.goalType,
      summary: `Escort corridor for ${operation.summary.toLowerCase()}`,
    });
  }

  return navalOperations;
}

export function createAiThreatSummary(state: GameState): AiThreatSummary {
  const knownTiles = getKnownTiles(state, "ai");
  const enemyUnits = getDetectedEnemyUnits(state, "ai");
  const aiSites = state.map.flat().filter((tile) => {
    if (tile.owner !== "ai") return false;
    if (tile.city) return true;
    return tile.improvement?.owner === "ai" && (tile.improvement.type === "port" || tile.improvement.type === "airfield");
  });

  const threatenedSites = aiSites
    .map((site) => {
      const name = site.city
        ? site.cityName ?? getLocationLabel(site)
        : `${site.improvement?.type ?? "site"} ${getLocationLabel(site)}`;
      return {
        x: site.x,
        y: site.y,
        name,
        threatScore: scoreThreatAtSite(site, enemyUnits),
      };
    })
    .filter((site) => site.threatScore > 0)
    .sort((a, b) => b.threatScore - a.threatScore);

  const knownEnemyCities = knownTiles.filter((tile) => tile.city && tile.owner === "player");
  const knownEnemyNearFrontCount = enemyUnits.filter((enemyUnit) =>
    aiSites.some((site) => distance(site, enemyUnit) <= 5)
  ).length;
  const unexploredTileCount = state.aiIntel.flat().filter((tile) => tile === null).length;

  return {
    threatenedSites,
    knownEnemyCityCount: knownEnemyCities.length,
    knownEnemyUnitCount: enemyUnits.length,
    knownEnemyNearFrontCount,
    unexploredTileCount,
  };
}

export function planAiStrategicGoals(state: GameState, threatSummary: AiThreatSummary): AiStrategicGoal[] {
  const goals: AiStrategicGoal[] = [];
  const knownTiles = getKnownTiles(state, "ai");
  const knownEnemyCities = knownTiles.filter((tile) => tile.city && tile.owner === "player");
  const knownNeutralCities = knownTiles.filter((tile) => tile.city && tile.owner === null);
  const aiUnits = state.units.filter((unit) => unit.owner === "ai");
  const capturingUnits = aiUnits.filter((unit) => ["infantry", "tank", "scout", "engineer", "special-ops"].includes(unit.type));
  const knownEnemyAirUnits = getDetectedEnemyUnits(state, "ai").filter((unit) =>
    ["chopper", "fighter", "bomber", "drone-swarm"].includes(unit.type)
  );

  for (const site of threatSummary.threatenedSites.slice(0, 3)) {
    goals.push({
      type: "defend-city",
      score: 90 + site.threatScore,
      x: site.x,
      y: site.y,
      summary: `Defend ${site.name}; threat ${site.threatScore}`,
    });
  }

  for (const tile of [...knownNeutralCities]
    .map((city) => ({
      city,
      score: 60 + Math.max(0, 24 - nearestDistance(capturingUnits, city) * 4),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.city)) {
    goals.push({
      type: "capture-neutral-city",
      score: 60 + Math.max(0, 24 - nearestDistance(capturingUnits, tile) * 4),
      x: tile.x,
      y: tile.y,
      summary: `Capture neutral city at ${tile.cityName ?? getLocationLabel(tile)}`,
    });
  }

  for (const tile of [...knownEnemyCities]
    .map((city) => ({
      city,
      score: 66 + Math.max(0, 20 - nearestDistance(aiUnits, city) * 3),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.city)) {
    goals.push({
      type: "attack-enemy-city",
      score: 66 + Math.max(0, 20 - nearestDistance(aiUnits, tile) * 3),
      x: tile.x,
      y: tile.y,
      summary: `Pressure enemy city at ${tile.cityName ?? getLocationLabel(tile)}`,
    });
  }

  if (threatSummary.unexploredTileCount > 0) {
    const unexploredTarget = state.aiIntel.reduce<{ x: number; y: number } | null>((found, row, y) => {
      if (found) return found;
      const x = row.findIndex((tile) => tile === null);
      return x >= 0 ? { x, y } : null;
    }, null);

    if (unexploredTarget) {
      goals.push({
        type: "scout-unexplored",
        score: 56,
        x: unexploredTarget.x,
        y: unexploredTarget.y,
        summary: `Scout unexplored sector near ${getLocationLabel(unexploredTarget)}`,
      });
    }
  }

  if (threatSummary.knownEnemyNearFrontCount > 0 && threatSummary.threatenedSites[0]) {
    goals.push({
      type: "reinforce-front",
      score: 66 + Math.min(10, threatSummary.knownEnemyNearFrontCount),
      x: threatSummary.threatenedSites[0].x,
      y: threatSummary.threatenedSites[0].y,
      summary: `Reinforce front near ${threatSummary.threatenedSites[0].name}`,
    });
  }

  for (const airUnit of knownEnemyAirUnits.slice(0, 2)) {
    goals.push({
      type: "intercept-air-threat",
      score: 84,
      x: airUnit.x,
      y: airUnit.y,
      summary: `Intercept enemy air threat near ${getLocationLabel(airUnit)}`,
    });
  }

  return goals.sort((a, b) => b.score - a.score);
}

export function planAiOperations(state: GameState, goals: AiStrategicGoal[], threatSummary: AiThreatSummary): AiOperation[] {
  const operations: AiOperation[] = [];
  const aiUnits = state.units.filter((unit) => unit.owner === "ai");

  for (const goal of goals) {
    if (goal.type === "defend-city") {
      operations.push({
        id: `${goal.type}:${goal.x},${goal.y}`,
        type: "defense",
        priority: goal.score,
        targetX: goal.x,
        targetY: goal.y,
        stagingX: goal.x,
        stagingY: goal.y,
        requiresTransport: false,
        requiresEscort: false,
        stage: "executing",
        goalType: goal.type,
        summary: goal.summary,
      });
      continue;
    }

    if (goal.type === "capture-neutral-city" || goal.type === "attack-enemy-city") {
      operations.push(createObjectiveOperation(state, goal, aiUnits));
      continue;
    }

    if (goal.type === "scout-unexplored") {
      operations.push({
        id: `${goal.type}:${goal.x},${goal.y}`,
        type: "recon",
        priority: goal.score,
        targetX: goal.x,
        targetY: goal.y,
        stagingX: goal.x,
        stagingY: goal.y,
        requiresTransport: false,
        requiresEscort: false,
        stage: "executing",
        goalType: goal.type,
        summary: goal.summary,
      });
      continue;
    }

    if (goal.type === "intercept-air-threat") {
      operations.push({
        id: `${goal.type}:${goal.x},${goal.y}`,
        type: "defense",
        priority: goal.score,
        targetX: goal.x,
        targetY: goal.y,
        stagingX: goal.x,
        stagingY: goal.y,
        requiresTransport: false,
        requiresEscort: false,
        stage: "executing",
        goalType: goal.type,
        summary: goal.summary,
      });
      continue;
    }

    operations.push({
      id: `${goal.type}:${goal.x},${goal.y}`,
      type: "defense",
      priority: goal.score,
      targetX: goal.x,
      targetY: goal.y,
      stagingX: goal.x,
      stagingY: goal.y,
      requiresTransport: false,
      requiresEscort: false,
      stage: "executing",
      goalType: goal.type,
      summary: goal.summary,
    });
  }

  const navalOperations = createNavalControlOperations(state, aiUnits, operations);
  const fallbackThreat = threatSummary.threatenedSites[0];
  if (navalOperations.length === 0 && fallbackThreat && hasAdjacentWater(state, fallbackThreat.x, fallbackThreat.y)) {
    navalOperations.push({
      id: `naval-control:${fallbackThreat.x},${fallbackThreat.y}`,
      type: "naval-control",
      priority: 58,
      targetX: fallbackThreat.x,
      targetY: fallbackThreat.y,
      stagingX: fallbackThreat.x,
      stagingY: fallbackThreat.y,
      requiresTransport: false,
      requiresEscort: false,
      stage: "executing",
      goalType: "fallback",
      summary: `Guard coastal approaches near ${fallbackThreat.name}`,
    });
  }

  return [...operations, ...navalOperations].sort((a, b) => b.priority - a.priority);
}

export function classifyAiUnitRole(unit: Unit): AiUnitRole {
  if (unit.type === "scout") return "scout";
  if (unit.type === "fighter") return "interceptor";
  if (unit.type === "bomber" || unit.type === "drone-swarm") return "bombardment";
  if (unit.type === "destroyer") return "fleet-screen";
  if (unit.type === "submarine" || unit.type === "ssbn") return "fleet-strike";
  if (unit.type === "carrier") return "carrier-core";
  if (unit.type === "troop-transport") return "transport-support";
  if (unit.type === "special-ops" || unit.type === "engineer" || unit.type === "chopper") return "specialist";
  if (unit.type === "infantry") return "garrison";
  return "line-attacker";
}

function getRoleOperationAffinity(role: AiUnitRole, operation: AiOperation) {
  if (operation.type === "defense") {
    if (role === "garrison") return 32;
    if (role === "interceptor") return 24;
    if (role === "line-attacker") return 16;
    if (role === "bombardment") return 12;
    if (role === "fleet-screen") return 8;
  }

  if (operation.type === "expansion" || operation.type === "offense") {
    if (role === "garrison") return 22;
    if (role === "line-attacker") return 26;
    if (role === "scout") return 12;
    if (role === "bombardment") return operation.type === "offense" ? 24 : 12;
    if (role === "interceptor") return 10;
    if (role === "specialist") return 16;
    if (role === "transport-support" && operation.requiresTransport) return 26;
    if (role === "fleet-screen" && operation.requiresEscort) return 18;
    if (role === "fleet-strike" && operation.requiresEscort) return 16;
    if (role === "carrier-core" && operation.requiresEscort) return 18;
  }

  if (operation.type === "amphibious-assault") {
    if (role === "transport-support") return 34;
    if (role === "fleet-screen") return 28;
    if (role === "fleet-strike") return 24;
    if (role === "carrier-core") return 22;
    if (role === "interceptor") return 16;
    if (role === "garrison" || role === "line-attacker" || role === "specialist") return 22;
    if (role === "bombardment") return 18;
  }

  if (operation.type === "recon") {
    if (role === "scout") return 36;
    if (role === "specialist") return 14;
  }

  if (operation.type === "naval-control") {
    if (role === "fleet-screen") return 32;
    if (role === "fleet-strike") return 30;
    if (role === "carrier-core") return 22;
    if (role === "interceptor") return 12;
    if (role === "transport-support") return 10;
  }

  return 0;
}

function getRoleAssignmentPriority(role: AiUnitRole) {
  if (role === "transport-support") return 104;
  if (role === "garrison") return 100;
  if (role === "interceptor") return 92;
  if (role === "carrier-core") return 88;
  if (role === "fleet-screen") return 84;
  if (role === "fleet-strike") return 82;
  if (role === "line-attacker") return 74;
  if (role === "bombardment") return 70;
  if (role === "scout") return 62;
  return 50;
}

function getOperationDestination(unit: Unit, role: AiUnitRole, operation: AiOperation) {
  if (operation.type === "recon") {
    return { x: operation.targetX, y: operation.targetY };
  }

  if (operation.type === "naval-control") {
    return { x: operation.approachX ?? operation.targetX, y: operation.approachY ?? operation.targetY };
  }

  if (operation.requiresTransport) {
    if (role === "transport-support") {
      return {
        x: operation.stagingX,
        y: operation.stagingY,
      };
    }

    if (role === "fleet-screen" || role === "fleet-strike" || role === "carrier-core" || role === "interceptor") {
      return {
        x: operation.approachX ?? operation.stagingX,
        y: operation.approachY ?? operation.stagingY,
      };
    }

    if (["garrison", "line-attacker", "specialist"].includes(role) && unit.type !== "chopper") {
      return { x: operation.stagingX, y: operation.stagingY };
    }
  }

  return { x: operation.targetX, y: operation.targetY };
}

function getMissionTypeForOperation(unit: Unit, role: AiUnitRole, operation: AiOperation): AiUnitMissionType {
  if (operation.type === "recon") return "scout-sector";
  if (operation.type === "naval-control") return role === "fleet-strike" ? "strike-target" : "screen-fleet";
  if (operation.type === "defense") return role === "interceptor" ? "intercept-threat" : "hold-site";
  if (operation.requiresTransport) {
    if (role === "transport-support" || role === "fleet-screen" || role === "fleet-strike" || role === "carrier-core" || role === "interceptor") {
      return role === "transport-support" ? "stage-assault" : "escort-expedition";
    }
    if (["garrison", "line-attacker", "specialist"].includes(role) && unit.type !== "chopper") {
      return "stage-assault";
    }
  }
  if (operation.goalType === "capture-neutral-city") return "capture-city";
  if (operation.goalType === "attack-enemy-city") return role === "bombardment" ? "strike-target" : "advance-on-city";
  return role === "fleet-screen" ? "screen-fleet" : "support-front";
}

function getNearestFrontierTarget(state: GameState, unit: Unit) {
  let bestTarget: { x: number; y: number } | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < state.mapHeight; y += 1) {
    for (let x = 0; x < state.mapWidth; x += 1) {
      const tile = state.aiIntel[y]?.[x];
      if (!tile) continue;

      let adjacentUnknown = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny, state.mapWidth, state.mapHeight)) continue;
        if (state.aiIntel[ny]?.[nx] === null) adjacentUnknown += 1;
      }

      if (adjacentUnknown === 0) continue;
      const score = adjacentUnknown * 20 - distance(unit, { x, y }) * 2;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = { x, y };
      }
    }
  }

  return bestTarget;
}

function getFallbackMission(state: GameState, role: AiUnitRole, unit: Unit, threatSummary: AiThreatSummary): AiUnitMission {
  const fallbackTarget = threatSummary.threatenedSites[0];
  const frontierTarget = getNearestFrontierTarget(state, unit);

  if (role === "scout") {
    const scoutTarget = frontierTarget ?? { x: unit.x, y: unit.y };
    return {
      unitId: unit.id,
      unitType: unit.type,
      role,
      missionType: "scout-sector",
      targetX: scoutTarget.x,
      targetY: scoutTarget.y,
      goalType: "fallback",
      operationId: null,
      operationType: null,
      summary: frontierTarget
        ? `${unit.type} probes the nearest frontier at ${getLocationLabel(frontierTarget)}`
        : `${unit.type} scouts locally while awaiting higher-priority goals`,
    };
  }

  if (fallbackTarget) {
    return {
      unitId: unit.id,
      unitType: unit.type,
      role,
      missionType: "hold-site",
      targetX: fallbackTarget.x,
      targetY: fallbackTarget.y,
      goalType: "fallback",
      operationId: null,
      operationType: null,
      summary: `${unit.type} holds near ${fallbackTarget.name} as reserve`,
    };
  }

  if (frontierTarget && (role === "garrison" || role === "line-attacker")) {
    return {
      unitId: unit.id,
      unitType: unit.type,
      role,
      missionType: "support-front",
      targetX: frontierTarget.x,
      targetY: frontierTarget.y,
      goalType: "fallback",
      operationId: null,
      operationType: null,
      summary: `${unit.type} advances toward the frontier at ${getLocationLabel(frontierTarget)}`,
    };
  }

  return {
    unitId: unit.id,
    unitType: unit.type,
    role,
    missionType: "support-front",
    targetX: unit.x,
    targetY: unit.y,
    goalType: "fallback",
    operationId: null,
    operationType: null,
    summary: `${unit.type} remains in general reserve`,
  };
}

export function assignAiUnitMissions(
  state: GameState,
  operations: AiOperation[],
  threatSummary: AiThreatSummary
) {
  const aiUnits = state.units
    .filter((unit) => unit.owner === "ai")
    .sort((a, b) => {
      const roleDelta = getRoleAssignmentPriority(classifyAiUnitRole(b)) - getRoleAssignmentPriority(classifyAiUnitRole(a));
      if (roleDelta !== 0) return roleDelta;
      return b.hp - a.hp;
    });
  const missions: AiUnitMission[] = [];
  const operationLoad = new Map<string, number>();
  const operationRoleLoad = new Map<string, number>();

  for (const unit of aiUnits) {
    const role = classifyAiUnitRole(unit);
    let bestOperation: AiOperation | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const operation of operations) {
      const affinity = getRoleOperationAffinity(role, operation);
      if (affinity <= 0) continue;

      const destination = getOperationDestination(unit, role, operation);
      const loadPenalty = (operationLoad.get(operation.id) ?? 0) * 5;
      const rolePenalty = (operationRoleLoad.get(`${operation.id}:${role}`) ?? 0) * 8;
      const distancePenalty = distance(unit, destination) * 2;
      const stagingBias =
        operation.requiresTransport && ["garrison", "line-attacker", "specialist"].includes(role) &&
        !hasLandRouteIgnoringUnits(state, unit, { x: operation.targetX, y: operation.targetY }, unit.type)
          ? 12
          : 0;
      const defensiveBias =
        operation.type === "defense" && distance(unit, { x: operation.targetX, y: operation.targetY }) <= 4
          ? 14
          : 0;
      const escortBias =
        operation.requiresEscort && ["fleet-screen", "fleet-strike", "carrier-core", "interceptor", "transport-support"].includes(role)
          ? 10
          : 0;
      const score = operation.priority + affinity + stagingBias + defensiveBias + escortBias - distancePenalty - loadPenalty - rolePenalty;

      if (score > bestScore) {
        bestScore = score;
        bestOperation = operation;
      }
    }

    if (!bestOperation) {
      missions.push(getFallbackMission(state, role, unit, threatSummary));
      continue;
    }

    const destination = getOperationDestination(unit, role, bestOperation);
    const missionType = getMissionTypeForOperation(unit, role, bestOperation);
    operationLoad.set(bestOperation.id, (operationLoad.get(bestOperation.id) ?? 0) + 1);
    operationRoleLoad.set(`${bestOperation.id}:${role}`, (operationRoleLoad.get(`${bestOperation.id}:${role}`) ?? 0) + 1);
    missions.push({
      unitId: unit.id,
      unitType: unit.type,
      role,
      missionType,
      targetX: destination.x,
      targetY: destination.y,
      goalType: bestOperation.goalType,
      operationId: bestOperation.id,
      operationType: bestOperation.type,
      stagingX: bestOperation.stagingX,
      stagingY: bestOperation.stagingY,
      approachX: bestOperation.approachX,
      approachY: bestOperation.approachY,
      requiresTransport: bestOperation.requiresTransport,
      summary: `${unit.type} assigned ${missionType} for ${bestOperation.summary.toLowerCase()}`,
    });
  }

  return missions;
}
