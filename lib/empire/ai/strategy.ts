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
  | "screen-fleet";

export type AiUnitMission = {
  unitId: number;
  unitType: Unit["type"];
  role: AiUnitRole;
  missionType: AiUnitMissionType;
  targetX: number;
  targetY: number;
  goalType: AiStrategicGoalType | "fallback";
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
  const knownEnemyAirUnits = getDetectedEnemyUnits(state, "ai").filter((unit) => state.units.find((candidate) => candidate.id === unit.id)?.type && unit.type !== "infantry").filter((unit) => {
    return ["chopper", "fighter", "bomber", "drone-swarm"].includes(unit.type);
  });

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

function getRoleGoalAffinity(role: AiUnitRole, goalType: AiStrategicGoalType) {
  if (role === "garrison") {
    if (goalType === "defend-city") return 28;
    if (goalType === "capture-neutral-city") return 20;
    if (goalType === "reinforce-front") return 12;
    if (goalType === "scout-unexplored") return 8;
  }
  if (role === "line-attacker") {
    if (goalType === "attack-enemy-city") return 26;
    if (goalType === "reinforce-front") return 16;
    if (goalType === "capture-neutral-city") return 14;
    if (goalType === "scout-unexplored") return 6;
  }
  if (role === "scout") {
    if (goalType === "scout-unexplored") return 32;
    if (goalType === "capture-neutral-city") return 8;
  }
  if (role === "interceptor") {
    if (goalType === "intercept-air-threat") return 34;
    if (goalType === "defend-city") return 10;
  }
  if (role === "bombardment") {
    if (goalType === "attack-enemy-city") return 24;
    if (goalType === "reinforce-front") return 12;
    if (goalType === "intercept-air-threat") return 14;
  }
  if (role === "fleet-screen") {
    if (goalType === "defend-city") return 14;
    if (goalType === "intercept-air-threat") return 20;
    if (goalType === "reinforce-front") return 18;
    if (goalType === "attack-enemy-city") return 12;
  }
  if (role === "fleet-strike") {
    if (goalType === "capture-neutral-city") return 10;
    if (goalType === "attack-enemy-city") return 18;
    if (goalType === "reinforce-front") return 14;
  }
  if (role === "carrier-core") {
    if (goalType === "attack-enemy-city") return 14;
    if (goalType === "intercept-air-threat") return 18;
    if (goalType === "reinforce-front") return 16;
  }
  if (role === "transport-support") {
    if (goalType === "capture-neutral-city") return 18;
    if (goalType === "attack-enemy-city") return 10;
    if (goalType === "reinforce-front") return 8;
  }
  if (role === "specialist") {
    if (goalType === "scout-unexplored") return 10;
    if (goalType === "defend-city") return 8;
    if (goalType === "attack-enemy-city") return 8;
  }

  return 0;
}

function getRoleAssignmentPriority(role: AiUnitRole) {
  if (role === "garrison") return 100;
  if (role === "interceptor") return 92;
  if (role === "transport-support") return 88;
  if (role === "carrier-core") return 84;
  if (role === "fleet-screen") return 80;
  if (role === "line-attacker") return 74;
  if (role === "bombardment") return 70;
  if (role === "fleet-strike") return 66;
  if (role === "scout") return 62;
  return 50;
}

function getMissionTypeFor(goalType: AiStrategicGoalType, role: AiUnitRole): AiUnitMissionType {
  if (goalType === "defend-city") return "hold-site";
  if (goalType === "capture-neutral-city") return "capture-city";
  if (goalType === "attack-enemy-city") return role === "bombardment" ? "strike-target" : "advance-on-city";
  if (goalType === "scout-unexplored") return "scout-sector";
  if (goalType === "intercept-air-threat") return "intercept-threat";
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
    summary: `${unit.type} remains in general reserve`,
  };
}

export function assignAiUnitMissions(
  state: GameState,
  goals: AiStrategicGoal[],
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
  const goalLoad = new Map<string, number>();

  for (const unit of aiUnits) {
    const role = classifyAiUnitRole(unit);
    let bestGoal: AiStrategicGoal | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const goal of goals) {
      const affinity = getRoleGoalAffinity(role, goal.type);
      if (affinity <= 0) continue;

      const loadPenalty = (goalLoad.get(`${goal.type}:${goal.x},${goal.y}`) ?? 0) * 6;
      const distancePenalty = distance(unit, goal) * 2;
      const threatBias =
        goal.type === "defend-city" && role === "garrison" && distance(unit, goal) <= 4
          ? 12
          : goal.type === "capture-neutral-city" && role === "transport-support"
            ? 8
            : 0;
      const score = goal.score + affinity + threatBias - distancePenalty - loadPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestGoal = goal;
      }
    }

    if (!bestGoal) {
      missions.push(getFallbackMission(state, role, unit, threatSummary));
      continue;
    }

    const goalKey = `${bestGoal.type}:${bestGoal.x},${bestGoal.y}`;
    goalLoad.set(goalKey, (goalLoad.get(goalKey) ?? 0) + 1);
    missions.push({
      unitId: unit.id,
      unitType: unit.type,
      role,
      missionType: getMissionTypeFor(bestGoal.type, role),
      targetX: bestGoal.x,
      targetY: bestGoal.y,
      goalType: bestGoal.type,
      summary: `${unit.type} assigned ${getMissionTypeFor(bestGoal.type, role)} toward ${bestGoal.summary.toLowerCase()}`,
    });
  }

  return missions;
}
