'use client';

import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import type { ReachableMove, Tile, Unit } from "@/lib/empire/types";

type BattlefieldFxOverlayProps = {
  map: Tile[][];
  visible: boolean[][];
  units: Unit[];
  selectedUnitId: number | null;
  possibleMoves: ReachableMove[];
  events?: BattlefieldFxEvent[];
};

export type BattlefieldFxEvent =
  | {
      id: string;
      type: "explosion";
      x: number;
      y: number;
      createdAt: number;
      durationMs: number;
      size: "small" | "large";
    }
  | {
      id: string;
      type: "firefight";
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      createdAt: number;
      durationMs: number;
      bursts?: number;
    };

type Spark = {
  x: number;
  y: number;
  length: number;
  thickness: number;
  alpha: number;
  phase: number;
  speed: number;
  tint: number;
  driftX: number;
  driftY: number;
  tilt: number;
};

const AIRFIELD_RADAR_RANGE_TILES = 5;

function createDeterministicNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function BattlefieldFxOverlay({ map, visible, units, selectedUnitId, possibleMoves, events = [] }: BattlefieldFxOverlayProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let initialized = false;
    const app = new Application();
    const stageRoot = new Container();
    const waterLayer = new Graphics();
    const mountainLayer = new Graphics();
    const moveLayer = new Graphics();
    const radarLayer = new Graphics();
    const selectedLayer = new Graphics();
    const sparkLayer = new Graphics();
    const atmosphereLayer = new Graphics();
    const combatLayer = new Graphics();
    const explosionLayer = new Graphics();
    let renderTick: (() => void) | null = null;
    stageRoot.addChild(waterLayer, mountainLayer, moveLayer, radarLayer, selectedLayer, sparkLayer, atmosphereLayer, combatLayer, explosionLayer);

    const moveKeys = new Set(possibleMoves.map((move) => `${move.x},${move.y}`));
    const selectedUnit = selectedUnitId !== null ? units.find((unit) => unit.id === selectedUnitId) ?? null : null;
    const waterSparks: Spark[] = [];

    for (let y = 0; y < map.length; y += 1) {
      for (let x = 0; x < map[y].length; x += 1) {
        if (!visible[y]?.[x]) continue;
        const tile = map[y][x];
        const seed = (x + 1) * 997 + (y + 1) * 463;
        if (tile.terrain === "water") {
          waterSparks.push({
            x: x + 0.22 + createDeterministicNoise(seed) * 0.56,
            y: y + 0.18 + createDeterministicNoise(seed + 1) * 0.58,
            length: 0.1 + createDeterministicNoise(seed + 2) * 0.14,
            thickness: 0.01 + createDeterministicNoise(seed + 9) * 0.02,
            alpha: 0.05 + createDeterministicNoise(seed + 3) * 0.08,
            phase: createDeterministicNoise(seed + 4) * Math.PI * 2,
            speed: 0.6 + createDeterministicNoise(seed + 5) * 0.8,
            tint: createDeterministicNoise(seed + 6) > 0.5 ? 0x9be7ff : 0x67d7ff,
            driftX: (createDeterministicNoise(seed + 7) - 0.5) * 0.02,
            driftY: (createDeterministicNoise(seed + 8) - 0.5) * 0.03,
            tilt: (createDeterministicNoise(seed + 10) - 0.5) * 0.34,
          });
        }
      }
    }

    const resizeAndRender = (elapsedTime = 0) => {
      if (destroyed || !initialized || !host) return;
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;

      app.renderer.resize(width, height);

      const tileWidth = width / Math.max(1, map[0]?.length ?? 1);
      const tileHeight = height / Math.max(1, map.length);

      waterLayer.clear();
      mountainLayer.clear();
      moveLayer.clear();
      radarLayer.clear();
      selectedLayer.clear();
      sparkLayer.clear();
      atmosphereLayer.clear();
      combatLayer.clear();
      explosionLayer.clear();

      for (let y = 0; y < map.length; y += 1) {
        for (let x = 0; x < map[y].length; x += 1) {
          if (!visible[y]?.[x]) continue;
          const tile = map[y][x];
          const px = x * tileWidth;
          const py = y * tileHeight;

          if (tile.terrain === "water") {
            const phase = elapsedTime * 0.0018 + (x + y) * 0.55;
            const crestDrift = Math.sin(phase) * tileWidth * 0.06;
            const troughDrift = Math.cos(phase * 1.1) * tileWidth * 0.05;
            const crestAlpha = 0.045 + (Math.sin(phase * 1.3) + 1) * 0.018;
            const troughAlpha = 0.03 + (Math.cos(phase * 1.1) + 1) * 0.012;

            waterLayer.roundRect(
              px + tileWidth * 0.12 + crestDrift,
              py + tileHeight * 0.16,
              tileWidth * 0.72,
              tileHeight * 0.16,
              999
            );
            waterLayer.fill({ color: 0x93dcff, alpha: crestAlpha });
            waterLayer.roundRect(
              px + tileWidth * 0.22 + troughDrift,
              py + tileHeight * 0.52,
              tileWidth * 0.4,
              tileHeight * 0.12,
              999
            );
            waterLayer.fill({ color: 0xd4f3ff, alpha: troughAlpha });
          }

          if (tile.terrain === "mountain") {
            mountainLayer.moveTo(px + tileWidth * 0.18, py + tileHeight * 0.76);
            mountainLayer.lineTo(px + tileWidth * 0.38, py + tileHeight * 0.34);
            mountainLayer.lineTo(px + tileWidth * 0.58, py + tileHeight * 0.76);
            mountainLayer.closePath();
            mountainLayer.fill({ color: 0xe2e8f0, alpha: 0.05 });
          }

          if (moveKeys.has(`${x},${y}`)) {
            const pulse = 0.45 + (Math.sin(elapsedTime * 0.005 + (x + y) * 0.9) + 1) * 0.2;
            moveLayer.roundRect(px + tileWidth * 0.12, py + tileHeight * 0.12, tileWidth * 0.76, tileHeight * 0.76, 10);
            moveLayer.fill({ color: 0x38bdf8, alpha: 0.035 + pulse * 0.03 });
            moveLayer.roundRect(px + tileWidth * 0.08, py + tileHeight * 0.08, tileWidth * 0.84, tileHeight * 0.84, 10);
            moveLayer.stroke({ color: 0x89f0ff, alpha: 0.12 + pulse * 0.08, width: 1.5 });
            moveLayer.roundRect(px + tileWidth * 0.22, py + tileHeight * 0.22, tileWidth * 0.56, tileHeight * 0.56, 8);
            moveLayer.stroke({ color: 0xd9f99d, alpha: 0.06 + pulse * 0.05, width: 1 });
          }

          if (tile.improvement?.type === "airfield" && tile.improvement.hasRadar) {
            const centerX = px + tileWidth * 0.5;
            const centerY = py + tileHeight * 0.5;
            const radius = Math.min(tileWidth, tileHeight) * AIRFIELD_RADAR_RANGE_TILES;
            const pulse = 0.94 + Math.sin(elapsedTime * 0.0016 + (x + y) * 0.24) * 0.05;
            const sweepAngle = (elapsedTime * 0.0011 + (x + y) * 0.08) % (Math.PI * 2);
            const radarColor = tile.improvement.owner === "player" ? 0xa3e635 : 0xef4444;
            const lineWidth = Math.max(1, Math.min(tileWidth, tileHeight) * 0.028);

            radarLayer.moveTo(centerX, centerY);
            radarLayer.arc(centerX, centerY, radius * pulse, sweepAngle - 0.24, sweepAngle + 0.18);
            radarLayer.closePath();
            radarLayer.fill({ color: radarColor, alpha: 0.045 });
            radarLayer.circle(centerX, centerY, radius * pulse);
            radarLayer.stroke({ color: radarColor, alpha: 0.12, width: lineWidth });
            radarLayer.circle(centerX, centerY, radius * 0.62 * pulse);
            radarLayer.stroke({ color: radarColor, alpha: 0.07, width: Math.max(1, lineWidth * 0.7) });
            radarLayer.moveTo(centerX, centerY);
            radarLayer.lineTo(
              centerX + Math.cos(sweepAngle + 0.18) * radius * pulse,
              centerY + Math.sin(sweepAngle + 0.18) * radius * pulse
            );
            radarLayer.stroke({ color: radarColor, alpha: 0.16, width: Math.max(1, lineWidth * 0.85), cap: "round" });
          }
        }
      }

      for (let index = 0; index < 3; index += 1) {
        const diagonalProgress = ((elapsedTime * 0.00005) + index * 0.33) % 1;
        const offset = (diagonalProgress * (width + height)) - height;
        atmosphereLayer.moveTo(Math.max(0, offset), Math.max(0, -offset));
        atmosphereLayer.lineTo(Math.min(width, offset + height), Math.min(height, height - Math.max(0, offset + height - width)));
        atmosphereLayer.stroke({ color: index === 1 ? 0xa3e635 : 0x67e8f9, alpha: 0.035, width: 1 });
      }

      if (selectedUnit) {
        const selectedX = selectedUnit.x * tileWidth + tileWidth * 0.5;
        const selectedY = selectedUnit.y * tileHeight + tileHeight * 0.5;
        const pulse = 0.78 + Math.sin(elapsedTime * 0.0032) * 0.08;
        const sweepAngle = (elapsedTime * 0.003) % (Math.PI * 2);
        selectedLayer.circle(selectedX, selectedY, Math.min(tileWidth, tileHeight) * pulse * 0.34);
        selectedLayer.stroke({ color: 0xfde68a, alpha: 0.26, width: 2 });
        selectedLayer.circle(selectedX, selectedY, Math.min(tileWidth, tileHeight) * pulse * 0.46);
        selectedLayer.stroke({ color: 0xfbbf24, alpha: 0.13, width: 1.5 });
        selectedLayer.moveTo(selectedX, selectedY);
        selectedLayer.arc(
          selectedX,
          selectedY,
          Math.min(tileWidth, tileHeight) * 0.72,
          sweepAngle - 0.38,
          sweepAngle + 0.26
        );
        selectedLayer.closePath();
        selectedLayer.fill({ color: 0x67e8f9, alpha: 0.08 });
        selectedLayer.rect(selectedX - 1, selectedY - tileHeight * 0.5, 2, tileHeight);
        selectedLayer.fill({ color: 0xfef3c7, alpha: 0.12 });
      }

      for (const spark of waterSparks) {
        const pulse = 0.88 + Math.sin(elapsedTime * 0.0014 * spark.speed + spark.phase) * 0.22;
        const drift = Math.sin(elapsedTime * 0.0011 + spark.phase) * 0.12;
        const centerX = spark.x * tileWidth + tileWidth * spark.driftX * drift;
        const centerY = spark.y * tileHeight + tileHeight * spark.driftY * drift;
        const halfLength = tileWidth * spark.length * pulse;
        const tiltOffset = tileHeight * spark.tilt;
        const thickness = Math.max(1, Math.min(tileWidth, tileHeight) * spark.thickness);

        sparkLayer.moveTo(centerX - halfLength, centerY - tiltOffset);
        sparkLayer.lineTo(centerX + halfLength, centerY + tiltOffset);
        sparkLayer.stroke({ color: spark.tint, alpha: spark.alpha * pulse, width: thickness, cap: "round" });
      }

      const eventNow = Date.now();

      for (const event of events) {
        const age = eventNow - event.createdAt;
        if (age < 0 || age > event.durationMs) continue;

        if (event.type === "firefight") {
          const progress = age / event.durationMs;
          const burstCount = Math.max(1, event.bursts ?? 1);
          const burstProgress = (progress * burstCount) % 1;
          const pulse = Math.sin(burstProgress * Math.PI);
          const fromX = (event.fromX + 0.5) * tileWidth;
          const fromY = (event.fromY + 0.5) * tileHeight;
          const toX = (event.toX + 0.5) * tileWidth;
          const toY = (event.toY + 0.5) * tileHeight;
          const dx = toX - fromX;
          const dy = toY - fromY;
          const tracerLength = 0.18 + pulse * 0.5;
          const tracerStartX = fromX + dx * (0.2 + burstProgress * 0.3);
          const tracerStartY = fromY + dy * (0.2 + burstProgress * 0.3);
          const tracerEndX = tracerStartX + dx * tracerLength;
          const tracerEndY = tracerStartY + dy * tracerLength;
          const returnStartX = toX - dx * (0.18 + burstProgress * 0.28);
          const returnStartY = toY - dy * (0.18 + burstProgress * 0.28);
          const returnEndX = returnStartX - dx * (0.12 + pulse * 0.18);
          const returnEndY = returnStartY - dy * (0.12 + pulse * 0.18);

          combatLayer.moveTo(fromX, fromY);
          combatLayer.lineTo(toX, toY);
          combatLayer.stroke({ color: 0xfca5a5, alpha: 0.18 + pulse * 0.16, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.03) });
          combatLayer.moveTo(tracerStartX, tracerStartY);
          combatLayer.lineTo(tracerEndX, tracerEndY);
          combatLayer.stroke({ color: 0xfef08a, alpha: 0.42 + pulse * 0.4, width: Math.max(1.5, Math.min(tileWidth, tileHeight) * 0.07), cap: "round" });
          combatLayer.moveTo(returnStartX, returnStartY);
          combatLayer.lineTo(returnEndX, returnEndY);
          combatLayer.stroke({ color: 0xfda4af, alpha: 0.26 + pulse * 0.28, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.055), cap: "round" });
          combatLayer.circle(fromX, fromY, Math.min(tileWidth, tileHeight) * (0.05 + pulse * 0.04));
          combatLayer.fill({ color: 0xf59e0b, alpha: 0.3 + pulse * 0.24 });
          combatLayer.circle(toX, toY, Math.min(tileWidth, tileHeight) * (0.05 + pulse * 0.04));
          combatLayer.fill({ color: 0xfb7185, alpha: 0.2 + pulse * 0.2 });
          combatLayer.circle((fromX + toX) / 2, (fromY + toY) / 2, Math.min(tileWidth, tileHeight) * (0.03 + pulse * 0.03));
          combatLayer.fill({ color: 0xffffff, alpha: 0.1 + pulse * 0.14 });
          continue;
        }

        const progress = age / event.durationMs;
        const centerX = (event.x + 0.5) * tileWidth;
        const centerY = (event.y + 0.5) * tileHeight;
        const sizeMultiplier = event.size === "large" ? 1.3 : 0.78;
        const baseRadius = Math.min(tileWidth, tileHeight) * sizeMultiplier;
        const flareRadius = baseRadius * (0.24 + progress * 0.72);
        const outerRadius = baseRadius * (0.38 + progress * 1.05);
        const fade = 1 - progress;
        const sparkCount = event.size === "large" ? 10 : 6;
        const smokeRadius = baseRadius * (0.52 + progress * 1.4);
        const shockwaveRadius = baseRadius * (0.3 + progress * 1.65);

        explosionLayer.circle(centerX, centerY, flareRadius);
        explosionLayer.fill({ color: 0xfbbf24, alpha: 0.34 * fade });
        explosionLayer.circle(centerX, centerY, flareRadius * 0.56);
        explosionLayer.fill({ color: 0xf97316, alpha: 0.52 * fade });
        explosionLayer.circle(centerX, centerY, flareRadius * 0.24);
        explosionLayer.fill({ color: 0xffffff, alpha: 0.2 * fade });
        explosionLayer.circle(centerX, centerY, outerRadius);
        explosionLayer.stroke({ color: 0xfef08a, alpha: 0.45 * fade, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.04) });
        explosionLayer.circle(centerX, centerY, shockwaveRadius);
        explosionLayer.stroke({ color: 0xf8fafc, alpha: 0.18 * fade, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.03) });
        explosionLayer.circle(centerX, centerY, smokeRadius);
        explosionLayer.stroke({ color: 0x1f2937, alpha: 0.2 * fade, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.08) });

        for (let index = 0; index < sparkCount; index += 1) {
          const angle = (Math.PI * 2 * index) / sparkCount + progress * 1.4;
          const rayLength = baseRadius * (0.22 + fade * 0.55);
          const innerRadius = flareRadius * 0.55;
          explosionLayer.moveTo(
            centerX + Math.cos(angle) * innerRadius,
            centerY + Math.sin(angle) * innerRadius
          );
          explosionLayer.lineTo(
            centerX + Math.cos(angle) * (innerRadius + rayLength),
            centerY + Math.sin(angle) * (innerRadius + rayLength)
          );
          explosionLayer.stroke({
            color: index % 2 === 0 ? 0xfef08a : 0xfdba74,
            alpha: 0.26 * fade,
            width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.03),
            cap: "round",
          });
          explosionLayer.circle(
            centerX + Math.cos(angle) * (innerRadius + rayLength * 0.9),
            centerY + Math.sin(angle) * (innerRadius + rayLength * 0.9),
            Math.max(1, Math.min(tileWidth, tileHeight) * 0.03)
          );
          explosionLayer.fill({ color: 0x111827, alpha: 0.12 * fade });
        }
      }
    };

    const start = async () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);

      await app.init({
        width,
        height,
        preference: "webgl",
        backgroundAlpha: 0,
        antialias: true,
      });
      initialized = true;
      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }

      host.appendChild(app.canvas);
      app.stage.addChild(stageRoot);
      resizeAndRender(performance.now());
      renderTick = () => {
        resizeAndRender(performance.now());
      };
      app.ticker.add(renderTick);
    };

    void start().catch(() => {
      destroyed = true;
    });

    const observer = new ResizeObserver(() => {
      resizeAndRender(performance.now());
    });
    observer.observe(host);

    return () => {
      destroyed = true;
      observer.disconnect();
      if (!initialized) return;
      if (renderTick) {
        app.ticker.remove(renderTick);
      }
      app.destroy(true, { children: true });
    };
  }, [events, map, visible, units, selectedUnitId, possibleMoves]);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[15] overflow-hidden rounded-xl opacity-95" />;
}
