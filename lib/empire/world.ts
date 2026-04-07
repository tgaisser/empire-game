import { getFactionCapitalCity, getFactionCityNames } from "@/lib/empire/factions";
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

function shuffle<T>(items: T[], rand: () => number) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function getOrderedFactionCityNames(faction: Faction, rand: () => number) {
  const capitalCity = getFactionCapitalCity(faction);
  const cityNames = getFactionCityNames(faction);
  const remainingCityNames = cityNames.filter((name) => name !== capitalCity);

  return [capitalCity, ...shuffle(remainingCityNames, rand)];
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

  // Generate island chains like Indonesia / Philippines / Caribbean
  // Chains are linear sequences of islands with slight randomness
  const chainCount = Math.max(4, Math.floor((width * height) / 120));
  const minDim = Math.min(width, height);

  for (let c = 0; c < chainCount; c += 1) {
    // Chain start point — distributed across the map
    let cx = 2 + Math.floor(rand() * (width - 4));
    let cy = 2 + Math.floor(rand() * (height - 4));
    // Chain direction (angle in radians)
    const angle = rand() * Math.PI * 2;
    const stepX = Math.cos(angle);
    const stepY = Math.sin(angle);
    // Islands per chain
    const islandCount = 3 + Math.floor(rand() * 5);
    const spacing = Math.max(2.5, minDim * 0.08 + rand() * minDim * 0.06);

    for (let i = 0; i < islandCount; i += 1) {
      // Each island in the chain has some perpendicular scatter
      const perpOffset = (rand() - 0.5) * spacing * 0.6;
      const ix = Math.round(cx + perpOffset * -stepY);
      const iy = Math.round(cy + perpOffset * stepX);
      const radius = Math.max(1.2, minDim * 0.04 + rand() * minDim * 0.05);
      if (ix >= 2 && ix < width - 2 && iy >= 2 && iy < height - 2) {
        stampIsland(map, ix, iy, radius, rand, 0.08);
      }
      // Advance along the chain
      cx += stepX * spacing;
      cy += stepY * spacing;
    }
  }

  // Scatter some lone small islands for variety
  const scatterCount = Math.max(6, Math.floor((width * height) / 60));
  for (let i = 0; i < scatterCount; i += 1) {
    const x = 2 + Math.floor(rand() * (width - 4));
    const y = 2 + Math.floor(rand() * (height - 4));
    const radius = Math.max(0.8, minDim * 0.02 + rand() * minDim * 0.035);
    stampIsland(map, x, y, radius, rand, 0.06);
  }

  return { map, rand };
}

