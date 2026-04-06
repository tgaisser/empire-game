import type { GameType, TerrainType, WorldSizeOption } from "@/lib/empire/types";

export { UNIT_STATS } from "@/lib/empire/data/units";

export const MIN_MAP_W = 16;
export const MIN_MAP_H = 12;
export const STARTING_CREDITS = 0;
export const CITY_INCOME = 6;
export const MAX_LOG = 18;
export const AI_TURN_DELAY_MS = 700;
export const CITY_VISION_RANGE = 2;
export const MOVEMENT_PLAYBACK_STEP_MS = 140;

export const WORLD_SIZE_OPTIONS: WorldSizeOption[] = [
  { id: "small", label: "Small 20 x 15", width: 20, height: 15 },
  { id: "medium", label: "Medium 24 x 18", width: 24, height: 18 },
  { id: "large", label: "Large 30 x 22", width: 30, height: 22 },
  { id: "huge", label: "Huge 36 x 26", width: 36, height: 26 },
  { id: "massive", label: "Massive 42 x 30", width: 42, height: 30 },
];

export const GAME_TYPE_OPTIONS: Array<{ id: GameType; label: string }> = [
  { id: "normal", label: "Normal Game" },
  { id: "naval", label: "Lakes and Rivers" },
  { id: "archipelago", label: "Archipelago" },
  { id: "pangea", label: "Pangea" },
  { id: "ocean", label: "Open Ocean" },
  { id: "alpine", label: "Alpine War" },
  { id: "globe", label: "Random Globe" },
];

export const GLOBE_MAP_SIZE = { width: 52, height: 38 };

export const TERRAIN: Record<TerrainType, { name: string; moveCost: number }> = {
  water: { name: "Water", moveCost: 999 },
  land: { name: "Land", moveCost: 1 },
  mountain: { name: "Mountain", moveCost: 2 },
};


export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
