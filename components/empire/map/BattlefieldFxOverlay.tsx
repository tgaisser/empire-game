'use client';

import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
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
      type: "projectile";
      role: "attack" | "counter" | "missile" | "airstrike";
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      createdAt: number;
      delayMs?: number;
      durationMs: number;
      bursts?: number;
    }
  | {
      id: string;
      type: "impact";
      role: "attack" | "counter" | "missile" | "airstrike";
      x: number;
      y: number;
      createdAt: number;
      delayMs?: number;
      durationMs: number;
      size: "small" | "large";
    }
  | {
      id: string;
      type: "damage";
      role: "attack" | "counter";
      x: number;
      y: number;
      amount: number;
      createdAt: number;
      delayMs?: number;
      durationMs: number;
    }
  | {
      id: string;
      type: "sonar-ring";
      x: number;
      y: number;
      radius: number;
      detected: boolean;
      createdAt: number;
      durationMs: number;
    };

const AIRFIELD_RADAR_RANGE_TILES = 5;

export function BattlefieldFxOverlay({ map, visible, units, selectedUnitId, possibleMoves, events = [] }: BattlefieldFxOverlayProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  // Store current props in refs so the render loop always reads fresh data
  // without needing to destroy/recreate the Pixi application.
  const propsRef = useRef({ map, visible, units, selectedUnitId, possibleMoves, events });

  useEffect(() => {
    propsRef.current = { map, visible, units, selectedUnitId, possibleMoves, events };
  }, [events, map, possibleMoves, selectedUnitId, units, visible]);

  // Single effect — creates the Pixi app once, tears it down on unmount only.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let initialized = false;
    const app = new Application();
    const stageRoot = new Container();
    const moveLayer = new Graphics();
    const radarLayer = new Graphics();
    const selectedLayer = new Graphics();
    const combatLayer = new Graphics();
    const explosionLayer = new Graphics();
    const labelLayer = new Container();
    stageRoot.addChild(moveLayer, radarLayer, selectedLayer, combatLayer, explosionLayer, labelLayer);

    const render = (elapsedTime = 0) => {
      if (destroyed || !initialized || !host) return;
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;

      app.renderer.resize(width, height);

      const { map: curMap, visible: curVisible, units: curUnits, selectedUnitId: curSelectedId, possibleMoves: curMoves, events: curEvents } = propsRef.current;
      const mapCols = curMap[0]?.length ?? 1;
      const mapRows = curMap.length;
      const tileWidth = width / Math.max(1, mapCols);
      const tileHeight = height / Math.max(1, mapRows);

      moveLayer.clear();
      radarLayer.clear();
      selectedLayer.clear();
      combatLayer.clear();
      explosionLayer.clear();
      labelLayer.removeChildren();

      const moveKeys = new Set(curMoves.map((move) => `${move.x},${move.y}`));
      const selectedUnit = curSelectedId !== null ? curUnits.find((unit) => unit.id === curSelectedId) ?? null : null;

      for (let y = 0; y < mapRows; y += 1) {
        for (let x = 0; x < curMap[y].length; x += 1) {
          if (!curVisible[y]?.[x]) continue;
          const tile = curMap[y][x];
          const px = x * tileWidth;
          const py = y * tileHeight;

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

      if (selectedUnit) {
        const selectedX = selectedUnit.x * tileWidth + tileWidth * 0.5;
        const selectedY = selectedUnit.y * tileHeight + tileHeight * 0.5;
        const pulse = 0.88 + Math.sin(elapsedTime * 0.0044) * 0.08;
        const tileRadius = Math.min(tileWidth, tileHeight);
        selectedLayer.circle(selectedX, selectedY, tileRadius * 0.32);
        selectedLayer.fill({ color: 0xfef08a, alpha: 0.08 + pulse * 0.04 });
        selectedLayer.circle(selectedX, selectedY, tileRadius * pulse * 0.48);
        selectedLayer.stroke({ color: 0xfde68a, alpha: 0.34, width: 2.2 });
        selectedLayer.circle(selectedX, selectedY, tileRadius * pulse * 0.62);
        selectedLayer.stroke({ color: 0xfbbf24, alpha: 0.18, width: 1.4 });
        selectedLayer.circle(selectedX, selectedY, tileRadius * (0.74 + pulse * 0.06));
        selectedLayer.stroke({ color: 0xfca5a5, alpha: 0.1, width: 1 });
      }

      const eventNow = Date.now();

      for (const event of curEvents) {
        const age = eventNow - event.createdAt - ("delayMs" in event ? event.delayMs ?? 0 : 0);
        if (age < 0 || age > event.durationMs) continue;

        if (event.type === "projectile") {
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
          const tracerColor =
            event.role === "missile"
              ? 0xf59e0b
              : event.role === "airstrike"
                ? 0x38bdf8
                : event.role === "counter"
                  ? 0xfb7185
                  : 0xfef08a;
          const beamColor =
            event.role === "missile"
              ? 0xfca5a5
              : event.role === "airstrike"
                ? 0x67e8f9
                : event.role === "counter"
                  ? 0xfda4af
                  : 0xfca5a5;

          combatLayer.moveTo(tracerStartX, tracerStartY);
          combatLayer.lineTo(tracerEndX, tracerEndY);
          combatLayer.stroke({ color: beamColor, alpha: 0.18 + pulse * 0.16, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.03) });
          combatLayer.moveTo(tracerStartX, tracerStartY);
          combatLayer.lineTo(tracerEndX, tracerEndY);
          combatLayer.stroke({ color: tracerColor, alpha: 0.42 + pulse * 0.4, width: Math.max(1.5, Math.min(tileWidth, tileHeight) * 0.07), cap: "round" });
          combatLayer.circle(fromX, fromY, Math.min(tileWidth, tileHeight) * (0.05 + pulse * 0.04));
          combatLayer.fill({ color: tracerColor, alpha: 0.24 + pulse * 0.18 });
          combatLayer.circle(toX, toY, Math.min(tileWidth, tileHeight) * (0.05 + pulse * 0.04));
          combatLayer.fill({ color: beamColor, alpha: 0.18 + pulse * 0.16 });
          combatLayer.circle((fromX + toX) / 2, (fromY + toY) / 2, Math.min(tileWidth, tileHeight) * (0.03 + pulse * 0.03));
          combatLayer.fill({ color: 0xffffff, alpha: 0.1 + pulse * 0.14 });
          continue;
        }

        if (event.type === "damage") {
          const progress = age / event.durationMs;
          const centerX = (event.x + 0.5) * tileWidth;
          const centerY = (event.y + 0.5) * tileHeight - progress * tileHeight * 0.42;
          const alpha = 1 - progress;
          const damageColor = event.role === "counter" ? 0xfda4af : 0xfef08a;
          const strokeColor = event.role === "counter" ? 0x881337 : 0x78350f;
          const text = `-${event.amount}`;
          const fontSize = Math.max(12, Math.min(tileWidth, tileHeight) * 0.28);
          const letterWidth = fontSize * 0.58;
          const boxWidth = Math.max(fontSize * 1.8, text.length * letterWidth + 10);
          const boxHeight = fontSize * 0.9 + 10;
          const boxX = centerX - boxWidth / 2;
          const boxY = centerY - boxHeight / 2;

          explosionLayer.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
          explosionLayer.fill({ color: 0x020617, alpha: 0.45 * alpha });
          explosionLayer.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
          explosionLayer.stroke({ color: damageColor, alpha: 0.6 * alpha, width: 1.5 });
          const damageText = new Text({
            text,
            style: {
              fill: damageColor,
              fontFamily: "Georgia",
              fontSize,
              fontWeight: "700",
              align: "center",
              stroke: { color: strokeColor, width: 2 },
            },
          });
          damageText.anchor.set(0.5);
          damageText.x = centerX;
          damageText.y = centerY;
          damageText.alpha = alpha;
          labelLayer.addChild(damageText);
          continue;
        }

        if (event.type === "sonar-ring") {
          const progress = age / event.durationMs;
          const centerX = (event.x + 0.5) * tileWidth;
          const centerY = (event.y + 0.5) * tileHeight;
          const tileRadius = Math.min(tileWidth, tileHeight);
          const maxRadius = tileRadius * event.radius;
          const ringRadius = maxRadius * (0.16 + progress * 0.94);
          const sonarColor = event.detected ? 0x67e8f9 : 0x93c5fd;
          const fade = 1 - progress;

          radarLayer.circle(centerX, centerY, ringRadius);
          radarLayer.stroke({ color: sonarColor, alpha: 0.34 * fade, width: Math.max(1.5, tileRadius * 0.07) });
          radarLayer.circle(centerX, centerY, ringRadius * 0.66);
          radarLayer.stroke({ color: sonarColor, alpha: 0.18 * fade, width: Math.max(1, tileRadius * 0.04) });
          radarLayer.circle(centerX, centerY, tileRadius * (0.18 + Math.sin(progress * Math.PI) * 0.08));
          radarLayer.fill({ color: sonarColor, alpha: 0.12 * fade });
          continue;
        }

        const progress = age / event.durationMs;
        const centerX = (event.x + 0.5) * tileWidth;
        const centerY = (event.y + 0.5) * tileHeight;
        const sizeMultiplier = event.size === "large" ? 1.3 : 0.78;
        const baseRadius = Math.min(tileWidth, tileHeight) * sizeMultiplier;
        const flareRadius = baseRadius * (0.28 + progress * 0.82);
        const outerRadius = baseRadius * (0.42 + progress * 1.12);
        const fade = 1 - progress;
        const sparkCount = event.size === "large" ? 10 : 6;
        const smokeRadius = baseRadius * (0.58 + progress * 1.5);
        const shockwaveRadius = baseRadius * (0.34 + progress * 1.72);
        const coreColor =
          event.role === "missile"
            ? 0xfb923c
            : event.role === "airstrike"
              ? 0x38bdf8
              : event.role === "counter"
                ? 0xfb7185
                : 0xf97316;
        const outerColor =
          event.role === "missile"
            ? 0xfef08a
            : event.role === "airstrike"
              ? 0x67e8f9
              : event.role === "counter"
                ? 0xfda4af
                : 0xfdba74;

        explosionLayer.circle(centerX, centerY, flareRadius);
        explosionLayer.fill({ color: coreColor, alpha: 0.22 * fade });
        explosionLayer.circle(centerX, centerY, flareRadius * 0.84);
        explosionLayer.fill({ color: coreColor, alpha: 0.4 * fade });
        explosionLayer.circle(centerX, centerY, flareRadius * 0.52);
        explosionLayer.fill({ color: outerColor, alpha: 0.58 * fade });
        explosionLayer.circle(centerX, centerY, flareRadius * 0.22);
        explosionLayer.fill({ color: 0xfffbeb, alpha: 0.28 * fade });
        explosionLayer.circle(centerX, centerY, outerRadius);
        explosionLayer.stroke({ color: outerColor, alpha: 0.4 * fade, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.045) });
        explosionLayer.circle(centerX, centerY, shockwaveRadius);
        explosionLayer.stroke({ color: outerColor, alpha: 0.2 * fade, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.035) });
        explosionLayer.circle(centerX, centerY, smokeRadius);
        explosionLayer.stroke({ color: 0x111827, alpha: 0.26 * fade, width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.09) });

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
            color: index % 2 === 0 ? outerColor : coreColor,
            alpha: 0.32 * fade,
            width: Math.max(1, Math.min(tileWidth, tileHeight) * 0.034),
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
        backgroundColor: 0x0f172a,
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
      render(performance.now());
      app.ticker.add(() => {
        render(performance.now());
      });
    };

    void start().catch(() => {
      destroyed = true;
    });

    const observer = new ResizeObserver(() => {
      render(performance.now());
    });
    observer.observe(host);

    return () => {
      destroyed = true;
      observer.disconnect();
      if (initialized) {
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[15] overflow-hidden rounded-xl" />;
}
