import { chooseMoveTowardTarget } from "@/lib/empire/ai/navigation";
import { scoreEnemyThreatAtPosition, scoreFriendlySupportAtPosition } from "@/lib/empire/ai/tactics";
import {
  applyCommand,
  getCarrierJamTargets,
  getEngineerBuildOptions,
  getSpecialOpsAirStrikeTargets,
  getSpecialOpsDeploymentTargets,
  getTroopTransportDeploymentTargets,
  getTroopTransportLoadTargets,
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

  if ((plan.context.aiCountsByDomain.sea > 0 || state.gameType === "naval" || state.gameType === "archipelago" || state.gameType === "ocean") && options.portTargets.length > 0) {
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

  return null;
}

function chooseTroopTransportAction(unit: Unit, state: GameState) {
  const deploymentTargets = getTroopTransportDeploymentTargets(state, unit);
  if (deploymentTargets.length > 0 && (unit.carriedTroops?.length ?? 0) > 0) {
    const priority = [...getKnownNeutralCityTargets(state), ...getKnownEnemyCityTargets(state)];
    const target = [...deploymentTargets].sort((a, b) => {
      const proximityA = priority.length ? Math.min(...priority.map((city) => distance(a, city))) : 999;
      const proximityB = priority.length ? Math.min(...priority.map((city) => distance(b, city))) : 999;
      const cargoType = unit.carriedTroops?.[0]?.type ?? "infantry";
      const templateUnit = { ...unit, type: cargoType, x: a.x, y: a.y } as Unit;
      const templateUnitB = { ...unit, type: cargoType, x: b.x, y: b.y } as Unit;
      const scoreA = proximityA * 8 + scoreEnemyThreatAtPosition(templateUnit, a.x, a.y, state) - scoreFriendlySupportAtPosition(templateUnit, a.x, a.y, state) * 0.5;
      const scoreB = proximityB * 8 + scoreEnemyThreatAtPosition(templateUnitB, b.x, b.y, state) - scoreFriendlySupportAtPosition(templateUnitB, b.x, b.y, state) * 0.5;
      return scoreA - scoreB;
    })[0];
    return { type: "unload_transport_troop" as const, transportUnitId: unit.id, x: target.x, y: target.y };
  }

  const loadTargets = getTroopTransportLoadTargets(state, unit);
  if (loadTargets.length > 0) {
    const troop = [...loadTargets].sort((a, b) => {
      const weight = (candidate: Unit) => (candidate.type === "tank" ? 30 : candidate.type === "infantry" ? 20 : 10) + candidate.hp;
      return weight(b) - weight(a);
    })[0];
    return { type: "load_transport_troop" as const, transportUnitId: unit.id, troopUnitId: troop.id };
  }

  return null;
}

function chooseSpecialOpsCarrierAction(unit: Unit, state: GameState) {
  if (!["apache", "submarine"].includes(unit.type)) return null;

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
    if (unit.type === "apache") return candidate.x === unit.x && candidate.y === unit.y;
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

  const transportAction = unit.type === "troop-transport" ? chooseTroopTransportAction(unit, state) : null;
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
