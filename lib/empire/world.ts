import { getFactionCityNames } from "@/lib/empire/factions";
import { DIRECTIONS, MIN_MAP_H, MIN_MAP_W } from "@/lib/empire/config";
import type { Faction, GameType, Owner, Tile } from "@/lib/empire/types";

type CityPlacement = {
  x: number;
  y: number;
  owner: Owner;
  cityName: string | null;
};

function rng(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function key(x: number, y: number) {
  return `${x},${y}`;
}

function distance(a: Pick<Tile, "x" | "y">, b: Pick<Tile, "x" | "y">) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function createEmptyMap(width: number, height: number, terrain: Tile["terrain"]): Tile[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      terrain,
      city: false,
      owner: null,
      cityName: null,
      production: null,
      improvement: null,
      improvementProject: null,
    }))
  );
}

function fillEllipse(map: Tile[][], cx: number, cy: number, rx: number, ry: number, terrain: Tile["terrain"]) {
  const height = map.length;
  const width = map[0]?.length ?? 0;
  for (let y = Math.max(0, Math.floor(cy - ry - 1)); y <= Math.min(height - 1, Math.ceil(cy + ry + 1)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - rx - 1)); x <= Math.min(width - 1, Math.ceil(cx + rx + 1)); x += 1) {
      const dx = (x - cx) / Math.max(rx, 0.01);
      const dy = (y - cy) / Math.max(ry, 0.01);
      if (dx * dx + dy * dy <= 1) {
        map[y][x].terrain = terrain;
      }
    }
  }
}

function carveEllipse(map: Tile[][], cx: number, cy: number, rx: number, ry: number) {
  fillEllipse(map, cx, cy, rx, ry, "water");
}

function shuffle<T>(items: T[], rand: () => number) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function mirrorPoint(width: number, height: number, x: number, y: number) {
  return { x: width - 1 - x, y: height - 1 - y };
}

function isFarEnoughFromCities(
  candidate: Pick<Tile, "x" | "y">,
  placements: Array<Pick<Tile, "x" | "y">>,
  minimumDistance: number
) {
  return placements.every((placement) => distance(candidate, placement) >= minimumDistance);
}

function getTerrainWeights(gameType: GameType) {
  if (gameType === "naval") {
    return { waterChance: 0.3, mountainChance: 0.41, waterSpreadThreshold: 2, waterSpreadChance: 0.5, riverPasses: 2 };
  }

  if (gameType === "alpine") {
    return { waterChance: 0.24, mountainChance: 0.5, waterSpreadThreshold: 2, waterSpreadChance: 0.36, riverPasses: 1 };
  }

  return { waterChance: 0.24, mountainChance: 0.33, waterSpreadThreshold: 2, waterSpreadChance: 0.42, riverPasses: 0 };
}

function carveRivers(map: Tile[][], rand: () => number, passes: number) {
  const width = map[0]?.length ?? 0;
  const height = map.length;

  for (let pass = 0; pass < passes; pass += 1) {
    let x = Math.floor(rand() * Math.max(1, Math.floor(width * 0.25))) + 1;
    let y = 1 + Math.floor(rand() * Math.max(1, height - 2));
    const targetX = width - 2;

    while (x < targetX) {
      map[y][x].terrain = "water";
      const verticalRoll = rand();
      if (verticalRoll < 0.22 && y > 1) y -= 1;
      else if (verticalRoll > 0.78 && y < height - 2) y += 1;
      x += 1;
    }
  }
}

function isolateCornersWithWater(map: Tile[][], rand: () => number) {
  const width = map[0]?.length ?? 0;
  const height = map.length;
  const centerBand = Math.max(2, Math.floor(width * 0.12));
  const midX = Math.floor(width / 2);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = midX - centerBand; x <= midX + centerBand; x += 1) {
      if (rand() < 0.7) {
        map[y][x].terrain = "water";
      }
    }
  }
}

function stampIsland(map: Tile[][], cx: number, cy: number, radius: number, rand: () => number, mountainBias = 0.1) {
  const height = map.length;
  const width = map[0]?.length ?? 0;

  for (let y = Math.max(1, Math.floor(cy - radius - 1)); y <= Math.min(height - 2, Math.ceil(cy + radius + 1)); y += 1) {
    for (let x = Math.max(1, Math.floor(cx - radius - 1)); x <= Math.min(width - 2, Math.ceil(cx + radius + 1)); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const softness = rand() * 0.9;
      if (dist > radius + softness) continue;
      map[y][x].terrain = dist > radius * 0.72 && rand() < mountainBias ? "mountain" : "land";
    }
  }
}

