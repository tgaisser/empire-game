import type { AiUnitMission } from "@/lib/empire/ai/strategy";
import { chooseMoveForMission, chooseMoveTowardTarget, findNearestTarget } from "@/lib/empire/ai/navigation";
import { chooseAirRecoveryMove } from "@/lib/empire/ai/special";
import {
  canUnitAttackTarget,
  getReachableMoves,
  getRemainingMove,
  getUnitStats,
  isFriendlyAirBase,
} from "@/lib/empire/game";
import { DIRECTIONS } from "@/lib/empire/config";
import type { GameState, ReachableMove, Tile, Unit } from "@/lib/empire/types";

function distance(a: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">, b: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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

function getFriendlyUnits(state: GameState, side: "player" | "ai") {
  return state.units.filter((unit) => unit.owner === side);
}

function getStrategicUnitValue(unit: Unit) {
  if (unit.type === "carrier") return 34;
  if (unit.type === "troop-transport") return 26;
  if (unit.type === "bomber") return 22;
  if (unit.type === "submarine" || unit.type === "ssbn") return 20;
  if (unit.type === "engineer" || unit.type === "special-ops") return 18;
  if (unit.type === "fighter" || unit.type === "chopper") return 16;
  return 10;
}

function getLikelyDefender(attacker: Unit, x: number, y: number, state: GameState) {
  const candidates = state.units.filter((unit) => unit.owner !== attacker.owner && unit.x === x && unit.y === y);
  return (
    candidates
      .filter((candidate) => canUnitAttackTarget(attacker, candidate))
      .sort((a, b) => a.hp - b.hp)[0] ?? null
  );
}

function scoreEngagement(attacker: Unit, defender: Unit, tile: Tile) {
  const attackerStats = getUnitStats(attacker);
  const defenderStats = getUnitStats(defender);
  const antiAir = defenderStats.domain === "air" ? attackerStats.antiAirBonus ?? 0 : 0;
  const attackerPressure = attackerStats.atk + attackerStats.piercing + antiAir + attacker.hp * 0.55;
  const fortificationValue = defender.entrenched ? 3 : (tile.city || defender.fortified ? 1.5 : 0);
  const defenderDurability = defenderStats.armor + defender.hp * 0.5 + fortificationValue;
  const retaliation =
    defenderStats.canAttack && canUnitAttackTarget(defender, attacker)
      ? defenderStats.atk * 0.65 + defenderStats.piercing * 0.3 + defender.hp * 0.35
      : 0;
  const expectedDamageEdge = attackerPressure - defenderDurability;
  const likelyKill = expectedDamageEdge >= defender.hp * 0.4;
  const likelyLoss = retaliation >= attacker.hp * 0.9;

  let score = expectedDamageEdge * 3 - retaliation * 1.8;
  if (likelyKill) score += 18;
  if (likelyLoss) score -= 26;
  if (tile.city && attackerStats.canCapture) score += 24;
  if (tile.improvement && tile.improvement.owner !== attacker.owner) score += 14;
  score += getStrategicUnitValue(defender) * 0.45;
  score -= getStrategicUnitValue(attacker) * 0.25;
  if (attackerStats.selfDestructOnAttack) {
    score += tile.city ? 8 : 0;
    score -= likelyKill ? 0 : 16;
  }

  return score;
}

export function scoreEnemyThreatAtPosition(unit: Unit, x: number, y: number, state: GameState) {
  const enemies = getVisibleEnemyUnits(state, unit.owner);
  let total = 0;

  for (const enemy of enemies) {
    if (!canUnitAttackTarget(enemy, unit)) continue;
    const enemyStats = getUnitStats(enemy);
    const reach = enemyStats.move + (enemyStats.attackRequiresSameTile ? 0 : 1);
    const range = distance(enemy, { x, y });
    if (range > reach + 1) continue;
    total += Math.max(0, reach + 2 - range) * (enemyStats.atk + (enemyStats.antiAirBonus ?? 0) * 0.4);
  }

  return total;
}

export function scoreFriendlySupportAtPosition(unit: Unit, x: number, y: number, state: GameState) {
  const friendlies = getFriendlyUnits(state, unit.owner).filter((friendly) => friendly.id !== unit.id);
  let total = 0;

  for (const friendly of friendlies) {
    const stats = getUnitStats(friendly);
    const range = distance(friendly, { x, y });
    if (range > stats.move + 1) continue;
    total += Math.max(0, stats.move + 2 - range) * (stats.atk + stats.armor * 0.5);
  }

  return total;
}

function getRetreatAnchors(unit: Unit, state: GameState) {
  const anchors: Array<{ x: number; y: number }> = [];

  if (getUnitStats(unit).domain === "air") {
    for (const row of state.map) {
      for (const tile of row) {
        if (isFriendlyAirBase(tile, unit.owner, state, unit.type, tile.x, tile.y)) {
          anchors.push({ x: tile.x, y: tile.y });
        }
      }
    }
    return anchors;
  }

  if (getUnitStats(unit).domain === "sea") {
    for (const row of state.map) {
      for (const tile of row) {
        const ownedPortLike =
          (tile.improvement?.type === "port" && tile.improvement.owner === unit.owner) ||
          Boolean(tile.city && tile.owner === unit.owner);
        if (!ownedPortLike) continue;

        for (const [dx, dy] of DIRECTIONS) {
          const nx = tile.x + dx;
          const ny = tile.y + dy;
          const candidate = state.map[ny]?.[nx];
          if (candidate?.terrain === "water") {
            anchors.push({ x: nx, y: ny });
          }
        }
      }
    }
    return anchors;
  }

  for (const row of state.map) {
    for (const tile of row) {
      if (tile.owner !== unit.owner) continue;
      if (tile.city || tile.improvement) {
        anchors.push({ x: tile.x, y: tile.y });
      }
    }
  }

  return anchors;
}

function chooseRetreatMove(unit: Unit, mission: AiUnitMission | null, state: GameState) {
  const reachable = getReachableMoves(state, unit).filter((move) => !move.occupiedByEnemy);
  if (!reachable.length) return null;
  const anchors = getRetreatAnchors(unit, state);

  const ranked = [...reachable].sort((a, b) => {
    const scoreA = scoreRetreatPosition(unit, mission, a, anchors, state);
    const scoreB = scoreRetreatPosition(unit, mission, b, anchors, state);
    return scoreB - scoreA;
  });

  return ranked[0] ?? null;
}

function scoreRetreatPosition(
  unit: Unit,
  mission: AiUnitMission | null,
  move: ReachableMove,
  anchors: Array<{ x: number; y: number }>,
  state: GameState
) {
  const threat = scoreEnemyThreatAtPosition(unit, move.x, move.y, state);
  const support = scoreFriendlySupportAtPosition(unit, move.x, move.y, state);
  const nearestAnchorDistance = anchors.length
    ? Math.min(...anchors.map((anchor) => distance(anchor, move)))
    : 8;

  let score = support * 0.8 - threat * 1.6 - nearestAnchorDistance * 4 - move.cost;
  if (mission?.missionType === "hold-site") {
    const objectiveDistance = distance(move, { x: mission.targetX, y: mission.targetY });
    score -= objectiveDistance * 2;
  }
  return score;
}

function shouldRetreat(unit: Unit, mission: AiUnitMission | null, state: GameState) {
  const stats = getUnitStats(unit);
  const hpRatio = unit.hp / Math.max(1, stats.maxHp);
  const localThreat = scoreEnemyThreatAtPosition(unit, unit.x, unit.y, state);
  const localSupport = scoreFriendlySupportAtPosition(unit, unit.x, unit.y, state);
  const isHighValueUnit = ["carrier", "troop-transport", "bomber", "engineer", "special-ops", "submarine", "ssbn"].includes(unit.type);

  if (hpRatio <= 0.35) return true;
  if (stats.maxTurnsAwayFromBase && unit.turnsAwayFromBase >= stats.maxTurnsAwayFromBase - 1) return true;
  if (hpRatio <= 0.55 && localThreat > localSupport * 1.1) return true;
  if (mission?.missionType === "hold-site" && hpRatio <= 0.45 && localThreat > localSupport) return true;
  if ((mission?.missionType === "stage-assault" || mission?.missionType === "escort-expedition") && localThreat > localSupport * 1.05) return true;
  if (isHighValueUnit && hpRatio <= 0.7 && localThreat > localSupport * 1.15) return true;
  if (unit.type === "troop-transport" && (unit.carriedTroops?.length ?? 0) > 0 && localThreat > localSupport * 0.85) return true;

  return false;
}

function scoreDefensiveValue(mission: AiUnitMission | null, move: ReachableMove) {
  if (!mission) return 0;
  if (mission.missionType !== "hold-site" && mission.missionType !== "support-front") return 0;
  const objectiveDistance = distance(move, { x: mission.targetX, y: mission.targetY });
  return Math.max(0, 24 - objectiveDistance * 6);
}

function chooseBestCombatMove(unit: Unit, mission: AiUnitMission | null, state: GameState) {
  if (!getUnitStats(unit).canAttack) return null;
  if (mission?.missionType === "stage-assault" && ["troop-transport", "engineer", "special-ops"].includes(unit.type)) return null;
  if (mission?.missionType === "escort-expedition" && ["carrier", "troop-transport"].includes(unit.type)) return null;
  const attacks = getReachableMoves(state, unit).filter((move) => move.occupiedByEnemy);
  if (!attacks.length) return null;

  const ranked = attacks
    .map((move) => {
      const defender = getLikelyDefender(unit, move.x, move.y, state);
      const tile = state.map[move.y]?.[move.x];
      if (!defender || !tile) return { move, score: Number.NEGATIVE_INFINITY };
      const combatScore = scoreEngagement(unit, defender, tile);
      const threat = scoreEnemyThreatAtPosition(unit, move.x, move.y, state);
      const support = scoreFriendlySupportAtPosition(unit, move.x, move.y, state);
      const defenseBias = scoreDefensiveValue(mission, move);
      const objectiveBias =
        mission?.missionType === "capture-city" && tile.city
          ? 18
          : mission?.missionType === "advance-on-city" && tile.city
            ? 10
            : mission?.missionType === "escort-expedition"
              ? -8
              : mission?.missionType === "stage-assault" && unit.type === "troop-transport"
                ? -12
            : 0;
      const preservationPenalty =
        ["carrier", "troop-transport", "bomber", "engineer"].includes(unit.type) && threat > support
          ? (threat - support) * 0.3
          : 0;
      const unsupportedAssaultPenalty =
        tile.city && mission && ["advance-on-city", "capture-city"].includes(mission.missionType) && support < threat * 0.9
          ? (threat - support) * 0.45 + 8
          : 0;
      return {
        move,
        score: combatScore + support * 0.35 - threat * 0.45 + defenseBias + objectiveBias - preservationPenalty - unsupportedAssaultPenalty - move.cost,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;
  if (ranked[0].score < 6) return null;
  return ranked[0].move;
}

function shouldHoldMissionPosition(unit: Unit, mission: AiUnitMission | null) {
  if (!mission) return false;
  if (mission.missionType === "hold-site") {
    return unit.x === mission.targetX && unit.y === mission.targetY;
  }
  if (mission.missionType === "stage-assault") {
    if (unit.type === "troop-transport" && (unit.carriedTroops?.length ?? 0) > 0 && mission.approachX !== undefined && mission.approachY !== undefined) {
      return unit.x === mission.approachX && unit.y === mission.approachY;
    }
    const stagingX = mission.stagingX ?? mission.targetX;
    const stagingY = mission.stagingY ?? mission.targetY;
    return unit.x === stagingX && unit.y === stagingY;
  }
  if (mission.missionType === "escort-expedition" && mission.approachX !== undefined && mission.approachY !== undefined) {
    return unit.x === mission.approachX && unit.y === mission.approachY;
  }
  return false;
}

export function chooseTacticalMove(unit: Unit, mission: AiUnitMission | null, state: GameState, aiOmniscience = false) {
  const airRecoveryMove = chooseAirRecoveryMove(unit, state);
  if (airRecoveryMove) return airRecoveryMove;

  if (shouldRetreat(unit, mission, state)) {
    return chooseRetreatMove(unit, mission, state);
  }

  const combatMove = chooseBestCombatMove(unit, mission, state);
  if (combatMove) return combatMove;

  if (shouldHoldMissionPosition(unit, mission)) {
    return null;
  }

  if (mission) {
    return chooseMoveForMission(unit, mission, state, aiOmniscience);
  }

  const fallbackTarget = findNearestTarget(unit, state, unit.owner === "ai" ? "player" : "ai", aiOmniscience);
  if (!fallbackTarget) return null;
  return chooseMoveTowardTarget(unit, fallbackTarget, state, aiOmniscience);
}

export function evaluateUnitTacticalState(unit: Unit, mission: AiUnitMission | null, state: GameState) {
  return {
    shouldRetreat: shouldRetreat(unit, mission, state),
    localThreat: scoreEnemyThreatAtPosition(unit, unit.x, unit.y, state),
    localSupport: scoreFriendlySupportAtPosition(unit, unit.x, unit.y, state),
    moveLeft: getRemainingMove(unit),
  };
}
