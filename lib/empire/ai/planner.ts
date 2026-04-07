import { DIRECTIONS, UNIT_STATS } from "@/lib/empire/config";
import { AIR_SUPPORT_PER_CITY, CITY_SURFACE_CAPACITY } from "@/lib/empire/data/rules";
import { assignAiUnitMissions, createAiThreatSummary, planAiOperations, planAiStrategicGoals } from "@/lib/empire/ai/strategy";
import { getTerrainMoveCost } from "@/lib/empire/game";
import type { GameState, Side, Tile, Unit, UnitDomain, UnitType } from "@/lib/empire/types";
import type { AiOperation, AiStrategicGoal, AiThreatSummary, AiUnitMission } from "@/lib/empire/ai/strategy";

type AiProductionSiteKind = "city" | "coastal-city" | "port" | "airfield";

export type AiContext = {
  state: GameState;
  aiUnits: Unit[];
  knownEnemyUnits: Unit[];
  unexploredTileCount: number;
  aiCityCount: number;
  aiSiteCount: number;
  aiCountsByType: Record<UnitType, number>;
  aiCountsByDomain: Record<UnitDomain, number>;
  knownEnemyCountsByDomain: Record<UnitDomain, number>;
  aiPortCount: number;
  aiAirfieldCount: number;
  aiRadarCount: number;
  coastalCityCount: number;
  knownEnemySubCount: number;
  highValueMissileTargetCount: number;
  isolatedAssaultUnitCount: number;
  sites: AiProductionSite[];
  threatSummary: AiThreatSummary;
};

export type AiProductionSite = {
  x: number;
  y: number;
  tile: Tile;
  kind: AiProductionSiteKind;
};

export type AiProductionDecision = {
  x: number;
  y: number;
  unitType: UnitType;
  score: number;
  reason: string;
  spawnX?: number;
  spawnY?: number;
};

export type AiTurnPlan = {
  context: AiContext;
  strategicGoals: AiStrategicGoal[];
  operations: AiOperation[];
  unitMissions: AiUnitMission[];
  productionDecisions: AiProductionDecision[];
};

type CandidateBuild = {
  unitType: UnitType;
  score: number;
  reasons: string[];
  spawnX?: number;
  spawnY?: number;
};

const LAND_PRODUCTION_UNITS: UnitType[] = ["infantry", "scout", "tank", "engineer", "special-ops"];
const SEA_PRODUCTION_UNITS: UnitType[] = ["destroyer", "troop-transport", "carrier", "submarine", "ssbn"];
const AIR_PRODUCTION_UNITS: UnitType[] = ["chopper", "fighter", "bomber", "drone-swarm"];

function countUnitsByType(units: Unit[]) {
  const counts = Object.keys(UNIT_STATS).reduce<Record<UnitType, number>>((accumulator, unitType) => {
    accumulator[unitType as UnitType] = 0;
    return accumulator;
  }, {} as Record<UnitType, number>);

  for (const unit of units) {
    counts[unit.type] += 1;
  }

  return counts;
}

function countUnitsByDomain(units: Unit[]) {
  const counts: Record<UnitDomain, number> = { land: 0, sea: 0, air: 0 };
  for (const unit of units) {
    counts[UNIT_STATS[unit.type].domain] += 1;
  }
  return counts;
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

function hasAdjacentWater(state: GameState, x: number, y: number) {
  return DIRECTIONS.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < state.mapWidth && ny < state.mapHeight && state.map[ny][nx].terrain === "water";
  });
}