function paintOceanContinent(map: Tile[][], side: "left" | "right", rand: () => number) {
  const height = map.length;
  const width = map[0]?.length ?? 0;
  const baseDepth = Math.min(6, Math.max(4, Math.floor(width * 0.18)));

  for (let y = 0; y < height; y += 1) {
    const verticalBias = Math.abs(y - (height - 1) / 2) / Math.max(1, height / 2);
    const taper = verticalBias > 0.78 ? 1 : 0;
    const coastalBulge = verticalBias > 0.18 && verticalBias < 0.68 && rand() < 0.35 ? 1 : 0;
    const jitter = rand() < 0.22 ? 1 : 0;
    const depth = clamp(baseDepth + coastalBulge - taper - jitter, 4, 6);

    if (side === "left") {
      for (let x = 0; x < depth; x += 1) {
        map[y][x].terrain = "land";
      }
      if (depth >= 5 && y > 0 && y < height - 1 && rand() < 0.12) {
        map[y][depth - 1].terrain = "mountain";
      }
    } else {
      for (let x = width - depth; x < width; x += 1) {
        map[y][x].terrain = "land";
      }
      if (depth >= 5 && y > 0 && y < height - 1 && rand() < 0.12) {
        map[y][width - depth].terrain = "mountain";
      }
    }
  }
}

function placeOceanMiniIsland(map: Tile[][], x: number, y: number, vertical: boolean) {
  const height = map.length;
  const width = map[0]?.length ?? 0;
  const cells = vertical
    ? [
        { x, y },
        { x, y: y + 1 },
      ]
    : [
        { x, y },
        { x: x + 1, y },
      ];

  for (const cell of cells) {
    if (cell.x < 1 || cell.x >= width - 1 || cell.y < 1 || cell.y >= height - 1) continue;
    map[cell.y][cell.x].terrain = "land";
  }
}

function getOpenOceanIslandAnchors(width: number, height: number) {
  const centerX = Math.floor(width / 2);
  return [
    { x: centerX - 1, y: Math.max(3, Math.floor(height * 0.3)), vertical: false },
    { x: centerX - 1, y: Math.min(height - 4, Math.floor(height * 0.68)), vertical: false },
  ];
}

function createArchipelagoTerrain(seed: number, width: number, height: number) {
  const rand = rng(seed);
  const map = createEmptyMap(width, height, "water");
  const homeRadius = Math.max(2.4, Math.min(width, height) * 0.12);
  const neutralRadius = Math.max(1.6, Math.min(width, height) * 0.08);
  const playerHome = { x: Math.max(3, Math.floor(width * 0.2)), y: Math.max(3, Math.floor(height * 0.24)) };
  const aiHome = { x: width - 1 - playerHome.x, y: height - 1 - playerHome.y };

  stampIsland(map, playerHome.x, playerHome.y, homeRadius, rand, 0.12);
  stampIsland(map, aiHome.x, aiHome.y, homeRadius, rand, 0.12);

  const islandCount = Math.max(8, Math.floor((width * height) / 42));
  for (let index = 0; index < islandCount; index += 1) {
    const x = 2 + Math.floor(rand() * (width - 4));
    const y = 2 + Math.floor(rand() * (height - 4));
    const radius = neutralRadius + rand() * 1.7;
    stampIsland(map, x, y, radius, rand, 0.08);
  }

  return { map, rand };
}

function createOpenOceanTerrain(seed: number, width: number, height: number) {
  const rand = rng(seed);
  const map = createEmptyMap(width, height, "water");
  paintOceanContinent(map, "left", rand);
  paintOceanContinent(map, "right", rand);

  for (const island of getOpenOceanIslandAnchors(width, height)) {
    placeOceanMiniIsland(map, island.x, island.y, island.vertical);
  }

  return { map, rand };
}

