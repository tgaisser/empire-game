'use client';

import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useEmpireAudio } from "@/components/empire/audio/useEmpireAudio";
import { useEmpireGame } from "@/components/empire/hooks/useEmpireGame";
import { GameMap } from "@/components/empire/map/GameMap";
import type { BattlefieldFxEvent } from "@/components/empire/map/BattlefieldFxOverlay";
import { createBattlefieldFxEvents } from "@/components/empire/map/battlefieldFxEvents";
import { BattleLogModal } from "@/components/empire/panels/BattleLogModal";
import { BridgeConfirmModal } from "@/components/empire/panels/BridgeConfirmModal";
import { CommandPanel } from "@/components/empire/panels/CommandPanel";
import { DecommissionConfirmModal } from "@/components/empire/panels/DecommissionConfirmModal";
import { DeveloperDrawer } from "@/components/empire/panels/DeveloperDrawer";
import { EndTurnConfirmModal } from "@/components/empire/panels/EndTurnConfirmModal";
import { EndgameOverlay } from "@/components/empire/panels/EndgameOverlay";
import { FieldManualModal } from "@/components/empire/panels/FieldManualModal";
import { NamePromptModal } from "@/components/empire/panels/NamePromptModal";
import { StartGameModal } from "@/components/empire/panels/StartGameModal";
import { TileContentsModal } from "@/components/empire/panels/TileContentsModal";
import { TopCommandBar } from "@/components/empire/panels/TopCommandBar";
import { SiteIntelModal } from "@/components/empire/panels/SiteIntelModal";
import { UnitIntelModal } from "@/components/empire/panels/UnitIntelModal";
import { createAiDiagnosticsReport } from "@/lib/empire/ai/diagnostics";
import { getRemainingMove, getUnitStats, getUnitsAt, key } from "@/lib/empire/game";
import type { ManualRelatedLink } from "@/lib/empire/manual";
import { MOVEMENT_PLAYBACK_STEP_MS } from "@/lib/empire/config";
import { getFactionLeaderName } from "@/lib/empire/factions";
import { getPreferredPlayerName, isCustomPlayerName, resolvePlayerName, savePlayerProfile } from "@/lib/empire/playerProfile";
import { clearAutoSave, downloadSaveFile, getAutoSaveSummary, loadAutoSave, uploadSaveFile } from "@/lib/empire/saveLoad";
import type { DeveloperPlacementType, Faction, GameType, Side, Unit, UnitType } from "@/lib/empire/types";
import { Card, CardContent } from "@/components/ui/card";

