'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { TileClickTarget } from "@/components/empire/hooks/useEmpireGame";
import type { MovementPlayback } from "@/components/empire/hooks/useEmpireGame";
import { MOVEMENT_PLAYBACK_STEP_MS } from "@/lib/empire/config";
import { getUnitsAt, key } from "@/lib/empire/game";
import { getSideDisplayOption } from "@/lib/empire/factions";
import type { Faction, ReachableMove, Tile, Unit } from "@/lib/empire/types";
import { BattlefieldFxOverlay, type BattlefieldFxEvent } from "@/components/empire/map/BattlefieldFxOverlay";
import { MapTile } from "@/components/empire/map/MapTile";
import { getSideUnitBadgeClass, getSideUnitBadgeStyle, getSideUnitIconClass } from "@/components/empire/shared/domainStyles";
import { UnitTypeIcon } from "@/components/empire/shared/UnitTypeIcon";
import { Button } from "@/components/ui/button";

type GameMapProps = {
  map: Tile[][];
  playerVisible: boolean[][];
  playerIntel: (Tile | null)[][];
  units: Unit[];
  selectedUnit: Unit | null;
  playerFaction: Faction;
  aiFaction: Faction;
  selectedCity: { x: number; y: number } | null;
  possibleMoves: ReachableMove[];
  highlightOrderSignal: number;
  highlightedUnitIds: Set<number>;
  bridgeBuildKeys?: Set<string>;
  movementPlayback?: MovementPlayback[];
  battlefieldFxEvents?: BattlefieldFxEvent[];
  canInteract: boolean;
  onViewportChange?: (viewport: { left: number; top: number; width: number; height: number }) => void;
  jumpTarget?: { x: number; y: number; nonce: number } | null;
  onTileClick: (x: number, y: number, target?: TileClickTarget) => void;
  onTileRightClick?: (x: number, y: number, target?: TileClickTarget) => void;
};

const DEFAULT_TACTICAL_ZOOM = 1;
const MAX_TACTICAL_ZOOM = 1.8;
const TACTICAL_ZOOM_STEP = 0.2;
const BASE_TILE_SIZE = 42;
const TILE_GAP = 4;
const DRAG_PAN_THRESHOLD = 6;

function getBridgeOrientation(map: Tile[][], tile: Tile) {
  const improvementType = tile.improvement?.type ?? tile.improvementProject?.type ?? null;
  if (improvementType !== "bridge") return null;

  const width = map[0]?.length ?? 0;
  const height = map.length;
  const leftLand = tile.x - 1 >= 0 && map[tile.y][tile.x - 1].terrain !== "water";
  const rightLand = tile.x + 1 < width && map[tile.y][tile.x + 1].terrain !== "water";
  const upLand = tile.y - 1 >= 0 && map[tile.y - 1][tile.x].terrain !== "water";
  const downLand = tile.y + 1 < height && map[tile.y + 1][tile.x].terrain !== "water";

  if (leftLand && rightLand) return "horizontal" as const;
  if (upLand && downLand) return "vertical" as const;
  return leftLand || rightLand ? ("horizontal" as const) : ("vertical" as const);
}

function getPlaybackDomain(unitType: MovementPlayback["unitType"]) {
  if (unitType === "destroyer" || unitType === "troop-transport" || unitType === "carrier" || unitType === "submarine") return "sea" as const;
  if (unitType === "apache" || unitType === "fighter" || unitType === "bomber" || unitType === "drone-swarm") {
    return "air" as const;
  }
  return "land" as const;
}

function getPlaybackPercent(point: { x: number; y: number }, mapWidth: number, mapHeight: number) {
  return {
    left: ((point.x + 0.5) / mapWidth) * 100,
    top: ((point.y + 0.5) / mapHeight) * 100,
  };
}

function getPlaybackTrailSegments(path: Array<{ x: number; y: number }>, stepIndex: number, mapWidth: number, mapHeight: number) {
  return path.slice(0, stepIndex + 1).slice(1).flatMap((trailPoint, index) => {
    const previousPoint = path[index];
    if (!previousPoint) return [];

    const start = getPlaybackPercent(previousPoint, mapWidth, mapHeight);
    const end = getPlaybackPercent(trailPoint, mapWidth, mapHeight);
    const dx = end.left - start.left;
    const dy = end.top - start.top;

    return [
      {
        key: `${previousPoint.x}-${previousPoint.y}-${trailPoint.x}-${trailPoint.y}-${index}`,
        left: `${start.left}%`,
        top: `${start.top}%`,
        width: `${Math.sqrt(dx * dx + dy * dy)}%`,
        transform: `translateY(-50%) rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}deg)`,
        opacity: Math.max(0.18, (index + 1) / Math.max(1, stepIndex + 1)),
      },
    ];
  });
}