function createGlobeTerrain(seed: number, width: number, height: number) {
  const rand = rng(seed);
  const map = createEmptyMap(width, height, "water");

  const continentCount = 3 + Math.floor(rand() * 3);
  const continents: Array<{ cx: number; cy: number; rx: number; ry: number }> = [];

  for (let i = 0; i < continentCount; i += 1) {
    const cx = 3 + Math.floor(rand() * (width - 6));
    const cy = 3 + Math.floor(rand() * (height - 6));
    const rx = Math.max(3, Math.floor(width * (0.12 + rand() * 0.14)));
    const ry = Math.max(3, Math.floor(height * (0.12 + rand() * 0.14)));
    continents.push({ cx, cy, rx, ry });
    fillEllipse(map, cx, cy, rx, ry, "land");

    const lobeCount = 1 + Math.floor(rand() * 3);
    for (let j = 0; j < lobeCount; j += 1) {
      const angle = rand() * Math.PI * 2;
      const lobeCx = cx + Math.cos(angle) * rx * (0.5 + rand() * 0.4);
      const lobeCy = cy + Math.sin(angle) * ry * (0.5 + rand() * 0.4);
      const lobeRx = Math.max(2, Math.floor(rx * (0.3 + rand() * 0.4)));
      const lobeRy = Math.max(2, Math.floor(ry * (0.3 + rand() * 0.4)));
      fillEllipse(map, lobeCx, lobeCy, lobeRx, lobeRy, "land");
    }
  }

  for (const continent of continents) {
    const mountainCount = 1 + Math.floor(rand() * 3);
    for (let m = 0; m < mountainCount; m += 1) {
      const mx = continent.cx + Math.floor((rand() - 0.5) * continent.rx * 1.2);
      const my = continent.cy + Math.floor((rand() - 0.5) * continent.ry * 1.2);
      const chainLength = 3 + Math.floor(rand() * 6);
      let px = mx;
      let py = my;
      for (let s = 0; s < chainLength; s += 1) {
        if (px >= 1 && px < width - 1 && py >= 1 && py < height - 1 && map[py][px].terrain === "land") {
          map[py][px].terrain = "mountain";
          if (rand() < 0.4 && py + 1 < height && map[py + 1][px].terrain === "land") {
            map[py + 1][px].terrain = "mountain";
          }
        }
        const dir = rand();
        if (dir < 0.5) px += rand() < 0.5 ? 1 : -1;
        else py += rand() < 0.5 ? 1 : -1;
      }
    }
  }

  const islandCount = Math.max(6, Math.floor((width * height) / 80));
  for (let i = 0; i < islandCount; i += 1) {
    const ix = 2 + Math.floor(rand() * (width - 4));
    const iy = 2 + Math.floor(rand() * (height - 4));
    const ir = 1 + rand() * 2;
    stampIsland(map, ix, iy, ir, rand, 0.15);
  }

  const riverCount = 2 + Math.floor(rand() * 3);
  for (let r = 0; r < riverCount; r += 1) {
    const landTiles = map.flat().filter((t) => t.terrain === "land" || t.terrain === "mountain");
    if (landTiles.length === 0) break;
    const start = landTiles[Math.floor(rand() * landTiles.length)];
    let rx = start.x;
    let ry = start.y;
    const riverLength = 4 + Math.floor(rand() * 8);
    for (let s = 0; s < riverLength; s += 1) {
      if (rx < 1 || rx >= width - 1 || ry < 1 || ry >= height - 1) break;
      if (map[ry][rx].terrain === "water") break;
      map[ry][rx].terrain = "water";
      const vr = rand();
      if (vr < 0.22 && ry > 1) ry -= 1;
      else if (vr > 0.78 && ry < height - 2) ry += 1;
      rx += rand() < 0.5 ? 1 : -1;
    }
  }

  return { map, rand };
}

function createBaseTerrain(seed: number, width: number, height: number, gameType: GameType) {
  if (gameType === "archipelago") {
    return createArchipelagoTerrain(seed, width, height);
  }

  if (gameType === "ocean") {
    return createOpenOceanTerrain(seed, width, height);
  }

  if (gameType === "globe") {
    return createGlobeTerrain(seed, width, height);
  }

  const rand = rng(seed);
  const weights = getTerrainWeights(gameType);
  const map: Tile[][] = [];

  for (let y = 0; y < height; y += 1) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x += 1) {
      const n = rand();
      let terrain: Tile["terrain"] = "land";
      if (n < weights.waterChance) terrain = "water";
      else if (n < weights.mountainChance) terrain = "mountain";
      row.push({
        x,
        y,
        terrain,
        city: false,
        owner: null,
        cityName: null,
        production: null,
        improvement: null,
        improvementProject: null,
      });
    }
    map.push(row);
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const waterNeighbors = DIRECTIONS.filter(([dx, dy]) => map[y + dy][x + dx].terrain === "water").length;
      if (map[y][x].terrain === "water" && waterNeighbors <= 1) map[y][x].terrain = "land";
      if (map[y][x].terrain !== "water" && waterNeighbors >= weights.waterSpreadThreshold && rand() < weights.waterSpreadChance) {
        map[y][x].terrain = "water";
      }
    }
  }

  if (gameType === "naval") {
    isolateCornersWithWater(map, rand);
  }

  if (weights.riverPasses > 0) {
    carveRivers(map, rand, weights.riverPasses);
  }

  return { map, rand };
}