function createPangeaTerrain(seed: number, width: number, height: number) {
  const rand = rng(seed);
  const map = createEmptyMap(width, height, "water");

  // Main supercontinent — large elliptical landmass centered on the map
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const mainRx = Math.max(6, Math.floor(width * 0.38 + (rand() - 0.5) * width * 0.06));
  const mainRy = Math.max(5, Math.floor(height * 0.38 + (rand() - 0.5) * height * 0.06));
  fillEllipse(map, cx, cy, mainRx, mainRy, "land");

  // Add irregular lobes to make it look natural (not a perfect ellipse)
  const lobeCount = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < lobeCount; i += 1) {
    const angle = rand() * Math.PI * 2;
    const lobeCx = cx + Math.cos(angle) * mainRx * (0.5 + rand() * 0.45);
    const lobeCy = cy + Math.sin(angle) * mainRy * (0.5 + rand() * 0.45);
    const lobeRx = Math.max(2, Math.floor(mainRx * (0.2 + rand() * 0.25)));
    const lobeRy = Math.max(2, Math.floor(mainRy * (0.2 + rand() * 0.25)));
    fillEllipse(map, lobeCx, lobeCy, lobeRx, lobeRy, "land");
  }

  // Rift channels carving through the continent (it's breaking up)
  const riftCount = 2 + Math.floor(rand() * 2);
  for (let r = 0; r < riftCount; r += 1) {
    // Start from an edge of the continent
    const riftAngle = rand() * Math.PI * 2;
    let rx = cx + Math.cos(riftAngle) * mainRx * 0.7;
    let ry = cy + Math.sin(riftAngle) * mainRy * 0.7;
    const riftLength = Math.floor(Math.min(mainRx, mainRy) * (0.6 + rand() * 0.6));
    const riftDir = riftAngle + Math.PI + (rand() - 0.5) * 1.2;

    for (let s = 0; s < riftLength; s += 1) {
      const ix = Math.round(rx);
      const iy = Math.round(ry);
      if (ix >= 1 && ix < width - 1 && iy >= 1 && iy < height - 1) {
        map[iy][ix].terrain = "water";
        // Widen the rift slightly
        if (rand() < 0.5 && iy + 1 < height) map[iy + 1][ix].terrain = "water";
        if (rand() < 0.3 && ix + 1 < width) map[iy][ix + 1].terrain = "water";
      }
      rx += Math.cos(riftDir + (rand() - 0.5) * 0.6);
      ry += Math.sin(riftDir + (rand() - 0.5) * 0.6);
    }
  }

  // Breakaway landmasses (like Australia breaking off from Gondwana)
  const breakawayCount = 2 + Math.floor(rand() * 2);
  for (let b = 0; b < breakawayCount; b += 1) {
    const angle = rand() * Math.PI * 2;
    const dist = Math.max(mainRx, mainRy) * (0.9 + rand() * 0.5);
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist * (mainRy / Math.max(1, mainRx));
    const brx = Math.max(2, Math.floor(mainRx * (0.12 + rand() * 0.14)));
    const bry = Math.max(2, Math.floor(mainRy * (0.12 + rand() * 0.14)));
    fillEllipse(map, bx, by, brx, bry, "land");
    // Stepping-stone islands between breakaway and main continent
    const steps = 1 + Math.floor(rand() * 3);
    for (let s = 1; s <= steps; s += 1) {
      const t = s / (steps + 1);
      const sx = cx + (bx - cx) * t + (rand() - 0.5) * 3;
      const sy = cy + (by - cy) * t + (rand() - 0.5) * 3;
      stampIsland(map, Math.round(sx), Math.round(sy), 0.8 + rand() * 1.2, rand, 0.05);
    }
  }

  // Mountain ranges through the continent
  const mountainRanges = 2 + Math.floor(rand() * 3);
  for (let m = 0; m < mountainRanges; m += 1) {
    const mAngle = rand() * Math.PI;
    let mx = cx + Math.floor((rand() - 0.5) * mainRx * 0.8);
    let my = cy + Math.floor((rand() - 0.5) * mainRy * 0.8);
    const chainLen = 4 + Math.floor(rand() * 8);
    for (let s = 0; s < chainLen; s += 1) {
      if (mx >= 1 && mx < width - 1 && my >= 1 && my < height - 1 && map[my][mx].terrain === "land") {
        map[my][mx].terrain = "mountain";
        if (rand() < 0.4 && my + 1 < height && map[my + 1][mx].terrain === "land") {
          map[my + 1][mx].terrain = "mountain";
        }
      }
      mx += Math.round(Math.cos(mAngle) + (rand() - 0.5) * 0.8);
      my += Math.round(Math.sin(mAngle) + (rand() - 0.5) * 0.8);
    }
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

  if (gameType === "pangea") {
    return createPangeaTerrain(seed, width, height);
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
  const playerNames = getOrderedFactionCityNames(playerFaction, rand);
  const enemyNames = getOrderedFactionCityNames(aiFaction, rand);
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

function carveCityFootprint(map: Tile[][], x: number, y: number, gameType: GameType, isStartingCity: boolean) {
  const height = map.length;
  const width = map[0]?.length ?? 0;

  map[y][x].terrain = "land";

  if (gameType === "ocean") {
    return;
  }

  // Starting cities get a larger land footprint (radius 3) so units have room to maneuver
  const radius = isStartingCity ? 3 : 1;

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      map[ny][nx].terrain = "land";
    }
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
    carveCityFootprint(map, placement.x, placement.y, gameType, placement.owner === "player" || placement.owner === "ai");
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
