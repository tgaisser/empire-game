'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import carrierNames from "@/lib/empire/data/carrier-names.json";
import destroyerNames from "@/lib/empire/data/destroyer-names.json";
import submarineNames from "@/lib/empire/data/submarine-names.json";
import troopTransportNames from "@/lib/empire/data/troop-transport-names.json";
import { getOrderedUnitDefinitions, UNIT_TYPE_ORDER } from "@/lib/empire/catalog";
import { AI_TURN_DELAY_MS, WORLD_SIZE_OPTIONS } from "@/lib/empire/config";
import { getFactionCityNames } from "@/lib/empire/factions";
import {
  addCredits,
  addDeveloperImprovement,
  addDeveloperUnit,
  applyCommand,
  getCarrierJamTargets,
  getCarrierRelayAttackTargets,
  countForces,
  createInitialState,
  forceCompleteProductionForSide,
  forceWinner,
  canProduceUnitAtTile,
  getBlockingUnitAt,
  getCityCount,
  getDemolishableImprovementTargets,
  getDroneSwarmPlaybackPreview,
  getEngineerBuildOptions,
  getExplorationIncome,
  getExploredPercent,
  getReachableMoves,
  getDeveloperPlacementTargets,
  getDeveloperImprovementPlacementTargets,
  getSeaSpawnTiles,
  getSpecialOpsDeploymentTargets,
  getSpecialOpsAirStrikeTargets,
  getUnitStats,
  getTroopTransportDeploymentTargets,
  getTroopTransportLoadTargets,
  getUnitsAt,
  key,
  renameCity,
  renameUnit,
} from "@/lib/empire/game";
import { runAiTurnWithPlayback } from "@/lib/empire/ai/engine";
import { planAiTurn } from "@/lib/empire/ai/planner";
import { evaluateUnitTacticalState } from "@/lib/empire/ai/tactics";
import type { AiTurnPlan } from "@/lib/empire/ai/planner";
import type { DeveloperPlacementType, Faction, GameState, GameType, TileImprovementType, Unit, UnitType } from "@/lib/empire/types";
import type { Side } from "@/lib/empire/types";

export type TileClickTarget = "tile" | "city" | "surface-unit" | "air-unit";
export type PendingCityRename = {
  x: number;
  y: number;
  oldName: string;
  defaultName: string;
};
export type PendingDroneTarget = {
  unitId: number;
};
export type PendingUnitRename = {
  unitId: number;
  defaultName: string;
  unitType: UnitType;
};
export type MovementPlayback = {
  unitId: number;
  unitType: UnitType;
  owner: "player" | "ai";
  path: Array<{ x: number; y: number }>;
};

export type AiDebugTacticalPreview = {
  unitId: number;
  unitType: UnitType;
  missionType: string;
  role: string;
  targetX: number;
  targetY: number;
  shouldRetreat: boolean;
  localThreat: number;
  localSupport: number;
  moveLeft: number;
};

type LastPlayerMoveSnapshot = {
  game: GameState;
};

