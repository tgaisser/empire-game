import type { AiUnitMission } from "@/lib/empire/ai/strategy";
import {
  estimateRouteCost,
  getReachableMoves,
  getReachableMovesFromIntel,
  findNearestTarget as findNearestTargetBase,
} from "@/lib/empire/game";
import { DIRECTIONS } from "@/lib/empire/config";
import type { GameState, ReachableMove, Tile, Unit } from "@/lib/empire/types";

type TargetPoint = Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">;

export const findNearestTarget = findNearestTargetBase;

function distance(a: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">, b: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function inBounds(x: number, y: number, width: number, height: number) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function getUnknownNeighborCount(state: GameState, x: number, y: number) {
  let total = 0;

  for (const [dx, dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny, state.mapWidth, state.mapHeight)) continue;
    if (state.aiIntel[ny]?.[nx] === null) total += 1;
  }

  return total;
}

export function chooseMoveTowardTarget(unit: Unit, target: TargetPoint, state: GameState, aiOmniscience = false): ReachableMove | null {
  const reachable = unit.owner === "ai" && !aiOmniscience ? getReachableMovesFromIntel(state, unit) : getReachableMoves(state, unit);
  if (!reachable.length) return null;

  const ranked = [...reachable].sort((a, b) => {
    const routeDelta =
      estimateRouteCost(unit, { x: a.x, y: a.y }, target, state, aiOmniscience) -
      estimateRouteCost(unit, { x: b.x, y: b.y }, target, state, aiOmniscience);
    if (routeDelta !== 0) return routeDelta;
    const distanceDelta = distance(a, target) - distance(b, target);
    if (distanceDelta !== 0) return distanceDelta;
    const costDelta = a.cost - b.cost;
    if (costDelta !== 0) return costDelta;
    return Number(a.occupiedByEnemy) - Number(b.occupiedByEnemy);
  });

  const bestMove = ranked[0];
  if (!bestMove) return null;

  if (
    unit.owner === "ai" &&
    !aiOmniscience &&
    !Number.isFinite(estimateRouteCost(unit, { x: bestMove.x, y: bestMove.y }, target, state, aiOmniscience)) &&
    distance(bestMove, target) >= distance(unit, target)
  ) {
    return null;
  }

  return bestMove;
}

function scoreMoveForMission(
  unit: Unit,
  mission: AiUnitMission,
  move: ReachableMove,
  state: GameState,
  aiOmniscience = false
) {
  const operationalTarget =
    mission.missionType === "stage-assault" && unit.type === "troop-transport" && (unit.carriedTroops?.length ?? 0) > 0 && mission.approachX !== undefined && mission.approachY !== undefined
      ? { x: mission.approachX, y: mission.approachY }
      : mission.missionType === "escort-expedition" && mission.approachX !== undefined && mission.approachY !== undefined
        ? { x: mission.approachX, y: mission.approachY }
        : { x: mission.targetX, y: mission.targetY };
  const routeCost = estimateRouteCost(unit, { x: move.x, y: move.y }, operationalTarget, state, aiOmniscience);
  const directDistance = distance(move, operationalTarget);
  const unknownNeighbors = getUnknownNeighborCount(state, move.x, move.y);
  const onObjective = move.x === operationalTarget.x && move.y === operationalTarget.y;

  let score = 0;

  if (mission.missionType === "hold-site") {
    score += onObjective ? 30 : 0;
    score -= directDistance * 8;
    score -= Number.isFinite(routeCost) ? routeCost * 3 : 40;
    score -= move.occupiedByEnemy ? 6 : 0;
  } else if (mission.missionType === "advance-on-city" || mission.missionType === "capture-city") {
    score += onObjective ? 40 : 0;
    score -= directDistance * 7;
    score -= Number.isFinite(routeCost) ? routeCost * 4 : 50;
    score += move.occupiedByEnemy ? 10 : 0;
  } else if (mission.missionType === "scout-sector") {
    score += unknownNeighbors * 14;
    score -= directDistance * 4;
    score -= Number.isFinite(routeCost) ? routeCost * 2 : 20;
    score -= move.occupiedByEnemy ? 10 : 0;
  } else if (mission.missionType === "intercept-threat") {
    score += onObjective ? 35 : 0;
    score -= directDistance * 7;
    score -= Number.isFinite(routeCost) ? routeCost * 3 : 35;
    score += move.occupiedByEnemy ? 12 : 0;
  } else if (mission.missionType === "stage-assault") {
    score += onObjective ? 36 : 0;
    score -= directDistance * 6;
    score -= Number.isFinite(routeCost) ? routeCost * 3 : 36;
    score -= move.occupiedByEnemy ? 12 : 0;
  } else if (mission.missionType === "escort-expedition") {
    score += onObjective ? 24 : 0;
    score -= directDistance * 6;
    score -= Number.isFinite(routeCost) ? routeCost * 2 : 28;
    score += move.occupiedByEnemy ? 4 : 0;
  } else if (mission.missionType === "strike-target") {
    score += onObjective ? 34 : 0;
    score -= directDistance * 6;
    score -= Number.isFinite(routeCost) ? routeCost * 3 : 30;
    score += move.occupiedByEnemy ? 8 : 0;
  } else if (mission.missionType === "screen-fleet") {
    score -= directDistance * 6;
    score -= Number.isFinite(routeCost) ? routeCost * 2 : 24;
    score -= move.occupiedByEnemy ? 4 : 0;
  } else {
    score -= directDistance * 5;
    score -= Number.isFinite(routeCost) ? routeCost * 3 : 25;
    score += move.occupiedByEnemy ? 6 : 0;
  }

  score -= move.cost;
  return score;
}

export function chooseMoveForMission(unit: Unit, mission: AiUnitMission, state: GameState, aiOmniscience = false): ReachableMove | null {
  const reachable = unit.owner === "ai" && !aiOmniscience ? getReachableMovesFromIntel(state, unit) : getReachableMoves(state, unit);
  if (!reachable.length) return null;
  const operationalTarget =
    mission.missionType === "stage-assault" && unit.type === "troop-transport" && (unit.carriedTroops?.length ?? 0) > 0 && mission.approachX !== undefined && mission.approachY !== undefined
      ? { x: mission.approachX, y: mission.approachY }
      : mission.missionType === "escort-expedition" && mission.approachX !== undefined && mission.approachY !== undefined
        ? { x: mission.approachX, y: mission.approachY }
        : { x: mission.targetX, y: mission.targetY };

  const ranked = [...reachable].sort((a, b) => {
    const scoreDelta = scoreMoveForMission(unit, mission, b, state, aiOmniscience) - scoreMoveForMission(unit, mission, a, state, aiOmniscience);
    if (scoreDelta !== 0) return scoreDelta;

    const routeDelta =
      estimateRouteCost(unit, { x: a.x, y: a.y }, operationalTarget, state, aiOmniscience) -
      estimateRouteCost(unit, { x: b.x, y: b.y }, operationalTarget, state, aiOmniscience);
    if (routeDelta !== 0) return routeDelta;

    return a.cost - b.cost;
  });

  const bestMove = ranked[0];
  if (!bestMove) return null;

  if (
    unit.owner === "ai" &&
    !aiOmniscience &&
    !Number.isFinite(
      estimateRouteCost(unit, { x: bestMove.x, y: bestMove.y }, operationalTarget, state, aiOmniscience)
    ) &&
    mission.missionType !== "scout-sector"
  ) {
    return null;
  }

  return bestMove;
}