function createRouteProbeUnit(type: UnitType, x: number, y: number, owner: Side = "ai"): Unit {
  return {
    id: -1,
    owner,
    type,
    x,
    y,
    hp: UNIT_STATS[type].maxHp,
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

function hasLandRouteIgnoringUnits(state: GameState, start: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">, target: Pick<Tile, "x" | "y">, unitType: UnitType) {
  const frontier = [{ x: start.x, y: start.y, cost: 0 }];
  const bestCost = new Map<string, number>([[`${start.x},${start.y}`, 0]]);
  const probe = createRouteProbeUnit(unitType, start.x, start.y);

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift();
    if (!current) break;
    if (current.x === target.x && current.y === target.y) return true;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= state.mapWidth || ny >= state.mapHeight) continue;
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

function getKnownStrategicObjectives(state: GameState) {
  return state.aiIntel.flat().filter((tile): tile is Tile => {
    if (!tile) return false;
    if (tile.city && tile.owner !== "ai") return true;
    return Boolean(tile.improvement && tile.improvement.owner === "player");
  });
}

function countHighValueMissileTargets(state: GameState) {
  return state.aiIntel.flat().filter((tile): tile is Tile => {
    if (!tile || tile.terrain === "water") return false;
    if (tile.owner !== "player" && tile.improvement?.owner !== "player" && tile.improvementProject?.owner !== "player") return false;
    return Boolean(tile.city || tile.production || tile.improvement || tile.improvementProject);
  }).length;
}

function countIsolatedAssaultUnits(state: GameState, aiUnits: Unit[]) {
  const assaultUnits = aiUnits.filter((unit) => ["infantry", "tank", "scout", "engineer", "special-ops"].includes(unit.type));
  if (assaultUnits.length === 0) return 0;

  const knownObjectives = getKnownStrategicObjectives(state);
  if (knownObjectives.length === 0) {
    const navalPressureMap = state.gameType === "naval" || state.gameType === "archipelago" || state.gameType === "ocean";
    return navalPressureMap ? assaultUnits.filter((unit) => hasAdjacentWater(state, unit.x, unit.y)).length : 0;
  }

  return assaultUnits.filter(
    (unit) => !knownObjectives.some((objective) => hasLandRouteIgnoringUnits(state, unit, objective, unit.type))
  ).length;
}

function getOccupancyLayer(domain: UnitDomain) {
  return domain === "air" ? "air" : "surface";
}

function getBlockingUnitAt(units: Unit[], x: number, y: number, domain: UnitDomain) {
  const occupancyLayer = getOccupancyLayer(domain);
  return (
    units.find((unit) => {
      if (unit.x !== x || unit.y !== y) return false;
      return getOccupancyLayer(UNIT_STATS[unit.type].domain) === occupancyLayer;
    }) ?? null
  );
}

function getFriendlySurfaceCountAt(units: Unit[], x: number, y: number, side: Side) {
  return units.filter(
    (unit) => unit.x === x && unit.y === y && unit.owner === side && getOccupancyLayer(UNIT_STATS[unit.type].domain) === "surface"
  ).length;
}

function createProductionSites(state: GameState) {
  const sites: AiProductionSite[] = [];

  for (const row of state.map) {
    for (const tile of row) {
      if (tile.owner !== "ai") continue;
      if (tile.production) continue;

      if (tile.city) {
        sites.push({
          x: tile.x,
          y: tile.y,
          tile,
          kind: hasAdjacentWater(state, tile.x, tile.y) ? "coastal-city" : "city",
        });
        continue;
      }

      if (tile.improvement?.owner !== "ai") continue;
      if (tile.improvement.type === "port") {
        sites.push({ x: tile.x, y: tile.y, tile, kind: "port" });
      } else if (tile.improvement.type === "airfield") {
        sites.push({ x: tile.x, y: tile.y, tile, kind: "airfield" });
      }
    }
  }

  return sites;
}

export function createAiContext(state: GameState): AiContext {
  const aiUnits = state.units.filter((unit) => unit.owner === "ai");
  const knownEnemyUnits = getDetectedEnemyUnits(state, "ai");
  const unexploredTileCount = state.aiIntel.flat().filter((tile) => tile === null).length;
  const aiCityCount = state.map.flat().filter((tile) => tile.city && tile.owner === "ai").length;
  const sites = createProductionSites(state);
  const threatSummary = createAiThreatSummary(state);
  const aiPortCount = state.map.flat().filter((tile) => tile.improvement?.type === "port" && tile.improvement.owner === "ai").length;
  const aiAirfieldCount = state.map.flat().filter((tile) => tile.improvement?.type === "airfield" && tile.improvement.owner === "ai").length;
  const aiRadarCount = state.map.flat().filter((tile) => tile.improvement?.type === "radar" && tile.improvement.owner === "ai").length;
  const coastalCityCount = state.map.flat().filter((tile) => tile.city && tile.owner === "ai" && hasAdjacentWater(state, tile.x, tile.y)).length;
  const knownEnemySubCount = knownEnemyUnits.filter((unit) => unit.type === "submarine" || unit.type === "ssbn").length;
  const highValueMissileTargetCount = countHighValueMissileTargets(state);
  const isolatedAssaultUnitCount = countIsolatedAssaultUnits(state, aiUnits);

  return {
    state,
    aiUnits,
    knownEnemyUnits,
    unexploredTileCount,
    aiCityCount,
    aiSiteCount: sites.length,
    aiCountsByType: countUnitsByType(aiUnits),
    aiCountsByDomain: countUnitsByDomain(aiUnits),
    knownEnemyCountsByDomain: countUnitsByDomain(knownEnemyUnits),
    aiPortCount,
    aiAirfieldCount,
    aiRadarCount,
    coastalCityCount,
    knownEnemySubCount,
    highValueMissileTargetCount,
    isolatedAssaultUnitCount,
    sites,
    threatSummary,
  };
}

function getSeaSpawnTiles(state: GameState, tile: Tile) {
  const spawnTiles: Array<{ x: number; y: number }> = [];

  for (const [dx, dy] of DIRECTIONS) {
    const nx = tile.x + dx;
    const ny = tile.y + dy;
    if (nx < 0 || ny < 0 || nx >= state.mapWidth || ny >= state.mapHeight) continue;
    const candidate = state.map[ny][nx];
    if (candidate.terrain !== "water") continue;
    if (getBlockingUnitAt(state.units, nx, ny, "sea")) continue;
    spawnTiles.push({ x: nx, y: ny });
  }

  return spawnTiles;
}

function hasAirCapacityAt(state: GameState, x: number, y: number, side: Side) {
  const tile = state.map[y]?.[x] ?? null;
  if (!tile) return false;
  const capacity = tile.improvement?.type === "airfield" && tile.improvement.owner === side ? 1 : 0;
  if (capacity <= 0) return false;
  const friendlyAir = state.units.filter(
    (unit) => unit.owner === side && unit.x === x && unit.y === y && UNIT_STATS[unit.type].domain === "air"
  ).length;
  return friendlyAir < capacity;
}

function getSupportedUnitsForSite(context: AiContext, site: AiProductionSite) {
  const builds: Array<{ unitType: UnitType; spawnX?: number; spawnY?: number }> = [];

  if (site.kind === "city" || site.kind === "coastal-city") {
    if (getFriendlySurfaceCountAt(context.state.units, site.x, site.y, "ai") < CITY_SURFACE_CAPACITY) {
      for (const unitType of LAND_PRODUCTION_UNITS) {
        builds.push({ unitType });
      }
    }
  }

  if (site.kind === "coastal-city" || site.kind === "port") {
    const spawnTile = getSeaSpawnTiles(context.state, site.tile)[0];
    if (spawnTile) {
      for (const unitType of SEA_PRODUCTION_UNITS) {
        builds.push({ unitType, spawnX: spawnTile.x, spawnY: spawnTile.y });
      }
    }
  }

  if (site.kind === "airfield" && hasAirCapacityAt(context.state, site.x, site.y, "ai")) {
    for (const unitType of AIR_PRODUCTION_UNITS) {
      builds.push({ unitType });
    }
  }

  return builds;
}

function formatReason(reasons: string[]) {
  return reasons.slice(0, 3).join("; ");
}

function scoreUnitForSite(
  context: AiContext,
  site: AiProductionSite,
  unitType: UnitType,
  operations: AiOperation[],
  unitMissions: AiUnitMission[]
): CandidateBuild {
  const definition = UNIT_STATS[unitType];
  const aiTypeCount = context.aiCountsByType[unitType];
  const aiLand = context.aiCountsByDomain.land;
  const aiSea = context.aiCountsByDomain.sea;
  const aiAir = context.aiCountsByDomain.air;
  const enemyLand = context.knownEnemyCountsByDomain.land;
  const enemySea = context.knownEnemyCountsByDomain.sea;
  const enemyAir = context.knownEnemyCountsByDomain.air;
  const knownEnemyCities = context.threatSummary.knownEnemyCityCount;
  const threatenedSiteCount = context.threatSummary.threatenedSites.length;
  const aiEngineers = context.aiCountsByType.engineer;
  const aiSpecialOps = context.aiCountsByType["special-ops"];
  const aiTransports = context.aiCountsByType["troop-transport"];
  const aiCarriers = context.aiCountsByType.carrier;
  const aiDestroyers = context.aiCountsByType.destroyer;
  const aiBombers = context.aiCountsByType.bomber;
  const aiFighters = context.aiCountsByType.fighter;
  const aiChoppers = context.aiCountsByType.chopper;
  const knownEnemySubCount = context.knownEnemySubCount;
  const highValueMissileTargetCount = context.highValueMissileTargetCount;
  const isolatedAssaultUnitCount = context.isolatedAssaultUnitCount;
  const expeditionOperations = operations.filter((operation) => operation.requiresTransport);
  const navalOperations = operations.filter((operation) => operation.type === "naval-control");
  const stagedAssaultUnits = unitMissions.filter(
    (mission) =>
      mission.missionType === "stage-assault" &&
      ["infantry", "tank", "scout", "engineer", "special-ops"].includes(mission.unitType)
  ).length;
  const escortMissionCount = unitMissions.filter((mission) => mission.missionType === "escort-expedition").length;
  const transportNeed = Math.max(0, Math.max(Math.ceil(stagedAssaultUnits / 2), Math.ceil(isolatedAssaultUnitCount / 3)) - aiTransports);
  const escortShortfall = Math.max(0, expeditionOperations.length * 2 - escortMissionCount);
  const siteThreatScore =
    context.threatSummary.threatenedSites.find((threatenedSite) => threatenedSite.x === site.x && threatenedSite.y === site.y)?.threatScore ?? 0;
  const isNavalMap =
    context.state.gameType === "naval" ||
    context.state.gameType === "archipelago" ||
    context.state.gameType === "ocean";
  const reasons: string[] = [];
  let score = 0;

  const airCap = AIR_SUPPORT_PER_CITY * context.aiCityCount;
  if (definition.domain === "air" && aiAir >= airCap) {
    return { unitType, score: -1000, reasons: ["aircraft cap reached"] };
  }

  if (site.kind === "city" || site.kind === "coastal-city") score += definition.domain === "land" ? 8 : 0;
  if (site.kind === "port") score += definition.domain === "sea" ? 12 : 0;
  if (site.kind === "airfield") score += definition.domain === "air" ? 12 : 0;
  if (siteThreatScore > 0 && definition.domain === "land") {
    score += Math.min(18, siteThreatScore * 2);
    reasons.push("site is under direct pressure");
  }

  if (unitType === "infantry") {
    score += 42;
    if (aiTypeCount < Math.max(2, context.aiCityCount)) {
      score += 18;
      reasons.push("city garrisons are too thin");
    }
    if (aiLand < Math.max(4, context.aiCityCount * 2)) {
      score += 18;
      reasons.push("front line is too thin");
    }
    if (enemyLand > aiLand) {
      score += 14;
      reasons.push("known enemy land pressure is higher");
    }
    if (context.state.credits.ai <= 14) {
      score += 10;
      reasons.push("credits are tight");
    }
    if (transportNeed > 0 && aiLand >= Math.max(6, context.aiCityCount * 2)) {
      score -= 12;
      reasons.push("expedition lift is missing");
    }
    score -= aiTypeCount * 4;
  } else if (unitType === "scout") {
    score += 20;
    if (context.unexploredTileCount > (context.state.mapWidth * context.state.mapHeight) / 3) {
      score += 22;
      reasons.push("large areas are still unexplored");
    }
    if (context.aiCountsByType.scout === 0) {
      score += 14;
      reasons.push("no scout screen is active");
    }
    if (expeditionOperations.length > 0) {
      score += 8;
      reasons.push("amphibious plans need pathfinders");
    }
    score -= aiTypeCount * 9;
  } else if (unitType === "tank") {
    score += 38;
    if (context.state.credits.ai >= UNIT_STATS.tank.cost) {
      score += 10;
      reasons.push("treasury can support armor");
    }
    if (enemyLand >= 2) {
      score += 12;
      reasons.push("enemy land targets justify armor");
    }
    if (aiLand <= context.aiCityCount) {
      score -= 6;
    }
    if (transportNeed > 0 && aiTransports === 0) {
      score -= 16;
      reasons.push("armor needs transports before more hulls");
    }
    score -= aiTypeCount * 3;
  } else if (unitType === "engineer") {
    score += 14;
    if (aiEngineers === 0) {
      score += 28;
      reasons.push("no engineer is active");
    }
    if (context.aiAirfieldCount < Math.max(1, Math.floor(context.aiCityCount / 2)) && aiAir > 0) {
      score += 18;
      reasons.push("air arm needs more airfields");
    }
    if (context.aiPortCount < Math.max(1, Math.floor(context.coastalCityCount / 2)) && context.coastalCityCount > 0) {
      score += 16;
      reasons.push("coastline lacks enough ports");
    }
    if (isolatedAssaultUnitCount > 0 && context.aiPortCount < Math.max(1, context.coastalCityCount)) {
      score += 18;
      reasons.push("isolated ground forces need more embark points");
    }
    if (context.aiRadarCount < Math.max(1, threatenedSiteCount) && enemyAir > 0) {
      score += 16;
      reasons.push("enemy air pressure justifies radar");
    }
    if (expeditionOperations.length > 0 && context.aiPortCount < Math.max(1, context.coastalCityCount)) {
      score += 18;
      reasons.push("expeditions need more embark points");
    }
    if (context.state.turn <= 2) {
      score -= 8;
    }
    score -= aiTypeCount * 10;
  } else if (unitType === "special-ops") {
    if (aiSpecialOps >= context.aiCityCount) {
      score -= 1000;
      reasons.push("special ops production cap reached");
      return { unitType, score, reasons };
    }
    score += 18;
    if (knownEnemyCities > 0) {
      score += 16;
      reasons.push("enemy cities are known for raids");
    }
    if (context.aiCountsByType.submarine + aiChoppers > 0) {
      score += 12;
      reasons.push("insertion carriers are available");
    }
    if (context.state.turn >= 4) {
      score += 8;
      reasons.push("midgame timing suits infiltration");
    }
    score -= aiSpecialOps * 8;
  } else if (unitType === "destroyer") {
    score += 46;
    if (enemySea > 0) {
      score += 14;
      reasons.push("enemy naval contacts are known");
    }
    if (knownEnemySubCount > 0) {
      score += 12;
      reasons.push("enemy submarines detected — ASW capability needed");
    }
    if (enemyAir > 0) {
      score += 10;
      reasons.push("destroyers improve fleet air defense");
    }
    if (isNavalMap) {
      score += 12;
      reasons.push("map favors naval control");
    }
    if (aiCarriers + aiTransports > aiDestroyers) {
      score += 12;
      reasons.push("capital ships need screening");
    }
    if (escortShortfall > 0) {
      score += 20;
      reasons.push("active expeditions are under-escorted");
    }
    if (isolatedAssaultUnitCount > 0) {
      score += 10;
      reasons.push("island forces need escort coverage to break out");
    }
    if (navalOperations.length > 0) {
      score += 10;
      reasons.push("sea control operations are active");
    }
    score -= aiTypeCount * 4;
  } else if (unitType === "troop-transport") {
    score += 10;
    if (isNavalMap || context.coastalCityCount >= 2) {
      score += 20;
      reasons.push("sea crossings create transport demand");
    }
    if (aiLand >= Math.max(4, context.aiCityCount * 2) && aiTransports < Math.max(1, Math.floor(aiLand / 6))) {
      score += 18;
      reasons.push("ground forces can support an amphibious push");
    }
    if (knownEnemyCities > 0 || context.unexploredTileCount > context.state.mapWidth) {
      score += 10;
      reasons.push("new objectives exist beyond the front");
    }
    if (transportNeed > 0) {
      score += 28;
      reasons.push("staged assault units are waiting for lift");
    }
    if (isolatedAssaultUnitCount > 0) {
      score += 22;
      reasons.push("ground forces are stranded behind water");
    }
    if (expeditionOperations.length > aiTransports) {
      score += 18;
      reasons.push("known objectives require sea crossings");
    }
    if (aiDestroyers === 0) {
      score -= 8;
    }
    score -= aiTransports * 12;
  } else if (unitType === "carrier") {
    score += 14;
    if (isNavalMap) {
      score += 18;
      reasons.push("map supports carrier projection");
    }
    if (aiAir >= 2 || aiBombers > 0 || enemyAir > 0) {
      score += 16;
      reasons.push("air power can benefit from a carrier core");
    }
    if (aiCarriers === 0) {
      score += 12;
      reasons.push("fleet lacks a carrier flagship");
    }
    if (aiDestroyers < aiCarriers + 1) {
      score -= 10;
    }
    if (escortShortfall > 1 && enemyAir > 0) {
      score += 12;
      reasons.push("expeditions need protected air cover");
    }
    score -= aiCarriers * 18;
  } else if (unitType === "submarine") {
    score += 28;
    if (context.state.gameType === "archipelago" || context.state.gameType === "ocean") {
      score += 18;
      reasons.push("map rewards long-range sea strikes");
    }
    if (enemySea > aiSea) {
      score += 10;
      reasons.push("enemy fleet presence is growing");
    }
    if (aiDestroyers > 0) {
      score += 8;
      reasons.push("friendly destroyers support coordinated sea pressure");
    }
    if (navalOperations.length > 0 || expeditionOperations.length > 0) {
      score += 12;
      reasons.push("sea control pressure favors attack subs");
    }
    if (highValueMissileTargetCount > 0) {
      score += Math.min(18, highValueMissileTargetCount * 3);
      reasons.push("visible coastal targets justify submarine strike reach");
    }
    score -= aiTypeCount * 6;
  } else if (unitType === "ssbn") {
    score += 20;
    if (context.state.gameType === "archipelago" || context.state.gameType === "ocean") {
      score += 14;
      reasons.push("map supports missile submarine operations");
    }
    if (context.aiCountsByType.ssbn === 0 && context.aiCountsByType.submarine > 0) {
      score += 12;
      reasons.push("adding cruise missile capability to the fleet");
    }
    if (highValueMissileTargetCount > 0) {
      score += 20 + Math.min(16, highValueMissileTargetCount * 2);
      reasons.push("visible cities and infrastructure reward missile boats");
    }
    if (enemySea > aiSea) {
      score += 8;
      reasons.push("enemy fleet presence justifies missile deterrent");
    }
    score -= aiTypeCount * 12;
  } else if (unitType === "chopper") {
    score += 32;
    if (enemyLand > 0) {
      score += 12;
      reasons.push("known land targets can be hit from the air");
    }
    if (aiAir === 0) {
      score += 8;
      reasons.push("air arm is currently empty");
    }
    if (context.aiCountsByType["special-ops"] > 0) {
      score += 6;
      reasons.push("special ops can ride helicopter insertions");
    }
    score -= aiTypeCount * 4;
  } else if (unitType === "fighter") {
    score += 42;
    if (enemyAir > 0) {
      score += 18;
      reasons.push("enemy aircraft have been detected");
    }
    if (aiTypeCount === 0) {
      score += 10;
      reasons.push("air cover is missing");
    }
    if (aiBombers > 0) {
      score += 8;
      reasons.push("bombers need fighter escort");
    }
    if (escortShortfall > 0) {
      score += 8;
      reasons.push("expeditions benefit from intercept cover");
    }
    score -= aiTypeCount * 5;
  } else if (unitType === "bomber") {
    score += 26;
    if (knownEnemyCities > 0) {
      score += knownEnemyCities * 5;
      reasons.push("enemy cities are identified for strike missions");
    }
    if (aiFighters > 0) {
      score += 8;
      reasons.push("fighters can cover bomber sorties");
    } else {
      score -= 8;
    }
    score -= aiTypeCount * 6;
  } else if (unitType === "drone-swarm") {
    score += 24;
    if (enemyLand + enemySea > 0) {
      score += 10;
      reasons.push("detected targets can justify expendable strikes");
    }
    if (context.state.turn >= 4) {
      score += 6;
      reasons.push("midgame timing supports disposable pressure");
    }
    score -= aiTypeCount * 6;
  }

  if (definition.cost > context.state.credits.ai) {
    score -= 1000;
  }

  if (reasons.length === 0) {
    reasons.push("best fit for the current force mix");
  }

  return { unitType, score, reasons };
}

function applyCommittedCounts(context: AiContext, decisions: AiProductionDecision[]): AiContext {
  if (decisions.length === 0) {
    return context;
  }

  const aiCountsByType = { ...context.aiCountsByType };
  const aiCountsByDomain = { ...context.aiCountsByDomain };

  for (const decision of decisions) {
    aiCountsByType[decision.unitType] += 1;
    aiCountsByDomain[UNIT_STATS[decision.unitType].domain] += 1;
  }

  return {
    ...context,
    aiCountsByType,
    aiCountsByDomain,
  };
}

export function planAiProductionPhase(context: AiContext, operations: AiOperation[], unitMissions: AiUnitMission[]): AiProductionDecision[] {
  let creditsRemaining = context.state.credits.ai;
  const decisions: AiProductionDecision[] = [];
  const reservedSites = new Set<string>();

  while (true) {
    let bestDecision: AiProductionDecision | null = null;

    for (const site of context.sites) {
      const siteKey = `${site.x},${site.y}`;
      if (reservedSites.has(siteKey)) continue;

      const simulatedContext: AiContext = {
        ...applyCommittedCounts(context, decisions),
        state: {
          ...context.state,
          credits: { ...context.state.credits, ai: creditsRemaining },
        },
      };
      const supported = getSupportedUnitsForSite(simulatedContext, site);
      const choice = supported
        .map((build) => {
          const candidate = scoreUnitForSite(simulatedContext, site, build.unitType, operations, unitMissions);
          return {
            ...candidate,
            spawnX: build.spawnX,
            spawnY: build.spawnY,
          };
        })
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score)[0] ?? null;
      if (!choice) continue;
      if (UNIT_STATS[choice.unitType].cost > creditsRemaining) continue;

      const decision: AiProductionDecision = {
        x: site.x,
        y: site.y,
        unitType: choice.unitType,
        score: choice.score,
        reason: formatReason(choice.reasons),
        spawnX: choice.spawnX,
        spawnY: choice.spawnY,
      };

      if (!bestDecision || decision.score > bestDecision.score) {
        bestDecision = decision;
      }
    }

    if (!bestDecision) break;

    decisions.push(bestDecision);
    reservedSites.add(`${bestDecision.x},${bestDecision.y}`);
    creditsRemaining -= UNIT_STATS[bestDecision.unitType].cost;
  }

  return decisions;
}

export function planAiTurn(state: GameState): AiTurnPlan {
  const context = createAiContext(state);
  const strategicGoals = planAiStrategicGoals(state, context.threatSummary);
  const operations = planAiOperations(state, strategicGoals, context.threatSummary);
  const unitMissions = assignAiUnitMissions(state, operations, context.threatSummary);

  return {
    context,
    strategicGoals,
    operations,
    unitMissions,
    productionDecisions: planAiProductionPhase(context, operations, unitMissions),
  };
}