function getNeutralCityCount(width: number, height: number) {
  const area = width * height;
  if (area >= 1500) return 14;
  if (area >= 900) return 10;
  if (area >= 400) return 8;
  if (area >= 260) return 6;
  return 4;
}

function buildHomeCandidates(width: number, height: number) {
  const candidates: Array<Pick<Tile, "x" | "y">> = [];
  const maxX = Math.max(2, Math.floor(width * 0.28));
  const maxY = Math.max(2, Math.floor(height * 0.28));

  for (let y = 1; y <= maxY; y += 1) {
    for (let x = 1; x <= maxX; x += 1) {
      candidates.push({ x, y });
    }
  }

  return candidates;
}

function buildNeutralCandidates(width: number, height: number) {
  const candidates: Array<Pick<Tile, "x" | "y">> = [];
  const maxX = Math.max(2, Math.floor((width - 1) / 2) - 1);

  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x <= maxX; x += 1) {
      if (x <= Math.floor(width * 0.2) && y <= Math.floor(height * 0.2)) continue;
      candidates.push({ x, y });
    }
  }

  return candidates;
}

function assignCityNames(
  placements: CityPlacement[],
  rand: () => number,
  playerFaction: Faction,
  aiFaction: Faction
) {
  const playerNames = shuffle(getFactionCityNames(playerFaction), rand);
  const enemyNames = shuffle(getFactionCityNames(aiFaction), rand);
  let playerIndex = 0;
  let enemyIndex = 0;

  return placements.map((placement, index) => {
    if (placement.owner === "player") {
      const cityName = playerNames[playerIndex % playerNames.length] ?? `City ${index + 1}`;
      playerIndex += 1;
      return { ...placement, cityName };
    }

    if (placement.owner === "ai") {
      const cityName = enemyNames[enemyIndex % enemyNames.length] ?? `City ${index + 1}`;
      enemyIndex += 1;
      return { ...placement, cityName };
    }

    return { ...placement, cityName: null };
  });
}

