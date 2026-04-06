import { DIRECTIONS, UNIT_STATS } from "@/lib/empire/config";
import { assignAiUnitMissions, createAiThreatSummary, planAiStrategicGoals } from "@/lib/empire/ai/strategy";
import type { GameState, Side, Tile, Unit, UnitDomain, UnitType } from "@/lib/empire/types";
import type { AiStrategicGoal, AiThreatSummary, AiUnitMission } from "@/lib/empire/ai/strategy";

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

const LAND_PRODUCTION_UNITS: UnitType[] = ["infantry", "scout", "tank", "engineer", "special-ops", "spy"];
const SEA_PRODUCTION_UNITS: UnitType[] = ["destroyer", "troop-transport", "carrier", "submarine"];
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
    if (!getBlockingUnitAt(context.state.units, site.x, site.y, "land")) {
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

function scoreUnitForSite(context: AiContext, site: AiProductionSite, unitType: UnitType): CandidateBuild {
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
  const siteThreatScore =
    context.threatSummary.threatenedSites.find((threatenedSite) => threatenedSite.x === site.x && threatenedSite.y === site.y)?.threatScore ?? 0;
  const isNavalMap =
    context.state.gameType === "naval" ||
    context.state.gameType === "archipelago" ||
    context.state.gameType === "ocean";
  const reasons: string[] = [];
  let score = 0;

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
    if (context.aiRadarCount < Math.max(1, threatenedSiteCount) && enemyAir > 0) {
      score += 16;
      reasons.push("enemy air pressure justifies radar");
    }
    if (context.state.turn <= 2) {
      score -= 8;
    }
    score -= aiTypeCount * 10;
  } else if (unitType === "special-ops") {
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
  } else if (unitType === "spy") {
    score += 8;
    if (context.unexploredTileCount > (context.state.mapWidth * context.state.mapHeight) / 2) {
      score += 10;
      reasons.push("intel coverage is weak");
    }
    score -= aiTypeCount * 10;
  } else if (unitType === "destroyer") {
    score += 46;
    if (enemySea > 0) {
      score += 14;
      reasons.push("enemy naval contacts are known");
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
    score -= aiCarriers * 18;
  } else if (unitType === "submarine") {
    score += 34;
    if (context.state.gameType === "archipelago" || context.state.gameType === "ocean") {
      score += 18;
      reasons.push("map rewards long-range sea strikes");
    }
    if (enemySea > aiSea) {
      score += 10;
      reasons.push("enemy fleet presence is growing");
    }
    score -= aiTypeCount * 5;
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

function chooseBestProductionForSite(context: AiContext, site: AiProductionSite) {
  const supported = getSupportedUnitsForSite(context, site);
  const ranked = supported
    .map((build) => {
      const candidate = scoreUnitForSite(context, site, build.unitType);
      return {
        ...candidate,
        spawnX: build.spawnX,
        spawnY: build.spawnY,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0] ?? null;
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

export function planAiProductionPhase(context: AiContext): AiProductionDecision[] {
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
      const choice = chooseBestProductionForSite(simulatedContext, site);
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
  const unitMissions = assignAiUnitMissions(state, strategicGoals, context.threatSummary);

  return {
    context,
    strategicGoals,
    unitMissions,
    productionDecisions: planAiProductionPhase(context),
  };
}
