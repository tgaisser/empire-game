import { runAiTurnWithPlayback } from "@/lib/empire/ai/engine";
import { planAiTurn } from "@/lib/empire/ai/planner";
import { UNIT_STATS } from "@/lib/empire/config";
import {
  countForces,
  createInitialState,
  getCityCount,
  getCruiseMissileTargets,
  getEngineerBuildOptions,
  getAmmoReloadQuote,
} from "@/lib/empire/game";
import type { GameState, Owner, Side, Tile, Unit, WorldSizeOption } from "@/lib/empire/types";

export type AiDiagnosticStatus = "pass" | "warn" | "fail";

export type AiDiagnosticResult = {
  id: string;
  label: string;
  status: AiDiagnosticStatus;
  details: string;
};

export type AiMirrorSimulationSummary = {
  seed: number;
  turn: number;
  winner: Side | null;
  playerCities: number;
  aiCities: number;
  playerUnits: number;
  aiUnits: number;
  ending: "winner" | "turn-limit";
};

export type AiDiagnosticsReport = {
  currentStateResults: AiDiagnosticResult[];
  simulations: AiMirrorSimulationSummary[];
};

type AiMirrorSimulationOptions = {
  count: number;
  turnLimit: number;
  width: number;
  height: number;
  gameType: GameState["gameType"];
  playerFaction: GameState["playerFaction"];
  aiFaction: GameState["aiFaction"];
  seedBase: number;
};

function swapSide(side: Side): Side {
  return side === "player" ? "ai" : "player";
}

function swapOwner(owner: Owner): Owner {
  if (owner === null) return null;
  return swapSide(owner);
}

function swapTilePerspective(tile: Tile): Tile {
  return {
    ...tile,
    owner: swapOwner(tile.owner),
    improvement: tile.improvement ? { ...tile.improvement, owner: swapSide(tile.improvement.owner) } : null,
    improvementProject: tile.improvementProject
      ? { ...tile.improvementProject, owner: swapSide(tile.improvementProject.owner) }
      : null,
    production: tile.production ? { ...tile.production } : null,
  };
}

function cloneIntelGrid(grid: (Tile | null)[][], swapPerspective = false) {
  return grid.map((row) =>
    row.map((tile) => {
      if (!tile) return null;
      return swapPerspective ? swapTilePerspective(tile) : { ...tile };
    })
  );
}

function cloneMask(mask: boolean[][]) {
  return mask.map((row) => [...row]);
}

function cloneUnits(units: Unit[], swapPerspective = false) {
  return units.map((unit) => ({
    ...unit,
    owner: swapPerspective ? swapSide(unit.owner) : unit.owner,
    carriedSpecialOps: unit.carriedSpecialOps ? { ...unit.carriedSpecialOps } : unit.carriedSpecialOps ?? null,
    carriedTroops: unit.carriedTroops?.map((cargo) => ({ ...cargo })) ?? null,
  }));
}

function swapStatePerspective(state: GameState): GameState {
  return {
    ...state,
    playerFaction: state.aiFaction,
    aiFaction: state.playerFaction,
    side: swapSide(state.side),
    credits: {
      player: state.credits.ai,
      ai: state.credits.player,
    },
    map: state.map.map((row) => row.map((tile) => swapTilePerspective(tile))),
    units: cloneUnits(state.units, true),
    winner: state.winner ? swapSide(state.winner) : null,
    playerVisible: cloneMask(state.aiVisible),
    playerIntel: cloneIntelGrid(state.aiIntel, true),
    aiVisible: cloneMask(state.playerVisible),
    aiIntel: cloneIntelGrid(state.playerIntel, true),
    playerDetectedUnitIds: [...state.aiDetectedUnitIds],
    aiDetectedUnitIds: [...state.playerDetectedUnitIds],
    logs: [...state.logs],
    nextCombatEventId: state.nextCombatEventId,
    combatEvents: state.combatEvents.map((event) =>
      event.type === "combat"
        ? {
            ...event,
            attackerSide: swapSide(event.attackerSide),
            visibleToPlayer: event.visibleToAi,
            visibleToAi: event.visibleToPlayer,
          }
        : {
            ...event,
            side: swapSide(event.side),
            visibleToPlayer: event.visibleToAi,
            visibleToAi: event.visibleToPlayer,
          }
    ),
    sonarContacts: state.sonarContacts.map((contact) => ({ ...contact, side: swapSide(contact.side) })),
  };
}

