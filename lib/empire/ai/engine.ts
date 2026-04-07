import { planAiTurn } from "@/lib/empire/ai/planner";
import { chooseMoveTowardTarget, findNearestTarget } from "@/lib/empire/ai/navigation";
import { executeAiUnitSpecialAction } from "@/lib/empire/ai/special";
import { chooseTacticalMove, evaluateUnitTacticalState } from "@/lib/empire/ai/tactics";
import { addLog, applyCommand, getRemainingMove, getUnitDefinition } from "@/lib/empire/game";
import type { GameState, UnitType } from "@/lib/empire/types";

export type VisibleAiMove = {
  unitId: number;
  unitType: UnitType;
  path: Array<{ x: number; y: number }>;
};

function getLocationLabel(x: number, y: number) {
  return `(${x + 1}, ${y + 1})`;
}

function executeAiSameTileStrike(state: GameState, unitId: number) {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit || !getUnitDefinition(unit.type).attackRequiresSameTile) return state;
  return applyCommand(state, { type: "attack_tile", side: "ai", unitId: unit.id, x: unit.x, y: unit.y });
}

function executeAiProductionPhase(state: GameState) {
  const plan = planAiTurn(state);
  let nextState = state;

  const goalSummary = plan.strategicGoals
    .slice(0, 3)
    .map((goal) => goal.summary)
    .join(" | ");
  if (goalSummary) {
    nextState = addLog(nextState, `AI priorities: ${goalSummary}.`);
  }

  nextState = addLog(
    nextState,
    `AI threat summary: ${plan.context.threatSummary.threatenedSites.length} threatened site(s), ${plan.context.threatSummary.knownEnemyCityCount} known enemy city target(s), ${plan.context.threatSummary.unexploredTileCount} unexplored tile(s).`
  );

  const operationSummary = plan.operations
    .slice(0, 4)
    .map((operation) => `${operation.type}:${operation.stage}@${getLocationLabel(operation.targetX, operation.targetY)}`)
    .join(" | ");
  if (operationSummary) {
    nextState = addLog(nextState, `AI operations: ${operationSummary}.`);
  }

  const missionSummary = plan.unitMissions
    .slice(0, 5)
    .map((mission) => `${mission.unitType}:${mission.role}->${mission.missionType}@${getLocationLabel(mission.targetX, mission.targetY)}`)
    .join(" | ");
  if (missionSummary) {
    nextState = addLog(nextState, `AI missions: ${missionSummary}.`);
  }

  const tacticalSummary = plan.unitMissions
    .slice(0, 4)
    .map((mission) => {
      const unit = nextState.units.find((candidate) => candidate.id === mission.unitId);
      if (!unit) return null;
      const tacticalState = evaluateUnitTacticalState(unit, mission, nextState);
      return `${mission.unitType}:${tacticalState.shouldRetreat ? "retreat" : "engage"} T${Math.round(tacticalState.localThreat)} S${Math.round(tacticalState.localSupport)}`;
    })
    .filter((value): value is string => Boolean(value))
    .join(" | ");
  if (tacticalSummary) {
    nextState = addLog(nextState, `AI tactics: ${tacticalSummary}.`);
  }

  const engineerCount = nextState.units.filter((unit) => unit.owner === "ai" && unit.type === "engineer").length;
  const transportCount = nextState.units.filter((unit) => unit.owner === "ai" && unit.type === "troop-transport").length;
  const airCount = nextState.units.filter((unit) => unit.owner === "ai" && getUnitDefinition(unit.type).domain === "air").length;
  if (engineerCount + transportCount + airCount > 0) {
    nextState = addLog(
      nextState,
      `AI support posture: ${engineerCount} engineer(s), ${transportCount} transport(s), ${airCount} air unit(s) under special-action rules.`
    );
  }

  for (const decision of plan.productionDecisions) {
    const before = nextState;
    nextState = applyCommand(nextState, {
      type: "recruit_unit",
      side: "ai",
      unitType: decision.unitType,
      x: decision.x,
      y: decision.y,
      spawnX: decision.spawnX,
      spawnY: decision.spawnY,
    });

    if (nextState !== before) {
      nextState = addLog(
        nextState,
        `AI: queued ${getUnitDefinition(decision.unitType).name.toLowerCase()} at ${getLocationLabel(decision.x, decision.y)} because ${decision.reason}.`
      );
    }
  }

  return { state: nextState, plan };
}