export default function EmpireGame() {
  const { playDeployCampaign, playEndTurnConfirm, playFromLogDelta, playMovement, playTileClick, playUnitSelect } = useEmpireAudio();
  const {
    game,
    worldSizeId,
    worldSizeOptions,
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
    playerCities,
    aiCities,
    playerUnits,
    aiUnits,
    playerExploredPercent,
    aiExploredPercent,
    playerExplorationIncome,
    aiExplorationIncome,
    aiDebugPlan,
    aiDebugTacticalPreview,
    unitDefinitions,
    canUndoLastMove,
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
    handleArrowMove,
    handleUnloadSpecialOps,
    handleUpgradeSelectedUnit,
    handleUndoLastMove,
    handleSentryUnit,
    handleWakeUnit,
    handleDecommissionSelectedUnit,
    handleTileClick,
    handleEndTurn,
    selectCity,
    selectUnit,
    carrierJamTargets,
    carrierRelayAttackTargets,
    dismissMovementPlayback,
    resetGame,
    specialOpsDeploymentTargets,
    specialOpsAirStrikeTargets,
    loadGame,
  } = useEmpireGame();
  const [battleLogOpen, setBattleLogOpen] = useState(false);
  const [fieldManualOpen, setFieldManualOpen] = useState(false);
  const [devDrawerOpen, setDevDrawerOpen] = useState(false);
  const [endTurnConfirmOpen, setEndTurnConfirmOpen] = useState(false);
  const [skipEndTurnMoveWarning, setSkipEndTurnMoveWarning] = useState(false);
  const [startGameOpen, setStartGameOpen] = useState(true);
  const [startGameSource, setStartGameSource] = useState<"initial" | "menu" | "endgame">("initial");
  const [selectedGameType, setSelectedGameType] = useState<GameType>("normal");
  const [selectedPlayerFaction, setSelectedPlayerFaction] = useState<Faction>("usa");
  const [selectedAiFaction, setSelectedAiFaction] = useState<Faction>("china");
  const [selectedPlayerNameOverride, setSelectedPlayerNameOverride] = useState<string | null>(null);
  const [selectedWorldSizeId, setSelectedWorldSizeId] = useState(worldSizeId);
  const [pendingBridgeAction, setPendingBridgeAction] = useState<{ x: number; y: number } | null>(null);
  const [pendingEngineerPlacement, setPendingEngineerPlacement] = useState<"port" | "airfield" | "radar" | "tunnel" | "outpost" | "minefield" | null>(null);
  const [pendingSeaBuild, setPendingSeaBuild] = useState<UnitType | null>(null);
  const [pendingSpecialOpsDeployment, setPendingSpecialOpsDeployment] = useState(false);
  const [pendingTransportLoad, setPendingTransportLoad] = useState(false);
  const [decommissionConfirmOpen, setDecommissionConfirmOpen] = useState(false);
  const [selectedDevSide, setSelectedDevSide] = useState<Side>("player");
  const [selectedDevUnitType, setSelectedDevUnitType] = useState<UnitType>("infantry");
  const [selectedDevImprovementType, setSelectedDevImprovementType] = useState<DeveloperPlacementType>("bridge");
  const [pendingDevPlacement, setPendingDevPlacement] = useState<{ side: Side; unitType: UnitType } | null>(null);
  const [pendingDevImprovementPlacement, setPendingDevImprovementPlacement] = useState<{ side: Side; improvementType: DeveloperPlacementType } | null>(null);
  const [dismissedWinner, setDismissedWinner] = useState<Side | null>(null);
  const [intelUnitId, setIntelUnitId] = useState<number | null>(null);
  const [highlightOrderSignal, setHighlightOrderSignal] = useState(0);
  const [showUnmovedHighlights, setShowUnmovedHighlights] = useState(false);
  const [aiDiagnosticsReport, setAiDiagnosticsReport] = useState<ReturnType<typeof createAiDiagnosticsReport> | null>(null);
  const [miniMapJumpTarget, setMiniMapJumpTarget] = useState<{ x: number; y: number; nonce: number } | null>(null);
  const [tileContentsTarget, setTileContentsTarget] = useState<{ x: number; y: number } | null>(null);
  const [siteIntelTarget, setSiteIntelTarget] = useState<{ x: number; y: number } | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const unmovedCycleIndexRef = useRef(0);
  const aiPlaybackTimeoutRef = useRef<number | null>(null);
  const previousLogCountRef = useRef(game.logs.length);
  const previousGameAudioRef = useRef(game);
  const previousSelectedUnitIdRef = useRef<number | null>(game.selectedUnitId);
  const previousPlaybackKeyRef = useRef("");
  const previousTurnStateRef = useRef<{ side: Side; turn: number; winner: Side | null }>({
    side: game.side,
    turn: game.turn,
    winner: game.winner,
  });
  const [phaseBanner, setPhaseBanner] = useState<string | null>(null);
  const [tacticalViewport, setTacticalViewport] = useState({ left: 0, top: 0, width: 1, height: 1 });
  const [battlefieldFxEvents, setBattlefieldFxEvents] = useState<BattlefieldFxEvent[]>([]);
  const [fieldManualFocusLink, setFieldManualFocusLink] = useState<ManualRelatedLink | null>(null);
  const localStorageReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const preferredInitialPlayerName = useSyncExternalStore(
    () => () => {},
    () => getPreferredPlayerName("usa"),
    () => getFactionLeaderName("usa")
  );
  const selectedPlayerName = selectedPlayerNameOverride ?? preferredInitialPlayerName;
  const selectedPlayerNameIsCustom = isCustomPlayerName(selectedPlayerName, selectedPlayerFaction);
  const autoSaveSummary = localStorageReady && startGameOpen ? getAutoSaveSummary() : null;
  const showPhaseBanner = useEffectEvent((message: string) => {
    setPhaseBanner(message);
  });
  const playSelectedUnitCue = useEffectEvent((unitType: UnitType) => {
    playUnitSelect(unitType);
  });
  const endgameOpen = !!game.winner && dismissedWinner !== game.winner;
  const intelUnit = game.units.find((unit) => unit.id === intelUnitId) ?? null;
  const committedEngineerIds = new Set(
    game.map
      .flatMap((row) => row.map((tile) => tile.improvementProject))
      .filter((project) => project?.owner === "player")
      .map((project) => project!.engineerUnitId)
  );
  const unmovedUnits = game.units.filter(
    (unit) => unit.owner === "player" && getRemainingMove(unit) > 0 && !committedEngineerIds.has(unit.id)
  );
  const unmovedUnitCount = unmovedUnits.length;
  const unmovedUnitIds = new Set(unmovedUnits.map((unit) => unit.id));
  const bridgeEngineerActions = engineerActions.filter((action) => action.improvementType === "bridge");
  const transportLoadMode = pendingTransportLoad && selectedUnit?.type === "troop-transport";
  const placementTargets =
    pendingEngineerPlacement === "port"
      ? engineerPlacementTargets.port
      : pendingEngineerPlacement === "airfield"
        ? engineerPlacementTargets.airfield
        : pendingEngineerPlacement === "radar"
          ? engineerPlacementTargets.radar
        : pendingEngineerPlacement === "tunnel"
          ? engineerPlacementTargets.tunnel
        : pendingEngineerPlacement === "outpost"
          ? engineerPlacementTargets.outpost
        : pendingEngineerPlacement === "minefield"
          ? engineerPlacementTargets.minefield
          : [];
  const devPlacementTargets = pendingDevPlacement ? getDeveloperUnitPlacementTargets(pendingDevPlacement.side, pendingDevPlacement.unitType) : [];
  const devImprovementPlacementTargets = pendingDevImprovementPlacement
    ? getDeveloperImprovementTargets(pendingDevImprovementPlacement.side, pendingDevImprovementPlacement.improvementType)
    : [];
  const engineerBuildKeys = new Set([
    ...bridgeEngineerActions.map((action) => key(action.x, action.y)),
    ...placementTargets.map((tile) => key(tile.x, tile.y)),
    ...(pendingSeaBuild ? selectedSeaSpawnTiles.map((tile) => key(tile.x, tile.y)) : []),
    ...carrierJamTargets.map((tile) => key(tile.x, tile.y)),
    ...troopTransportLoadTargets.map((unit) => key(unit.x, unit.y)),
    ...troopTransportDeploymentTargets.map((tile) => key(tile.x, tile.y)),
    ...(pendingSpecialOpsDeployment ? specialOpsDeploymentTargets.map((tile) => key(tile.x, tile.y)) : []),
    ...specialOpsAirStrikeTargets.map((tile) => key(tile.x, tile.y)),
    ...devPlacementTargets.map((tile) => key(tile.x, tile.y)),
    ...devImprovementPlacementTargets.map((tile) => key(tile.x, tile.y)),
  ]);
  const activeSiteIntel = useMemo(() => {
    if (!siteIntelTarget) return null;

    const liveTile = game.map[siteIntelTarget.y]?.[siteIntelTarget.x] ?? null;
    const intelTile = effectivePlayerIntel[siteIntelTarget.y]?.[siteIntelTarget.x] ?? null;
    const visible = effectivePlayerVisible[siteIntelTarget.y]?.[siteIntelTarget.x] ?? false;
    const tile = visible ? liveTile : intelTile;

    if (!tile) return null;
    if (!tile.city && !tile.improvement && !tile.improvementProject) return null;

    const visibleUnits = visible
      ? getUnitsAt(game.units, siteIntelTarget.x, siteIntelTarget.y).filter((unit) => unit.owner !== "player")
      : [];

    return {
      tile,
      visible,
      surfaceUnits: visibleUnits.filter((unit) => getUnitStats(unit).domain !== "air"),
      airUnits: visibleUnits.filter((unit) => getUnitStats(unit).domain === "air"),
    };
  }, [effectivePlayerIntel, effectivePlayerVisible, game.map, game.units, siteIntelTarget]);

  function getClickedEnemyUnit(x: number, y: number, target?: "tile" | "site" | "surface-unit" | "air-unit") {
    const visible = effectivePlayerVisible[y]?.[x];
    if (!visible) return null;

    const tileUnits = game.units.filter((unit) => unit.x === x && unit.y === y);
    const surfaceUnit = tileUnits.find((unit) => unit.owner === "ai" && unitDefinitions[unit.type].domain !== "air") ?? null;
    const airUnit = tileUnits.find((unit) => unit.owner === "ai" && unitDefinitions[unit.type].domain === "air") ?? null;

    if (target === "air-unit") return airUnit;
    if (target === "surface-unit") return surfaceUnit;
    if (target === "site") return null;
    return surfaceUnit ?? airUnit;
  }

  function shouldOpenEnemyIntelOnClick(x: number, y: number, target?: "tile" | "site" | "surface-unit" | "air-unit") {
    const clickedEnemyUnit = getClickedEnemyUnit(x, y, target);
    if (!clickedEnemyUnit) return null;

    if (
      pendingDroneTarget ||
      pendingDevPlacement ||
      pendingDevImprovementPlacement ||
      pendingSeaBuild ||
      transportLoadMode ||
      pendingEngineerPlacement ||
      pendingSpecialOpsDeployment
    ) {
      return null;
    }

    if (possibleMoves.some((move) => move.x === x && move.y === y)) {
      return null;
    }

    if (
      selectedUnit &&
      selectedUnit.x === x &&
      selectedUnit.y === y &&
      getUnitStats(selectedUnit).attackRequiresSameTile &&
      game.units.some(
        (unit) =>
          unit.x === x &&
          unit.y === y &&
          unit.owner !== selectedUnit.owner &&
          getUnitStats(selectedUnit).attackDomains.includes(getUnitStats(unit).domain) &&
          getUnitStats(unit).cannotBeAttacked !== true
      )
    ) {
      return null;
    }

    if (selectedUnit?.type === "special-ops" && specialOpsAirStrikeTargets.some((tile) => tile.x === x && tile.y === y)) {
      return null;
    }

    if (selectedUnit?.type === "carrier" && carrierJamTargets.some((tile) => tile.x === x && tile.y === y)) {
      return null;
    }

    return clickedEnemyUnit;
  }

  function getInspectableSiteAt(x: number, y: number) {
    const liveTile = game.map[y]?.[x] ?? null;
    const intelTile = effectivePlayerIntel[y]?.[x] ?? null;
    const visible = effectivePlayerVisible[y]?.[x] ?? false;
    const displayTile = visible ? liveTile : intelTile;
    if (!displayTile) return null;

    const owner = displayTile.improvement?.owner ?? displayTile.improvementProject?.owner ?? displayTile.owner ?? null;
    const isInspectableSite = Boolean(displayTile.city || displayTile.improvement || displayTile.improvementProject);
    if (!isInspectableSite) return null;
    if (owner === "player" && visible) return null;

    return { x, y, visible, tile: displayTile };
  }

  function shouldOpenSiteIntelOnClick(x: number, y: number, target?: "tile" | "site" | "surface-unit" | "air-unit") {
    const site = getInspectableSiteAt(x, y);
    if (!site) return null;

    if (
      pendingDroneTarget ||
      pendingDevPlacement ||
      pendingDevImprovementPlacement ||
      pendingSeaBuild ||
      transportLoadMode ||
      pendingEngineerPlacement ||
      pendingSpecialOpsDeployment
    ) {
      return null;
    }

    if (target === "site") return site;

    if (possibleMoves.some((move) => move.x === x && move.y === y)) {
      return null;
    }

    if (
      selectedUnit &&
      selectedUnit.x === x &&
      selectedUnit.y === y &&
      getUnitStats(selectedUnit).attackRequiresSameTile &&
      game.units.some(
        (unit) =>
          unit.x === x &&
          unit.y === y &&
          unit.owner !== selectedUnit.owner &&
          getUnitStats(selectedUnit).attackDomains.includes(getUnitStats(unit).domain) &&
          getUnitStats(unit).cannotBeAttacked !== true
      )
    ) {
      return null;
    }

    if (selectedUnit?.type === "special-ops" && specialOpsAirStrikeTargets.some((tile) => tile.x === x && tile.y === y)) {
      return null;
    }

    if (selectedUnit?.type === "carrier" && carrierJamTargets.some((tile) => tile.x === x && tile.y === y)) {
      return null;
    }

    if (target === "tile" || target === undefined) return site;
    return null;
  }

  function handleAttemptEndTurn() {
    if (game.side !== "player" || game.winner) return;
    if (unmovedUnitCount > 0 && !skipEndTurnMoveWarning) {
      setEndTurnConfirmOpen(true);
      return;
    }
    setPendingTransportLoad(false);
    playEndTurnConfirm();
    handleEndTurn();
  }

  function handleShowUnmovedUnits() {
    if (unmovedUnitCount === 0) return;
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    setShowUnmovedHighlights(true);
    setHighlightOrderSignal((current) => current + 1);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setShowUnmovedHighlights(false);
      highlightTimeoutRef.current = null;
    }, 1600);

    // Cycle to the next unmoved unit
    const index = unmovedCycleIndexRef.current % unmovedUnits.length;
    const targetUnit = unmovedUnits[index];
    unmovedCycleIndexRef.current = index + 1;
    selectUnit(targetUnit);
    setMiniMapJumpTarget({ x: targetUnit.x, y: targetUnit.y, nonce: Date.now() });
  }

  function openStartGameModal(source: "menu" | "endgame" = "menu") {
    setStartGameSource(source);
    setStartGameOpen(true);
    setSelectedGameType(game.gameType);
    setSelectedPlayerFaction(game.playerFaction);
    setSelectedAiFaction(game.aiFaction);
    setSelectedPlayerNameOverride(game.playerName);
    setSelectedWorldSizeId(worldSizeId);
    if (source === "endgame" && game.winner) {
      setDismissedWinner(game.winner);
    }
  }

  function handlePlayerFactionChange(nextFaction: Faction) {
    const currentFactionLeader = getFactionLeaderName(selectedPlayerFaction);
    setSelectedPlayerFaction(nextFaction);
    if (!selectedPlayerNameIsCustom || selectedPlayerName.trim() === currentFactionLeader) {
      setSelectedPlayerNameOverride(getFactionLeaderName(nextFaction));
    }
  }

  function handlePlayerNameChange(value: string) {
    setSelectedPlayerNameOverride(value);
  }

  function handleResetPlayerName() {
    setSelectedPlayerNameOverride(getFactionLeaderName(selectedPlayerFaction));
  }

  function handleStartGame() {
    if (selectedPlayerFaction === selectedAiFaction) return;
    const playerName = resolvePlayerName(selectedPlayerName, selectedPlayerFaction);
    playDeployCampaign();
    clearAutoSave();
    savePlayerProfile(playerName, selectedPlayerFaction);
    resetGame(selectedGameType, selectedWorldSizeId, selectedPlayerFaction, selectedAiFaction, playerName);
    setSelectedPlayerNameOverride(playerName);
    setSkipEndTurnMoveWarning(false);
    setDismissedWinner(null);
    setAiDiagnosticsReport(null);
    setPendingTransportLoad(false);
    setStartGameOpen(false);
    setStartGameSource("menu");
  }

  function handleContinueSavedGame() {
    const saved = loadAutoSave();
    if (!saved) {
      toast.error("No saved game found.");
      return;
    }
    savePlayerProfile(saved.playerName, saved.playerFaction);
    loadGame(saved);
    setDismissedWinner(null);
    setAiDiagnosticsReport(null);
    setPendingTransportLoad(false);
    setStartGameOpen(false);
    setStartGameSource("menu");
    toast.success(`Resumed ${saved.playerName} at turn ${saved.turn}.`);
  }

  async function handleLoadSaveFile() {
    const state = await uploadSaveFile();
    if (!state) {
      toast.error("Could not load save file. Make sure it is a valid Empire save.");
      return;
    }
    savePlayerProfile(state.playerName, state.playerFaction);
    loadGame(state);
    setDismissedWinner(null);
    setAiDiagnosticsReport(null);
    setPendingTransportLoad(false);
    setStartGameOpen(false);
    setStartGameSource("menu");
    toast.success(`Loaded ${state.playerName} at turn ${state.turn}.`);
  }

  function handleSaveToFile() {
    downloadSaveFile(game);
    toast.success("Save file downloaded.");
  }

  function handleCancelStartGame() {
    setStartGameOpen(false);
    if (startGameSource === "endgame") {
      setDismissedWinner(null);
    }
  }

  function handleRunAiDiagnostics() {
    startTransition(() => {
      setAiDiagnosticsReport(createAiDiagnosticsReport(game, { width: game.mapWidth, height: game.mapHeight }));
    });
    toast.success("AI diagnostics updated.");
  }

  function handleRunAiMirrorSimulationBatch() {
    startTransition(() => {
      setAiDiagnosticsReport(createAiDiagnosticsReport(game, { width: game.mapWidth, height: game.mapHeight }, 5, 40));
    });
    toast.success("AI mirror simulations completed.");
  }

  function shouldOpenTileContentsPicker(x: number, y: number, target?: "tile" | "site" | "surface-unit" | "air-unit") {
    const clickedTile = game.map[y]?.[x] ?? null;
    if (!clickedTile) return false;

    const friendlyUnits = getUnitsAt(game.units, x, y).filter((unit) => unit.owner === "player");
    const friendlySurfaceUnits = friendlyUnits.filter((unit) => getUnitStats(unit).domain !== "air");
    const friendlyAirUnits = friendlyUnits.filter((unit) => getUnitStats(unit).domain === "air");
    const friendlySite = Boolean(
      (clickedTile.city && clickedTile.owner === "player") ||
      (clickedTile.improvement && clickedTile.improvement.owner === "player" && (clickedTile.improvement.type === "port" || clickedTile.improvement.type === "airfield"))
    );

    if (target === "site") return false;
    if (target === "surface-unit") return friendlySurfaceUnits.length > 1;
    if (target === "air-unit") return friendlyAirUnits.length > 1;

    const browsingThisTile =
      !selectedUnit ||
      (selectedUnit.x === x && selectedUnit.y === y) ||
      (selectedCity?.x === x && selectedCity?.y === y);

    return browsingThisTile && friendlyUnits.length + (friendlySite ? 1 : 0) > 1;
  }

  function handleTileContentsUnitSelect(unit: Unit) {
    setTileContentsTarget(null);
    selectUnit(unit);
  }

  function handleTileContentsSiteSelect(x: number, y: number) {
    setTileContentsTarget(null);
    selectCity(x, y);
  }

  function handleMapTileClick(x: number, y: number, target?: "tile" | "site" | "surface-unit" | "air-unit") {
    playTileClick(game.map[y]?.[x] ?? null);
    setIntelUnitId(null);
    setTileContentsTarget(null);
    setSiteIntelTarget(null);
    if (pendingDroneTarget) {
      handleSetDroneTarget(x, y);
      return;
    }

    if (pendingDevPlacement) {
      const devPlacementTile = devPlacementTargets.find((tile) => tile.x === x && tile.y === y);
      if (devPlacementTile) {
        handleAddDeveloperUnit(pendingDevPlacement.side, pendingDevPlacement.unitType, x, y);
      }
      setPendingDevPlacement(null);
      setDevDrawerOpen(true);
      return;
    }

    if (pendingDevImprovementPlacement) {
      const devImprovementTile = devImprovementPlacementTargets.find((tile) => tile.x === x && tile.y === y);
      if (devImprovementTile) {
        handleAddDeveloperImprovement(
          pendingDevImprovementPlacement.side,
          pendingDevImprovementPlacement.improvementType,
          x,
          y
        );
      }
      setPendingDevImprovementPlacement(null);
      setDevDrawerOpen(true);
      return;
    }

    if (pendingSeaBuild && target !== "site" && target !== "surface-unit" && target !== "air-unit") {
      const seaSpawnTile = selectedSeaSpawnTiles.find((tile) => tile.x === x && tile.y === y);
      if (seaSpawnTile) {
        recruitAtSelectedCity(pendingSeaBuild, x, y);
        setPendingSeaBuild(null);
        return;
      }
      setPendingSeaBuild(null);
    }

    if (transportLoadMode) {
      const loadTarget =
        target !== "site" && target !== "air-unit"
          ? troopTransportLoadTargets.find((unit) => unit.x === x && unit.y === y)
          : null;
      if (loadTarget) {
        handleTileClick(x, y, target);
      }
      setPendingTransportLoad(false);
      return;
    }

    if (pendingEngineerPlacement && target !== "site" && target !== "surface-unit" && target !== "air-unit") {
      const placementTile = placementTargets.find((tile) => tile.x === x && tile.y === y);
      if (placementTile) {
        buildWithSelectedEngineer(pendingEngineerPlacement, x, y);
        setPendingEngineerPlacement(null);
        return;
      }
      setPendingEngineerPlacement(null);
    }

    if (pendingSpecialOpsDeployment && target !== "site" && target !== "surface-unit" && target !== "air-unit") {
      const deploymentTile = specialOpsDeploymentTargets.find((tile) => tile.x === x && tile.y === y);
      if (deploymentTile) {
        handleUnloadSpecialOps(x, y);
      }
      setPendingSpecialOpsDeployment(false);
      return;
    }

    if (selectedUnit?.type === "engineer" && target !== "site" && target !== "surface-unit" && target !== "air-unit") {
      const bridgeAction = bridgeEngineerActions.find((action) => action.x === x && action.y === y);
      if (bridgeAction) {
        setPendingBridgeAction({ x, y });
        return;
      }
    }

    const clickedEnemyUnit = shouldOpenEnemyIntelOnClick(x, y, target);
    if (clickedEnemyUnit) {
      setIntelUnitId(clickedEnemyUnit.id);
      return;
    }

    const clickedSite = shouldOpenSiteIntelOnClick(x, y, target);
    if (clickedSite) {
      setSiteIntelTarget({ x: clickedSite.x, y: clickedSite.y });
      return;
    }

    if (shouldOpenTileContentsPicker(x, y, target)) {
      setTileContentsTarget({ x, y });
      return;
    }

    handleTileClick(x, y, target);
  }

  function handleMapTileRightClick(x: number, y: number, target?: "tile" | "site" | "surface-unit" | "air-unit") {
    setTileContentsTarget(null);
    const targetUnit = getClickedEnemyUnit(x, y, target);
    if (targetUnit) {
      setSiteIntelTarget(null);
      setIntelUnitId(targetUnit.id);
      return;
    }

    const targetSite = shouldOpenSiteIntelOnClick(x, y, target);
    if (targetSite) {
      setIntelUnitId(null);
      setSiteIntelTarget({ x: targetSite.x, y: targetSite.y });
    }
  }

  function handleOpenFieldManualForUnit(unit: NonNullable<typeof intelUnit>) {
    setFieldManualFocusLink({
      kind: "unit",
      id: unit.type,
      label: getUnitStats(unit).name,
    });
    setIntelUnitId(null);
    setFieldManualOpen(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        battleLogOpen ||
        fieldManualOpen ||
        devDrawerOpen ||
        endTurnConfirmOpen ||
        endgameOpen ||
        startGameOpen ||
        !!tileContentsTarget ||
        !!pendingCityRename ||
        !!pendingDroneTarget ||
        !!pendingUnitRename
      ) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      let handled = false;

      if (event.key === "ArrowUp") handled = handleArrowMove(0, -1);
      if (event.key === "ArrowDown") handled = handleArrowMove(0, 1);
      if (event.key === "ArrowLeft") handled = handleArrowMove(-1, 0);
      if (event.key === "ArrowRight") handled = handleArrowMove(1, 0);

      if (handled) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [battleLogOpen, devDrawerOpen, endTurnConfirmOpen, endgameOpen, fieldManualOpen, handleArrowMove, pendingCityRename, pendingDroneTarget, pendingUnitRename, startGameOpen, tileContentsTarget]);

  useEffect(() => {
    if (movementPlayback.length === 0) return;
    if (aiPlaybackTimeoutRef.current) {
      window.clearTimeout(aiPlaybackTimeoutRef.current);
    }
    const longestPath = Math.max(...movementPlayback.map((move) => move.path.length), 0);
    aiPlaybackTimeoutRef.current = window.setTimeout(() => {
      dismissMovementPlayback();
      aiPlaybackTimeoutRef.current = null;
    }, Math.max(220, longestPath * MOVEMENT_PLAYBACK_STEP_MS + 140));

    return () => {
      if (aiPlaybackTimeoutRef.current) {
        window.clearTimeout(aiPlaybackTimeoutRef.current);
        aiPlaybackTimeoutRef.current = null;
      }
    };
  }, [dismissMovementPlayback, movementPlayback]);

  useEffect(() => {
    if (movementPlayback.length === 0) {
      previousPlaybackKeyRef.current = "";
      return;
    }

    const playbackKey = movementPlayback
      .map((move) => `${move.owner}-${move.unitId}-${move.unitType}-${move.path.map((point) => `${point.x}:${point.y}`).join(">")}`)
      .join("|");

    if (playbackKey === previousPlaybackKeyRef.current) return;
    previousPlaybackKeyRef.current = playbackKey;
    playMovement(movementPlayback);
  }, [movementPlayback, playMovement]);

  useEffect(() => {
    const previousSelectedUnitId = previousSelectedUnitIdRef.current;
    if (selectedUnit && selectedUnit.owner === "player" && selectedUnit.id !== previousSelectedUnitId) {
      playSelectedUnitCue(selectedUnit.type);
    }
    previousSelectedUnitIdRef.current = selectedUnit?.id ?? null;
  }, [selectedUnit]);

  useEffect(() => {
    const previousLogCount = previousLogCountRef.current;
    const currentLogCount = game.logs.length;

    if (currentLogCount <= previousLogCount) {
      previousLogCountRef.current = currentLogCount;
      return;
    }

    const newMessages = game.logs.slice(previousLogCount);
    previousLogCountRef.current = currentLogCount;

    if (previousLogCount === 0 || newMessages.length > 4) return;

    for (const message of newMessages) {
      if (
        message.startsWith("Welcome, ") ||
        message.startsWith("Enemy turn.") ||
        message.startsWith("End of your turn.") ||
        message.startsWith("Turn ")
      ) {
        continue;
      }

      if (message.includes("Victory") || message.includes("Defeat")) {
        toast(message, { duration: 5000 });
        continue;
      }

      if (message.includes("captured") || message.includes("destroyed") || message.includes("detonated")) {
        toast.warning(message, { duration: 4500 });
        continue;
      }

      if (message.includes("completed") || message.includes("produced") || message.includes("installed")) {
        toast.success(message, { duration: 3600 });
        continue;
      }

      toast(message, { duration: 3200 });
    }
  }, [game.logs]);

  useEffect(() => {
    const previousGame = previousGameAudioRef.current;
    if (previousGame !== game) {
      const nextEvents = createBattlefieldFxEvents(previousGame, game);
      if (nextEvents.length > 0) {
        setBattlefieldFxEvents((current) => {
          const now = Date.now();
          return [...current.filter((event) => now - event.createdAt < event.durationMs), ...nextEvents];
        });
      }
    }
  }, [game]);

  useEffect(() => {
    const previousGame = previousGameAudioRef.current;
    if (previousGame !== game) {
      playFromLogDelta(previousGame, game);
      previousGameAudioRef.current = game;
    }
  }, [game, playFromLogDelta]);

  useEffect(() => {
    const previous = previousTurnStateRef.current;
    if (game.winner && previous.winner !== game.winner) {
      showPhaseBanner(game.winner === "player" ? "Victory Secured" : "Command Lost");
    } else if (previous.side !== game.side || previous.turn !== game.turn) {
      showPhaseBanner(game.side === "player" ? `Turn ${game.turn}: Your Command` : `Turn ${game.turn}: Enemy Phase`);
    }
    previousTurnStateRef.current = { side: game.side, turn: game.turn, winner: game.winner };
  }, [game.side, game.turn, game.winner]);

  useEffect(() => {
    if (!phaseBanner) return;
    const timeout = window.setTimeout(() => setPhaseBanner(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [phaseBanner]);

  const commandPrompts = [
    pendingDroneTarget ? "Drone target assignment active" : null,
    pendingEngineerPlacement ? `Engineer placement: ${pendingEngineerPlacement}` : null,
    pendingSeaBuild ? `Choose naval launch tile for ${pendingSeaBuild}` : null,
    pendingSpecialOpsDeployment ? "Choose special ops landing tile" : null,
    transportLoadMode ? "Choose troop to embark" : null,
    pendingDevPlacement ? `Developer placement: ${pendingDevPlacement.unitType}` : null,
    pendingDevImprovementPlacement ? `Developer placement: ${pendingDevImprovementPlacement.improvementType}` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 p-4 text-slate-100 md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.10),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.15),rgba(2,6,23,0.4))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.35)_1px,transparent_1px)] [background-size:28px_28px]" />
      {phaseBanner ? (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12 }}
          className="pointer-events-none fixed left-1/2 top-4 z-40 w-[min(92vw,40rem)] -translate-x-1/2 rounded-2xl border border-cyan-400/30 bg-slate-950/88 px-5 py-3 text-center text-sm font-semibold tracking-wide text-cyan-100 shadow-2xl backdrop-blur"
        >
          {phaseBanner}
        </motion.div>
      ) : null}
      <div className="mx-auto max-w-[1800px] space-y-4">
        {commandPrompts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {commandPrompts.map((prompt) => (
              <div key={prompt} className="command-prompt-chip rounded-full border border-amber-500/35 bg-amber-950/30 px-3 py-1 text-xs text-amber-100">
                {prompt}
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] xl:items-start">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="space-y-4">
              {pendingDroneTarget ? (
                <Card className="border-amber-500/40 bg-amber-950/35 shadow-xl rounded-3xl">
                  <CardContent className="p-4 text-sm text-amber-100">
                    Drone swarm selected. Click any map tile to assign its strike square. The swarm will begin flying there over future turns and detonate on that square whether or not a target is present.
                  </CardContent>
                </Card>
              ) : null}
              <Card className="border-slate-800 bg-slate-900/90 shadow-2xl rounded-3xl overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <GameMap
                    map={game.map}
                    playerVisible={effectivePlayerVisible}
                    playerIntel={effectivePlayerIntel}
                    units={game.units}
                    selectedUnit={selectedUnit}
                    playerFaction={game.playerFaction}
                    aiFaction={game.aiFaction}
                    selectedCity={selectedCity}
                    possibleMoves={possibleMoves}
                    highlightOrderSignal={showUnmovedHighlights ? highlightOrderSignal : 0}
                    highlightedUnitIds={unmovedUnitIds}
                    bridgeBuildKeys={engineerBuildKeys}
                    movementPlayback={movementPlayback}
                    battlefieldFxEvents={battlefieldFxEvents}
                    canInteract={game.side === "player"}
                    onViewportChange={setTacticalViewport}
                    jumpTarget={miniMapJumpTarget}
                    onTileClick={handleMapTileClick}
                    onTileRightClick={handleMapTileRightClick}
                  />
                </CardContent>
              </Card>
              <TopCommandBar
                turn={game.turn}
                side={game.side}
                winner={game.winner}
                playerCredits={game.credits.player}
                aiCredits={game.credits.ai}
                playerCities={playerCities}
                aiCities={aiCities}
                playerUnits={playerUnits}
                aiUnits={aiUnits}
                playerExploredPercent={playerExploredPercent}
                aiExploredPercent={aiExploredPercent}
                playerExplorationIncome={playerExplorationIncome}
                aiExplorationIncome={aiExplorationIncome}
                onOpenLog={() => setBattleLogOpen(true)}
                onOpenHelp={() => setFieldManualOpen(true)}
                onToggleDevDrawer={() => setDevDrawerOpen((current) => !current)}
                onReset={() => openStartGameModal("menu")}
                onSaveToFile={handleSaveToFile}
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="xl:sticky xl:top-4">
              <CommandPanel
                map={game.map}
                playerVisible={effectivePlayerVisible}
                playerIntel={effectivePlayerIntel}
                units={game.units}
                viewport={tacticalViewport}
                onMiniMapJump={({ x, y }) => setMiniMapJumpTarget({ x, y, nonce: Date.now() })}
                selectedUnit={selectedUnit}
                selectedUnitTile={selectedUnitTile}
                selectedCity={selectedCityTile}
                selectedCityOccupants={selectedCityOccupants}
                selectedSiteBuildableUnitTypes={selectedSiteBuildableUnitTypes}
                selectedSeaSpawnTileCount={selectedSeaSpawnTiles.length}
                playerCredits={game.credits.player}
                playerCities={playerCities}
                playerUnits={playerUnits}
                playerExploredPercent={playerExploredPercent}
                unmovedUnitCount={unmovedUnitCount}
                playerFaction={game.playerFaction}
                aiFaction={game.aiFaction}
                playerName={game.playerName}
                side={game.side}
                winner={game.winner}
                unitDefinitions={unitDefinitions}
                engineerActions={engineerActions}
                demolishableImprovementTargets={demolishableImprovementTargets}
                carrierRelayAttackTargetCount={carrierRelayAttackTargets.length}
                carrierJamTargetCount={carrierJamTargets.length}
                troopTransportLoadTargetCount={troopTransportLoadTargets.length}
                troopTransportDeploymentTargetCount={troopTransportDeploymentTargets.length}
                specialOpsAirStrikeTargetCount={specialOpsAirStrikeTargets.length}
                specialOpsDeploymentTargetCount={specialOpsDeploymentTargets.length}
                canSelectedBomberAttackHere={canSelectedBomberAttackHere}
                transportLoadMode={transportLoadMode}
                onBuild={(unitType) => {
                  if (unitDefinitions[unitType].domain === "sea" && selectedSeaSpawnTiles.length > 1) {
                    setPendingSeaBuild(unitType);
                    return;
                  }
                  if (unitDefinitions[unitType].domain === "sea") {
                    recruitAtSelectedCity(unitType, selectedSeaSpawnTiles[0]?.x, selectedSeaSpawnTiles[0]?.y);
                    return;
                  }
                  recruitAtSelectedCity(unitType);
                }}
                onBuildImprovement={(action) => {
                  if (action.improvementType === "bridge") {
                    buildWithSelectedEngineer(action.improvementType, action.x, action.y);
                    return;
                  }
                  setPendingEngineerPlacement(action.improvementType);
                }}
                onUpgradeUnit={handleUpgradeSelectedUnit}
                onBombsAway={handleBombSelectedUnit}
                onDemolishImprovement={handleDemolishWithSelectedUnit}
                onBeginTransportLoad={() => setPendingTransportLoad(true)}
                onLoadSpecialOps={handleLoadSpecialOps}
                onUnloadSpecialOps={() => {
                  if (selectedUnit?.type === "submarine") {
                    setPendingSpecialOpsDeployment(true);
                    return;
                  }
                  handleUnloadSpecialOps();
                }}
                onSentryUnit={handleSentryUnit}
                onWakeUnit={handleWakeUnit}
                onDecommissionUnit={() => setDecommissionConfirmOpen(true)}
                canUndoLastMove={canUndoLastMove}
                onUndoLastMove={handleUndoLastMove}
                onEndTurn={handleAttemptEndTurn}
                onShowUnmovedUnits={handleShowUnmovedUnits}
                showUnmovedHighlights={showUnmovedHighlights}
                highlightedUnitIds={unmovedUnitIds}
              />
            </div>
          </motion.div>
        </div>
      </div>

      <BattleLogModal open={battleLogOpen} logs={game.logs} onClose={() => setBattleLogOpen(false)} />
      <FieldManualModal
        open={fieldManualOpen}
        playerFaction={game.playerFaction}
        focusLink={fieldManualFocusLink}
        onFocusHandled={() => setFieldManualFocusLink(null)}
        onClose={() => {
          setFieldManualFocusLink(null);
          setFieldManualOpen(false);
        }}
      />
      <EndTurnConfirmModal
        open={endTurnConfirmOpen}
        unmovedUnitCount={unmovedUnitCount}
        suppressForGame={skipEndTurnMoveWarning}
        onCancel={() => setEndTurnConfirmOpen(false)}
        onConfirm={() => {
          setEndTurnConfirmOpen(false);
          setPendingTransportLoad(false);
          playEndTurnConfirm();
          handleEndTurn();
        }}
        onSuppressForGameChange={setSkipEndTurnMoveWarning}
      />
      <BridgeConfirmModal
        open={!!pendingBridgeAction}
        x={pendingBridgeAction?.x ?? 0}
        y={pendingBridgeAction?.y ?? 0}
        onCancel={() => setPendingBridgeAction(null)}
        onConfirm={() => {
          if (pendingBridgeAction) {
            buildWithSelectedEngineer("bridge", pendingBridgeAction.x, pendingBridgeAction.y);
          }
          setPendingBridgeAction(null);
        }}
      />
      <DecommissionConfirmModal
        open={decommissionConfirmOpen}
        unitType={selectedUnit?.type ?? null}
        unitName={selectedUnit?.name ?? null}
        onCancel={() => setDecommissionConfirmOpen(false)}
        onConfirm={() => {
          setDecommissionConfirmOpen(false);
          handleDecommissionSelectedUnit();
        }}
      />
      <DeveloperDrawer
        open={devDrawerOpen}
        playerFogEnabled={developerSettings.playerFogEnabled}
        playerInstantBuild={developerSettings.playerInstantBuild}
        selectedDevSide={selectedDevSide}
        selectedDevUnitType={selectedDevUnitType}
        selectedDevImprovementType={selectedDevImprovementType}
        pendingDevPlacement={pendingDevPlacement}
        pendingDevImprovementPlacement={pendingDevImprovementPlacement}
        aiDebugPlan={aiDebugPlan}
        aiDebugTacticalPreview={aiDebugTacticalPreview}
        aiDiagnosticsReport={aiDiagnosticsReport}
        aiDiagnosticsSummary={aiDiagnosticsReport ? {
          currentStatePasses: aiDiagnosticsReport.currentStateResults.filter((result) => result.status === "pass").length,
          currentStateWarnings: aiDiagnosticsReport.currentStateResults.filter((result) => result.status === "warn").length,
          currentStateFailures: aiDiagnosticsReport.currentStateResults.filter((result) => result.status === "fail").length,
          simulationCount: aiDiagnosticsReport.simulations.length,
          latestSimulationWinner: aiDiagnosticsReport.simulations[aiDiagnosticsReport.simulations.length - 1]?.winner ?? null,
        } : null}
        onClose={() => setDevDrawerOpen(false)}
        onTogglePlayerFog={() =>
          setDeveloperSettings((current) => ({ ...current, playerFogEnabled: !current.playerFogEnabled }))
        }
        onTogglePlayerInstantBuild={() =>
          setDeveloperSettings((current) => ({ ...current, playerInstantBuild: !current.playerInstantBuild }))
        }
        onGrantCredits={handleGrantCredits}
        onDevSideChange={setSelectedDevSide}
        onDevUnitTypeChange={setSelectedDevUnitType}
        onDevImprovementTypeChange={setSelectedDevImprovementType}
        onBeginAddUnit={() => {
          setPendingDevPlacement({ side: selectedDevSide, unitType: selectedDevUnitType });
          setPendingDevImprovementPlacement(null);
          setDevDrawerOpen(false);
        }}
        onBeginAddImprovement={() => {
          setPendingDevImprovementPlacement({ side: selectedDevSide, improvementType: selectedDevImprovementType });
          setPendingDevPlacement(null);
          setDevDrawerOpen(false);
        }}
        onCancelAddUnit={() => setPendingDevPlacement(null)}
        onCancelAddImprovement={() => setPendingDevImprovementPlacement(null)}
        onSimulateDefeat={handleSimulateDefeat}
        onSimulateVictory={handleSimulateVictory}
        onRunAiDiagnostics={handleRunAiDiagnostics}
        onRunAiMirrorSimulationBatch={handleRunAiMirrorSimulationBatch}
      />
      <EndgameOverlay
        open={endgameOpen}
        winner={game.winner}
        turn={game.turn}
        playerCities={playerCities}
        playerUnits={playerUnits}
        playerName={game.playerName}
        playerFaction={game.playerFaction}
        aiFaction={game.aiFaction}
        onClose={() => setDismissedWinner(game.winner)}
        onReset={() => {
          openStartGameModal("endgame");
        }}
      />
      <StartGameModal
        open={startGameOpen}
        canCancel={startGameSource !== "initial"}
        selectedGameType={selectedGameType}
        selectedPlayerFaction={selectedPlayerFaction}
        selectedAiFaction={selectedAiFaction}
        selectedPlayerName={selectedPlayerName}
        selectedWorldSizeId={selectedWorldSizeId}
        worldSizeOptions={worldSizeOptions}
        onChangeGameType={setSelectedGameType}
        onChangePlayerFaction={handlePlayerFactionChange}
        onChangeAiFaction={setSelectedAiFaction}
        onChangePlayerName={handlePlayerNameChange}
        onResetPlayerName={handleResetPlayerName}
        onChangeWorldSize={setSelectedWorldSizeId}
        onOpenFieldManual={() => setFieldManualOpen(true)}
        autoSaveSummary={autoSaveSummary}
        onCancel={handleCancelStartGame}
        onStart={handleStartGame}
        onContinue={handleContinueSavedGame}
        onLoadFile={handleLoadSaveFile}
      />
      <UnitIntelModal
        open={!!intelUnit}
        unit={intelUnit}
        playerFaction={game.playerFaction}
        aiFaction={game.aiFaction}
        onOpenFieldManual={handleOpenFieldManualForUnit}
        onClose={() => setIntelUnitId(null)}
      />
      <SiteIntelModal
        open={!!activeSiteIntel}
        tile={activeSiteIntel?.tile ?? null}
        visible={activeSiteIntel?.visible ?? false}
        surfaceUnits={activeSiteIntel?.surfaceUnits ?? []}
        airUnits={activeSiteIntel?.airUnits ?? []}
        playerFaction={game.playerFaction}
        aiFaction={game.aiFaction}
        onClose={() => setSiteIntelTarget(null)}
      />
      <TileContentsModal
        open={!!tileContentsTarget}
        tile={tileContentsTarget ? game.map[tileContentsTarget.y]?.[tileContentsTarget.x] ?? null : null}
        units={
          tileContentsTarget
            ? getUnitsAt(game.units, tileContentsTarget.x, tileContentsTarget.y).filter((unit) => unit.owner === "player")
            : []
        }
        playerFaction={game.playerFaction}
        onSelectSite={handleTileContentsSiteSelect}
        onSelectUnit={handleTileContentsUnitSelect}
        onClose={() => setTileContentsTarget(null)}
      />
      <NamePromptModal
        key={pendingCityRename ? `city-${pendingCityRename.x}-${pendingCityRename.y}-${pendingCityRename.oldName}` : "city-rename"}
        open={!!pendingCityRename}
        title="Rename Captured City"
        description="Your forces took the city. Confirm the new city name, or keep the old one."
        defaultValue={pendingCityRename?.defaultName ?? pendingCityRename?.oldName ?? ""}
        confirmLabel="Confirm Name"
        onConfirm={handleRenameCapturedCity}
      />
      <NamePromptModal
        key={pendingUnitRename ? `unit-${pendingUnitRename.unitId}-${pendingUnitRename.defaultName}` : "unit-rename"}
        open={!!pendingUnitRename}
        title={
          pendingUnitRename?.unitType === "submarine"
            ? "Commission New Attack Sub"
            : pendingUnitRename?.unitType === "ssbn"
              ? "Commission New Missile Sub"
            : pendingUnitRename?.unitType === "troop-transport"
              ? "Commission New Troop Transport"
            : pendingUnitRename?.unitType === "carrier"
              ? "Commission New Carrier"
              : "Commission New Ship"
        }
        description={
          pendingUnitRename?.unitType === "submarine"
            ? "Your new Attack Sub is ready. Confirm its name before it slips out on patrol."
            : pendingUnitRename?.unitType === "ssbn"
              ? "Your new Missile Sub is ready. Confirm its name before it takes station."
            : pendingUnitRename?.unitType === "troop-transport"
              ? "Your new troop transport is ready. Confirm its name before it joins the convoy."
            : pendingUnitRename?.unitType === "carrier"
              ? "Your new carrier is ready. Confirm its name before it joins the fleet."
              : "Your new ship is ready. Confirm its name before it joins the fleet."
        }
        defaultValue={pendingUnitRename?.defaultName ?? ""}
        confirmLabel="Commission Ship"
        onConfirm={handleRenameUnit}
      />
    </div>
  );
}