function createCityPlacements(
  width: number,
  height: number,
  rand: () => number,
  gameType: GameType,
  playerFaction: Faction,
  aiFaction: Faction
) {
  if (gameType === "archipelago") {
    const placements: CityPlacement[] = [
      { x: Math.max(3, Math.floor(width * 0.2)), y: Math.max(3, Math.floor(height * 0.24)), owner: "player", cityName: "" },
      { x: width - 1 - Math.max(3, Math.floor(width * 0.2)), y: height - 1 - Math.max(3, Math.floor(height * 0.24)), owner: "ai", cityName: "" },
    ];
    const islandPairs = [
      { x: Math.floor(width * 0.32), y: Math.floor(height * 0.22) },
      { x: Math.floor(width * 0.38), y: Math.floor(height * 0.5) },
      { x: Math.floor(width * 0.26), y: Math.floor(height * 0.72) },
    ];
    for (const candidate of shuffle(islandPairs, rand)) {
      const mirror = mirrorPoint(width, height, candidate.x, candidate.y);
      placements.push({ x: candidate.x, y: candidate.y, owner: null, cityName: "" });
      placements.push({ x: mirror.x, y: mirror.y, owner: null, cityName: "" });
    }
    return assignCityNames(placements, rand, playerFaction, aiFaction);
  }

  if (gameType === "ocean") {
    const playerHome = { x: Math.min(3, width - 1), y: Math.floor(height * 0.5) };
    const aiHome = { x: width - 1 - playerHome.x, y: height - 1 - playerHome.y };
    const middleIslands = getOpenOceanIslandAnchors(width, height);
    const placements: CityPlacement[] = [
      { ...playerHome, owner: "player", cityName: "" },
      { ...aiHome, owner: "ai", cityName: "" },
      { x: 2, y: Math.floor(height * 0.22), owner: null, cityName: "" },
      { x: width - 3, y: height - 1 - Math.floor(height * 0.22), owner: null, cityName: "" },
      { x: 2, y: Math.floor(height * 0.78), owner: null, cityName: "" },
      { x: width - 3, y: height - 1 - Math.floor(height * 0.78), owner: null, cityName: "" },
      { x: middleIslands[0]?.x ?? Math.floor(width / 2), y: middleIslands[0]?.y ?? Math.floor(height * 0.3), owner: null, cityName: "" },
      { x: middleIslands[1]?.x ?? Math.floor(width / 2), y: middleIslands[1]?.y ?? Math.floor(height * 0.68), owner: null, cityName: "" },
    ];
    return assignCityNames(placements, rand, playerFaction, aiFaction);
  }

  const minimumDistance = Math.max(4, Math.floor(Math.min(width, height) / 3));
  const placements: CityPlacement[] = [];

  const homeCandidates = shuffle(buildHomeCandidates(width, height), rand);
  let homePick = homeCandidates.find((candidate) => {
    const mirror = mirrorPoint(width, height, candidate.x, candidate.y);
    return distance(candidate, mirror) >= minimumDistance + 4;
  });

  if (!homePick) {
    homePick = { x: 1, y: 1 };
  }

  const mirroredHome = mirrorPoint(width, height, homePick.x, homePick.y);
  placements.push({ x: homePick.x, y: homePick.y, owner: "player", cityName: "" });
  placements.push({ x: mirroredHome.x, y: mirroredHome.y, owner: "ai", cityName: "" });

  const neutralPairs = Math.floor(getNeutralCityCount(width, height) / 2);
  const neutralCandidates = shuffle(buildNeutralCandidates(width, height), rand);

  for (const candidate of neutralCandidates) {
    if (placements.filter((placement) => placement.owner === null).length >= neutralPairs * 2) break;

    const mirror = mirrorPoint(width, height, candidate.x, candidate.y);
    if (key(candidate.x, candidate.y) === key(mirror.x, mirror.y)) continue;
    if (!isFarEnoughFromCities(candidate, placements, minimumDistance)) continue;
    if (!isFarEnoughFromCities(mirror, placements, minimumDistance)) continue;

    placements.push({ x: candidate.x, y: candidate.y, owner: null, cityName: "" });
    placements.push({ x: mirror.x, y: mirror.y, owner: null, cityName: "" });
  }

  const fallbackCandidates = buildNeutralCandidates(width, height);
  let fallbackIndex = 0;
  while (placements.filter((placement) => placement.owner === null).length < neutralPairs * 2) {
    const candidate = fallbackCandidates[fallbackIndex % fallbackCandidates.length] ?? { x: 2, y: 2 };
    const mirror = mirrorPoint(width, height, candidate.x, candidate.y);
    fallbackIndex += 1;

    if (placements.some((placement) => key(placement.x, placement.y) === key(candidate.x, candidate.y))) continue;
    if (placements.some((placement) => key(placement.x, placement.y) === key(mirror.x, mirror.y))) continue;

    placements.push({ x: candidate.x, y: candidate.y, owner: null, cityName: "" });
    placements.push({ x: mirror.x, y: mirror.y, owner: null, cityName: "" });
  }

  return assignCityNames(placements, rand, playerFaction, aiFaction);
}

function carveCityFootprint(map: Tile[][], x: number, y: number, gameType: GameType) {
  const height = map.length;
  const width = map[0]?.length ?? 0;

  map[y][x].terrain = "land";

  if (gameType === "ocean") {
    return;
  }

  for (const [dx, dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    map[ny][nx].terrain = "land";
  }
}

export function createMap(
  seed = 7,
  width = MIN_MAP_W,
  height = MIN_MAP_H,
  gameType: GameType = "normal",
  playerFaction: Faction = "usa",
  aiFaction: Faction = "asia"
): Tile[][] {
  const mapWidth = Math.max(width, MIN_MAP_W);
  const mapHeight = Math.max(height, MIN_MAP_H);
  const { map, rand } = createBaseTerrain(seed, mapWidth, mapHeight, gameType);
  const placements = createCityPlacements(mapWidth, mapHeight, rand, gameType, playerFaction, aiFaction);

  for (const placement of placements) {
    carveCityFootprint(map, placement.x, placement.y, gameType);
    const tile = map[placement.y][placement.x];
    tile.city = true;
    tile.owner = placement.owner;
    tile.cityName = placement.cityName;
    tile.production = null;
  }

  return map;
}

export function findOpenAdjacentLand(map: Tile[][], x: number, y: number) {
  const height = map.length;
  const width = map[0]?.length ?? 0;

  for (const [dx, dy] of DIRECTIONS) {
    const nx = clamp(x + dx, 0, width - 1);
    const ny = clamp(y + dy, 0, height - 1);
    const tile = map[ny][nx];
    if (tile.terrain === "water") continue;
    if (tile.city) continue;
    return { x: nx, y: ny };
  }

  return null;
}