function runBotTurnForSide(state: GameState, side: Side) {
  if (side === "ai") {
    return runAiTurnWithPlayback(state).state;
  }

  const swappedState = swapStatePerspective(state);
  const result = runAiTurnWithPlayback(swappedState).state;
  return swapStatePerspective(result);
}

function createDiagnosticResult(id: string, label: string, status: AiDiagnosticStatus, details: string): AiDiagnosticResult {
  return { id, label, status, details };
}

export function runAiDiagnosticsForState(state: GameState): AiDiagnosticResult[] {
  const plan = planAiTurn(state);
  const results: AiDiagnosticResult[] = [];
  const aiUnits = state.units.filter((unit) => unit.owner === "ai");
  const missionIds = new Set(plan.unitMissions.map((mission) => mission.unitId));
  const reservedSites = new Set<string>();
  const operationIds = new Set(plan.operations.map((operation) => operation.id));
  let hasInvalidDecision = false;
  let hasDuplicateDecision = false;
  let overspend = 0;

  for (const decision of plan.productionDecisions) {
    const siteKey = `${decision.x},${decision.y}`;
    if (reservedSites.has(siteKey)) {
      hasDuplicateDecision = true;
    }
    reservedSites.add(siteKey);
    overspend += UNIT_STATS[decision.unitType].cost;
  }

  for (const decision of plan.productionDecisions) {
    const site = plan.context.sites.find((candidate) => candidate.x === decision.x && candidate.y === decision.y);
    if (!site) {
      hasInvalidDecision = true;
      continue;
    }
    const domain = UNIT_STATS[decision.unitType].domain;
    if (site.kind === "port" && domain !== "sea") hasInvalidDecision = true;
    if (site.kind === "airfield" && domain !== "air") hasInvalidDecision = true;
  }

  results.push(
    createDiagnosticResult(
      "mission-coverage",
      "Mission coverage",
      missionIds.size === aiUnits.length ? "pass" : "fail",
      missionIds.size === aiUnits.length
        ? `All ${aiUnits.length} AI units received a mission.`
        : `${aiUnits.length - missionIds.size} AI unit(s) are missing missions.`
    )
  );

  results.push(
    createDiagnosticResult(
      "production-validity",
      "Production validity",
      hasInvalidDecision || hasDuplicateDecision ? "fail" : "pass",
      hasInvalidDecision
        ? "At least one planned build uses an invalid site or domain."
        : hasDuplicateDecision
          ? "More than one build was assigned to the same site."
          : `${plan.productionDecisions.length} build decision(s) are legal and site-unique.`
    )
  );

  results.push(
    createDiagnosticResult(
      "production-budget",
      "Production budget",
      overspend <= state.credits.ai ? "pass" : "fail",
      overspend <= state.credits.ai
        ? `Planner spends ${overspend} of ${state.credits.ai} available credits.`
        : `Planner overspends by ${overspend - state.credits.ai} credits.`
    )
  );

  const topThreat = plan.context.threatSummary.threatenedSites[0];
  const hasDefenseGoal = topThreat
    ? plan.strategicGoals.some((goal) => goal.type === "defend-city" && goal.x === topThreat.x && goal.y === topThreat.y)
    : true;
  results.push(
    createDiagnosticResult(
      "defense-response",
      "Defense response",
      hasDefenseGoal ? "pass" : "warn",
      topThreat
        ? hasDefenseGoal
          ? `Top threatened site ${topThreat.name} has a defense goal.`
          : `Top threatened site ${topThreat.name} is not represented in the goal list.`
        : "No threatened AI sites are currently detected."
    )
  );

  const scoutGoalPresent = plan.strategicGoals.some((goal) => goal.type === "scout-unexplored");
  results.push(
    createDiagnosticResult(
      "scouting-coverage",
      "Scouting coverage",
      plan.context.unexploredTileCount > 0 && !scoutGoalPresent ? "warn" : "pass",
      plan.context.unexploredTileCount > 0
        ? scoutGoalPresent
          ? `${plan.context.unexploredTileCount} unexplored tile(s) remain and scouting is planned.`
          : `${plan.context.unexploredTileCount} unexplored tile(s) remain but no scouting goal was created.`
        : "Map is fully explored from the AI perspective."
    )
  );

  const engineerOpportunityCount = aiUnits
    .filter((unit) => unit.type === "engineer")
    .reduce((total, unit) => {
      const options = getEngineerBuildOptions(state, unit);
      return total + options.airfieldTargets.length + options.portTargets.length + options.radarTargets.length + options.bridgeTargets.length + options.tunnelTargets.length;
    }, 0);
  const engineerInQueue = plan.productionDecisions.some((decision) => decision.unitType === "engineer");
  results.push(
    createDiagnosticResult(
      "engineer-coverage",
      "Engineer coverage",
      engineerOpportunityCount > 0 || engineerInQueue ? "pass" : "warn",
      engineerOpportunityCount > 0
        ? `Engineers already have ${engineerOpportunityCount} available improvement target(s).`
        : engineerInQueue
          ? "Planner is preparing an engineer despite no current improvement action."
        : "No engineer opportunity is active and no engineer is queued."
    )
  );

  const undercoveredOperations = plan.operations.filter((operation) => {
    const assigned = plan.unitMissions.filter((mission) => mission.operationId === operation.id);
    if (operation.type === "naval-control") return assigned.length < 1;
    if (operation.requiresTransport) return assigned.length < 3;
    return assigned.length < 1;
  });
  results.push(
    createDiagnosticResult(
      "operation-coverage",
      "Operation coverage",
      undercoveredOperations.length === 0 ? "pass" : "warn",
      undercoveredOperations.length === 0
        ? `${operationIds.size} operation(s) have mission coverage.`
        : `${undercoveredOperations.length} operation(s) are light on assigned units.`
    )
  );

  const expeditionOperations = plan.operations.filter((operation) => operation.requiresTransport);
  const stagedAssaultMissions = plan.unitMissions.filter((mission) => mission.missionType === "stage-assault");
  const transportMissions = stagedAssaultMissions.filter((mission) => mission.unitType === "troop-transport");
  results.push(
    createDiagnosticResult(
      "expedition-lift",
      "Expedition lift",
      expeditionOperations.length === 0 || transportMissions.length > 0 ? "pass" : "warn",
      expeditionOperations.length === 0
        ? "No amphibious expedition is currently required."
        : transportMissions.length > 0
          ? `${transportMissions.length} transport mission(s) support ${expeditionOperations.length} expedition(s).`
          : `${expeditionOperations.length} expedition(s) are planned without transport mission coverage.`
    )
  );

  const escortOperations = plan.operations.filter((operation) => operation.requiresEscort);
  const escortMissions = plan.unitMissions.filter((mission) => mission.missionType === "escort-expedition");
  results.push(
    createDiagnosticResult(
      "escort-readiness",
      "Escort readiness",
      escortOperations.length === 0 || escortMissions.length >= escortOperations.length ? "pass" : "warn",
      escortOperations.length === 0
        ? "No escort-dependent operation is active."
        : escortMissions.length >= escortOperations.length
          ? `${escortMissions.length} escort mission(s) cover ${escortOperations.length} escort-demanding operation(s).`
          : `${escortOperations.length} escort-demanding operation(s) only have ${escortMissions.length} escort mission(s).`
      )
  );

  const missileUnits = aiUnits.filter((unit) => ["submarine", "ssbn"].includes(unit.type));
  const missileReadyUnits = missileUnits.filter((unit) => getCruiseMissileTargets(state, unit).length > 0);
  results.push(
    createDiagnosticResult(
      "missile-pressure",
      "Missile pressure",
      missileUnits.length === 0 || missileReadyUnits.length > 0 ? "pass" : "warn",
      missileUnits.length === 0
        ? "No AI missile submarines are currently afloat."
        : missileReadyUnits.length > 0
          ? `${missileReadyUnits.length} missile submarine(s) have visible launch targets.`
          : `${missileUnits.length} missile-capable submarine(s) are afloat but no visible strike targets are available.`
    )
  );

  const sonarDestroyers = aiUnits.filter((unit) => unit.type === "destroyer" && unit.sonarUpgraded);
  const knownEnemySubs = plan.context.knownEnemySubCount;
  results.push(
    createDiagnosticResult(
      "sonar-coverage",
      "Sonar coverage",
      knownEnemySubs === 0 || sonarDestroyers.length > 0 ? "pass" : "warn",
      knownEnemySubs === 0
        ? "No enemy submarine contacts are currently known."
        : sonarDestroyers.length > 0
          ? `${sonarDestroyers.length} sonar destroyer(s) are available against ${knownEnemySubs} known submarine contact(s).`
          : `${knownEnemySubs} enemy submarine contact(s) are known, but no sonar-upgraded destroyer is available.`
    )
  );

  const reloadCandidates = aiUnits.filter((unit) => {
    const quote = getAmmoReloadQuote(state, unit);
    return Boolean(quote && quote.cost > 0);
  });
  results.push(
    createDiagnosticResult(
      "ammo-readiness",
      "Ammo readiness",
      reloadCandidates.length <= 3 ? "pass" : "warn",
      reloadCandidates.length === 0
        ? "No AI strike units are currently waiting on a paid reload."
        : `${reloadCandidates.length} AI unit(s) could reload ammunition immediately at support sites.`
    )
  );

  return results;
}

