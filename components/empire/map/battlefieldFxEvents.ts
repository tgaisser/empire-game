import type { BattlefieldFxEvent } from "@/components/empire/map/BattlefieldFxOverlay";
import type { GameState, Side, Tile } from "@/lib/empire/types";

type ParsedCombatImpact = {
  label: string;
  firefight: boolean;
  attackerOwner: Side | null;
  size: "small" | "large";
  bursts: number;
};

type CombatPattern = {
  regex: RegExp;
  firefight: boolean;
  attackerOwner: Side | null;
  size: "small" | "large";
  bursts?: number;
};

const COMBAT_PATTERNS: CombatPattern[] = [
  { regex: /^Battle at (.+?):/, firefight: true, attackerOwner: "player", size: "small" },
  { regex: /^Bombing run at (.+?):/, firefight: false, attackerOwner: "player", size: "small" },
  { regex: /^Strike at (.+?):/, firefight: false, attackerOwner: "player", size: "small" },
  { regex: /^Special Ops called in an air strike on (.+?) for/, firefight: false, attackerOwner: "player", size: "small" },
  { regex: /^Carrier jamming attack hit drone swarm near (.+?) for/, firefight: false, attackerOwner: "player", size: "small" },
  { regex: /^Drone swarm detonated over (.+?)(?: for|,|\.)/, firefight: false, attackerOwner: "player", size: "small" },
  { regex: /^You hit the outpost at (.+?) for/, firefight: false, attackerOwner: "player", size: "small" },
  { regex: /^You destroyed the outpost at (.+?)(?: after|\.)/, firefight: false, attackerOwner: "player", size: "large" },
  { regex: /^Enemy attacked near (.+?)\./, firefight: true, attackerOwner: "ai", size: "small" },
  { regex: /^Enemy strike near (.+?)\./, firefight: false, attackerOwner: "ai", size: "small" },
  { regex: /^Enemy special operations directed an air strike near (.+?)\./, firefight: false, attackerOwner: "ai", size: "small" },
  { regex: /^Enemy drone swarm detonated near (.+?)\./, firefight: false, attackerOwner: "ai", size: "small" },
  { regex: /^Enemy destroyed an outpost near (.+?)\./, firefight: false, attackerOwner: "ai", size: "large" },
];

function findTileByLocationLabel(map: Tile[][], label: string) {
  const coordinateMatch = label.match(/^\((\d+),\s*(\d+)\)$/);
  if (coordinateMatch) {
    const x = Number(coordinateMatch[1]) - 1;
    const y = Number(coordinateMatch[2]) - 1;
    return map[y]?.[x] ?? null;
  }

  for (const row of map) {
    for (const tile of row) {
      if (tile.cityName === label) return tile;
    }
  }

  return null;
}

function parseCombatImpact(message: string): ParsedCombatImpact | null {
  for (const pattern of COMBAT_PATTERNS) {
    const match = message.match(pattern.regex);
    if (!match) continue;

    return {
      label: match[1],
      firefight: pattern.firefight,
      attackerOwner: pattern.attackerOwner,
      size: pattern.size,
      bursts: message.includes("Special Ops struck twice.") ? 2 : pattern.bursts ?? 1,
    };
  }

  return null;
}

function inferAttackerOrigin(
  previousGame: GameState,
  currentGame: GameState,
  attackerOwner: Side | null,
  target: Pick<Tile, "x" | "y">
) {
  if (attackerOwner === "player" && previousGame.selectedUnitId !== null) {
    const selectedAttacker = previousGame.units.find((unit) => unit.id === previousGame.selectedUnitId);
    if (selectedAttacker) return { x: selectedAttacker.x, y: selectedAttacker.y };
  }

  const currentUnitsById = new Map(currentGame.units.map((unit) => [unit.id, unit] as const));
  let bestCandidate: { x: number; y: number; distance: number } | null = null;

  for (const previousUnit of previousGame.units) {
    if (attackerOwner && previousUnit.owner !== attackerOwner) continue;

    const currentUnit = currentUnitsById.get(previousUnit.id);
    if (!currentUnit) continue;

    const changed =
      currentUnit.x !== previousUnit.x ||
      currentUnit.y !== previousUnit.y ||
      currentUnit.moveSpent > previousUnit.moveSpent ||
      currentUnit.hp < previousUnit.hp;
    if (!changed) continue;

    const distanceFromPrevious = Math.abs(previousUnit.x - target.x) + Math.abs(previousUnit.y - target.y);
    const distanceFromCurrent = Math.abs(currentUnit.x - target.x) + Math.abs(currentUnit.y - target.y);
    const score = Math.min(distanceFromPrevious, distanceFromCurrent);

    if (!bestCandidate || score < bestCandidate.distance) {
      bestCandidate = { x: previousUnit.x, y: previousUnit.y, distance: score };
    }
  }

  if (!bestCandidate || bestCandidate.distance > 3) return null;
  return { x: bestCandidate.x, y: bestCandidate.y };
}

export function createBattlefieldFxEvents(previousGame: GameState, currentGame: GameState) {
  const createdAt = Date.now();
  const newMessages = currentGame.logs.slice(previousGame.logs.length);
  const parsedImpacts = newMessages
    .map((message, index) => {
      const parsedImpact = parseCombatImpact(message);
      if (!parsedImpact) return null;

      const tile = findTileByLocationLabel(currentGame.map, parsedImpact.label);
      if (!tile) return null;

      return { ...parsedImpact, tile, index };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const currentUnitsById = new Set(currentGame.units.map((unit) => unit.id));
  const events: BattlefieldFxEvent[] = parsedImpacts.flatMap((impact) => {
    const impactEvents: BattlefieldFxEvent[] = [
      {
        id: `impact-${createdAt}-${impact.index}`,
        type: "explosion",
        x: impact.tile.x,
        y: impact.tile.y,
        createdAt,
        durationMs: impact.size === "large" ? 920 : 760,
        size: impact.size,
      },
    ];

    if (impact.firefight) {
      const attackerOrigin = inferAttackerOrigin(previousGame, currentGame, impact.attackerOwner, impact.tile);
      if (attackerOrigin && (attackerOrigin.x !== impact.tile.x || attackerOrigin.y !== impact.tile.y)) {
        impactEvents.push({
          id: `firefight-${createdAt}-${impact.index}`,
          type: "firefight",
          fromX: attackerOrigin.x,
          fromY: attackerOrigin.y,
          toX: impact.tile.x,
          toY: impact.tile.y,
          createdAt,
          durationMs: 720,
          bursts: impact.bursts,
        });
      }
    }

    return impactEvents;
  });

  for (const previousUnit of previousGame.units) {
    if (currentUnitsById.has(previousUnit.id)) continue;
    if (!parsedImpacts.some((impact) => Math.abs(impact.tile.x - previousUnit.x) + Math.abs(impact.tile.y - previousUnit.y) <= 1)) continue;

    events.push({
      id: `destroyed-${createdAt}-${previousUnit.id}`,
      type: "explosion",
      x: previousUnit.x,
      y: previousUnit.y,
      createdAt,
      durationMs: 980,
      size: "large",
    });
  }

  return events;
}
