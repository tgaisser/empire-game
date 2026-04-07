import { chooseMoveTowardTarget } from "@/lib/empire/ai/navigation";
import { scoreEnemyThreatAtPosition, scoreFriendlySupportAtPosition } from "@/lib/empire/ai/tactics";
import {
  applyCommand,
  canUnitUseActiveSonar,
  getAmmoReloadQuote,
  getCarrierJamTargets,
  getCruiseMissileTargets,
  getEngineerBuildOptions,
  getSpecialOpsAirStrikeTargets,
  getSpecialOpsDeploymentTargets,
  getTroopTransportDeploymentTargets,
  getTroopTransportLoadTargets,
  getRemainingMove,
  getUnitStats,
  isFriendlyAirBase,
} from "@/lib/empire/game";
import type { AiTurnPlan } from "@/lib/empire/ai/planner";
import type { GameState, Tile, Unit } from "@/lib/empire/types";

function distance(a: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">, b: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getKnownEnemyCityTargets(state: GameState) {
  return state.aiIntel.flat().filter((tile): tile is Tile => Boolean(tile?.city && tile.owner === "player"));
}

function getKnownNeutralCityTargets(state: GameState) {
  return state.aiIntel.flat().filter((tile): tile is Tile => Boolean(tile?.city && tile.owner === null));
}

function getMissionForUnit(plan: AiTurnPlan, unitId: number) {
  return plan.unitMissions.find((mission) => mission.unitId === unitId) ?? null;
}

function getVisibleEnemyUnits(state: GameState, side: "player" | "ai") {
  const visible = side === "ai" ? state.aiVisible : state.playerVisible;
  const detectedIds = new Set(side === "ai" ? state.aiDetectedUnitIds : state.playerDetectedUnitIds);

  return state.units.filter((unit) => {
    if (unit.owner === side) return false;
    if (!visible[unit.y]?.[unit.x]) return false;
    return detectedIds.has(unit.id);
  });
}

function isHighValueTransportCargo(unit: Unit) {
  return ["infantry", "tank", "engineer", "special-ops", "scout"].includes(unit.type);
}

function chooseEngineerImprovement(unit: Unit, state: GameState, plan: AiTurnPlan) {
  const options = getEngineerBuildOptions(state, unit);
  const enemyAirPressure = plan.context.knownEnemyCountsByDomain.air;
  const aiAirCount = plan.context.aiCountsByDomain.air;
  const aiAirfields = state.map.flat().filter((tile) => tile.improvement?.type === "airfield" && tile.improvement.owner === "ai").length;
  const aiPorts = state.map.flat().filter((tile) => tile.improvement?.type === "port" && tile.improvement.owner === "ai").length;
  const knownEnemyCities = getKnownEnemyCityTargets(state);
  const knownNeutralCities = getKnownNeutralCityTargets(state);
  const objectiveCities = [...knownEnemyCities, ...knownNeutralCities];

  const scoreSite = (tile: Tile | { x: number; y: number }) =>
    objectiveCities.length > 0
      ? Math.min(...objectiveCities.map((city) => distance(tile, city)))
      : 99;

  if (enemyAirPressure > 0 && options.radarTargets.length > 0) {
    const target = [...options.radarTargets].sort((a, b) => scoreSite(a) - scoreSite(b))[0];
    return { improvementType: "radar" as const, x: target.x, y: target.y };
  }

  if (aiAirCount > 0 && aiAirfields < Math.max(1, Math.floor(plan.context.aiCityCount / 2)) && options.airfieldTargets.length > 0) {
    const target = options.airfieldTargets.sort((a, b) => {
      const scoreA = objectiveCities.reduce((best, city) => Math.min(best, distance(a, city)), 999);
      const scoreB = objectiveCities.reduce((best, city) => Math.min(best, distance(b, city)), 999);
      return scoreA - scoreB;
    })[0];
    return { improvementType: "airfield" as const, x: target.x, y: target.y };
  }

  if (
    (
      plan.context.aiCountsByDomain.sea > 0 ||
      state.gameType === "naval" ||
      state.gameType === "archipelago" ||
      state.gameType === "ocean"
    ) &&
    options.portTargets.length > 0
  ) {
    const shouldExpandPorts = aiPorts < Math.max(1, Math.floor(plan.context.aiCityCount / 2));
    if (shouldExpandPorts) {
      const target = [...options.portTargets].sort((a, b) => scoreSite(a) - scoreSite(b))[0];
      return { improvementType: "port" as const, x: target.x, y: target.y };
    }
  }

  if (options.bridgeTargets.length > 0) {
    const target = [...options.bridgeTargets].sort((a, b) => scoreSite(a) - scoreSite(b))[0];
    return { improvementType: "bridge" as const, x: target.x, y: target.y };
  }

  if (options.tunnelTargets.length > 0) {
    const target = [...options.tunnelTargets].sort((a, b) => scoreSite(a) - scoreSite(b))[0];
    return { improvementType: "tunnel" as const, x: target.x, y: target.y };
  }

  if (options.minefieldTargets.length > 0) {
    const frontlineTargets = options.minefieldTargets.filter((tile) => {
      const nearbyEnemyCount = state.units.filter(
        (u) => u.owner === "player" && distance(tile, u) <= 5
      ).length;
      return nearbyEnemyCount > 0 || scoreSite(tile) <= 6;
    });
    const targets = frontlineTargets.length > 0 ? frontlineTargets : options.minefieldTargets;
    const target = [...targets].sort((a, b) => scoreSite(a) - scoreSite(b))[0];
    if (target) {
      return { improvementType: "minefield" as const, x: target.x, y: target.y };
    }
  }

  return null;
}