export function useEmpireGame() {
  const defaultWorldSize = WORLD_SIZE_OPTIONS.find((option) => option.id === "large") ?? WORLD_SIZE_OPTIONS[0];
  const [worldSizeId, setWorldSizeId] = useState(defaultWorldSize.id);
  const [game, setGame] = useState<GameState>(() =>
    createInitialState(
      undefined,
      defaultWorldSize.width,
      defaultWorldSize.height,
      "normal",
      "usa",
      "asia"
    )
  );
  const [selectedCity, setSelectedCity] = useState<{ x: number; y: number } | null>(null);
  const [developerSettings, setDeveloperSettings] = useState({
    playerFogEnabled: true,
    playerInstantBuild: false,
  });
  const [movementPlayback, setMovementPlayback] = useState<MovementPlayback[]>([]);
  const [lastPlayerMoveSnapshot, setLastPlayerMoveSnapshot] = useState<LastPlayerMoveSnapshot | null>(null);
  const [pendingCityRename, setPendingCityRename] = useState<PendingCityRename | null>(null);
  const [pendingDroneTarget, setPendingDroneTarget] = useState<PendingDroneTarget | null>(null);
  const [pendingUnitRename, setPendingUnitRename] = useState<PendingUnitRename | null>(null);
  const previousGameRef = useRef(game);

  function pickRandomUnusedName(
    sourceNames: string[],
    usedNames: Set<string>,
    format: "destroyer" | "carrier" | "submarine" | "troop-transport",
    fallbackName: string
  ) {
    const availableNames = sourceNames.filter((name) =>
      format === "destroyer"
        ? !usedNames.has(`The ${name}`) && !usedNames.has(name)
        : !usedNames.has(`USS ${name}`) && !usedNames.has(name)
    );

    const candidatePool = availableNames.length > 0 ? availableNames : sourceNames;
    const chosen = candidatePool[Math.floor(Math.random() * Math.max(1, candidatePool.length))] ?? fallbackName;
    return format === "destroyer" ? `The ${chosen}` : `USS ${chosen}`;
  }

  function pickRandomUnusedCityName(sourceNames: string[], usedNames: Set<string>, fallbackName: string) {
    const availableNames = sourceNames.filter((name) => !usedNames.has(name));
    const candidatePool = availableNames.length > 0 ? availableNames : sourceNames;
    return candidatePool[Math.floor(Math.random() * Math.max(1, candidatePool.length))] ?? fallbackName;
  }

  const selectedUnit = useMemo(
    () => game.units.find((unit) => unit.id === game.selectedUnitId) ?? null,
    [game.units, game.selectedUnitId]
  );

  const possibleMoves = useMemo(
    () => getReachableMoves(game, selectedUnit),
    [game, selectedUnit]
  );

  const possibleMoveKeys = useMemo(
    () => new Set(possibleMoves.map((move) => key(move.x, move.y))),
    [possibleMoves]
  );

  const aiDebugPlan = useMemo<AiTurnPlan>(() => planAiTurn(game), [game]);

  const aiDebugTacticalPreview = useMemo<AiDebugTacticalPreview[]>(
    () =>
      aiDebugPlan.unitMissions.slice(0, 10).flatMap((mission) => {
        const unit = game.units.find((candidate) => candidate.id === mission.unitId);
        if (!unit) return [];
        const tacticalState = evaluateUnitTacticalState(unit, mission, game);
        return [
          {
            unitId: unit.id,
            unitType: unit.type,
            missionType: mission.missionType,
            role: mission.role,
            targetX: mission.targetX,
            targetY: mission.targetY,
            shouldRetreat: tacticalState.shouldRetreat,
            localThreat: tacticalState.localThreat,
            localSupport: tacticalState.localSupport,
            moveLeft: tacticalState.moveLeft,
          },
        ];
      }),
    [aiDebugPlan, game]
  );

  useEffect(() => {
    if (game.side !== "ai" || game.winner) return;

    const timer = window.setTimeout(() => {
      setGame((current) => {
        const aiTurnResult = runAiTurnWithPlayback(current);
        setMovementPlayback(
          aiTurnResult.visibleMoves.map((move) => ({
            unitId: move.unitId,
            unitType: move.unitType,
            owner: "ai",
            path: move.path,
          }))
        );
        return aiTurnResult.state;
      });
    }, AI_TURN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [game.side, game.winner]);

  useEffect(() => {
    const previousGame = previousGameRef.current;

    if (previousGame !== game) {
      for (const row of game.map) {
        for (const tile of row) {
          const previousTile = previousGame.map[tile.y]?.[tile.x];
          if (!previousTile?.city) continue;
          if (previousTile.owner !== "player" && tile.owner === "player" && !game.winner) {
            const sourceNames = getFactionCityNames(game.playerFaction);
            const usedNames = new Set(
              game.map
                .flat()
                .filter((currentTile) => currentTile.city && currentTile.owner === "player" && currentTile.cityName)
                .map((currentTile) => currentTile.cityName)
                .filter((name): name is string => Boolean(name) && name !== tile.cityName)
            );
            setPendingCityRename({
              x: tile.x,
              y: tile.y,
              oldName: tile.cityName ?? previousTile.cityName ?? `City ${tile.x + 1}-${tile.y + 1}`,
              defaultName: pickRandomUnusedCityName(
                sourceNames,
                usedNames,
                tile.cityName ?? previousTile.cityName ?? `City ${tile.x + 1}-${tile.y + 1}`
              ),
            });
          }
        }
      }

      const previousUnitIds = new Set(previousGame.units.map((unit) => unit.id));
      for (const unit of game.units) {
        if (previousUnitIds.has(unit.id)) continue;
        if (unit.owner === "player" && !unit.name && ["destroyer", "carrier", "submarine", "troop-transport"].includes(unit.type)) {
          const sourceNames =
            unit.type === "carrier"
              ? carrierNames
              : unit.type === "submarine"
                ? submarineNames
                : unit.type === "troop-transport"
                  ? troopTransportNames
                  : destroyerNames;
          const usedNames = new Set(
            game.units
              .filter((currentUnit) => currentUnit.owner === "player" && currentUnit.type === unit.type && currentUnit.name)
              .map((currentUnit) => currentUnit.name)
              .filter((name): name is string => Boolean(name))
          );
          const fallbackName =
            unit.type === "carrier"
              ? "Enterprise"
              : unit.type === "submarine"
                ? "Tang"
                : unit.type === "troop-transport"
                  ? "Bayfield"
                  : "Arleigh Burke";
          setPendingUnitRename({
            unitId: unit.id,
            defaultName: pickRandomUnusedName(
              sourceNames,
              usedNames,
              unit.type === "carrier"
                ? "carrier"
                : unit.type === "submarine"
                  ? "submarine"
                  : unit.type === "troop-transport"
                    ? "troop-transport"
                    : "destroyer",
              fallbackName
            ),
            unitType: unit.type,
          });
          break;
        }
      }
    }

    previousGameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (!pendingDroneTarget) return;
    const liveDrone = game.units.find((unit) => unit.id === pendingDroneTarget.unitId);
    if (liveDrone && liveDrone.owner === "player" && liveDrone.type === "drone-swarm" && liveDrone.droneTargetX === null && liveDrone.droneTargetY === null) {
      return;
    }
    setPendingDroneTarget(null);
  }, [game.units, pendingDroneTarget]);

  const effectivePlayerVisible = useMemo(() => {
    if (game.winner) return game.map.map((row) => row.map(() => true));
    if (developerSettings.playerFogEnabled) return game.playerVisible;
    return game.map.map((row) => row.map(() => true));
  }, [developerSettings.playerFogEnabled, game.map, game.playerVisible, game.winner]);

  const effectivePlayerIntel = useMemo(() => {
    if (game.winner) return game.map.map((row) => row.map((tile) => ({ ...tile })));
    if (developerSettings.playerFogEnabled) return game.playerIntel;
    return game.map.map((row) => row.map((tile) => ({ ...tile })));
  }, [developerSettings.playerFogEnabled, game.map, game.playerIntel, game.winner]);

  const selectedCityTile = useMemo(() => {
    if (!selectedCity) return null;
    return game.map[selectedCity.y]?.[selectedCity.x] ?? null;
  }, [game.map, selectedCity]);

  const selectedUnitTile = useMemo(() => {
    if (!selectedUnit) return null;
    return game.map[selectedUnit.y]?.[selectedUnit.x] ?? null;
  }, [game.map, selectedUnit]);

  const selectedCityOccupants = useMemo(() => {
    if (!selectedCity) return null;
    const surface = getBlockingUnitAt(game.units, selectedCity.x, selectedCity.y, "land");
    const air = getBlockingUnitAt(game.units, selectedCity.x, selectedCity.y, "air");
    return { surface, air };
  }, [game.units, selectedCity]);

  const selectedSiteBuildableUnitTypes = useMemo(() => {
    if (!selectedCityTile) return new Set<UnitType>();
    return new Set(
      UNIT_TYPE_ORDER.filter((unitType) =>
        canProduceUnitAtTile(game, selectedCityTile, "player", unitType)
      )
    );
  }, [game, selectedCityTile]);

  const selectedSeaSpawnTiles = useMemo(() => {
    if (!selectedCityTile) return [];
    return getSeaSpawnTiles(game, selectedCityTile);
  }, [game, selectedCityTile]);

  function getDeveloperUnitPlacementTargets(side: Side, unitType: UnitType) {
    return getDeveloperPlacementTargets(game, side, unitType);
  }

  function getDeveloperImprovementTargets(side: Side, improvementType: DeveloperPlacementType) {
    return getDeveloperImprovementPlacementTargets(game, side, improvementType);
  }

  function isSelectableProductionSite(x: number, y: number) {
    const tile = game.map[y]?.[x];
    if (!tile) return false;
    if (tile.city && tile.owner === "player") return true;
    return Boolean(
      tile.improvement &&
        tile.improvement.owner === "player" &&
        (tile.improvement.type === "port" || tile.improvement.type === "airfield")
    );
  }

  const engineerActions = useMemo(() => {
    const options = getEngineerBuildOptions(game, selectedUnit);
    const actions: Array<{ improvementType: TileImprovementType; x: number; y: number; label: string }> = [];

    if (options.portTargets.length > 0 && selectedUnit) {
      actions.push({
        improvementType: "port" as const,
        x: selectedUnit.x,
        y: selectedUnit.y,
        label: "Choose port site",
      });
    }

    if (options.airfieldTargets.length > 0 && selectedUnit) {
      actions.push({
        improvementType: "airfield" as const,
        x: selectedUnit.x,
        y: selectedUnit.y,
        label: "Choose airfield site",
      });
    }

    if (options.radarTargets.length > 0 && selectedUnit) {
      actions.push({
        improvementType: "radar" as const,
        x: selectedUnit.x,
        y: selectedUnit.y,
        label: "Choose radar upgrade site",
      });
    }

    if (options.tunnelTargets.length > 0 && selectedUnit) {
      actions.push({
        improvementType: "tunnel" as const,
        x: selectedUnit.x,
        y: selectedUnit.y,
        label: "Choose tunnel site",
      });
    }

    if (options.outpostTargets.length > 0 && selectedUnit) {
      actions.push({
        improvementType: "outpost" as const,
        x: selectedUnit.x,
        y: selectedUnit.y,
        label: "Choose outpost site",
      });
    }

    for (const tile of options.bridgeTargets) {
      actions.push({
        improvementType: "bridge" as const,
        x: tile.x,
        y: tile.y,
        label: `Span bridge to (${tile.x + 1}, ${tile.y + 1})`,
      });
    }

    return actions;
  }, [game, selectedUnit]);

  const engineerPlacementTargets = useMemo(() => {
    const options = getEngineerBuildOptions(game, selectedUnit);
    return {
      port: options.portTargets,
      airfield: options.airfieldTargets,
      radar: options.radarTargets,
      tunnel: options.tunnelTargets,
      outpost: options.outpostTargets,
      bridge: options.bridgeTargets,
    };
  }, [game, selectedUnit]);
  const demolishableImprovementTargets = useMemo(
    () => getDemolishableImprovementTargets(game, selectedUnit),
    [game, selectedUnit]
  );

  const troopTransportLoadTargets = useMemo(() => getTroopTransportLoadTargets(game, selectedUnit), [game, selectedUnit]);
  const troopTransportDeploymentTargets = useMemo(() => getTroopTransportDeploymentTargets(game, selectedUnit), [game, selectedUnit]);
  const canSelectedBomberAttackHere = useMemo(() => {
    if (!selectedUnit || selectedUnit.type !== "bomber") return false;
    if ((selectedUnit.bombsRemaining ?? getUnitStats(selectedUnit).bombCapacity ?? 0) <= 0) return false;
    return getUnitsAt(game.units, selectedUnit.x, selectedUnit.y).some(
      (unit) =>
        unit.owner !== selectedUnit.owner &&
        getUnitStats(selectedUnit).attackDomains.includes(getUnitStats(unit).domain) &&
        getUnitStats(unit).cannotBeAttacked !== true
    );
  }, [game.units, selectedUnit]);

  function resetGame(
    nextGameType: GameType = game.gameType,
    nextWorldSizeId: string = worldSizeId,
    nextPlayerFaction: Faction = game.playerFaction,
    nextAiFaction: Faction = game.aiFaction
  ) {
    const worldSize = WORLD_SIZE_OPTIONS.find((option) => option.id === nextWorldSizeId) ?? defaultWorldSize;
    setWorldSizeId(worldSize.id);
    setGame(
      createInitialState(
        Math.floor(Math.random() * 9999) + 1,
        worldSize.width,
        worldSize.height,
        nextGameType,
        nextPlayerFaction,
        nextAiFaction
      )
    );
    setLastPlayerMoveSnapshot(null);
    setSelectedCity(null);
  }

  function applyGameUpdate(updater: (current: GameState) => GameState, options?: { captureLastPlayerMove?: boolean }) {
    setGame((current) => {
      setLastPlayerMoveSnapshot(options?.captureLastPlayerMove ? { game: current } : null);
      return updater(current);
    });
  }

  function selectUnit(unit: Unit) {
    if (game.side !== "player" || game.winner) return;
    if (unit.owner !== "player") return;
    setSelectedCity(null);
    if (unit.type === "drone-swarm" && unit.droneTargetX === null && unit.droneTargetY === null) {
      setPendingDroneTarget({ unitId: unit.id });
    } else {
      setPendingDroneTarget(null);
    }
    setGame((current) => applyCommand(current, { type: "select_unit", unitId: unit.id }));
  }

  function selectCity(x: number, y: number) {
    setPendingDroneTarget(null);
    setSelectedCity({ x, y });
    setGame((current) => ({ ...current, selectedUnitId: null }));
  }

  function recruitAtSelectedCity(unitType: UnitType, spawnX?: number, spawnY?: number) {
    if (!selectedCity) return;
    applyGameUpdate((current) => {
      let nextState = applyCommand(current, {
        type: "recruit_unit",
        side: "player",
        unitType,
        x: selectedCity.x,
        y: selectedCity.y,
        spawnX,
        spawnY,
      });
      if (developerSettings.playerInstantBuild) {
        nextState = forceCompleteProductionForSide(nextState, "player");
      }
      return nextState;
    });
  }

  function buildWithSelectedEngineer(improvementType: TileImprovementType, x: number, y: number) {
    if (!selectedUnit) return;
    setSelectedCity(null);
    applyGameUpdate((current) =>
      applyCommand(current, { type: "build_improvement", side: "player", unitId: selectedUnit.id, improvementType, x, y })
    );
  }

  function handleTileClick(x: number, y: number, target: TileClickTarget = "tile") {
    if (game.side !== "player" || game.winner) return;
    if (!effectivePlayerVisible[y]?.[x]) return;

    const clickedTile = game.map[y][x];
    const clickedUnits = getUnitsAt(game.units, x, y);
    const surfaceUnit =
      clickedUnits.find((unit) => unit.owner === "player" && getUnitStats(unit).domain !== "air") ?? null;
    const airUnit =
      clickedUnits.find((unit) => unit.owner === "player" && getUnitStats(unit).domain === "air") ?? null;
    const selectedUnitStats = selectedUnit ? getUnitStats(selectedUnit) : null;

    function commitSelectedUnitMove() {
      if (!selectedUnit) return;
      const chosenMove = possibleMoves.find((move) => move.x === x && move.y === y);
      if (!chosenMove) return;
      setSelectedCity(null);
      setMovementPlayback([
        {
          unitId: selectedUnit.id,
          unitType: selectedUnit.type,
          owner: "player",
          path: [{ x: selectedUnit.x, y: selectedUnit.y }, ...chosenMove.path],
        },
      ]);
      applyGameUpdate((current) =>
        applyCommand(current, { type: "move_unit", side: "player", unitId: selectedUnit.id, x, y })
      , { captureLastPlayerMove: true });
    }

    const selectedAirCanLandHere = Boolean(
      selectedUnit &&
        selectedUnit.owner === "player" &&
        selectedUnitStats?.domain === "air" &&
        possibleMoveKeys.has(key(x, y)) &&
        (
          (target === "city" && clickedTile.city && clickedTile.owner === "player") ||
          ((target === "surface-unit" || target === "tile") && surfaceUnit?.owner === "player" && surfaceUnit.type === "carrier")
        )
    );

    if (
      selectedUnit &&
      selectedUnit.x === x &&
      selectedUnit.y === y &&
      getUnitStats(selectedUnit).attackRequiresSameTile
    ) {
      const attackableEnemy = clickedUnits.find(
        (unit) => unit.owner !== "player" && getUnitStats(selectedUnit).attackDomains.includes(getUnitStats(unit).domain)
      );
      if (attackableEnemy) {
        setSelectedCity(null);
        applyGameUpdate((current) =>
          applyCommand(current, { type: "attack_tile", side: "player", unitId: selectedUnit.id, x, y })
        );
        return;
      }
    }

    if (
      selectedUnit &&
      selectedUnit.type === "special-ops" &&
      getSpecialOpsAirStrikeTargets(game, selectedUnit).some((tile) => tile.x === x && tile.y === y)
    ) {
      setSelectedCity(null);
      applyGameUpdate((current) =>
        applyCommand(current, { type: "special_ops_airstrike", side: "player", unitId: selectedUnit.id, x, y })
      );
      return;
    }

    if (
      selectedUnit &&
      selectedUnit.type === "carrier" &&
      getCarrierJamTargets(game, selectedUnit).some((tile) => tile.x === x && tile.y === y)
    ) {
      setSelectedCity(null);
      applyGameUpdate((current) =>
        applyCommand(current, { type: "jam_drone", side: "player", unitId: selectedUnit.id, x, y })
      );
      return;
    }

    if (selectedUnit?.type === "troop-transport") {
      const loadTarget =
        (target === "surface-unit" || target === "tile")
          ? troopTransportLoadTargets.find((unit) => unit.id === surfaceUnit?.id)
          : undefined;

      if (loadTarget) {
        setSelectedCity(null);
        applyGameUpdate((current) =>
          applyCommand(current, {
            type: "load_transport_troop",
            side: "player",
            transportUnitId: selectedUnit.id,
            troopUnitId: loadTarget.id,
          })
        );
        return;
      }

      if (troopTransportDeploymentTargets.some((tile) => tile.x === x && tile.y === y) && target !== "surface-unit" && target !== "air-unit") {
        setSelectedCity(null);
        applyGameUpdate((current) =>
          applyCommand(current, {
            type: "unload_transport_troop",
            side: "player",
            transportUnitId: selectedUnit.id,
            x,
            y,
          })
        );
        return;
      }
    }

    if (selectedAirCanLandHere) {
      commitSelectedUnitMove();
      return;
    }

    if (target === "surface-unit" && surfaceUnit) {
      selectUnit(surfaceUnit);
      return;
    }

    if (target === "air-unit" && airUnit) {
      selectUnit(airUnit);
      return;
    }

    if (target === "city" && clickedTile.city && clickedTile.owner === "player") {
      selectCity(x, y);
      return;
    }

    const clickedUnit = surfaceUnit ?? airUnit;
    if (clickedUnit && target === "tile") {
      selectUnit(clickedUnit);
      return;
    }

    if (!selectedUnit) {
      if (isSelectableProductionSite(x, y)) {
        selectCity(x, y);
      } else {
        setSelectedCity(null);
      }
      return;
    }

    if (isSelectableProductionSite(x, y) && !possibleMoveKeys.has(key(x, y))) {
      selectCity(x, y);
      return;
    }

    if (!possibleMoveKeys.has(key(x, y))) return;
    commitSelectedUnitMove();
  }

  function handleEndTurn() {
    if (game.side !== "player" || game.winner) return;
    setPendingDroneTarget(null);
    setSelectedCity(null);
    const dronePlaybackPreview = getDroneSwarmPlaybackPreview(game, "player");
    setMovementPlayback(dronePlaybackPreview);
    applyGameUpdate((current) => applyCommand(current, { type: "end_turn", side: "player" }));
  }

  function handleDecommissionSelectedUnit() {
    if (game.side !== "player" || game.winner || !selectedUnit) return;
    setSelectedCity(null);
    setMovementPlayback([]);
    applyGameUpdate((current) =>
      applyCommand(current, { type: "decommission_unit", side: "player", unitId: selectedUnit.id })
    );
  }

  function handleArrowMove(dx: number, dy: number) {
    if (game.side !== "player" || game.winner) return false;
    if (!selectedUnit) return false;

    const targetX = selectedUnit.x + dx;
    const targetY = selectedUnit.y + dy;
    const move = possibleMoves.find((candidate) => candidate.x === targetX && candidate.y === targetY);
    if (!move) return false;

    setSelectedCity(null);
    setMovementPlayback([
      {
        unitId: selectedUnit.id,
        unitType: selectedUnit.type,
        owner: "player",
        path: [{ x: selectedUnit.x, y: selectedUnit.y }, ...move.path],
      },
    ]);
    applyGameUpdate((current) =>
      applyCommand(current, { type: "move_unit", side: "player", unitId: selectedUnit.id, x: targetX, y: targetY })
    , { captureLastPlayerMove: true });
    return true;
  }

  function handleSimulateVictory() {
    applyGameUpdate((current) => forceWinner(current, "player"));
  }

  function handleSimulateDefeat() {
    applyGameUpdate((current) => forceWinner(current, "ai"));
  }

  function handleGrantCredits() {
    applyGameUpdate((current) => addCredits(current, "player", 33));
  }

  function handleUpgradeSelectedUnit(upgrade: "sonar" | "radar-relay") {
    if (!selectedUnit || game.side !== "player" || game.winner) return;
    applyGameUpdate((current) => applyCommand(current, { type: "upgrade_unit", side: "player", unitId: selectedUnit.id, upgrade }));
  }

  function handleLoadSpecialOps() {
    if (!selectedUnit || !["apache", "submarine"].includes(selectedUnit.type)) return;
    const specialOps =
      selectedUnit.type === "apache"
        ? game.units.find(
            (unit) => unit.owner === "player" && unit.type === "special-ops"
          )
        : game.units.find(
            (unit) =>
              unit.owner === "player" &&
              unit.type === "special-ops" &&
              Math.abs(unit.x - selectedUnit.x) + Math.abs(unit.y - selectedUnit.y) === 1
          );
    if (!specialOps) return;
    applyGameUpdate((current) =>
      applyCommand(current, {
        type: "load_special_ops",
        side: "player",
        carrierUnitId: selectedUnit.id,
        specialOpsUnitId: specialOps.id,
      })
    );
  }

  function handleUnloadSpecialOps(x?: number, y?: number) {
    if (!selectedUnit || !["apache", "submarine"].includes(selectedUnit.type)) return;
    applyGameUpdate((current) =>
      applyCommand(current, { type: "unload_special_ops", side: "player", carrierUnitId: selectedUnit.id, x, y })
    );
  }

  function handleAddDeveloperUnit(side: Side, unitType: UnitType, x: number, y: number) {
    applyGameUpdate((current) => addDeveloperUnit(current, side, unitType, x, y));
  }

  function handleAddDeveloperImprovement(side: Side, improvementType: DeveloperPlacementType, x: number, y: number) {
    const validTarget = getDeveloperImprovementTargets(side, improvementType).some((tile) => tile.x === x && tile.y === y);
    if (!validTarget) return;

    const shouldSelectProductionSite =
      side === "player" && (improvementType === "city" || improvementType === "port" || improvementType === "airfield");

    if (shouldSelectProductionSite) {
      setPendingDroneTarget(null);
      setSelectedCity({ x, y });
      applyGameUpdate((current) => {
        const nextState = addDeveloperImprovement(current, side, improvementType, x, y);
        return { ...nextState, selectedUnitId: null };
      });
      return;
    }

    applyGameUpdate((current) => addDeveloperImprovement(current, side, improvementType, x, y));
  }

  function handleRenameCapturedCity(name: string) {
    if (!pendingCityRename) return;
    applyGameUpdate((current) => renameCity(current, pendingCityRename.x, pendingCityRename.y, name));
    setPendingCityRename(null);
  }

  function handleRenameUnit(name: string) {
    if (!pendingUnitRename) return;
    applyGameUpdate((current) => renameUnit(current, pendingUnitRename.unitId, name));
    setPendingUnitRename(null);
  }

  function handleSetDroneTarget(x: number, y: number) {
    if (!pendingDroneTarget) return;
    const liveDrone = game.units.find((unit) => unit.id === pendingDroneTarget.unitId);
    if (liveDrone && liveDrone.x === x && liveDrone.y === y) {
      return;
    }
    setSelectedCity(null);
    applyGameUpdate((current) =>
      applyCommand(current, { type: "set_drone_target", side: "player", unitId: pendingDroneTarget.unitId, x, y })
    );
    setPendingDroneTarget(null);
  }

  function handleBombSelectedUnit() {
    if (!selectedUnit || selectedUnit.type !== "bomber") return;
    if ((selectedUnit.bombsRemaining ?? getUnitStats(selectedUnit).bombCapacity ?? 0) <= 0) return;
    setSelectedCity(null);
    applyGameUpdate((current) =>
      applyCommand(current, {
        type: "attack_tile",
        side: "player",
        unitId: selectedUnit.id,
        x: selectedUnit.x,
        y: selectedUnit.y,
      })
    );
  }

  function handleDemolishWithSelectedUnit(x?: number, y?: number) {
    if (!selectedUnit) return;
    const target = x !== undefined && y !== undefined ? { x, y } : demolishableImprovementTargets[0];
    if (!target) return;
    setSelectedCity(null);
    applyGameUpdate((current) =>
      applyCommand(current, {
        type: "demolish_improvement",
        side: "player",
        unitId: selectedUnit.id,
        x: target.x,
        y: target.y,
      })
    );
  }

  function handleUndoLastMove() {
    if (game.side !== "player" || game.winner || !lastPlayerMoveSnapshot) return;
    setPendingDroneTarget(null);
    setSelectedCity(null);
    setMovementPlayback([]);
    setGame(lastPlayerMoveSnapshot.game);
    setLastPlayerMoveSnapshot(null);
  }

  function dismissMovementPlayback() {
    setMovementPlayback([]);
  }

  return {
    game,
    worldSizeId,
    worldSizeOptions: WORLD_SIZE_OPTIONS,
    developerSettings,
    movementPlayback,
    effectivePlayerVisible,
    effectivePlayerIntel,
    pendingCityRename,
    pendingDroneTarget,
    pendingUnitRename,
    selectedUnit,
    selectedUnitTile,
    selectedCity,
    selectedCityTile,
    selectedCityOccupants,
    selectedSiteBuildableUnitTypes,
    selectedSeaSpawnTiles,
    engineerActions,
    engineerPlacementTargets,
    demolishableImprovementTargets,
    troopTransportLoadTargets,
    troopTransportDeploymentTargets,
    canSelectedBomberAttackHere,
    possibleMoves,
    playerCities: getCityCount(game.map, "player"),
    aiCities: getCityCount(game.map, "ai"),
    playerUnits: countForces(game.units, "player"),
    aiUnits: countForces(game.units, "ai"),
    playerExploredPercent: getExploredPercent(game, "player"),
    aiExploredPercent: getExploredPercent(game, "ai"),
    playerExplorationIncome: getExplorationIncome(game, "player"),
    aiExplorationIncome: getExplorationIncome(game, "ai"),
    aiDebugPlan,
    aiDebugTacticalPreview,
    unitDefinitions: getOrderedUnitDefinitions(),
    canUndoLastMove: game.side === "player" && !game.winner && !!lastPlayerMoveSnapshot,
    setWorldSizeId,
    setDeveloperSettings,
    recruitAtSelectedCity,
    buildWithSelectedEngineer,
    getDeveloperImprovementTargets,
    getDeveloperUnitPlacementTargets,
    handleAddDeveloperImprovement,
    handleAddDeveloperUnit,
    handleGrantCredits,
    handleLoadSpecialOps,
    handleBombSelectedUnit,
    handleDemolishWithSelectedUnit,
    handleRenameCapturedCity,
    handleSetDroneTarget,
    handleRenameUnit,
    handleSimulateDefeat,
    handleSimulateVictory,
    handleUnloadSpecialOps,
    handleUpgradeSelectedUnit,
    handleUndoLastMove,
    dismissMovementPlayback,
    handleArrowMove,
    handleDecommissionSelectedUnit,
    handleTileClick,
    handleEndTurn,
    selectUnit,
    carrierJamTargets: getCarrierJamTargets(game, selectedUnit),
    carrierRelayAttackTargets: getCarrierRelayAttackTargets(game, selectedUnit),
    specialOpsDeploymentTargets: getSpecialOpsDeploymentTargets(game, selectedUnit),
    specialOpsAirStrikeTargets: getSpecialOpsAirStrikeTargets(game, selectedUnit),
    resetGame,
  };
}