export function GameMap({
  map,
  playerVisible,
  playerIntel,
  units,
  selectedUnit,
  playerFaction,
  aiFaction,
  selectedCity,
  possibleMoves,
  highlightOrderSignal,
  highlightedUnitIds,
  bridgeBuildKeys,
  movementPlayback = [],
  battlefieldFxEvents = [],
  canInteract,
  onViewportChange,
  jumpTarget,
  onTileClick,
  onTileRightClick,
}: GameMapProps) {
  const mapWidth = map[0]?.length ?? 0;
  const mapHeight = map.length;
  const hiddenPlaybackUnitIds = new Set(movementPlayback.map((move) => move.unitId));
  const displayUnits = units.filter((unit) => !hiddenPlaybackUnitIds.has(unit.id));
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [zoom, setZoom] = useState(DEFAULT_TACTICAL_ZOOM);
  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 1, height: 1 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const playbackKey = useMemo(
    () =>
      movementPlayback
        .map((move) => `${move.owner}-${move.unitId}-${move.path.map((point) => `${point.x}:${point.y}`).join(">")}`)
        .join("|"),
    [movementPlayback]
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateViewport = () => {
      const width = container.scrollWidth || 1;
      const height = container.scrollHeight || 1;
      setViewport({
        left: container.scrollLeft / width,
        top: container.scrollTop / height,
        width: container.clientWidth / width,
        height: container.clientHeight / height,
      });
    };

    updateViewport();
    container.addEventListener("scroll", updateViewport, { passive: true });
    window.addEventListener("resize", updateViewport);
    return () => {
      container.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [mapWidth, mapHeight, zoom]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateContainerSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateContainerSize();

    const observer = new ResizeObserver(updateContainerSize);
    observer.observe(container);
    window.addEventListener("resize", updateContainerSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateContainerSize);
    };
  }, []);

  useEffect(() => {
    onViewportChange?.(viewport);
  }, [onViewportChange, viewport]);

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const container = scrollRef.current;
      if (!dragState || !container || dragState.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(deltaX, deltaY) >= DRAG_PAN_THRESHOLD) {
        dragState.moved = true;
        suppressClickRef.current = true;
        setIsDragging(true);
      }
      if (!dragState.moved) return;

      container.scrollLeft = dragState.scrollLeft - deltaX;
      container.scrollTop = dragState.scrollTop - deltaY;
    };

    const handleWindowPointerFinish = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      if (dragState.moved) {
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("pointerup", handleWindowPointerFinish);
    window.addEventListener("pointercancel", handleWindowPointerFinish);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerFinish);
      window.removeEventListener("pointercancel", handleWindowPointerFinish);
    };
  }, []);

  const minZoom = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !mapWidth || !mapHeight) {
      return DEFAULT_TACTICAL_ZOOM;
    }

    const usableWidth = Math.max(1, containerSize.width - 16);
    const usableHeight = Math.max(1, containerSize.height - 16);
    const baseGridWidth = mapWidth * BASE_TILE_SIZE + Math.max(0, mapWidth - 1) * TILE_GAP;
    const baseGridHeight = mapHeight * BASE_TILE_SIZE + Math.max(0, mapHeight - 1) * TILE_GAP;
    const fitZoom = Math.min(usableWidth / baseGridWidth, usableHeight / baseGridHeight);

    return Math.min(DEFAULT_TACTICAL_ZOOM, Number(fitZoom.toFixed(2)));
  }, [containerSize.height, containerSize.width, mapHeight, mapWidth]);

  const effectiveZoom = Math.max(zoom, minZoom);

  const viewColumnStart = Math.max(1, Math.floor(viewport.left * mapWidth) + 1);
  const viewColumnEnd = Math.max(viewColumnStart, Math.min(mapWidth, Math.ceil((viewport.left + viewport.width) * mapWidth)));
  const viewRowStart = Math.max(1, Math.floor(viewport.top * mapHeight) + 1);
  const viewRowEnd = Math.max(viewRowStart, Math.min(mapHeight, Math.ceil((viewport.top + viewport.height) * mapHeight)));
  const tileSize = Math.round(BASE_TILE_SIZE * effectiveZoom);
  const gridWidth = mapWidth * tileSize + Math.max(0, mapWidth - 1) * TILE_GAP;
  const gridHeight = mapHeight * tileSize + Math.max(0, mapHeight - 1) * TILE_GAP;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !jumpTarget) return;

    const targetLeft = (jumpTarget.x + 0.5) / Math.max(1, mapWidth);
    const targetTop = (jumpTarget.y + 0.5) / Math.max(1, mapHeight);
    const desiredLeft = Math.max(0, Math.min(1 - viewport.width, targetLeft - viewport.width / 2));
    const desiredTop = Math.max(0, Math.min(1 - viewport.height, targetTop - viewport.height / 2));

    container.scrollTo({
      left: desiredLeft * gridWidth,
      top: desiredTop * gridHeight,
      behavior: "smooth",
    });
  }, [gridHeight, gridWidth, jumpTarget, mapHeight, mapWidth, viewport.height, viewport.width]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const container = scrollRef.current;
    if (!container) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      moved: false,
    };
    suppressClickRef.current = false;
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div className="mx-auto max-w-[1120px] rounded-2xl border border-slate-800 bg-slate-950/95 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="rounded-full border border-cyan-500/25 bg-slate-950/78 px-3 py-1 font-semibold tracking-wide text-cyan-100 shadow-lg backdrop-blur">
            Tactical Grid
          </span>
          <span className="rounded-full border border-slate-700/70 bg-slate-950/78 px-3 py-1 shadow-lg backdrop-blur">
            Scroll to pan the battlefield
          </span>
          <span className="rounded-full border border-slate-700/70 bg-slate-950/78 px-3 py-1 shadow-lg backdrop-blur">
            View: cols {viewColumnStart}-{viewColumnEnd}, rows {viewRowStart}-{viewRowEnd}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-2xl px-3"
            onClick={() => setZoom((current) => Math.max(minZoom, Number((Math.max(current, minZoom) - TACTICAL_ZOOM_STEP).toFixed(2))))}
            disabled={effectiveZoom <= minZoom}
          >
            Zoom Out
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-2xl px-3"
            onClick={() => setZoom((current) => Math.min(MAX_TACTICAL_ZOOM, Number((current + TACTICAL_ZOOM_STEP).toFixed(2))))}
            disabled={effectiveZoom >= MAX_TACTICAL_ZOOM}
          >
            Zoom In
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className={[
          "relative max-h-[58vh] overflow-auto rounded-2xl border border-slate-800/70 bg-slate-950/80 p-2 select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        ].join(" ")}
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
      >
        <div className="relative inline-block">
        <BattlefieldFxOverlay
          map={map}
          visible={playerVisible}
          units={displayUnits}
          selectedUnitId={selectedUnit?.id ?? null}
          possibleMoves={possibleMoves}
          events={battlefieldFxEvents}
        />
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${mapWidth}, minmax(${tileSize}px, 1fr))`,
            width: gridWidth,
          }}
        >
          {map.flat().map((tile) => {
            const moveData = possibleMoves.find((move) => key(move.x, move.y) === key(tile.x, tile.y));
            const visible = playerVisible[tile.y][tile.x];
            const intelTile = playerIntel[tile.y][tile.x];
            const occupants = getUnitsAt(displayUnits, tile.x, tile.y);
            const isHighlightedUnit = occupants.some((occupant) => highlightedUnitIds.has(occupant.id));
            const isBridgeBuildTarget = bridgeBuildKeys?.has(key(tile.x, tile.y)) ?? false;
            const bridgeOrientation = getBridgeOrientation(map, tile);

            return (
              <MapTile
                key={`${key(tile.x, tile.y)}-${isHighlightedUnit ? highlightOrderSignal : 0}`}
                tile={tile}
                intelTile={intelTile}
                visible={visible}
                units={displayUnits}
                selectedUnit={selectedUnit}
                playerFaction={playerFaction}
                aiFaction={aiFaction}
                selectedCity={selectedCity}
                highlightOrderSignal={highlightOrderSignal}
                highlightPendingOrder={isHighlightedUnit}
                bridgeBuildTarget={isBridgeBuildTarget}
                bridgeOrientation={bridgeOrientation}
                moveData={visible ? moveData : undefined}
                canInteract={canInteract}
                onClick={onTileClick}
                onRightClick={onTileRightClick}
              />
            );
          })}
        </div>
        {movementPlayback.length > 0 ? (
          <MovementPlaybackOverlay
            key={playbackKey}
            movementPlayback={movementPlayback}
            mapWidth={mapWidth}
            mapHeight={map.length}
            playerFaction={playerFaction}
            aiFaction={aiFaction}
          />
        ) : null}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
        <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1">Legend</span>
        <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1">Large centered badge: lone visible unit</span>
        <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1">Split corner badges: air + surface stack</span>
        <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1">Pulsing tiles: active production or construction</span>
        <span className="rounded-full border border-cyan-900/60 bg-cyan-950/20 px-3 py-1 text-cyan-100">Pixi overlay: move lanes, selection pulse, water shimmer, combat FX</span>
        </div>
      </div>
    </div>
  );
}

function MovementPlaybackOverlay({
  movementPlayback,
  mapWidth,
  mapHeight,
  playerFaction,
  aiFaction,
}: {
  movementPlayback: MovementPlayback[];
  mapWidth: number;
  mapHeight: number;
  playerFaction: Faction;
  aiFaction: Faction;
}) {
  const [playbackStep, setPlaybackStep] = useState(0);

  useEffect(() => {
    const longestPath = Math.max(...movementPlayback.map((move) => move.path.length), 0);
    if (longestPath <= 1) return;

    const interval = window.setInterval(() => {
      setPlaybackStep((current) => Math.min(current + 1, longestPath - 1));
    }, MOVEMENT_PLAYBACK_STEP_MS);

    return () => window.clearInterval(interval);
  }, [movementPlayback]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {movementPlayback.map((move) => {
        const stepIndex = Math.min(playbackStep, move.path.length - 1);
        const point = move.path[stepIndex];
        if (!point) return null;
        const trailSegments = getPlaybackTrailSegments(move.path, stepIndex, mapWidth, mapHeight);
        const playbackPosition = getPlaybackPercent(point, mapWidth, mapHeight);
        const ownershipDisplay = getSideDisplayOption(move.owner);
        const trailColor = ownershipDisplay?.hex ?? "#f8fafc";

        return (
          <div key={`${move.owner}-${move.unitId}-${move.path.map((pathPoint) => `${pathPoint.x}-${pathPoint.y}`).join("_")}`}>
            {trailSegments.map((segment) => (
              <span
                key={`${move.unitId}-trail-${segment.key}`}
                className="playback-trail absolute origin-left rounded-full"
                style={{
                  left: segment.left,
                  top: segment.top,
                  width: segment.width,
                  transform: segment.transform,
                  background: `linear-gradient(90deg, ${trailColor}00 0%, ${trailColor}aa 40%, ${trailColor} 100%)`,
                  opacity: segment.opacity,
                }}
              />
            ))}
            <div
              className="playback-unit-glow absolute h-[52px] w-[52px] rounded-full"
              style={{
                left: `calc(${playbackPosition.left}% - 26px)`,
                top: `calc(${playbackPosition.top}% - 26px)`,
                background: `radial-gradient(circle, ${trailColor}55 0%, ${trailColor}14 58%, transparent 72%)`,
              }}
            />
            <div
              className={[
                "playback-unit absolute flex h-[34px] w-[34px] items-center justify-center rounded-full border shadow-lg transition-all duration-75",
                getSideUnitBadgeClass(
                  move.unitType,
                  getPlaybackDomain(move.unitType),
                  playerFaction,
                  aiFaction,
                  move.owner
                ),
                ownershipDisplay ? `ring-2 ${ownershipDisplay.ringClass}` : "ring-2 ring-white",
              ].join(" ")}
              style={{
                left: `calc(${playbackPosition.left}% - 17px)`,
                top: `calc(${playbackPosition.top}% - 17px)`,
                ...getSideUnitBadgeStyle(
                  move.unitType,
                  getPlaybackDomain(move.unitType),
                  playerFaction,
                  aiFaction,
                  move.owner
                ),
              }}
            >
              <span
                className="playback-thruster absolute inset-[-16%] rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, ${trailColor}55 80deg, transparent 160deg, ${trailColor}33 220deg, transparent 360deg)`,
                }}
              />
              <UnitTypeIcon
                unitType={move.unitType}
                className={getSideUnitIconClass(playerFaction, aiFaction, move.owner)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