function chooseTroopTransportAction(unit: Unit, state: GameState, plan: AiTurnPlan) {
  const transportMission = getMissionForUnit(plan, unit.id);
  const missionObjective =
    transportMission?.approachX !== undefined && transportMission?.approachY !== undefined
      ? { x: transportMission.approachX, y: transportMission.approachY }
      : transportMission
        ? { x: transportMission.targetX, y: transportMission.targetY }
        : null;
  const deploymentTargets = getTroopTransportDeploymentTargets(state, unit);
  if (deploymentTargets.length > 0 && (unit.carriedTroops?.length ?? 0) > 0) {
    const priority = [...getKnownNeutralCityTargets(state), ...getKnownEnemyCityTargets(state)];
    const rankedTargets = [...deploymentTargets].sort((a, b) => {
      const proximityA = priority.length ? Math.min(...priority.map((city) => distance(a, city))) : 999;
      const proximityB = priority.length ? Math.min(...priority.map((city) => distance(b, city))) : 999;
      const cargoType = unit.carriedTroops?.[0]?.type ?? "infantry";
      const templateUnit = { ...unit, type: cargoType, x: a.x, y: a.y } as Unit;
      const templateUnitB = { ...unit, type: cargoType, x: b.x, y: b.y } as Unit;
      const missionBiasA = missionObjective ? distance(a, missionObjective) * 12 : 0;
      const missionBiasB = missionObjective ? distance(b, missionObjective) * 12 : 0;
      const scoreA =
        missionBiasA +
        proximityA * 8 +
        scoreEnemyThreatAtPosition(templateUnit, a.x, a.y, state) -
        scoreFriendlySupportAtPosition(templateUnit, a.x, a.y, state) * 0.5;
      const scoreB =
        missionBiasB +
        proximityB * 8 +
        scoreEnemyThreatAtPosition(templateUnitB, b.x, b.y, state) -
        scoreFriendlySupportAtPosition(templateUnitB, b.x, b.y, state) * 0.5;
      return scoreA - scoreB;
    });
    const target = rankedTargets[0];
    if (!target) return null;
    if (missionObjective && distance(target, missionObjective) > 5) {
      const localThreat = scoreEnemyThreatAtPosition(unit, unit.x, unit.y, state);
      const localSupport = scoreFriendlySupportAtPosition(unit, unit.x, unit.y, state);
      if (localThreat <= localSupport + 2) {
        return null;
      }
    }
    return { type: "unload_transport_troop" as const, transportUnitId: unit.id, x: target.x, y: target.y };
  }

  const loadTargets = getTroopTransportLoadTargets(state, unit);
  if (loadTargets.length > 0) {
    const stagedLoadTargets = transportMission?.stagingX !== undefined && transportMission?.stagingY !== undefined
      ? loadTargets.filter((candidate) => distance(candidate, { x: transportMission.stagingX!, y: transportMission.stagingY! }) <= 3)
      : loadTargets;
    const targets = stagedLoadTargets.length > 0 ? stagedLoadTargets : loadTargets;
    const troop = [...targets].sort((a, b) => {
      const missionA = getMissionForUnit(plan, a.id);
      const missionB = getMissionForUnit(plan, b.id);
      const weight = (candidate: Unit, missionOperationId: string | null) =>
        (candidate.type === "tank" ? 32 : candidate.type === "infantry" ? 22 : isHighValueTransportCargo(candidate) ? 18 : 10) +
        candidate.hp +
        (transportMission?.operationId && missionOperationId === transportMission.operationId ? 24 : 0) +
        (missionOperationId && transportMission?.operationId !== missionOperationId ? -6 : 0);
      return weight(b, missionB?.operationId ?? null) - weight(a, missionA?.operationId ?? null);
    })[0];
    if (!troop) return null;
    return { type: "load_transport_troop" as const, transportUnitId: unit.id, troopUnitId: troop.id };
  }

  return null;
}