export function runAiMirrorSimulation(options: Omit<AiMirrorSimulationOptions, "count" | "seedBase"> & { seed: number }) {
  let state = createInitialState(
    options.seed,
    options.width,
    options.height,
    options.gameType,
    options.playerFaction,
    options.aiFaction
  );
  let halfTurns = 0;
  const maxHalfTurns = options.turnLimit * 2;

  while (!state.winner && halfTurns < maxHalfTurns) {
    state = runBotTurnForSide(state, state.side);
    halfTurns += 1;
  }

  return {
    seed: options.seed,
    turn: state.turn,
    winner: state.winner,
    playerCities: getCityCount(state.map, "player"),
    aiCities: getCityCount(state.map, "ai"),
    playerUnits: countForces(state.units, "player"),
    aiUnits: countForces(state.units, "ai"),
    ending: state.winner ? "winner" : "turn-limit",
  } satisfies AiMirrorSimulationSummary;
}

export function runAiMirrorSimulationBatch(options: AiMirrorSimulationOptions) {
  const simulations: AiMirrorSimulationSummary[] = [];

  for (let index = 0; index < options.count; index += 1) {
    simulations.push(
      runAiMirrorSimulation({
        seed: options.seedBase + index,
        turnLimit: options.turnLimit,
        width: options.width,
        height: options.height,
        gameType: options.gameType,
        playerFaction: options.playerFaction,
        aiFaction: options.aiFaction,
      })
    );
  }

  return simulations;
}

export function createAiDiagnosticsReport(
  state: GameState,
  worldSize: Pick<WorldSizeOption, "width" | "height">,
  simulationCount = 0,
  turnLimit = 32
): AiDiagnosticsReport {
  return {
    currentStateResults: runAiDiagnosticsForState(state),
    simulations:
      simulationCount > 0
        ? runAiMirrorSimulationBatch({
            count: simulationCount,
            turnLimit,
            width: worldSize.width,
            height: worldSize.height,
            gameType: state.gameType,
            playerFaction: state.playerFaction,
            aiFaction: state.aiFaction,
            seedBase: state.seed + 1,
          })
        : [],
  };
}
