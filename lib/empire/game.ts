import {
  CITY_INCOME,
  DIRECTIONS,
  MAX_LOG,
  MIN_MAP_H,
  MIN_MAP_W,
  STARTING_CREDITS,
  TERRAIN,
  UNIT_STATS,
} from "@/lib/empire/config";
import type {
  Command,
  DeveloperPlacementType,
  Faction,
  GameState,
  GameType,
  ReachableMove,
  Side,
  Tile,
  TileImprovementType,
  TransportableTroopUnitType,
  TroopTransportCargo,
  Unit,
  UnitDomain,
  UnitType,
} from "@/lib/empire/types";
import { createMap } from "@/lib/empire/world";

const EXPLORATION_INCOME_STEP = 10;
const SITE_VISION_RANGE = 2;
const OUTPOST_MAX_HP = 12;
const OUTPOST_ARMOR = 2;

export function key(x: number, y: number) {
  return `${x},${y}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inBounds(x: number, y: number, width: number, height: number) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function distance(a: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">, b: Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

type TargetPoint = Pick<Tile, "x" | "y"> | Pick<Unit, "x" | "y">;

function createVisionMask(width: number, height: number) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => false));
}

function createIntelGrid(width: number, height: number) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => null));
}

function cloneTile(tile: Tile): Tile {
  return {
    ...tile,
    improvement: tile.improvement ? { ...tile.improvement } : null,
    improvementProject: tile.improvementProject ? { ...tile.improvementProject } : null,
    production: tile.production ? { ...tile.production } : null,
  };
}

function revealAround(mask: boolean[][], centerX: number, centerY: number, radius: number) {
  const width = mask[0]?.length ?? 0;
  const height = mask.length;

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (!inBounds(x, y, width, height)) continue;
      if (Math.abs(centerX - x) + Math.abs(centerY - y) > radius) continue;
      mask[y][x] = true;
    }
  }
}

export function getDetectedEnemyUnitIdSet(state: GameState, side: Side) {
  return new Set(side === "player" ? state.playerDetectedUnitIds : state.aiDetectedUnitIds);
}

function canUnitDetectTarget(observer: Unit, target: Unit) {
  const observerStats = getUnitStats(observer);
  if (target.type === "wraith" && observerStats.canDetectWraiths === false) return false;
  if (target.type === "special-ops" && observerStats.canDetectWraiths === false) return false;
  if (target.type === "submarine") return Boolean(observer.type === "destroyer" && observer.sonarUpgraded);
  return true;
}

function canUnitAttackDomain(attacker: Unit | UnitType, domain: UnitDomain) {
  const attackDomains = typeof attacker === "string" ? getUnitDefinition(attacker).attackDomains : getUnitStats(attacker).attackDomains;
  return attackDomains.includes(domain);
}

export function canUnitAttackTarget(attacker: Unit, defender: Unit) {
  const attackerStats = getUnitStats(attacker);
  const defenderStats = getUnitStats(defender);

  if (defenderStats.cannotBeAttacked) return false;
  if (!attackerStats.canAttack || !canUnitAttackDomain(attacker, defenderStats.domain)) return false;
  if (defender.type === "submarine") {
    return Boolean((attacker.type === "destroyer" && attacker.sonarUpgraded) || attacker.type === "submarine");
  }

  return true;
}

function isTransportableTroopType(unitType: UnitType): unitType is TransportableTroopUnitType {
  return ["infantry", "tank", "engineer", "wraith", "special-ops"].includes(unitType);
}

function getTroopTransportCargoSpaceRequired(unitType: TransportableTroopUnitType) {
  return unitType === "tank" ? 3 : 1;
}

function getTroopTransportUsedCapacity(cargo: TroopTransportCargo[] | null | undefined) {
  return (cargo ?? []).reduce((total, entry) => total + getTroopTransportCargoSpaceRequired(entry.type), 0);
}

export function getTroopTransportRemainingCapacity(unit: Unit | null) {
  if (!unit || unit.type !== "troop-transport") return 0;
  return Math.max(0, (getUnitStats(unit).transportCapacity ?? 0) - getTroopTransportUsedCapacity(unit.carriedTroops));
}

function canTroopTransportCarry(transport: Unit, troop: Unit) {
  if (transport.type !== "troop-transport") return false;
  if (!isTransportableTroopType(troop.type)) return false;
  return getTroopTransportRemainingCapacity(transport) >= getTroopTransportCargoSpaceRequired(troop.type);
}

function getOccupancyLayer(domain: UnitDomain) {
  return domain === "air" ? "air" : "surface";
}

function createUnit(id: number, owner: Side, type: UnitType, x: number, y: number, moveSpent = 0): Unit {
  const definition = getUnitDefinition(type);
  return {
    id,
    owner,
    type,
    name: null,
    x,
    y,
    hp: definition.maxHp,
    moveSpent,
    fortified: false,
    concealed: false,
    turnsAwayFromBase: 0,
    sonarUpgraded: false,
    radarRelayUpgraded: false,
    droneTargetX: null,
    droneTargetY: null,
    carriedSpecialOps: null,
    carriedTroops: null,
  };
}

function getLocationLabel(tile: Tile) {
  return tile.city && tile.cityName ? tile.cityName : `(${tile.x + 1}, ${tile.y + 1})`;
}

export function getImprovementLabel(improvementType: TileImprovementType) {
  if (improvementType === "bridge") return "Bridge";
  if (improvementType === "port") return "Port";
  if (improvementType === "tunnel") return "Tunnel";
  if (improvementType === "radar") return "Radar Upgrade";
  if (improvementType === "outpost") return "Outpost";
  return "Airfield";
}

export function getTileLabel(tile: Tile) {
  if (tile.city && tile.owner === "player") return tile.cityName ? `Player city: ${tile.cityName}` : "Player city";
  if (tile.city && tile.owner === "ai") return tile.cityName ? `Enemy city: ${tile.cityName}` : "Enemy city";
  if (tile.city) return tile.cityName ? `Neutral city: ${tile.cityName}` : "Neutral city";
  if (tile.improvementProject) return `${getImprovementLabel(tile.improvementProject.type)} under construction`;
  if (tile.improvement?.type === "outpost") return `Outpost (${tile.improvement.hp ?? OUTPOST_MAX_HP}/${tile.improvement.maxHp ?? OUTPOST_MAX_HP})`;
  if (tile.improvement) return `${getImprovementLabel(tile.improvement.type)} (${TERRAIN[tile.terrain].name})`;
  return TERRAIN[tile.terrain].name;
}

export function getUnitStats(unit: Unit) {
  const baseStats = UNIT_STATS[unit.type] ?? UNIT_STATS.infantry;
  if (unit.type === "wraith") {
    return {
      ...baseStats,
      vision: unit.extendedVision ? 5 : 3,
    };
  }
  return baseStats;
}

export function getUnitDefinition(unitType: UnitType) {
  return UNIT_STATS[unitType] ?? UNIT_STATS.infantry;
}

function getAssignedImprovementProjectTile(state: GameState, unitId: number) {
  for (const row of state.map) {
    for (const tile of row) {
      if (tile.improvementProject?.engineerUnitId === unitId) return tile;
    }
  }
  return null;
}

function getFriendlyCarrierAt(units: Unit[], x: number, y: number, side: Side) {
  return units.find((unit) => unit.owner === side && unit.type === "carrier" && unit.x === x && unit.y === y) ?? null;
}

function canUnitLandAtTile(state: GameState, tile: Tile | null, side: Side, unitType: UnitType, x?: number, y?: number) {
  if (!tile) return false;
  const definition = getUnitDefinition(unitType);
  if (definition.domain !== "air") return false;
  if (definition.canOnlyLandOnAirfield) {
    return tile.improvement?.type === "airfield" && (tile.improvement.owner === side || tile.owner === side);
  }
  if (tile.improvement?.type === "airfield" && (tile.improvement.owner === side || tile.owner === side)) return true;
  if (tile.city && tile.owner === side) return true;
  if (definition.canLandOnCarrier && x !== undefined && y !== undefined) {
    return Boolean(getFriendlyCarrierAt(state.units, x, y, side));
  }
  return false;
}

export function isFriendlyAirBase(tile: Tile | null, side: Side, state?: GameState, unitType?: UnitType, x?: number, y?: number) {
  if (!tile) return false;
  if (!state || !unitType || x === undefined || y === undefined) {
    if (tile.city && tile.owner === side) return true;
    return tile.improvement?.type === "airfield" && (tile.improvement.owner === side || tile.owner === side);
  }
  return canUnitLandAtTile(state, tile, side, unitType, x, y);
}

function isOwnedProductionSite(tile: Tile, side: Side) {
  if (tile.city && tile.owner === side) return true;
  return Boolean(
    tile.improvement &&
      tile.improvement.owner === side &&
      (tile.improvement.type === "port" || tile.improvement.type === "airfield")
  );
}

function isCoastalTile(state: GameState, tile: Tile) {
  return hasAdjacentWater(state, tile.x, tile.y);
}

function isFriendlyPortSite(state: GameState, tile: Tile | null, side: Side) {
  if (!tile) return false;
  if (tile.improvement?.type === "port" && tile.improvement.owner === side) return true;
  return Boolean(tile.city && tile.owner === side && isCoastalTile(state, tile));
}

export function canProduceUnitAtTile(state: GameState, tile: Tile, side: Side, unitType: UnitType) {
  const definition = getUnitDefinition(unitType);
  if (definition.domain === "air") {
    return tile.improvement?.type === "airfield" && tile.improvement.owner === side;
  }

  if (definition.domain === "sea") {
    const validSite =
      (tile.improvement?.type === "port" && tile.improvement.owner === side) ||
      Boolean(tile.city && tile.owner === side && isCoastalTile(state, tile));
    return validSite && getSeaSpawnTiles(state, tile).length > 0;
  }

  return tile.city && tile.owner === side;
}

export function getSeaSpawnTiles(state: GameState, tile: Tile, units: Unit[] = state.units) {
  const spawnTiles: Array<{ x: number; y: number }> = [];

  for (const [dx, dy] of DIRECTIONS) {
    const nx = tile.x + dx;
    const ny = tile.y + dy;
    if (!inBounds(nx, ny, state.mapWidth, state.mapHeight)) continue;
    const candidate = state.map[ny][nx];
    if (candidate.terrain !== "water") continue;
    if (getBlockingUnitAt(units, nx, ny, "sea")) continue;
    spawnTiles.push({ x: nx, y: ny });
  }

  return spawnTiles;
}

export function getDeveloperPlacementTargets(state: GameState, side: Side, unitType: UnitType) {
  const definition = getUnitDefinition(unitType);
  const candidateUnit = createUnit(-1, side, unitType, 0, 0);
  const targets: Tile[] = [];

  for (let y = 0; y < state.mapHeight; y += 1) {
    for (let x = 0; x < state.mapWidth; x += 1) {
      const tile = state.map[y][x];

      if (definition.domain === "air") {
        if (!canUnitLandAtTile(state, tile, side, unitType, x, y)) continue;
        if (!canStackAirUnitAt(state, x, y, side, unitType)) continue;
        targets.push(tile);
        continue;
      }

      if (definition.domain === "sea") {
        if (tile.terrain !== "water") continue;
        if (getBlockingUnitAt(state.units, x, y, "sea")) continue;
        targets.push(tile);
        continue;
      }

      candidateUnit.x = x;
      candidateUnit.y = y;
      if (getTerrainMoveCost(state, candidateUnit, tile) >= 999) continue;
      if (getBlockingUnitAt(state.units, x, y, "land")) continue;
      targets.push(tile);
    }
  }

  return targets;
}

export function getDeveloperImprovementPlacementTargets(
  state: GameState,
  side: Side,
  improvementType: DeveloperPlacementType
) {
  const targets: Tile[] = [];

  for (let y = 0; y < state.mapHeight; y += 1) {
    for (let x = 0; x < state.mapWidth; x += 1) {
      const tile = state.map[y][x];

      if (improvementType === "city") {
        if (tile.terrain === "land" && !tile.city && !tile.improvement && !tile.improvementProject) targets.push(tile);
        continue;
      }

      if (improvementType === "bridge") {
        if (canBuildBridgeAt(state, x, y)) targets.push(tile);
        continue;
      }

      if (improvementType === "port") {
        if (canBuildPort(tile) && hasAdjacentWater(state, x, y)) targets.push(tile);
        continue;
      }

      if (improvementType === "airfield") {
        if (canBuildAirfieldAt(tile)) targets.push(tile);
        continue;
      }

      if (improvementType === "tunnel") {
        if (canBuildTunnelAt(tile)) targets.push(tile);
        continue;
      }

      if (improvementType === "radar") {
        if (canBuildRadarAt(tile, side)) targets.push(tile);
        continue;
      }

      if (improvementType === "outpost") {
        if (canBuildOutpostAt(tile)) targets.push(tile);
      }
    }
  }

  return targets;
}

function getSpawnTileForProduction(
  state: GameState,
  tile: Tile,
  unitType: UnitType,
  units: Unit[],
  production?: Pick<NonNullable<Tile["production"]>, "spawnX" | "spawnY"> | null
) {
  const definition = getUnitDefinition(unitType);
  if (definition.domain === "air") {
    return canStackAirUnitAt(state, tile.x, tile.y, tile.owner ?? "player", unitType, units) ? { x: tile.x, y: tile.y } : null;
  }
  if (definition.domain !== "sea") return { x: tile.x, y: tile.y };

  if (production?.spawnX !== undefined && production.spawnY !== undefined) {
    const candidate = state.map[production.spawnY]?.[production.spawnX];
    if (candidate?.terrain === "water" && !getBlockingUnitAt(units, production.spawnX, production.spawnY, "sea")) {
      return { x: production.spawnX, y: production.spawnY };
    }
    return null;
  }

  return getSeaSpawnTiles(state, tile, units)[0] ?? null;
}

function getImprovementBuildTime(improvementType: TileImprovementType) {
  if (improvementType === "bridge") return 1;
  if (improvementType === "tunnel") return 2;
  if (improvementType === "airfield" || improvementType === "radar") return 3;
  return 3;
}

export function getImprovementBuildCost(improvementType: TileImprovementType) {
  if (improvementType === "port") return 8;
  if (improvementType === "airfield") return 10;
  if (improvementType === "radar") return 6;
  if (improvementType === "outpost") return 2;
  return 0;
}

function canBuildPort(tile: Tile) {
  return tile.terrain === "land" && !tile.city && !tile.improvement && !tile.improvementProject;
}

function canBuildTunnelAt(tile: Tile) {
  return tile.terrain === "mountain" && !tile.city && !tile.improvement && !tile.improvementProject;
}

function hasAdjacentWater(state: GameState, x: number, y: number) {
  return DIRECTIONS.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return inBounds(nx, ny, state.mapWidth, state.mapHeight) && state.map[ny][nx].terrain === "water";
  });
}

function canBuildBridgeAt(state: GameState, x: number, y: number) {
  if (!inBounds(x, y, state.mapWidth, state.mapHeight)) return false;
  const tile = state.map[y][x];
  if (tile.terrain !== "water" || tile.city || tile.improvement || tile.improvementProject) return false;

  for (const [dx, dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny, state.mapWidth, state.mapHeight)) continue;
    if (state.map[ny][nx].improvement?.type === "bridge") return false;
  }

  const horizontalBridge =
    inBounds(x - 1, y, state.mapWidth, state.mapHeight) &&
    inBounds(x + 1, y, state.mapWidth, state.mapHeight) &&
    state.map[y][x - 1].terrain !== "water" &&
    state.map[y][x + 1].terrain !== "water";

  const verticalBridge =
    inBounds(x, y - 1, state.mapWidth, state.mapHeight) &&
    inBounds(x, y + 1, state.mapWidth, state.mapHeight) &&
    state.map[y - 1][x].terrain !== "water" &&
    state.map[y + 1][x].terrain !== "water";

  return horizontalBridge || verticalBridge;
}

function canBuildAirfieldAt(tile: Tile) {
  return tile.terrain === "land" && !tile.city && !tile.improvement && !tile.improvementProject;
}

function canBuildOutpostAt(tile: Tile) {
  return tile.terrain === "land" && !tile.city && !tile.improvement && !tile.improvementProject;
}

function canBuildRadarAt(tile: Tile, side: Side) {
  return (
    tile.improvement?.type === "airfield" &&
    tile.improvement.owner === side &&
    !tile.improvement.hasRadar &&
    !tile.improvementProject
  );
}

export function getEngineerBuildOptions(state: GameState, unit: Unit | null) {
  if (!unit || unit.type !== "engineer" || getRemainingMove(unit) <= 0) {
    return { portTargets: [] as Tile[], airfieldTargets: [] as Tile[], radarTargets: [] as Tile[], tunnelTargets: [] as Tile[], outpostTargets: [] as Tile[], bridgeTargets: [] as Tile[] };
  }
  if (getAssignedImprovementProjectTile(state, unit.id)) {
    return { portTargets: [] as Tile[], airfieldTargets: [] as Tile[], radarTargets: [] as Tile[], tunnelTargets: [] as Tile[], outpostTargets: [] as Tile[], bridgeTargets: [] as Tile[] };
  }

  const adjacentTiles = DIRECTIONS
    .map(([dx, dy]) => {
      const x = unit.x + dx;
      const y = unit.y + dy;
      return inBounds(x, y, state.mapWidth, state.mapHeight) ? state.map[y][x] : null;
    })
    .filter((tile): tile is Tile => Boolean(tile));

  const portTargets = adjacentTiles.filter((tile) => canBuildPort(tile) && hasAdjacentWater(state, tile.x, tile.y));
  const airfieldTargets = adjacentTiles.filter((tile) => canBuildAirfieldAt(tile));
  const radarTargets = adjacentTiles.filter((tile) => canBuildRadarAt(tile, unit.owner));
  const tunnelTargets = adjacentTiles.filter((tile) => canBuildTunnelAt(tile));
  const outpostTargets = adjacentTiles.filter((tile) => canBuildOutpostAt(tile));
  const bridgeTargets = DIRECTIONS
    .map(([dx, dy]) => {
      const x = unit.x + dx;
      const y = unit.y + dy;
      return inBounds(x, y, state.mapWidth, state.mapHeight) ? state.map[y][x] : null;
    })
    .filter((tile): tile is Tile => {
      if (!tile) return false;
      return canBuildBridgeAt(state, tile.x, tile.y);
    });

  return {
    portTargets,
    airfieldTargets,
    radarTargets,
    tunnelTargets,
    outpostTargets,
    bridgeTargets,
  };
}

export function getRemainingMove(unit: Unit) {
  return Math.max(0, getUnitStats(unit).move - unit.moveSpent);
}

export function getSpecialOpsAirStrikeTargets(state: GameState, unit: Unit | null) {
  if (!unit || unit.type !== "special-ops" || getRemainingMove(unit) <= 0) return [] as Tile[];

  return state.map
    .flat()
    .filter((tile) => {
      if (!(unit.owner === "player" ? state.playerVisible[tile.y]?.[tile.x] : state.aiVisible[tile.y]?.[tile.x])) return false;
      if (distance(unit, tile) > 3) return false;
      return getAttackableOccupantsOnTile(state, tile.x, tile.y, unit.owner, unit).length > 0;
    });
}

export function getSpecialOpsDeploymentTargets(state: GameState, unit: Unit | null) {
  if (!unit || unit.type !== "submarine" || !unit.carriedSpecialOps) return [] as Tile[];

  return DIRECTIONS
    .map(([dx, dy]) => {
      const x = unit.x + dx;
      const y = unit.y + dy;
      return inBounds(x, y, state.mapWidth, state.mapHeight) ? state.map[y][x] : null;
    })
    .filter((tile): tile is Tile => Boolean(tile))
    .filter((tile) => tile.terrain !== "water" && !getBlockingUnitAt(state.units, tile.x, tile.y, "land"));
}

export function getTroopTransportLoadTargets(state: GameState, unit: Unit | null) {
  if (!unit || unit.type !== "troop-transport" || getTroopTransportRemainingCapacity(unit) <= 0) return [] as Unit[];

  return state.units.filter((candidate) => {
    if (candidate.owner !== unit.owner) return false;
    if (!isTransportableTroopType(candidate.type)) return false;
    if (getRemainingMove(candidate) <= 0) return false;
    if (distance(unit, candidate) !== 1) return false;
    const embarkTile = state.map[candidate.y]?.[candidate.x] ?? null;
    if (!isFriendlyPortSite(state, embarkTile, unit.owner)) return false;
    return canTroopTransportCarry(unit, candidate);
  });
}

export function getTroopTransportDeploymentTargets(state: GameState, unit: Unit | null) {
  if (!unit || unit.type !== "troop-transport" || !(unit.carriedTroops?.length)) return [] as Tile[];

  return DIRECTIONS
    .map(([dx, dy]) => {
      const x = unit.x + dx;
      const y = unit.y + dy;
      return inBounds(x, y, state.mapWidth, state.mapHeight) ? state.map[y][x] : null;
    })
    .filter((tile): tile is Tile => Boolean(tile))
    .filter((tile) => tile.terrain !== "water" && !getBlockingUnitAt(state.units, tile.x, tile.y, "land"));
}

export function isUnitConcealedFromSide(unit: Unit, side: Side) {
  return unit.owner !== side && unit.concealed;
}

export function getUnitAt(units: Unit[], x: number, y: number) {
  return units.find((unit) => unit.x === x && unit.y === y) ?? null;
}

export function getUnitsAt(units: Unit[], x: number, y: number) {
  return units.filter((unit) => unit.x === x && unit.y === y);
}

function getAirUnitsAtForSide(units: Unit[], x: number, y: number, side: Side) {
  return units.filter((unit) => unit.x === x && unit.y === y && getUnitStats(unit).domain === "air" && unit.owner === side);
}

function getAirCapacityAtTile(state: GameState, x: number, y: number, side: Side, unitType?: UnitType) {
  const tile = state.map[y]?.[x] ?? null;
  if (!tile) return 0;
  if (!unitType) {
    if (getFriendlyCarrierAt(state.units, x, y, side)) return 4;
    return isFriendlyAirBase(tile, side) ? 1 : 0;
  }
  if (getUnitDefinition(unitType).canLandOnCarrier && getFriendlyCarrierAt(state.units, x, y, side)) return 4;
  return canUnitLandAtTile(state, tile, side, unitType, x, y) ? 1 : 0;
}

function canStackAirUnitAt(state: GameState, x: number, y: number, side: Side, unitType: UnitType, units: Unit[] = state.units) {
  const capacity = getAirCapacityAtTile({ ...state, units }, x, y, side, unitType);
  if (capacity <= 0) return false;
  const friendlyAirCount = getAirUnitsAtForSide(units, x, y, side).length;
  return friendlyAirCount < capacity;
}

export function getBlockingUnitAt(units: Unit[], x: number, y: number, domain: UnitDomain) {
  const occupancyLayer = getOccupancyLayer(domain);
  return (
    units.find((unit) => {
      if (unit.x !== x || unit.y !== y) return false;
      return getOccupancyLayer(getUnitStats(unit).domain) === occupancyLayer;
    }) ?? null
  );
}

export function getPreferredDisplayUnitAt(units: Unit[], x: number, y: number) {
  const tileUnits = getUnitsAt(units, x, y);
  return tileUnits.find((unit) => getUnitStats(unit).domain !== "air") ?? tileUnits[0] ?? null;
}

export function getCarrierRelayAttackTargets(state: GameState, unit: Unit | null) {
  if (!unit || unit.type !== "destroyer") return [] as Tile[];

  const carriers = state.units.filter(
    (candidate) =>
      candidate.owner === unit.owner &&
      candidate.type === "carrier" &&
      candidate.radarRelayUpgraded &&
      distance(candidate, unit) <= (getUnitStats(candidate).radarRelayRange ?? 0)
  );

  if (carriers.length === 0) return [] as Tile[];

  const detectedEnemyUnitIds = getDetectedEnemyUnitIdSet(state, unit.owner);
  const targets: Tile[] = [];
  for (const enemyUnit of state.units) {
    if (enemyUnit.owner === unit.owner) continue;
    if (getUnitStats(enemyUnit).domain !== "air") continue;
    if (!detectedEnemyUnitIds.has(enemyUnit.id)) continue;
    if (!canUnitAttackTarget(unit, enemyUnit)) continue;
    if (
      carriers.some(
        (carrier) => distance(carrier, enemyUnit) <= (getUnitStats(carrier).radarRelayRange ?? 0)
      )
    ) {
      const tile = state.map[enemyUnit.y]?.[enemyUnit.x];
      if (tile) targets.push(tile);
    }
  }
  return targets;
}

export function getCarrierJamTargets(state: GameState, unit: Unit | null) {
  if (!unit || unit.type !== "carrier") return [] as Tile[];
  return state.map
    .flat()
    .filter((tile) => {
      if (distance(unit, tile) > 2) return false;
      const drone = state.units.find(
        (candidate) => candidate.x === tile.x && candidate.y === tile.y && candidate.owner !== unit.owner && candidate.type === "drone-swarm"
      );
      return Boolean(drone);
    });
}

function getVisibleUnitAtForSide(state: GameState, x: number, y: number, side: Side, moverDomain?: UnitDomain) {
  const detectedEnemyUnitIds = getDetectedEnemyUnitIdSet(state, side);
  const occupancyLayer = moverDomain ? getOccupancyLayer(moverDomain) : null;
  return (
    state.units.find((unit) => {
      if (unit.x !== x || unit.y !== y) return false;
      if (occupancyLayer && getOccupancyLayer(getUnitStats(unit).domain) !== occupancyLayer) return false;
      if (unit.owner === side) return true;
      return detectedEnemyUnitIds.has(unit.id);
    }) ?? null
  );
}

function getAttackableVisibleUnitAtForSide(state: GameState, x: number, y: number, side: Side, attacker: Unit) {
  const detectedEnemyUnitIds = getDetectedEnemyUnitIdSet(state, side);
  return (
    state.units.find((unit) => {
      if (unit.x !== x || unit.y !== y) return false;
      if (unit.owner === side) return false;
      if (!detectedEnemyUnitIds.has(unit.id)) return false;
      return canUnitAttackTarget(attacker, unit);
    }) ?? null
  );
}

function getAttackableUnitAt(state: GameState, x: number, y: number, side: Side, attacker: Unit) {
  return (
    state.units.find((unit) => {
      if (unit.x !== x || unit.y !== y) return false;
      if (unit.owner === side) return false;
      if (unit.concealed) return false;
      return canUnitAttackTarget(attacker, unit);
    }) ?? null
  );
}

function getAttackableOccupantsOnTile(state: GameState, x: number, y: number, side: Side, attacker: Unit) {
  return state.units.filter((unit) => {
    if (unit.x !== x || unit.y !== y) return false;
    if (unit.owner === side) return false;
    if (unit.concealed) return false;
    return canUnitAttackTarget(attacker, unit);
  });
}

export function getTerrainMoveCost(state: GameState, unit: Unit, tile: Tile) {
  const definition = getUnitStats(unit);

  if (definition.domain === "air") return 1;
  if (definition.domain === "sea") return tile.terrain === "water" ? 1 : 999;
  if (tile.improvement?.type === "bridge" && definition.domain === "land") return 1;
  if (tile.improvement?.type === "tunnel" && tile.terrain === "mountain" && definition.domain === "land") return 1;
  if (unit.type === "tank" && tile.terrain === "mountain") return 999;
  if (unit.type === "wraith" && tile.terrain === "water") return definition.move;
  if (tile.terrain === "water") return 999;

  if (tile.terrain === "mountain" && definition.domain === "land") return 2;

  return TERRAIN[tile.terrain].moveCost;
}

function refreshSideIntel(state: GameState, side: Side) {
  const visible = createVisionMask(state.mapWidth, state.mapHeight);
  const previousIntel = side === "player" ? state.playerIntel : state.aiIntel;
  const intel = previousIntel.map((row) => row.map((tile) => (tile ? cloneTile(tile) : null)));
  const detectedEnemyUnitIds = new Set<number>();
  const enemyUnits = state.units.filter((unit) => unit.owner !== side);

  for (const row of state.map) {
    for (const tile of row) {
      const providesStaticVision =
        (tile.city && tile.owner === side) ||
        ((tile.improvement?.type === "port" || tile.improvement?.type === "airfield" || tile.improvement?.type === "outpost") && tile.improvement.owner === side);
      if (!providesStaticVision) continue;

      revealAround(visible, tile.x, tile.y, SITE_VISION_RANGE);
      for (const enemyUnit of enemyUnits) {
        if (enemyUnit.concealed) continue;
        if (distance(tile, enemyUnit) <= SITE_VISION_RANGE) {
          detectedEnemyUnitIds.add(enemyUnit.id);
        }
      }
    }
  }

  for (const unit of state.units) {
    if (unit.owner !== side) continue;

    const unitStats = getUnitStats(unit);
    revealAround(visible, unit.x, unit.y, unitStats.vision);

    for (const enemyUnit of enemyUnits) {
      if (enemyUnit.concealed) continue;
      if (distance(unit, enemyUnit) > unitStats.vision) continue;
      if (!canUnitDetectTarget(unit, enemyUnit)) continue;
      detectedEnemyUnitIds.add(enemyUnit.id);
    }

    if (unitStats.airDetectionRange) {
      for (const enemyUnit of enemyUnits) {
        if (getUnitStats(enemyUnit).domain !== "air") continue;
        if (distance(unit, enemyUnit) > unitStats.airDetectionRange) continue;
        if (inBounds(enemyUnit.x, enemyUnit.y, state.mapWidth, state.mapHeight)) {
          visible[enemyUnit.y][enemyUnit.x] = true;
        }
        detectedEnemyUnitIds.add(enemyUnit.id);
      }
    }
  }

  for (const row of state.map) {
    for (const tile of row) {
      if (tile.improvement?.type !== "airfield" || tile.improvement.owner !== side || !tile.improvement.hasRadar) continue;
      for (const enemyUnit of enemyUnits) {
        if (getUnitStats(enemyUnit).domain !== "air") continue;
        if (distance(tile, enemyUnit) <= 5) {
          if (inBounds(enemyUnit.x, enemyUnit.y, state.mapWidth, state.mapHeight)) {
            visible[enemyUnit.y][enemyUnit.x] = true;
          }
          detectedEnemyUnitIds.add(enemyUnit.id);
        }
      }
    }
  }

  for (let y = 0; y < state.mapHeight; y += 1) {
    for (let x = 0; x < state.mapWidth; x += 1) {
      if (visible[y][x]) {
        intel[y][x] = cloneTile(state.map[y][x]);
      }
    }
  }

  return { visible, intel, detectedEnemyUnitIds: [...detectedEnemyUnitIds] };
}

export function refreshIntel(state: GameState): GameState {
  const playerIntelState = refreshSideIntel(state, "player");
  const aiIntelState = refreshSideIntel(state, "ai");

  return {
    ...state,
    playerVisible: playerIntelState.visible,
    playerIntel: playerIntelState.intel,
    aiVisible: aiIntelState.visible,
    aiIntel: aiIntelState.intel,
    playerDetectedUnitIds: playerIntelState.detectedEnemyUnitIds,
    aiDetectedUnitIds: aiIntelState.detectedEnemyUnitIds,
  };
}

export function createInitialState(
  seed = 7,
  width = MIN_MAP_W,
  height = MIN_MAP_H,
  gameType: GameType = "normal",
  playerFaction: Faction = "usa",
  aiFaction: Faction = "asia"
): GameState {
  const map = createMap(seed, width, height, gameType, playerFaction, aiFaction);
  const mapWidth = map[0]?.length ?? MIN_MAP_W;
  const mapHeight = map.length || MIN_MAP_H;
  const playerCity = map.flat().find((tile) => tile.city && tile.owner === "player");
  const aiCity = map.flat().find((tile) => tile.city && tile.owner === "ai");
  const units: Unit[] = [];

  if (playerCity) {
    units.push(createUnit(1, "player", "infantry", playerCity.x, playerCity.y));
  }
  if (aiCity) {
    units.push(createUnit(2, "ai", "infantry", aiCity.x, aiCity.y));
  }

  const initialState: GameState = {
      seed,
      gameType,
      playerFaction,
      aiFaction,
      mapWidth,
    mapHeight,
    map,
    units,
    turn: 1,
    side: "player",
    credits: { player: STARTING_CREDITS, ai: STARTING_CREDITS },
    selectedUnitId: null,
    logs: [
      "Welcome, commander.",
      "Capture cities, scout the map, and build a force strong enough to break the enemy capital.",
    ],
    nextUnitId: units.length + 1,
    winner: null,
    playerVisible: createVisionMask(mapWidth, mapHeight),
    playerIntel: createIntelGrid(mapWidth, mapHeight),
    aiVisible: createVisionMask(mapWidth, mapHeight),
    aiIntel: createIntelGrid(mapWidth, mapHeight),
    playerDetectedUnitIds: [],
    aiDetectedUnitIds: [],
  };

  return refreshIntel(initialState);
}

export function addLog(state: GameState, message: string): GameState {
  return { ...state, logs: [...state.logs, message].slice(-MAX_LOG) };
}

export function addCredits(state: GameState, side: Side, amount: number) {
  if (amount === 0) return state;
  return addLog(
    {
      ...state,
      credits: {
        ...state.credits,
        [side]: Math.max(0, state.credits[side] + amount),
      },
    },
    side === "player" ? `Developer grant: +${amount} credits.` : `Developer grant applied to ${side}.`
  );
}

export function addDeveloperUnit(state: GameState, side: Side, unitType: UnitType, x: number, y: number) {
  const tile = state.map[y]?.[x];
  if (!tile) return state;
  const validTargets = getDeveloperPlacementTargets(state, side, unitType);
  if (!validTargets.some((candidate) => candidate.x === x && candidate.y === y)) return state;

  const nextUnit = createUnit(state.nextUnitId, side, unitType, x, y, 0);
  return finalizeState(
    addLog(
      {
        ...state,
        units: [...state.units, nextUnit],
        nextUnitId: state.nextUnitId + 1,
      },
      side === "player"
        ? `Developer placed ${getUnitDefinition(unitType).name} at ${getLocationLabel(tile)}.`
        : `Developer placed ${getUnitDefinition(unitType).name.toLowerCase()} for ${side}.`
    )
  );
}

export function addDeveloperImprovement(
  state: GameState,
  side: Side,
  improvementType: DeveloperPlacementType,
  x: number,
  y: number
) {
  const tile = state.map[y]?.[x];
  if (!tile) return state;

  const validTargets = getDeveloperImprovementPlacementTargets(state, side, improvementType);
  if (!validTargets.some((candidate) => candidate.x === x && candidate.y === y)) return state;

  const nextMap = state.map.map((row) => row.map((cell) => cloneTile(cell)));
  const nextTile = nextMap[y][x];
  nextTile.improvementProject = null;

  if (improvementType === "city") {
    nextTile.city = true;
    nextTile.owner = side;
    nextTile.cityName = null;
    nextTile.production = null;
  } else if (improvementType === "radar") {
    if (!nextTile.improvement || nextTile.improvement.type !== "airfield") return state;
    nextTile.improvement = {
      ...nextTile.improvement,
      owner: side,
      hasRadar: true,
    };
    nextTile.owner = side;
  } else {
    nextTile.improvement = {
      type: improvementType,
      owner: side,
      hasRadar: improvementType === "airfield" ? false : undefined,
      hp: improvementType === "outpost" ? OUTPOST_MAX_HP : undefined,
      maxHp: improvementType === "outpost" ? OUTPOST_MAX_HP : undefined,
    };
    nextTile.owner = side;
  }

  return finalizeState(
    addLog(
      {
        ...state,
        map: nextMap,
      },
      side === "player"
        ? `Developer placed ${improvementType === "city" ? "city" : getImprovementLabel(improvementType).toLowerCase()} at ${getLocationLabel(nextTile)}.`
        : `Developer placed enemy ${improvementType === "city" ? "city" : getImprovementLabel(improvementType).toLowerCase()} at ${getLocationLabel(nextTile)}.`
    )
  );
}

export function renameCity(state: GameState, x: number, y: number, name: string) {
  const tile = state.map[y]?.[x];
  if (!tile || !tile.city) return state;
  const trimmed = name.trim();
  if (!trimmed) return state;
  const nextMap = state.map.map((row) => row.map((cell) => cloneTile(cell)));
  nextMap[y][x].cityName = trimmed;
  return {
    ...state,
    map: nextMap,
  };
}

export function renameUnit(state: GameState, unitId: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return state;
  return {
    ...state,
    units: state.units.map((unit) => (unit.id === unitId ? { ...unit, name: trimmed } : unit)),
  };
}

export function forceWinner(state: GameState, winner: Side) {
  const updatedState = refreshIntel(
    addLog(
      {
        ...state,
      },
      winner === "player" ? "Developer override: victory triggered." : "Developer override: defeat triggered."
    )
  );

  return {
    ...updatedState,
    winner,
  };
}

export function getCityCount(map: Tile[][], owner: Side) {
  let total = 0;
  for (const row of map) {
    for (const tile of row) {
      if (tile.city && tile.owner === owner) total += 1;
    }
  }
  return total;
}

export function getBusyCityCount(map: Tile[][], owner: Side) {
  let total = 0;
  for (const row of map) {
    for (const tile of row) {
      if (tile.city && tile.owner === owner && tile.production) total += 1;
    }
  }
  return total;
}

export function getCityIncome(state: GameState, side: Side) {
  let total = 0;
  for (const row of state.map) {
    for (const tile of row) {
      if (!tile.city || tile.owner !== side || tile.production) continue;
      total += CITY_INCOME;
    }
  }
  return total;
}

function getExploredTileCount(intel: (Tile | null)[][]) {
  let total = 0;
  for (const row of intel) {
    for (const tile of row) {
      if (tile) total += 1;
    }
  }
  return total;
}

export function getExploredPercent(state: GameState, side: Side) {
  const intel = side === "player" ? state.playerIntel : state.aiIntel;
  const exploredTiles = getExploredTileCount(intel);
  return Math.floor((exploredTiles / (state.mapWidth * state.mapHeight)) * 100);
}

export function getExplorationIncome(state: GameState, side: Side) {
  const exploredPercent = getExploredPercent(state, side);
  return Math.floor(exploredPercent / EXPLORATION_INCOME_STEP);
}

export function countForces(units: Unit[], owner: Side) {
  return units.filter((unit) => unit.owner === owner).length;
}

export function getReachableMoves(state: GameState, unit: Unit | null): ReachableMove[] {
  if (!unit || getRemainingMove(unit) <= 0) return [];
  if (unit.type === "engineer" && getAssignedImprovementProjectTile(state, unit.id)) return [];
  if (state.side === "player" && unit.owner === "player" && unit.type === "drone-swarm") return [];

  const unitStats = getUnitStats(unit);
  const maxMove = getRemainingMove(unit);
  const originX = unit.x;
  const originY = unit.y;
  const frontier = [{ x: unit.x, y: unit.y, cost: 0 }];
  const bestCost = new Map([[key(unit.x, unit.y), 0]]);
  const parents = new Map<string, string>();
  const reachable: ReachableMove[] = [];

  function buildPath(destinationX: number, destinationY: number) {
    const path: Array<{ x: number; y: number }> = [];
    let currentKey = key(destinationX, destinationY);

    while (currentKey !== key(originX, originY)) {
      const [xString, yString] = currentKey.split(",");
      path.unshift({ x: Number(xString), y: Number(yString) });
      const parentKey = parents.get(currentKey);
      if (!parentKey) break;
      currentKey = parentKey;
    }

    return path;
  }

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift();
    if (!current) break;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!inBounds(nx, ny, state.mapWidth, state.mapHeight)) continue;

      const tile = state.map[ny][nx];
      const terrainCost = getTerrainMoveCost(state, unit, tile);
      if (terrainCost >= 999) continue;

      const totalCost = current.cost + terrainCost;
      if (totalCost > maxMove) continue;

      const tileKey = key(nx, ny);
      const previousBest = bestCost.get(tileKey);
      if (previousBest !== undefined && previousBest <= totalCost) continue;

      let blockingOccupant = getVisibleUnitAtForSide(state, nx, ny, unit.owner, getUnitStats(unit).domain);
      const attackableOccupant = getAttackableVisibleUnitAtForSide(state, nx, ny, unit.owner, unit);
      if (
        getUnitStats(unit).domain === "air" &&
        blockingOccupant?.owner === unit.owner &&
        canStackAirUnitAt(state, nx, ny, unit.owner, unit.type)
      ) {
        blockingOccupant = null;
      }
      if (blockingOccupant && blockingOccupant.owner === unit.owner) continue;
      if (blockingOccupant && blockingOccupant.owner !== unit.owner && !attackableOccupant) continue;
      if (attackableOccupant && !unitStats.canAttack) continue;

      bestCost.set(tileKey, totalCost);
      parents.set(tileKey, key(current.x, current.y));
      reachable.push({
        x: nx,
        y: ny,
        cost: totalCost,
        occupiedByEnemy: !!attackableOccupant,
        approachX: current.x,
        approachY: current.y,
        path: buildPath(nx, ny),
      });

      if (!blockingOccupant && !attackableOccupant) {
        frontier.push({ x: nx, y: ny, cost: totalCost });
      }
    }
  }

  for (const relayTarget of getCarrierRelayAttackTargets(state, unit)) {
    const relayKey = key(relayTarget.x, relayTarget.y);
    if (reachable.some((move) => key(move.x, move.y) === relayKey)) continue;
    reachable.push({
      x: relayTarget.x,
      y: relayTarget.y,
      cost: maxMove,
      occupiedByEnemy: true,
      approachX: unit.x,
      approachY: unit.y,
      path: [],
    });
  }

  return reachable;
}

export function getReachableMovesFromIntel(state: GameState, unit: Unit | null): ReachableMove[] {
  if (!unit || getRemainingMove(unit) <= 0) return [];
  if (unit.type === "engineer" && getAssignedImprovementProjectTile(state, unit.id)) return [];

  const maxMove = getRemainingMove(unit);
  const canAttack = getUnitStats(unit).canAttack;
  const intel = unit.owner === "player" ? state.playerIntel : state.aiIntel;
  const originX = unit.x;
  const originY = unit.y;
  const frontier = [{ x: unit.x, y: unit.y, cost: 0 }];
  const bestCost = new Map([[key(unit.x, unit.y), 0]]);
  const parents = new Map<string, string>();
  const reachable: ReachableMove[] = [];

  function buildPath(destinationX: number, destinationY: number) {
    const path: Array<{ x: number; y: number }> = [];
    let currentKey = key(destinationX, destinationY);

    while (currentKey !== key(originX, originY)) {
      const [xString, yString] = currentKey.split(",");
      path.unshift({ x: Number(xString), y: Number(yString) });
      const parentKey = parents.get(currentKey);
      if (!parentKey) break;
      currentKey = parentKey;
    }

    return path;
  }

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift();
    if (!current) break;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!inBounds(nx, ny, state.mapWidth, state.mapHeight)) continue;

      const knownTile = intel[ny][nx];
      if (!knownTile) continue;

      const terrainCost = getTerrainMoveCost(state, unit, knownTile);
      if (terrainCost >= 999) continue;

      const totalCost = current.cost + terrainCost;
      if (totalCost > maxMove) continue;

      const tileKey = key(nx, ny);
      const previousBest = bestCost.get(tileKey);
      if (previousBest !== undefined && previousBest <= totalCost) continue;

      let blockingOccupant = getVisibleUnitAtForSide(state, nx, ny, unit.owner, getUnitStats(unit).domain);
      const attackableOccupant = getAttackableVisibleUnitAtForSide(state, nx, ny, unit.owner, unit);
      if (
        getUnitStats(unit).domain === "air" &&
        blockingOccupant?.owner === unit.owner &&
        canStackAirUnitAt(state, nx, ny, unit.owner, unit.type)
      ) {
        blockingOccupant = null;
      }
      if (blockingOccupant && blockingOccupant.owner === unit.owner) continue;
      if (blockingOccupant && blockingOccupant.owner !== unit.owner && !attackableOccupant) continue;
      if (attackableOccupant && !canAttack) continue;

      bestCost.set(tileKey, totalCost);
      parents.set(tileKey, key(current.x, current.y));
      reachable.push({
        x: nx,
        y: ny,
        cost: totalCost,
        occupiedByEnemy: !!attackableOccupant,
        approachX: current.x,
        approachY: current.y,
        path: buildPath(nx, ny),
      });

      if (!blockingOccupant && !attackableOccupant) {
        frontier.push({ x: nx, y: ny, cost: totalCost });
      }
    }
  }

  for (const relayTarget of getCarrierRelayAttackTargets(state, unit)) {
    const relayKey = key(relayTarget.x, relayTarget.y);
    if (reachable.some((move) => key(move.x, move.y) === relayKey)) continue;
    reachable.push({
      x: relayTarget.x,
      y: relayTarget.y,
      cost: maxMove,
      occupiedByEnemy: true,
      approachX: unit.x,
      approachY: unit.y,
      path: [],
    });
  }

  return reachable;
}

function setDroneTarget(state: GameState, side: Side, unitId: number, x: number, y: number): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== side || unit.type !== "drone-swarm") return state;
  if (!inBounds(x, y, state.mapWidth, state.mapHeight)) return state;
  if (unit.x === x && unit.y === y) return state;

  const targetedState = finalizeState(
    addLog(
      {
        ...state,
        units: state.units.map((currentUnit) =>
          currentUnit.id === unitId
            ? { ...currentUnit, droneTargetX: x, droneTargetY: y }
            : currentUnit
        ),
        selectedUnitId: side === "player" ? unitId : state.selectedUnitId,
      },
      side === "player"
        ? `Drone swarm assigned strike square (${x + 1}, ${y + 1}).`
        : `Enemy drone swarm assigned a strike corridor.`
    )
  );

  return processDroneSwarmOrders(targetedState, side);
}

function getDefenderArmorBonus(state: GameState, defender: Unit) {
  if (defender.type !== "troop-transport") return 0;
  return state.units.some(
    (unit) => unit.owner === defender.owner && unit.type === "destroyer" && unit.id !== defender.id && distance(unit, defender) <= 2
  )
    ? 2
    : 0;
}

function getFriendlySiteSupportCount(state: GameState, tile: Tile) {
  if (!tile.owner) return 0;
  return Math.min(4, state.units.filter((unit) => unit.owner === tile.owner && distance(unit, tile) === 1).length);
}

function getStrategicSiteDefenseBonus(state: GameState, tile: Tile) {
  if (!tile.owner) return 0;
  const supportCount = getFriendlySiteSupportCount(state, tile);

  if (tile.city) return 2 + supportCount;
  if (tile.improvement?.type === "airfield") return (tile.improvement.hasRadar ? 4 : 2) + supportCount;
  if (tile.improvement?.type === "port") return 2 + supportCount;
  return 0;
}

function resolveSiteCaptureDefense(state: GameState, attacker: Unit, tile: Tile) {
  const attackerStats = getUnitStats(attacker);
  const cityDefense = Math.max(0, getStrategicSiteDefenseBonus(state, tile) - attackerStats.piercing);
  const capturePower = attackerStats.atk + Math.floor(Math.random() * 3);

  return capturePower > cityDefense;
}

function resolveOutpostAssault(attacker: Unit, tile: Tile) {
  const attackerStats = getUnitStats(attacker);
  const structureHp = tile.improvement?.hp ?? OUTPOST_MAX_HP;
  const damage = clamp(
    attackerStats.atk + Math.floor(Math.random() * 3) - Math.max(0, OUTPOST_ARMOR - attackerStats.piercing),
    1,
    7
  );
  const remainingHp = Math.max(0, structureHp - damage);

  return {
    damage,
    remainingHp,
    destroyed: remainingHp <= 0,
  };
}

function resolveCombat(attacker: Unit, defender: Unit, options?: { defenderFortified?: boolean; defenderArmorBonus?: number }) {
  const attackerStats = getUnitStats(attacker);
  const defenderStats = getUnitStats(defender);
  if (attacker.type === "submarine" && defender.type === "carrier") {
    return {
      defenderHp: 0,
      attackerHp: attacker.hp,
      defenderDamage: defender.hp,
      attackerDamage: 0,
    };
  }
  const defenderDamageReduction = options?.defenderFortified && !attackerStats.ignoresFortification ? 1 : 0;
  const effectiveDefenderArmor = Math.max(0, defenderStats.armor + (options?.defenderArmorBonus ?? 0) - attackerStats.piercing);
  const effectiveAttackerArmor = Math.max(0, attackerStats.armor - defenderStats.piercing);
  const attackerBaseAttack = attackerStats.atk + (defenderStats.domain === "air" ? attackerStats.antiAirBonus ?? 0 : 0);
  const defenderBaseAttack = defenderStats.atk + (attackerStats.domain === "air" ? defenderStats.antiAirBonus ?? 0 : 0);
  let defenderDamage = attackerStats.canAttack
    ? clamp(attackerBaseAttack + Math.floor(Math.random() * 3) - effectiveDefenderArmor - defenderDamageReduction, 1, 9)
    : 0;
  const attackerDamage =
    defenderStats.canAttack && canUnitAttackTarget(defender, attacker)
      ? clamp(Math.floor(defenderBaseAttack / 2) + Math.floor(Math.random() * 2) - effectiveAttackerArmor, 1, 5)
      : 0;

  if (defender.type === "drone-swarm" && attackerStats.domain !== "air") {
    defenderDamage = Math.min(defenderDamage, 2);
  }

  return {
    defenderHp: defender.hp - defenderDamage,
    attackerHp: attacker.hp - attackerDamage,
    defenderDamage,
    attackerDamage,
  };
}

function resolveSpecialOpsCombat(
  attacker: Unit,
  defender: Unit,
  options: { defenderFortified?: boolean; defenderArmorBonus?: number },
  allowFollowUp: boolean
) {
  const first = resolveCombat(attacker, defender, options);
  let attackerHp = first.attackerHp;
  let defenderHp = first.defenderHp;
  let defenderDamage = first.defenderDamage;
  let attackerDamage = first.attackerDamage;
  let usedFollowUp = false;

  if (allowFollowUp && attackerHp > 0 && defenderHp > 0) {
    const second = resolveCombat({ ...attacker, hp: attackerHp }, { ...defender, hp: defenderHp }, options);
    attackerHp = second.attackerHp;
    defenderHp = second.defenderHp;
    defenderDamage += second.defenderDamage;
    attackerDamage += second.attackerDamage;
    usedFollowUp = true;
  }

  return {
    attackerHp,
    defenderHp,
    defenderDamage,
    attackerDamage,
    usedFollowUp,
  };
}

function jamDrone(state: GameState, side: Side, unitId: number, x: number, y: number): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== side || unit.type !== "carrier") return state;
  if (distance(unit, { x, y }) > 2) return state;

  const drone = state.units.find(
    (currentUnit) => currentUnit.x === x && currentUnit.y === y && currentUnit.owner !== side && currentUnit.type === "drone-swarm"
  );
  if (!drone) return state;

  const jamDamage = Math.min(drone.hp, 5);
  const nextUnits = state.units
    .map((currentUnit) =>
      currentUnit.id === drone.id ? { ...currentUnit, hp: currentUnit.hp - jamDamage, fortified: false, concealed: false } : currentUnit
    )
    .filter((currentUnit) => currentUnit.hp > 0);

  const destroyed = !nextUnits.some((currentUnit) => currentUnit.id === drone.id);
  const tile = state.map[y][x];
  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        selectedUnitId: side === "player" ? unit.id : state.selectedUnitId,
      },
      side === "player"
        ? `Carrier jamming attack hit drone swarm near ${getLocationLabel(tile)} for ${jamDamage} damage.${destroyed ? " Drone swarm broken." : ""}`
        : `Enemy carrier jamming disrupted a drone swarm near ${getLocationLabel(tile)}.`
    )
  );
}

function resolveTileAttack(state: GameState, side: Side, attacker: Unit, x: number, y: number) {
  const tile = state.map[y][x];
  const attackerStats = getUnitStats(attacker);
  const attackableOccupants = getAttackableOccupantsOnTile(state, x, y, side, attacker);
  const defender = attackableOccupants[0];
  if (!defender) return state;

  const nextMap = state.map.map((row) => row.map((cell) => ({ ...cell })));
  const combat = resolveCombat(attacker, defender, {
    defenderFortified: tile.city || defender.fortified,
    defenderArmorBonus: getDefenderArmorBonus(state, defender),
  });
  const moveSpentAfterAttack = attackerStats.attackConsumesRemainingMove === false ? attacker.moveSpent : attackerStats.move;
  const nextUnits = state.units
    .map((currentUnit) => {
      if (currentUnit.id === defender.id) {
        return { ...currentUnit, hp: combat.defenderHp, fortified: false, concealed: false };
      }
      if (currentUnit.id === attacker.id) {
        if (attackerStats.selfDestructOnAttack) return null;
        return {
          ...currentUnit,
          hp: combat.attackerHp,
          moveSpent: moveSpentAfterAttack,
          fortified: false,
          concealed: false,
        };
      }
      return currentUnit;
    })
    .filter((currentUnit): currentUnit is Unit => currentUnit !== null && currentUnit.hp > 0);

  const survivingAttacker = nextUnits.find((currentUnit) => currentUnit.id === attacker.id);
  const survivingDefender = nextUnits.find((currentUnit) => currentUnit.id === defender.id);
  let logMessage =
    side === "player"
      ? `Strike at ${getLocationLabel(tile)}: enemy took ${combat.defenderDamage}, you took ${combat.attackerDamage}.`
      : `Enemy strike near ${getLocationLabel(tile)}.`;

  if (!survivingDefender) {
    logMessage += side === "player" ? " Target destroyed." : "";
  }
  if (attackerStats.selfDestructOnAttack) {
    logMessage += side === "player" ? " The swarm expended itself in the strike." : "";
  }

  const keepSelected =
    side === "player" &&
    survivingAttacker &&
    attackerStats.attackConsumesRemainingMove === false &&
    getRemainingMove(survivingAttacker) > 0;

  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        map: nextMap,
        selectedUnitId: side === "player" ? (keepSelected ? attacker.id : null) : state.selectedUnitId,
      },
      logMessage
    )
  );
}

function getDroneStrikeOccupantAt(state: GameState, x: number, y: number, attacker: Unit) {
  return (
    getUnitsAt(state.units, x, y).find((unit) => {
      if (unit.id === attacker.id) return false;
      if (!canUnitAttackDomain(attacker, getUnitStats(unit).domain)) return false;
      return getUnitStats(unit).cannotBeAttacked !== true;
    }) ?? null
  );
}

function resolveDroneStrikeAtTarget(state: GameState, side: Side, attacker: Unit, x: number, y: number) {
  const scatterOffsets = [
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];
  const validScatterTargets = scatterOffsets
    .map((offset) => ({ x: x + offset.x, y: y + offset.y }))
    .filter((target) => inBounds(target.x, target.y, state.mapWidth, state.mapHeight));
  const scatteredTarget =
    validScatterTargets.length > 0 && Math.random() < 0.1
      ? validScatterTargets[Math.floor(Math.random() * validScatterTargets.length)]
      : null;
  const strikeX = scatteredTarget?.x ?? x;
  const strikeY = scatteredTarget?.y ?? y;
  const defender = getDroneStrikeOccupantAt(state, strikeX, strikeY, attacker);

  if (defender) {
    const tile = state.map[strikeY][strikeX];
    const combat = resolveCombat(attacker, defender, {
      defenderFortified: tile.city || defender.fortified,
      defenderArmorBonus: getDefenderArmorBonus(state, defender),
    });
    const nextUnits = state.units
      .map((currentUnit) => {
        if (currentUnit.id === defender.id) {
          return { ...currentUnit, hp: combat.defenderHp, fortified: false, concealed: false };
        }
        if (currentUnit.id === attacker.id) return null;
        return currentUnit;
      })
      .filter((currentUnit): currentUnit is Unit => currentUnit !== null && currentUnit.hp > 0);
    const destroyed = !nextUnits.some((currentUnit) => currentUnit.id === defender.id);
    const scatterText =
      scatteredTarget && side === "player"
        ? ` Drone swarm drifted off target and hit (${strikeX + 1}, ${strikeY + 1}) instead.`
        : scatteredTarget
          ? " Enemy drone swarm drifted off target."
          : "";

    return finalizeState(
      addLog(
        {
          ...state,
          units: nextUnits,
          selectedUnitId: side === "player" && state.selectedUnitId === attacker.id ? null : state.selectedUnitId,
        },
        side === "player"
          ? `Drone swarm detonated over ${getLocationLabel(tile)} for ${combat.defenderDamage} damage.${destroyed ? " Target destroyed." : ""}${scatterText}`
          : `Enemy drone swarm detonated near ${getLocationLabel(tile)}.${scatterText}`
      )
    );
  }

  const tile = state.map[strikeY][strikeX];
  return finalizeState(
    addLog(
      {
        ...state,
        units: state.units.filter((currentUnit) => currentUnit.id !== attacker.id),
        selectedUnitId: side === "player" && state.selectedUnitId === attacker.id ? null : state.selectedUnitId,
      },
      side === "player"
        ? `Drone swarm detonated over ${getLocationLabel(tile)}, but the impact square was empty.${scatteredTarget ? ` It drifted off target from (${x + 1}, ${y + 1}).` : ""}`
        : `Enemy drone swarm detonated over an empty strike square.${scatteredTarget ? " It drifted off target." : ""}`
    )
  );
}

function chooseDroneMoveTowardTarget(unit: Unit, target: TargetPoint, state: GameState, aiOmniscience = false) {
  const reachable = (unit.owner === "ai" && !aiOmniscience ? getReachableMovesFromIntel(state, unit) : getReachableMoves(state, unit)).filter(
    (move) => !move.occupiedByEnemy || (move.x === target.x && move.y === target.y)
  );
  if (!reachable.length) return null;

  return reachable.sort((a, b) => {
    const routeDelta =
      estimateRouteCost(unit, { x: a.x, y: a.y }, target, state, aiOmniscience) -
      estimateRouteCost(unit, { x: b.x, y: b.y }, target, state, aiOmniscience);
    if (routeDelta !== 0) return routeDelta;
    const distanceDelta = distance(a, target) - distance(b, target);
    if (distanceDelta !== 0) return distanceDelta;
    return a.cost - b.cost;
  })[0] ?? null;
}

function processDroneSwarmOrders(state: GameState, side: Side, aiOmniscience = false) {
  let nextState = state;
  const droneIds = state.units.filter((unit) => unit.owner === side && unit.type === "drone-swarm").map((unit) => unit.id);

  for (const droneId of droneIds) {
    const liveDrone = nextState.units.find((unit) => unit.id === droneId);
    if (!liveDrone || getRemainingMove(liveDrone) <= 0) continue;

    let targetX = liveDrone.droneTargetX ?? null;
    let targetY = liveDrone.droneTargetY ?? null;

    if ((targetX === null || targetY === null) && side === "ai") {
      const aiTarget = findNearestTarget(liveDrone, nextState, "player", aiOmniscience);
      if (!aiTarget) continue;
      targetX = aiTarget.x;
      targetY = aiTarget.y;
      nextState = {
        ...nextState,
        units: nextState.units.map((unit) =>
          unit.id === liveDrone.id ? { ...unit, droneTargetX: targetX, droneTargetY: targetY } : unit
        ),
      };
    }

    if (targetX === null || targetY === null) continue;

    if (liveDrone.x === targetX && liveDrone.y === targetY) {
      nextState = resolveDroneStrikeAtTarget(nextState, side, liveDrone, targetX, targetY);
      continue;
    }

    const chosenMove = chooseDroneMoveTowardTarget(liveDrone, { x: targetX, y: targetY }, nextState, aiOmniscience);
    if (!chosenMove) continue;

    nextState = {
      ...nextState,
      units: nextState.units.map((unit) =>
        unit.id === liveDrone.id
          ? {
              ...unit,
              x: chosenMove.x,
              y: chosenMove.y,
              moveSpent: unit.moveSpent + chosenMove.cost,
              fortified: false,
              concealed: false,
            }
          : unit
      ),
    };

    const advancedDrone = nextState.units.find((unit) => unit.id === droneId);
    if (advancedDrone && advancedDrone.x === targetX && advancedDrone.y === targetY) {
      nextState = resolveDroneStrikeAtTarget(nextState, side, advancedDrone, targetX, targetY);
    }
  }

  return nextState;
}

function applyFortificationForSide(units: Unit[], side: Side) {
  return units.map((unit) => {
    if (unit.owner !== side) return unit;
    const unitStats = getUnitStats(unit);

    return {
      ...unit,
      concealed: Boolean(unitStats.concealedWhileStationary && unit.moveSpent === 0),
      fortified: unit.moveSpent === 0,
      moveSpent: 0,
      turnsAwayFromBase: unit.turnsAwayFromBase,
    };
  });
}

function extendSpyVisionForSide(units: Unit[], side: Side) {
  return units.map((unit) => (unit.owner === side && unit.type === "wraith" ? { ...unit, extendedVision: true } : unit));
}

function processAirbaseReturn(state: GameState, side: Side) {
  const logs: string[] = [];
  const nextUnits = state.units
    .map((unit) => {
      if (unit.owner !== side) return unit;
      const definition = getUnitStats(unit);
      if (!definition.maxTurnsAwayFromBase) return unit;

      const tile = state.map[unit.y]?.[unit.x] ?? null;
      const onFriendlyBase = isFriendlyAirBase(tile, side, state, unit.type, unit.x, unit.y);
      const nextTurnsAway = onFriendlyBase ? 0 : unit.turnsAwayFromBase + 1;

      if (nextTurnsAway > definition.maxTurnsAwayFromBase) {
        logs.push(
          side === "player"
            ? `${definition.name} was lost after failing to return to base.`
            : `Enemy ${definition.name.toLowerCase()} failed to return to base.`
        );
        return null;
      }

      return {
        ...unit,
        turnsAwayFromBase: nextTurnsAway,
      };
    })
    .filter((unit): unit is Unit => Boolean(unit));

  return { units: nextUnits, logs };
}

function processImprovementProjects(state: GameState, side: Side) {
  const map = state.map.map((row) => row.map((tile) => cloneTile(tile)));
  const logs: string[] = [];

  for (let y = 0; y < state.mapHeight; y += 1) {
    for (let x = 0; x < state.mapWidth; x += 1) {
      const tile = map[y][x];
      if (!tile.improvementProject || tile.improvementProject.owner !== side) continue;

      const engineer = state.units.find((unit) => unit.id === tile.improvementProject?.engineerUnitId) ?? null;
      if (
        !engineer ||
        engineer.owner !== side ||
        engineer.type !== "engineer" ||
        engineer.x !== tile.improvementProject.engineerX ||
        engineer.y !== tile.improvementProject.engineerY
      ) {
        logs.push(
          side === "player"
            ? `${getImprovementLabel(tile.improvementProject.type)} construction at ${getLocationLabel(tile)} was halted when the engineer left the site.`
            : `Enemy ${tile.improvementProject.type} construction near ${getLocationLabel(tile)} was halted.`
        );
        tile.improvementProject = null;
        continue;
      }

      const nextTurnsRemaining = tile.improvementProject.turnsRemaining - 1;
      if (nextTurnsRemaining > 0) {
        tile.improvementProject = { ...tile.improvementProject, turnsRemaining: nextTurnsRemaining };
        continue;
      }

      if (tile.improvementProject.type === "radar" && tile.improvement?.type === "airfield") {
        tile.improvement = {
          ...tile.improvement,
          owner: side,
          hasRadar: true,
        };
        tile.owner = side;
      } else {
        tile.improvement = {
          type: tile.improvementProject.type,
          owner: side,
          hp: tile.improvementProject.type === "outpost" ? OUTPOST_MAX_HP : undefined,
          maxHp: tile.improvementProject.type === "outpost" ? OUTPOST_MAX_HP : undefined,
        };
        tile.owner = side;
      }
      logs.push(
        side === "player"
          ? `${getImprovementLabel(tile.improvementProject.type)} completed at ${getLocationLabel(tile)}.`
          : `Enemy ${tile.improvementProject.type} completed near ${getLocationLabel(tile)}.`
      );
      tile.improvementProject = null;
    }
  }

  return { map, logs };
}

function processCityProduction(state: GameState, side: Side) {
  let nextUnitId = state.nextUnitId;
  let units = [...state.units];
  const map = state.map.map((row) => row.map((tile) => cloneTile(tile)));
  const logs: string[] = [];

  for (let y = 0; y < state.mapHeight; y += 1) {
    for (let x = 0; x < state.mapWidth; x += 1) {
      const tile = map[y][x];
      if (!isOwnedProductionSite(tile, side) || !tile.production) continue;

      const nextTurnsRemaining = tile.production.turnsRemaining - 1;
      if (nextTurnsRemaining > 0) {
        tile.production = { ...tile.production, turnsRemaining: nextTurnsRemaining };
        continue;
      }

      const spawnTile = getSpawnTileForProduction(state, tile, tile.production.unitType, units, tile.production);
      const definition = getUnitDefinition(tile.production.unitType);

      if (!spawnTile || getBlockingUnitAt(units, spawnTile.x, spawnTile.y, definition.domain)) {
        tile.production = { ...tile.production, turnsRemaining: 0 };
        logs.push(
          side === "player"
            ? `${getLocationLabel(tile)} has completed ${definition.name.toLowerCase()}, but the deployment lane is blocked.`
            : `Enemy production at ${getLocationLabel(tile)} is complete, but deployment is blocked.`
        );
        continue;
      }

      units = [...units, createUnit(nextUnitId, side, tile.production.unitType, spawnTile.x, spawnTile.y, 0)];
      nextUnitId += 1;
      logs.push(
        side === "player"
          ? `${definition.name} completed at ${getLocationLabel(tile)}.`
          : `Enemy ${definition.name.toLowerCase()} completed at ${getLocationLabel(tile)}.`
      );
      tile.production = null;
    }
  }

  return { map, units, nextUnitId, logs };
}

export function forceCompleteProductionForSide(state: GameState, side: Side) {
  const primedMap = state.map.map((row) =>
    row.map((tile) => {
      if (!isOwnedProductionSite(tile, side) || !tile.production) return cloneTile(tile);
      return {
        ...cloneTile(tile),
        production: {
          ...tile.production,
          turnsRemaining: 1,
        },
      };
    })
  );

  const productionResult = processCityProduction({ ...state, map: primedMap }, side);
  let updatedState: GameState = {
    ...state,
    map: productionResult.map,
    units: productionResult.units,
    nextUnitId: productionResult.nextUnitId,
  };

  if (productionResult.logs.length === 0) {
    updatedState = addLog(
      updatedState,
      side === "player" ? "Developer action: no player queues were ready to rush." : `Developer action: no ${side} queues were ready to rush.`
    );
  } else {
    updatedState = addLog(
      updatedState,
      side === "player" ? "Developer action: player production rushed to completion." : `Developer action: ${side} production rushed to completion.`
    );
    for (const logMessage of productionResult.logs) {
      updatedState = addLog(updatedState, logMessage);
    }
  }

  return finalizeState(updatedState);
}

export function findNearestTarget(unit: Unit, state: GameState, targetOwner: Side, aiOmniscience = false) {
  if (unit.owner === "ai" && !aiOmniscience) {
    const visibleEnemyUnits = state.units.filter((otherUnit) => {
      if (otherUnit.owner !== targetOwner) return false;
      if (!state.aiVisible[otherUnit.y]?.[otherUnit.x]) return false;
      if (!getDetectedEnemyUnitIdSet(state, "ai").has(otherUnit.id)) return false;
      return canUnitAttackTarget(unit, otherUnit) || getUnitStats(otherUnit).domain !== "air";
    });
    const knownEnemyCities: Tile[] = [];
    const knownNeutralCities: Tile[] = [];
    const unexplored: Array<Pick<Tile, "x" | "y">> = [];

    for (let y = 0; y < state.mapHeight; y += 1) {
      for (let x = 0; x < state.mapWidth; x += 1) {
        const intelTile = state.aiIntel[y][x];
        if (!intelTile) {
          unexplored.push({ x, y });
          continue;
        }

        if (intelTile.city && intelTile.owner === targetOwner) knownEnemyCities.push(intelTile);
        if (intelTile.city && intelTile.owner === null) knownNeutralCities.push(intelTile);
      }
    }

    const priorityTargets = [...knownEnemyCities, ...visibleEnemyUnits];
    if (priorityTargets.length) {
      return priorityTargets.sort((a, b) => distance(unit, a) - distance(unit, b))[0];
    }

    if (knownNeutralCities.length) {
      return knownNeutralCities.sort((a, b) => distance(unit, a) - distance(unit, b))[0];
    }

    if (unexplored.length) {
      return unexplored.sort((a, b) => distance(unit, a) - distance(unit, b))[0];
    }

    return null;
  }

  const enemyCities: Tile[] = [];
  const enemyUnits = state.units.filter((otherUnit) => otherUnit.owner === targetOwner);

  for (const row of state.map) {
    for (const tile of row) {
      if (tile.city && tile.owner === targetOwner) enemyCities.push(tile);
    }
  }

  const allTargets = [...enemyCities, ...enemyUnits];
  if (!allTargets.length) return null;

  return allTargets.sort((a, b) => distance(unit, a) - distance(unit, b))[0];
}

export function estimateRouteCost(
  unit: Unit,
  start: Pick<Tile, "x" | "y">,
  target: TargetPoint,
  state: GameState,
  aiOmniscience = false
) {
  const intel = unit.owner === "ai" && !aiOmniscience ? state.aiIntel : state.playerIntel;
  const frontier = [{ x: start.x, y: start.y, cost: 0 }];
  const bestCost = new Map([[key(start.x, start.y), 0]]);

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift();
    if (!current) break;
    if (current.x === target.x && current.y === target.y) return current.cost;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!inBounds(nx, ny, state.mapWidth, state.mapHeight)) continue;

      const tile = aiOmniscience || unit.owner !== "ai" ? state.map[ny][nx] : intel[ny][nx];
      if (!tile) continue;

      const terrainCost = getTerrainMoveCost(state, unit, tile);
      if (terrainCost >= 999) continue;

      const blockingOccupant = getBlockingUnitAt(state.units.filter((otherUnit) => otherUnit.id !== unit.id), nx, ny, getUnitStats(unit).domain);
      const isTargetTile = nx === target.x && ny === target.y;
      if (blockingOccupant && blockingOccupant.owner === unit.owner && !isTargetTile) continue;
      if (blockingOccupant && blockingOccupant.owner !== unit.owner && !isTargetTile) continue;

      const totalCost = current.cost + terrainCost;
      const tileKey = key(nx, ny);
      const previousBest = bestCost.get(tileKey);
      if (previousBest !== undefined && previousBest <= totalCost) continue;

      bestCost.set(tileKey, totalCost);
      frontier.push({ x: nx, y: ny, cost: totalCost });
    }
  }

  return Number.POSITIVE_INFINITY;
}

export function evaluateWinner(state: GameState) {
  const playerCities = getCityCount(state.map, "player");
  const aiCities = getCityCount(state.map, "ai");
  const playerUnits = countForces(state.units, "player");
  const aiUnits = countForces(state.units, "ai");

  if (playerCities === 0 && playerUnits === 0) return "ai";
  if (aiCities === 0 && aiUnits === 0) return "player";
  return null;
}

function applyWinner(state: GameState): GameState {
  return {
    ...state,
    winner: evaluateWinner(state),
  };
}

function finalizeState(state: GameState): GameState {
  return applyWinner(refreshIntel(state));
}

function selectUnit(state: GameState, unitId: number): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== "player") return state;
  return {
    ...state,
    selectedUnitId: unitId,
  };
}

function recruitUnit(state: GameState, side: Side, unitType: UnitType, x: number, y: number, spawnX?: number, spawnY?: number): GameState {
  const tile = state.map[y][x];
  if (!isOwnedProductionSite(tile, side)) return state;
  if (tile.production) return state;
  if (!canProduceUnitAtTile(state, tile, side, unitType)) return state;
  const definition = getUnitDefinition(unitType);
  const seaSpawn = definition.domain === "sea" ? { spawnX, spawnY } : undefined;
  const spawnTile = getSpawnTileForProduction(state, tile, unitType, state.units, seaSpawn);
  if (!spawnTile) return state;
  if (getBlockingUnitAt(state.units, spawnTile.x, spawnTile.y, definition.domain)) return state;
  if (state.credits[side] < definition.cost) return state;
  const nextMap = state.map.map((row) => row.map((cell) => cloneTile(cell)));
  nextMap[y][x].production = {
    unitType,
    turnsRemaining: definition.buildTime,
    totalTurns: definition.buildTime,
    ...(definition.domain === "sea" ? { spawnX: spawnTile.x, spawnY: spawnTile.y } : {}),
  };

  return refreshIntel(
    addLog(
      {
        ...state,
        map: nextMap,
        credits: { ...state.credits, [side]: state.credits[side] - definition.cost },
      },
      side === "player"
        ? `${definition.name} queued at ${getLocationLabel(tile)}. Ready in ${definition.buildTime} turn${definition.buildTime === 1 ? "" : "s"}.`
        : `Enemy began ${definition.name.toLowerCase()} production at ${getLocationLabel(tile)}.`
    )
  );
}

function buildImprovement(
  state: GameState,
  side: Side,
  unitId: number,
  improvementType: TileImprovementType,
  x: number,
  y: number
): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== side || unit.type !== "engineer" || getRemainingMove(unit) <= 0) return state;

  const targetTile = state.map[y]?.[x] ?? null;
  if (!targetTile) return state;

  let validBuild = false;
  const buildCost = getImprovementBuildCost(improvementType);

  if (improvementType === "bridge") {
    validBuild = distance(unit, targetTile) === 1 && canBuildBridgeAt(state, x, y);
  } else if (improvementType === "port") {
    validBuild = distance(unit, targetTile) === 1 && canBuildPort(targetTile) && hasAdjacentWater(state, x, y);
  } else if (improvementType === "airfield") {
    validBuild = distance(unit, targetTile) === 1 && canBuildAirfieldAt(targetTile);
  } else if (improvementType === "radar") {
    validBuild = distance(unit, targetTile) === 1 && canBuildRadarAt(targetTile, side);
  } else if (improvementType === "tunnel") {
    validBuild = distance(unit, targetTile) === 1 && canBuildTunnelAt(targetTile);
  } else if (improvementType === "outpost") {
    validBuild = distance(unit, targetTile) === 1 && canBuildOutpostAt(targetTile);
  }

  if (!validBuild) return state;
  if (state.credits[side] < buildCost) return state;

  const nextMap = state.map.map((row) => row.map((cell) => cloneTile(cell)));
  const nextUnits = state.units.map((currentUnit) =>
    currentUnit.id === unit.id
      ? { ...currentUnit, moveSpent: getUnitStats(currentUnit).move, fortified: false, concealed: false }
      : currentUnit
  );

  const buildTime = getImprovementBuildTime(improvementType);
  nextMap[y][x].improvementProject = {
    type: improvementType,
    owner: side,
    engineerUnitId: unit.id,
    engineerX: unit.x,
    engineerY: unit.y,
    turnsRemaining: buildTime,
    totalTurns: buildTime,
  };

  const label = getImprovementLabel(improvementType);
  const location = improvementType === "bridge" ? `river crossing at ${getLocationLabel(targetTile)}` : getLocationLabel(targetTile);

  return finalizeState(
    addLog(
      {
        ...state,
        map: nextMap,
        credits: { ...state.credits, [side]: state.credits[side] - buildCost },
        units: nextUnits,
        selectedUnitId: side === "player" ? unit.id : state.selectedUnitId,
      },
      side === "player"
        ? `Engineer started ${label.toLowerCase()} construction at ${location}. Ready in ${buildTime} turn${buildTime === 1 ? "" : "s"}.${buildCost > 0 ? ` ${buildCost} credits committed.` : ""}`
        : `Enemy engineers started ${label.toLowerCase()} construction near ${location}.`
    )
  );
}

function resolveHiddenWraithEncounter(attacker: Unit, defender: Unit, side: Side, tile: Tile) {
  const bothWraiths = attacker.type === "wraith" && defender.type === "wraith";

  if (bothWraiths) {
    return {
      attackerSurvives: false,
      logMessage:
        side === "player"
          ? `Two spies crossed paths at ${getLocationLabel(tile)} and both disappeared into the dark.`
          : `Two hidden contacts collided near ${getLocationLabel(tile)} and vanished.`,
    };
  }

  return {
    attackerSurvives: true,
    logMessage:
      side === "player"
        ? `Your ${getUnitStats(attacker).name.toLowerCase()} exposed and eliminated a hidden spy at ${getLocationLabel(tile)}.`
        : `Enemy forces exposed and eliminated a hidden contact near ${getLocationLabel(tile)}.`,
  };
}

function canAttackerOccupyCombatTile(state: GameState, attacker: Unit, tile: Tile) {
  const attackerStats = getUnitStats(attacker);
  if (attackerStats.domain === "air") return true;
  if (!attackerStats.canCapture && tile.owner && tile.owner !== attacker.owner && (tile.city || tile.improvement?.owner === tile.owner)) {
    return false;
  }
  return getTerrainMoveCost(state, attacker, tile) < 999;
}

function captureSite(tile: Tile, side: Side) {
  const capturedCity = Boolean(tile.city && tile.owner !== side);
  const destroyedImprovement = Boolean(tile.improvement?.type === "outpost" && tile.improvement.owner !== side && (tile.improvement.hp ?? 0) <= 0);
  const capturedImprovement = Boolean(tile.improvement && tile.improvement.owner !== side && tile.improvement.type !== "outpost");

  if (capturedCity) {
    tile.owner = side;
  }

  if (destroyedImprovement) {
    tile.improvement = null;
    tile.owner = null;
  }

  if (capturedImprovement) {
    tile.improvement = {
      ...tile.improvement!,
      owner: side,
    };
    tile.owner = side;
  }

  if (capturedCity || capturedImprovement || destroyedImprovement) {
    tile.production = null;
  }

  return { capturedCity, capturedImprovement, destroyedImprovement };
}

function getCaptureLogSuffix(
  tile: Tile,
  side: Side,
  capture: { capturedCity: boolean; capturedImprovement: boolean; destroyedImprovement: boolean }
) {
  if (capture.capturedCity) {
    return side === "player" ? ` ${tile.cityName ?? "City"} captured.` : "";
  }

  if (capture.destroyedImprovement) {
    return side === "player" ? " Outpost destroyed." : "";
  }

  if (capture.capturedImprovement) {
    const label = getImprovementLabel(tile.improvement!.type);
    return side === "player" ? ` ${label} seized.` : "";
  }

  return "";
}

function moveUnit(state: GameState, side: Side, unitId: number, x: number, y: number): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== side) return state;

  const unitStats = getUnitStats(unit);
  const chosenMove = getReachableMoves(state, unit).find((move) => move.x === x && move.y === y);
  if (!chosenMove) return state;

  const moveSpentAfterStep = unit.moveSpent + chosenMove.cost;
  const moveSpentAfterAction = unitStats.move;
  const attackOriginX = chosenMove.approachX;
  const attackOriginY = chosenMove.approachY;
  const tile = state.map[y][x];
  const attackableOccupant =
    getAttackableVisibleUnitAtForSide(state, x, y, side, unit) ?? getAttackableUnitAt(state, x, y, side, unit);
  const hiddenOccupant =
    state.units.find(
      (currentUnit) =>
        currentUnit.x === x &&
        currentUnit.y === y &&
        getOccupancyLayer(getUnitStats(currentUnit).domain) === getOccupancyLayer(unitStats.domain) &&
        isUnitConcealedFromSide(currentUnit, side)
    ) ?? null;
  let nextUnits = [...state.units];
  const nextMap = state.map.map((row) => row.map((cell) => ({ ...cell })));
  let logMessage =
    side === "player"
      ? `${unitStats.name} moved to ${getLocationLabel(tile)} spending ${chosenMove.cost} movement.`
      : `Enemy moved near ${getLocationLabel(tile)}.`;

  if (hiddenOccupant && hiddenOccupant.owner !== side) {
    const hiddenEncounter = resolveHiddenWraithEncounter(unit, hiddenOccupant, side, tile);
    nextUnits = nextUnits.filter((currentUnit) => currentUnit.id !== hiddenOccupant.id);
    logMessage = hiddenEncounter.logMessage;

    if (hiddenEncounter.attackerSurvives) {
      nextUnits = nextUnits.map((currentUnit) =>
        currentUnit.id === unit.id
          ? { ...currentUnit, x, y, moveSpent: moveSpentAfterAction, fortified: false, concealed: false, extendedVision: false }
          : currentUnit
      );
      if (unitStats.canCapture) {
        const capture = captureSite(nextMap[y][x], side);
        logMessage += getCaptureLogSuffix(nextMap[y][x], side, capture);
      }
    } else {
      nextUnits = nextUnits.filter((currentUnit) => currentUnit.id !== unit.id);
    }
  } else if (attackableOccupant) {
    const specialOpsFollowUpAvailable = unit.type === "special-ops" && moveSpentAfterStep < unitStats.move;
    const bomberBombRun = unit.type === "bomber";
    const combat =
      unit.type === "special-ops"
        ? resolveSpecialOpsCombat(
            unit,
            attackableOccupant,
            {
              defenderFortified: tile.city || attackableOccupant.fortified,
              defenderArmorBonus: getDefenderArmorBonus(state, attackableOccupant),
            },
            specialOpsFollowUpAvailable
          )
        : resolveCombat(unit, attackableOccupant, {
            defenderFortified: tile.city || attackableOccupant.fortified,
            defenderArmorBonus: getDefenderArmorBonus(state, attackableOccupant),
          });
    const moveSpentAfterCombat =
      unit.type === "special-ops" || bomberBombRun
        ? Math.min(unitStats.move, moveSpentAfterStep + (combat.usedFollowUp ? 1 : 0))
        : moveSpentAfterAction;
    logMessage =
      side === "player"
        ? `${
            bomberBombRun ? `Bombing run at ${getLocationLabel(tile)}` : `Battle at ${getLocationLabel(tile)}`
          }: enemy took ${combat.defenderDamage}, you took ${combat.attackerDamage}.${combat.usedFollowUp ? " Special Ops struck twice." : ""}`
        : `Enemy attacked near ${getLocationLabel(tile)}.`;

    nextUnits = nextUnits
      .map((currentUnit) => {
        if (currentUnit.id === attackableOccupant.id) return { ...currentUnit, hp: combat.defenderHp, fortified: false, concealed: false };
        if (currentUnit.id === unit.id) {
          return {
            ...currentUnit,
            x: bomberBombRun ? x : attackOriginX,
            y: bomberBombRun ? y : attackOriginY,
            hp: combat.attackerHp,
            moveSpent: moveSpentAfterCombat,
            fortified: false,
            concealed: false,
            extendedVision: false,
          };
        }
        return currentUnit;
      })
      .filter((currentUnit) => currentUnit.hp > 0);

    const survivingAttacker = nextUnits.find((currentUnit) => currentUnit.id === unit.id);
    const survivingDefender = nextUnits.find((currentUnit) => currentUnit.id === attackableOccupant.id);

    if (survivingAttacker && !survivingDefender) {
      const occupiesTarget = bomberBombRun || canAttackerOccupyCombatTile(state, survivingAttacker, tile);
      nextUnits = nextUnits.map((currentUnit) => {
        if (currentUnit.id !== unit.id) return currentUnit;
        return occupiesTarget
          ? { ...currentUnit, x, y, moveSpent: moveSpentAfterCombat, fortified: false, concealed: false, extendedVision: false }
          : {
              ...currentUnit,
              x: attackOriginX,
              y: attackOriginY,
              moveSpent: moveSpentAfterCombat,
              fortified: false,
              concealed: false,
              extendedVision: false,
            };
      });
      if (occupiesTarget && unitStats.canCapture) {
        const capture = captureSite(nextMap[y][x], side);
        logMessage += getCaptureLogSuffix(nextMap[y][x], side, capture);
      }
    } else if (survivingAttacker) {
      nextUnits = nextUnits.map((currentUnit) =>
        currentUnit.id === unit.id ? { ...currentUnit, moveSpent: moveSpentAfterCombat, fortified: false, concealed: false, extendedVision: false } : currentUnit
      );
    }
  } else {
    const contestedOutpost = Boolean(unitStats.canCapture && tile.improvement?.type === "outpost" && tile.improvement.owner !== side);
    const contestedSite = Boolean(
      unitStats.canCapture &&
        tile.owner &&
        tile.owner !== side &&
        (tile.city || tile.improvement?.type === "port" || tile.improvement?.type === "airfield")
    );

    if (contestedOutpost) {
      const assault = resolveOutpostAssault(unit, tile);
      nextMap[y][x].improvement = {
        ...nextMap[y][x].improvement!,
        hp: assault.remainingHp,
      };

      if (assault.destroyed) {
        nextUnits = nextUnits.map((currentUnit) =>
          currentUnit.id === unit.id ? { ...currentUnit, x, y, moveSpent: moveSpentAfterStep, fortified: false, concealed: false } : currentUnit
        );
        const capture = captureSite(nextMap[y][x], side);
        logMessage =
          side === "player"
            ? `You destroyed the outpost at ${getLocationLabel(tile)} after dealing ${assault.damage} damage.`
            : `Enemy destroyed an outpost near ${getLocationLabel(tile)}.`;
        if (capture.destroyedImprovement) {
          logMessage += getCaptureLogSuffix(nextMap[y][x], side, capture);
        }
      } else {
        nextUnits = nextUnits.map((currentUnit) =>
          currentUnit.id === unit.id ? { ...currentUnit, moveSpent: moveSpentAfterAction, fortified: false, concealed: false, extendedVision: false } : currentUnit
        );
        logMessage =
          side === "player"
            ? `You hit the outpost at ${getLocationLabel(tile)} for ${assault.damage} damage. ${assault.remainingHp} structure left.`
            : `Enemy forces damaged an outpost near ${getLocationLabel(tile)}.`;
      }
    } else if (contestedSite && !resolveSiteCaptureDefense(state, unit, tile)) {
      nextUnits = nextUnits.map((currentUnit) =>
        currentUnit.id === unit.id
          ? { ...currentUnit, moveSpent: moveSpentAfterAction, fortified: false, concealed: false, extendedVision: false }
          : currentUnit
      );
      logMessage =
        side === "player"
          ? `${tile.city ? "City" : "Site"} defenses at ${getLocationLabel(tile)} held against your assault.`
          : `Enemy assault on ${getLocationLabel(tile)} was repelled by local defenses.`;
    } else {
      nextUnits = nextUnits.map((currentUnit) =>
        currentUnit.id === unit.id ? { ...currentUnit, x, y, moveSpent: moveSpentAfterStep, fortified: false, concealed: false, extendedVision: false } : currentUnit
      );

      if (unitStats.canCapture) {
        const capture = captureSite(nextMap[y][x], side);
        if (capture.capturedCity) {
          logMessage = side === "player" ? `You captured ${getLocationLabel(tile)}.` : `Enemy captured ${getLocationLabel(tile)}.`;
        } else if (capture.destroyedImprovement) {
          logMessage = side === "player" ? `You destroyed the outpost at ${getLocationLabel(tile)}.` : `Enemy destroyed an outpost near ${getLocationLabel(tile)}.`;
        } else if (capture.capturedImprovement) {
          logMessage = side === "player" ? `You seized the ${getImprovementLabel(nextMap[y][x].improvement!.type).toLowerCase()} at ${getLocationLabel(tile)}.` : `Enemy seized a strategic site near ${getLocationLabel(tile)}.`;
        }
      }
    }
  }

  const updatedUnit = nextUnits.find((currentUnit) => currentUnit.id === unit.id);
  const keepSelected = side === "player" && updatedUnit && getRemainingMove(updatedUnit) > 0;

  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        map: nextMap,
        selectedUnitId: side === "player" ? (keepSelected ? unit.id : null) : state.selectedUnitId,
      },
      logMessage
    )
  );
}

function attackTile(state: GameState, side: Side, unitId: number, x: number, y: number): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== side) return state;
  const unitStats = getUnitStats(unit);
  if (!unitStats.attackRequiresSameTile) return state;
  if (unit.x !== x || unit.y !== y) return state;
  if (!unitStats.canAttack) return state;
  return resolveTileAttack(state, side, unit, x, y);
}

function specialOpsAirstrike(state: GameState, side: Side, unitId: number, x: number, y: number): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== side || unit.type !== "special-ops") return state;
  if (distance(unit, { x, y }) > 3) return state;
  if (!(side === "player" ? state.playerVisible[y]?.[x] : state.aiVisible[y]?.[x])) return state;

  const defender = getAttackableOccupantsOnTile(state, x, y, side, unit)[0];
  if (!defender) return state;

  const strikeDamage = Math.min(defender.hp, clamp(getUnitStats(unit).atk * 2 + 2 - getUnitStats(defender).armor, 4, 12));
  const nextUnits = state.units
    .map((currentUnit) => {
      if (currentUnit.id === defender.id) return { ...currentUnit, hp: currentUnit.hp - strikeDamage, fortified: false, concealed: false };
      if (currentUnit.id === unit.id) return { ...currentUnit, moveSpent: getUnitStats(unit).move, fortified: false, concealed: false };
      return currentUnit;
    })
    .filter((currentUnit) => currentUnit.hp > 0);

  const tile = state.map[y][x];
  const destroyed = !nextUnits.some((currentUnit) => currentUnit.id === defender.id);
  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        selectedUnitId: side === "player" ? null : state.selectedUnitId,
      },
      side === "player"
        ? `Special Ops called in an air strike on ${getLocationLabel(tile)} for ${strikeDamage} damage.${destroyed ? " Target destroyed." : ""}`
        : `Enemy special operations directed an air strike near ${getLocationLabel(tile)}.`
    )
  );
}

function upgradeUnit(state: GameState, side: Side, unitId: number, upgrade: "sonar" | "radar-relay"): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== side) return state;
  if (upgrade === "sonar" && unit.type !== "destroyer") return state;
  if (upgrade === "radar-relay" && unit.type !== "carrier") return state;
  if (upgrade === "sonar" && unit.sonarUpgraded) return state;
  if (upgrade === "radar-relay" && unit.radarRelayUpgraded) return state;

  const nextUnits = state.units.map((currentUnit) =>
    currentUnit.id === unit.id
      ? {
          ...currentUnit,
          sonarUpgraded: upgrade === "sonar" ? true : currentUnit.sonarUpgraded,
          radarRelayUpgraded: upgrade === "radar-relay" ? true : currentUnit.radarRelayUpgraded,
          moveSpent: getUnitStats(currentUnit).move,
        }
      : currentUnit
  );

  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        selectedUnitId: side === "player" ? unit.id : state.selectedUnitId,
      },
      side === "player"
        ? `${getUnitStats(unit).name} completed its ${upgrade === "sonar" ? "sonar" : "radar relay"} upgrade.`
        : `Enemy ${getUnitStats(unit).name.toLowerCase()} completed an upgrade.`
    )
  );
}

function loadSpecialOps(state: GameState, side: Side, carrierUnitId: number, specialOpsUnitId: number): GameState {
  const carrier = state.units.find((unit) => unit.id === carrierUnitId);
  const specialOps = state.units.find((unit) => unit.id === specialOpsUnitId);
  if (!carrier || !specialOps) return state;
  if (carrier.owner !== side || specialOps.owner !== side) return state;
  if (!["apache", "submarine"].includes(carrier.type) || specialOps.type !== "special-ops") return state;
  if (carrier.carriedSpecialOps) return state;

  if (carrier.type === "apache") {
    // Choppers can extract Special Ops from anywhere on the map.
  } else {
    if (distance(carrier, specialOps) !== 1) return state;
    const embarkTile = state.map[specialOps.y]?.[specialOps.x] ?? null;
    if (!isFriendlyPortSite(state, embarkTile, side)) return state;
  }

  const nextUnits = state.units
    .map((unit) =>
      unit.id === carrier.id
        ? {
            ...unit,
            carriedSpecialOps: {
              hp: specialOps.hp,
              name: specialOps.name ?? null,
            },
          }
        : unit
    )
    .filter((unit) => unit.id !== specialOps.id);

  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        selectedUnitId: side === "player" ? carrier.id : state.selectedUnitId,
      },
      side === "player"
        ? carrier.type === "submarine"
          ? "Special Ops team slipped aboard the submarine."
          : "Special Ops team loaded into the Chopper."
        : carrier.type === "submarine"
          ? "Enemy special operations slipped aboard a submarine."
          : "Enemy special operations boarded a chopper."
    )
  );
}

function loadTransportTroop(state: GameState, side: Side, transportUnitId: number, troopUnitId: number): GameState {
  const transport = state.units.find((unit) => unit.id === transportUnitId);
  const troop = state.units.find((unit) => unit.id === troopUnitId);
  if (!transport || !troop) return state;
  if (transport.owner !== side || troop.owner !== side || transport.type !== "troop-transport") return state;
  if (!isTransportableTroopType(troop.type)) return state;
  if (distance(transport, troop) !== 1) return state;
  const embarkTile = state.map[troop.y]?.[troop.x] ?? null;
  if (!isFriendlyPortSite(state, embarkTile, side)) return state;
  if (getRemainingMove(troop) <= 0 || !canTroopTransportCarry(transport, troop)) return state;

  const nextCargo: TroopTransportCargo[] = [
    ...(transport.carriedTroops ?? []),
    { type: troop.type, hp: troop.hp, name: troop.name ?? null },
  ];

  const nextUnits = state.units
    .map((unit) =>
      unit.id === transport.id
        ? { ...unit, carriedTroops: nextCargo, fortified: false, concealed: false }
        : unit
    )
    .filter((unit) => unit.id !== troop.id);

  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        selectedUnitId: side === "player" ? transport.id : state.selectedUnitId,
      },
      side === "player"
        ? `${getUnitStats(troop).name} embarked on the troop transport.`
        : `Enemy troops embarked on a transport near ${getLocationLabel(state.map[transport.y][transport.x])}.`
    )
  );
}

function unloadTransportTroop(state: GameState, side: Side, transportUnitId: number, x: number, y: number): GameState {
  const transport = state.units.find((unit) => unit.id === transportUnitId);
  if (!transport || transport.owner !== side || transport.type !== "troop-transport" || !(transport.carriedTroops?.length)) return state;
  if (!getTroopTransportDeploymentTargets(state, transport).some((tile) => tile.x === x && tile.y === y)) return state;

  const cargo = transport.carriedTroops[0];
  if (!cargo) return state;

  const nextUnitId = state.nextUnitId;
  const unloaded = createUnit(nextUnitId, side, cargo.type, x, y);
  unloaded.hp = cargo.hp;
  unloaded.name = cargo.name ?? null;
  unloaded.moveSpent = getUnitDefinition(cargo.type).move;

  const nextUnits = state.units.map((unit) =>
    unit.id === transport.id
      ? { ...unit, carriedTroops: transport.carriedTroops?.slice(1) ?? null, fortified: false, concealed: false }
      : unit
  );
  nextUnits.push(unloaded);

  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        nextUnitId: nextUnitId + 1,
        selectedUnitId: side === "player" ? transport.id : state.selectedUnitId,
      },
      side === "player"
        ? `${getUnitDefinition(cargo.type).name} disembarked from the troop transport.`
        : `Enemy troops landed from a transport near ${getLocationLabel(state.map[y][x])}.`
    )
  );
}

function unloadSpecialOps(state: GameState, side: Side, carrierUnitId: number, x?: number, y?: number): GameState {
  const carrier = state.units.find((unit) => unit.id === carrierUnitId);
  if (!carrier || carrier.owner !== side || !["apache", "submarine"].includes(carrier.type) || !carrier.carriedSpecialOps) return state;

  let deployX = carrier.x;
  let deployY = carrier.y;
  let concealed = false;

  if (carrier.type === "submarine") {
    if (x === undefined || y === undefined) return state;
    const validTargets = getSpecialOpsDeploymentTargets(state, carrier);
    if (!validTargets.some((tile) => tile.x === x && tile.y === y)) return state;
    deployX = x;
    deployY = y;
    concealed = true;
  } else if (getBlockingUnitAt(state.units, carrier.x, carrier.y, "land")) {
    return state;
  }

  const nextUnitId = state.nextUnitId;
  const unloaded = createUnit(nextUnitId, side, "special-ops", deployX, deployY);
  unloaded.hp = carrier.carriedSpecialOps.hp;
  unloaded.name = carrier.carriedSpecialOps.name ?? null;
  unloaded.moveSpent = 0;
  unloaded.concealed = concealed;

  const nextUnits = state.units.map((unit) =>
    unit.id === carrier.id ? { ...unit, carriedSpecialOps: null } : unit
  );
  nextUnits.push(unloaded);

  return finalizeState(
    addLog(
      {
        ...state,
        units: nextUnits,
        nextUnitId: nextUnitId + 1,
        selectedUnitId: side === "player" ? unloaded.id : state.selectedUnitId,
      },
      side === "player"
        ? carrier.type === "submarine"
          ? "Special Ops team swam ashore from the submarine and remained concealed."
          : "Special Ops team deployed from the Chopper."
        : carrier.type === "submarine"
          ? "Enemy special operations slipped ashore from a submarine."
          : "Enemy special operations deployed from a chopper."
    )
  );
}

function decommissionUnit(state: GameState, side: Side, unitId: number): GameState {
  const unit = state.units.find((currentUnit) => currentUnit.id === unitId);
  if (!unit || unit.owner !== side) return state;

  const nextMap = state.map.map((row) => row.map((cell) => cloneTile(cell)));
  let canceledProject = false;
  const refund = Math.floor(getUnitStats(unit).cost / 2);

  for (const row of nextMap) {
    for (const tile of row) {
      if (tile.improvementProject?.engineerUnitId === unit.id) {
        tile.improvementProject = null;
        canceledProject = true;
      }
    }
  }

  const nextUnits = state.units.filter((currentUnit) => currentUnit.id !== unit.id);
  const unitName = unit.name ? `${unit.name} (${getUnitStats(unit).name})` : getUnitStats(unit).name;
  const logMessage =
    side === "player"
      ? canceledProject
        ? `${unitName} was decommissioned, its construction detail was stood down, and ${refund} credits were recovered.`
        : `${unitName} was decommissioned and ${refund} credits were recovered.`
      : canceledProject
        ? `Enemy ${getUnitStats(unit).name.toLowerCase()} was decommissioned, its work site abandoned, and ${refund} credits were recovered.`
        : `Enemy ${getUnitStats(unit).name.toLowerCase()} was decommissioned and ${refund} credits were recovered.`;

  return finalizeState(
    addLog(
      {
        ...state,
        credits: { ...state.credits, [side]: state.credits[side] + refund },
        units: nextUnits,
        map: nextMap,
        selectedUnitId: state.selectedUnitId === unit.id ? null : state.selectedUnitId,
      },
      logMessage
    )
  );
}

function beginTurn(state: GameState, side: Side): GameState {
  if (state.side !== side || state.winner) return state;
  if (side !== "ai") return state;

  const cityIncome = getCityIncome(state, side);
  const explorationIncome = getExplorationIncome(state, side);
  const income = cityIncome + explorationIncome;
  const busyCities = getBusyCityCount(state.map, side);

  return addLog(
    {
      ...state,
      credits: { ...state.credits, ai: state.credits.ai + income },
      units: extendSpyVisionForSide(state.units, side),
    },
    `Enemy turn. Enemy treasury +${income} (${cityIncome} city income, ${explorationIncome} exploration${busyCities ? `, ${busyCities} busy` : ""}).`
  );
}

function endTurn(state: GameState, side: Side): GameState {
  if (state.side !== side || state.winner) return state;

  if (side === "player") {
    const cityIncome = getCityIncome(state, "player");
    const explorationIncome = getExplorationIncome(state, "player");
    const income = cityIncome + explorationIncome;
    const busyCities = getBusyCityCount(state.map, "player");
    const fortifiedUnits = applyFortificationForSide(state.units, "player");
    const projectResult = processImprovementProjects({ ...state, units: fortifiedUnits }, "player");
    const productionResult = processCityProduction({ ...state, units: fortifiedUnits, map: projectResult.map }, "player");
    let updatedState: GameState = {
      ...state,
      side: "ai",
      selectedUnitId: null,
      credits: { ...state.credits, player: state.credits.player + income },
      units: productionResult.units,
      map: productionResult.map,
      nextUnitId: productionResult.nextUnitId,
    };
    updatedState = addLog(
      updatedState,
      `End of your turn. Treasury +${income} (${cityIncome} city income, ${explorationIncome} exploration${busyCities ? `, ${busyCities} busy` : ""}).`
    );
    for (const logMessage of productionResult.logs) {
      updatedState = addLog(updatedState, logMessage);
    }
    for (const logMessage of projectResult.logs) {
      updatedState = addLog(updatedState, logMessage);
    }
    updatedState = processDroneSwarmOrders(updatedState, "player");
    const airbaseResult = processAirbaseReturn(updatedState, "player");
    updatedState = {
      ...updatedState,
      units: airbaseResult.units,
    };
    for (const logMessage of airbaseResult.logs) {
      updatedState = addLog(updatedState, logMessage);
    }
    return finalizeState(updatedState);
  }

  const fortifiedUnits = applyFortificationForSide(state.units, "ai");
  const projectResult = processImprovementProjects({ ...state, units: fortifiedUnits }, "ai");
  const productionResult = processCityProduction({ ...state, units: fortifiedUnits, map: projectResult.map }, "ai");
  let updated = {
    ...state,
    units: extendSpyVisionForSide(productionResult.units, "player"),
    map: productionResult.map,
    nextUnitId: productionResult.nextUnitId,
    side: "player" as Side,
    turn: state.turn + 1,
  };
  for (const logMessage of productionResult.logs) {
    updated = addLog(updated, logMessage);
  }
  for (const logMessage of projectResult.logs) {
    updated = addLog(updated, logMessage);
  }
  updated = processDroneSwarmOrders(updated, "ai");
  const airbaseResult = processAirbaseReturn(updated, "ai");
  updated = {
    ...updated,
    units: airbaseResult.units,
  };
  for (const logMessage of airbaseResult.logs) {
    updated = addLog(updated, logMessage);
  }
  updated = finalizeState(updated);

  return addLog(
    updated,
    updated.winner
      ? updated.winner === "player"
        ? "Victory! Enemy forces shattered."
        : "Defeat. The enemy rules the map."
      : `Turn ${updated.turn}. Your command, commander.`
  );
}

export function applyCommand(state: GameState, command: Command): GameState {
  switch (command.type) {
    case "select_unit":
      return selectUnit(state, command.unitId);
    case "recruit_unit":
      return recruitUnit(state, command.side, command.unitType, command.x, command.y, command.spawnX, command.spawnY);
    case "set_drone_target":
      return setDroneTarget(state, command.side, command.unitId, command.x, command.y);
    case "move_unit":
      return moveUnit(state, command.side, command.unitId, command.x, command.y);
    case "attack_tile":
      return attackTile(state, command.side, command.unitId, command.x, command.y);
    case "jam_drone":
      return jamDrone(state, command.side, command.unitId, command.x, command.y);
    case "special_ops_airstrike":
      return specialOpsAirstrike(state, command.side, command.unitId, command.x, command.y);
    case "upgrade_unit":
      return upgradeUnit(state, command.side, command.unitId, command.upgrade);
    case "load_special_ops":
      return loadSpecialOps(state, command.side, command.carrierUnitId, command.specialOpsUnitId);
    case "unload_special_ops":
      return unloadSpecialOps(state, command.side, command.carrierUnitId, command.x, command.y);
    case "load_transport_troop":
      return loadTransportTroop(state, command.side, command.transportUnitId, command.troopUnitId);
    case "unload_transport_troop":
      return unloadTransportTroop(state, command.side, command.transportUnitId, command.x, command.y);
    case "decommission_unit":
      return decommissionUnit(state, command.side, command.unitId);
    case "build_improvement":
      return buildImprovement(state, command.side, command.unitId, command.improvementType, command.x, command.y);
    case "begin_turn":
      return beginTurn(state, command.side);
    case "end_turn":
      return endTurn(state, command.side);
    default:
      return state;
  }
}