function chooseSpecialOpsCarrierAction(unit: Unit, state: GameState) {
  if (!["chopper", "submarine"].includes(unit.type)) return null;

  if (unit.carriedSpecialOps) {
    if (unit.type === "submarine") {
      const deploymentTargets = getSpecialOpsDeploymentTargets(state, unit);
      if (deploymentTargets.length > 0) {
        const priority = [...getKnownEnemyCityTargets(state), ...getKnownNeutralCityTargets(state)];
        const target = [...deploymentTargets].sort((a, b) => {
          const templateUnitA = { ...unit, type: "special-ops", x: a.x, y: a.y } as Unit;
          const templateUnitB = { ...unit, type: "special-ops", x: b.x, y: b.y } as Unit;
          const scoreA =
            (priority.length ? Math.min(...priority.map((city) => distance(a, city))) : 999) * 8 +
            scoreEnemyThreatAtPosition(templateUnitA, a.x, a.y, state) -
            scoreFriendlySupportAtPosition(templateUnitA, a.x, a.y, state) * 0.4;
          const scoreB =
            (priority.length ? Math.min(...priority.map((city) => distance(b, city))) : 999) * 8 +
            scoreEnemyThreatAtPosition(templateUnitB, b.x, b.y, state) -
            scoreFriendlySupportAtPosition(templateUnitB, b.x, b.y, state) * 0.4;
          return scoreA - scoreB;
        })[0];
        return { type: "unload_special_ops" as const, carrierUnitId: unit.id, x: target.x, y: target.y };
      }
    }
    return null;
  }

  const specialOps = state.units.find((candidate) => {
    if (candidate.owner !== unit.owner || candidate.type !== "special-ops") return false;
    if (unit.type === "chopper") return distance(candidate, unit) <= 1;
    return distance(candidate, unit) === 1;
  });

  if (!specialOps) return null;
  return { type: "load_special_ops" as const, carrierUnitId: unit.id, specialOpsUnitId: specialOps.id };
}

function chooseCarrierJamAction(unit: Unit, state: GameState) {
  if (unit.type !== "carrier") return null;
  const jamTargets = getCarrierJamTargets(state, unit);
  if (!jamTargets.length) return null;
  const target = jamTargets.sort((a, b) => distance(unit, a) - distance(unit, b))[0];
  return { type: "jam_drone" as const, side: "ai" as const, unitId: unit.id, x: target.x, y: target.y };
}