export function runAiTurn(current: GameState, options?: { aiOmniscience?: boolean }): GameState {
  return runAiTurnWithPlayback(current, options).state;
}

export function runAiTurnWithPlayback(current: GameState, options?: { aiOmniscience?: boolean }) {
  let state: GameState = JSON.parse(JSON.stringify(current)) as GameState;
  const visibleMoves: VisibleAiMove[] = [];
  if (state.winner) return { state, visibleMoves };

  state = applyCommand(state, { type: "begin_turn", side: "ai" });
  const productionPhase = executeAiProductionPhase(state);
  state = productionPhase.state;
  const unitMissionMap = new Map(productionPhase.plan.unitMissions.map((mission) => [mission.unitId, mission] as const));

  const getMissionExecutionPriority = (unitId: number) => {
    const mission = unitMissionMap.get(unitId);
    if (!mission) return 40;
    if (mission.missionType === "stage-assault" && mission.unitType !== "troop-transport") return 110;
    if (mission.missionType === "hold-site") return 102;
    if (mission.unitType === "engineer") return 98;
    if (mission.missionType === "stage-assault" && mission.unitType === "troop-transport") return 92;
    if (mission.missionType === "escort-expedition") return 84;
    if (mission.missionType === "intercept-threat") return 78;
    if (mission.missionType === "capture-city" || mission.missionType === "advance-on-city") return 72;
    if (mission.missionType === "strike-target") return 68;
    return 54;
  };
  const aiUnits = state.units
    .filter((unit) => unit.owner === "ai")
    .sort((a, b) => {
      const priorityDelta = getMissionExecutionPriority(b.id) - getMissionExecutionPriority(a.id);
      if (priorityDelta !== 0) return priorityDelta;
      return b.hp - a.hp;
    });

  for (const aiUnit of aiUnits) {
    const liveUnit = state.units.find((unit) => unit.id === aiUnit.id);
    if (!liveUnit || getRemainingMove(liveUnit) <= 0) continue;

    const afterSpecialAction = executeAiUnitSpecialAction(state, liveUnit, productionPhase.plan);
    if (afterSpecialAction && afterSpecialAction !== state) {
      state = afterSpecialAction;
      continue;
    }

    const beforeMoveStrikeState = executeAiSameTileStrike(state, liveUnit.id);
    if (beforeMoveStrikeState !== state) {
      state = beforeMoveStrikeState;
      continue;
    }

    const mission = unitMissionMap.get(liveUnit.id) ?? null;
    const missionTarget = mission ? { x: mission.targetX, y: mission.targetY } : null;
    const fallbackTarget = findNearestTarget(liveUnit, state, "player", options?.aiOmniscience);
    const target = missionTarget ?? fallbackTarget;
    if (!target) continue;

    const step =
      chooseTacticalMove(liveUnit, mission, state, options?.aiOmniscience) ??
      chooseMoveTowardTarget(liveUnit, target, state, options?.aiOmniscience);
    if (!step) continue;
    const beforeMoveState = state;
    const fromX = liveUnit.x;
    const fromY = liveUnit.y;
    state = applyCommand(state, { type: "move_unit", side: "ai", unitId: liveUnit.id, x: step.x, y: step.y });
    const movedUnit = state.units.find((unit) => unit.id === liveUnit.id);
    if (!movedUnit) continue;

    const afterMoveStrikeState = executeAiSameTileStrike(state, movedUnit.id);
    if (afterMoveStrikeState !== state) {
      state = afterMoveStrikeState;
    }

    const fullPath = [{ x: fromX, y: fromY }, ...step.path];
    const visiblePath = fullPath.filter(
      (point) => (beforeMoveState.playerVisible[point.y]?.[point.x] ?? false) || (state.playerVisible[point.y]?.[point.x] ?? false)
    );

    if (visiblePath.length >= 2) {
      const existingMove = visibleMoves.find((move) => move.unitId === movedUnit.id);
      if (existingMove) {
        const mergedPath = [...existingMove.path];
        for (const point of visiblePath.slice(1)) {
          const last = mergedPath[mergedPath.length - 1];
          if (!last || last.x !== point.x || last.y !== point.y) {
            mergedPath.push(point);
          }
        }
        existingMove.path = mergedPath;
      } else {
        visibleMoves.push({
          unitId: movedUnit.id,
          unitType: movedUnit.type,
          path: visiblePath,
        });
      }
    }
  }

  state = applyCommand(state, { type: "end_turn", side: "ai" });
  return { state, visibleMoves };
}