function chooseCruiseMissileAction(unit: Unit, state: GameState, plan: AiTurnPlan) {
  if (!["submarine", "ssbn"].includes(unit.type)) return null;
  if (getRemainingMove(unit) <= 0) return null;

  const targets = getCruiseMissileTargets(state, unit);
  if (!targets.length) return null;

  const mission = getMissionForUnit(plan, unit.id);
  const target = [...targets]
    .map((tile) => {
      const visibleEnemy = state.units.find(
        (candidate) => candidate.owner !== unit.owner && candidate.x === tile.x && candidate.y === tile.y && getUnitStats(candidate).domain === "land"
      );
      const siteValue =
        (tile.city ? 52 : 0) +
        (tile.production ? 18 : 0) +
        (tile.improvement?.type === "airfield" ? 20 : 0) +
        (tile.improvement?.type === "port" ? 18 : 0) +
        (tile.improvement?.type === "outpost" ? 14 : 0) +
        (tile.improvementProject ? 10 : 0);
      const unitValue = visibleEnemy
        ? (visibleEnemy.type === "tank" ? 18 : visibleEnemy.type === "engineer" || visibleEnemy.type === "special-ops" ? 22 : 12) + visibleEnemy.hp
        : 0;
      const missionBias = mission ? Math.max(0, 12 - distance(tile, { x: mission.targetX, y: mission.targetY }) * 2) : 0;
      const productionBias = tile.production ? 12 : 0;
      const coastalBias = tile.improvement?.type === "port" || tile.improvement?.type === "airfield" ? 8 : 0;
      return {
        tile,
        score: siteValue + unitValue + missionBias + productionBias + coastalBias,
      };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!target || target.score < 24) return null;
  return { type: "launch_cruise_missile" as const, side: "ai" as const, unitId: unit.id, x: target.tile.x, y: target.tile.y };
}

function chooseSonarPingAction(unit: Unit, state: GameState, plan: AiTurnPlan) {
  if (!canUnitUseActiveSonar(unit)) return null;
  if (getRemainingMove(unit) <= 0) return null;

  const mission = getMissionForUnit(plan, unit.id);
  const visibleEnemies = getVisibleEnemyUnits(state, "ai");
  const nearbyEnemySub = visibleEnemies.some(
    (enemy) => (enemy.type === "submarine" || enemy.type === "ssbn") && distance(unit, enemy) <= 4
  );
  const nearbyEnemySea = visibleEnemies.some(
    (enemy) => getUnitStats(enemy).domain === "sea" && distance(unit, enemy) <= 5
  );
  const screeningHighValueFriendly = state.units.some(
    (friendly) =>
      friendly.owner === unit.owner &&
      ["troop-transport", "carrier", "ssbn"].includes(friendly.type) &&
      distance(unit, friendly) <= 2
  );
  const missionCallsForScreen =
    mission?.missionType === "escort-expedition" ||
    mission?.missionType === "stage-assault" ||
    mission?.missionType === "screen-fleet";

  if (!nearbyEnemySub && !(missionCallsForScreen && (nearbyEnemySea || screeningHighValueFriendly))) {
    return null;
  }

  return { type: "sonar_ping" as const, side: "ai" as const, unitId: unit.id };
}

function chooseReloadAction(unit: Unit, state: GameState, plan: AiTurnPlan) {
  if (getRemainingMove(unit) <= 0) return null;
  const quote = getAmmoReloadQuote(state, unit);
  if (!quote || quote.cost <= 0 || state.credits.ai <= 0) return null;

  const mission = getMissionForUnit(plan, unit.id);
  const missingAmmo = quote.bombs + quote.torpedoes + quote.cruiseMissiles;
  const strikeMission = Boolean(
    mission &&
      ["strike-target", "screen-fleet", "escort-expedition", "stage-assault", "advance-on-city", "capture-city"].includes(mission.missionType)
  );

  if (missingAmmo <= 0) return null;
  if (!strikeMission && unit.type !== "bomber" && unit.type !== "ssbn" && unit.type !== "submarine") return null;

  return { type: "reload_ammo" as const, side: "ai" as const, unitId: unit.id };
}

function chooseSpecialOpsAirStrikeAction(unit: Unit, state: GameState) {
  if (unit.type !== "special-ops") return null;
  const targets = getSpecialOpsAirStrikeTargets(state, unit);
  if (!targets.length) return null;
  const target = [...targets].sort((a, b) => {
    const value = (tile: Tile) => {
      const nearbyEnemyCount = state.units.filter((candidate) => candidate.owner !== unit.owner && distance(candidate, tile) <= 1).length;
      return (tile.city ? 40 : 0) + (tile.improvement ? 18 : 0) + nearbyEnemyCount * 8;
    };
    return value(b) - value(a);
  })[0];
  return { type: "special_ops_airstrike" as const, side: "ai" as const, unitId: unit.id, x: target.x, y: target.y };
}

export function executeAiUnitSpecialAction(state: GameState, unit: Unit, plan: AiTurnPlan) {
  const engineerAction = unit.type === "engineer" ? chooseEngineerImprovement(unit, state, plan) : null;
  if (engineerAction) {
    const nextState = applyCommand(state, {
      type: "build_improvement",
      side: "ai",
      unitId: unit.id,
      improvementType: engineerAction.improvementType,
      x: engineerAction.x,
      y: engineerAction.y,
    });
    if (nextState !== state) return nextState;
  }

  const missileAction = chooseCruiseMissileAction(unit, state, plan);
  if (missileAction) {
    const nextState = applyCommand(state, missileAction);
    if (nextState !== state) return nextState;
  }

  const sonarAction = chooseSonarPingAction(unit, state, plan);
  if (sonarAction) {
    const nextState = applyCommand(state, sonarAction);
    if (nextState !== state) return nextState;
  }

  const reloadAction = chooseReloadAction(unit, state, plan);
  if (reloadAction) {
    const nextState = applyCommand(state, reloadAction);
    if (nextState !== state) return nextState;
  }

  const transportAction = unit.type === "troop-transport" ? chooseTroopTransportAction(unit, state, plan) : null;
  if (transportAction) {
    const nextState = applyCommand(state, { ...transportAction, side: "ai" } as never);
    if (nextState !== state) return nextState;
  }

  const specialCarrierAction = chooseSpecialOpsCarrierAction(unit, state);
  if (specialCarrierAction) {
    const nextState = applyCommand(state, { ...specialCarrierAction, side: "ai" } as never);
    if (nextState !== state) return nextState;
  }

  const jamAction = chooseCarrierJamAction(unit, state);
  if (jamAction) {
    const nextState = applyCommand(state, jamAction);
    if (nextState !== state) return nextState;
  }

  const airStrikeAction = chooseSpecialOpsAirStrikeAction(unit, state);
  if (airStrikeAction) {
    const nextState = applyCommand(state, airStrikeAction);
    if (nextState !== state) return nextState;
  }

  return null;
}

export function chooseAirRecoveryMove(unit: Unit, state: GameState) {
  const stats = getUnitStats(unit);
  if (!stats.maxTurnsAwayFromBase) return null;
  if (unit.turnsAwayFromBase < stats.maxTurnsAwayFromBase - 1) return null;

  const bases: Array<{ x: number; y: number }> = [];
  for (const row of state.map) {
    for (const tile of row) {
      if (isFriendlyAirBase(tile, unit.owner, state, unit.type, tile.x, tile.y)) {
        bases.push({ x: tile.x, y: tile.y });
      }
    }
  }

  if (!bases.length) return null;
  const nearest = bases.sort((a, b) => distance(unit, a) - distance(unit, b))[0];
  return chooseMoveTowardTarget(unit, nearest, state, false);
}
