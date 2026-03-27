export type Side = "player" | "ai";
export type Owner = Side | null;
export type Faction =
  | "usa"
  | "china"
  | "asia"
  | "africa"
  | "iran"
  | "israel"
  | "canada"
  | "mexico"
  | "european-union"
  | "great-britain"
  | "argentina"
  | "australia"
  | "japan"
  | "north-korea"
  | "south-korea"
  | "russia"
  | "ukraine";

export type TerrainType = "water" | "land" | "mountain";
export type UnitDomain = "land" | "sea" | "air";
export type UnitType =
  | "infantry"
  | "scout"
  | "tank"
  | "engineer"
  | "wraith"
  | "special-ops"
  | "apache"
  | "destroyer"
  | "troop-transport"
  | "carrier"
  | "submarine"
  | "fighter"
  | "bomber"
  | "drone-swarm";
export type TransportableTroopUnitType = "infantry" | "tank" | "engineer" | "wraith" | "special-ops";
export type GameType = "normal" | "naval" | "archipelago" | "ocean" | "alpine" | "globe" | "pangea";
export type TileImprovementType = "bridge" | "port" | "airfield" | "tunnel" | "radar" | "outpost" | "minefield";
export type DeveloperPlacementType = TileImprovementType | "city";

export type TileImprovement = {
  type: TileImprovementType;
  owner: Side;
  hasRadar?: boolean;
  hp?: number;
  maxHp?: number;
};

export type ImprovementProject = {
  type: TileImprovementType;
  owner: Side;
  engineerUnitId: number;
  engineerX: number;
  engineerY: number;
  turnsRemaining: number;
  totalTurns: number;
};

export type UnitDefinition = {
  name: string;
  shortLabel: string;
  move: number;
  atk: number;
  armor: number;
  piercing: number;
  vision: number;
  cost: number;
  buildTime: number;
  domain: UnitDomain;
  maxHp: number;
  canAttack: boolean;
  canCapture: boolean;
  attackDomains: UnitDomain[];
  ignoresFortification?: boolean;
  canDetectWraiths?: boolean;
  concealedWhileStationary?: boolean;
  cannotBeAttacked?: boolean;
  maxTurnsAwayFromBase?: number;
  antiAirBonus?: number;
  attackRequiresSameTile?: boolean;
  attackConsumesRemainingMove?: boolean;
  selfDestructOnAttack?: boolean;
  canOnlyLandOnAirfield?: boolean;
  canLandOnCarrier?: boolean;
  airDetectionRange?: number;
  radarRelayRange?: number;
  bombCapacity?: number;
  canAttackSubmarines?: boolean;
  canBeDetectedBySonarOnly?: boolean;
  canCallAirStrike?: boolean;
  transportCapacity?: number;
};

export type TroopTransportCargo = {
  type: TransportableTroopUnitType;
  hp: number;
  name?: string | null;
};

export type WorldSizeOption = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export type CityProduction = {
  unitType: UnitType;
  turnsRemaining: number;
  totalTurns: number;
  spawnX?: number;
  spawnY?: number;
};

export type Tile = {
  x: number;
  y: number;
  terrain: TerrainType;
  city: boolean;
  owner: Owner;
  cityName: string | null;
  production: CityProduction | null;
  improvement: TileImprovement | null;
  improvementProject: ImprovementProject | null;
};

export type Unit = {
  id: number;
  owner: Side;
  type: UnitType;
  name?: string | null;
  x: number;
  y: number;
  hp: number;
  moveSpent: number;
  fortified: boolean;
  sentry: boolean;
  concealed: boolean;
  extendedVision?: boolean;
  turnsAwayFromBase: number;
  sonarUpgraded?: boolean;
  radarRelayUpgraded?: boolean;
  bombsRemaining?: number | null;
  droneTargetX?: number | null;
  droneTargetY?: number | null;
  carriedSpecialOps?: {
    hp: number;
    name?: string | null;
  } | null;
  carriedTroops?: TroopTransportCargo[] | null;
};

export type ReachableMove = {
  x: number;
  y: number;
  cost: number;
  occupiedByEnemy: boolean;
  approachX: number;
  approachY: number;
  path: Array<{ x: number; y: number }>;
};

export type GameState = {
  seed: number;
  gameType: GameType;
  playerFaction: Faction;
  aiFaction: Faction;
  mapWidth: number;
  mapHeight: number;
  map: Tile[][];
  units: Unit[];
  turn: number;
  side: Side;
  credits: Record<Side, number>;
  selectedUnitId: number | null;
  logs: string[];
  nextUnitId: number;
  winner: Side | null;
  playerVisible: boolean[][];
  playerIntel: (Tile | null)[][];
  aiVisible: boolean[][];
  aiIntel: (Tile | null)[][];
  playerDetectedUnitIds: number[];
  aiDetectedUnitIds: number[];
  /** Paths units traveled this turn — used to reveal tiles along movement routes */
  movementPathsThisTurn: Array<{ side: Side; path: Array<{ x: number; y: number }>; vision: number }>;
};

export type Command =
  | { type: "select_unit"; unitId: number }
  | { type: "recruit_unit"; side: Side; unitType: UnitType; x: number; y: number; spawnX?: number; spawnY?: number }
  | { type: "set_drone_target"; side: Side; unitId: number; x: number; y: number }
  | { type: "move_unit"; side: Side; unitId: number; x: number; y: number }
  | { type: "attack_tile"; side: Side; unitId: number; x: number; y: number }
  | { type: "demolish_improvement"; side: Side; unitId: number; x: number; y: number }
  | { type: "jam_drone"; side: Side; unitId: number; x: number; y: number }
  | { type: "special_ops_airstrike"; side: Side; unitId: number; x: number; y: number }
  | { type: "upgrade_unit"; side: Side; unitId: number; upgrade: "sonar" | "radar-relay" }
  | { type: "load_special_ops"; side: Side; carrierUnitId: number; specialOpsUnitId: number }
  | { type: "unload_special_ops"; side: Side; carrierUnitId: number; x?: number; y?: number }
  | { type: "load_transport_troop"; side: Side; transportUnitId: number; troopUnitId: number }
  | { type: "unload_transport_troop"; side: Side; transportUnitId: number; x: number; y: number }
  | { type: "decommission_unit"; side: Side; unitId: number }
  | { type: "sentry_unit"; side: Side; unitId: number }
  | { type: "wake_unit"; side: Side; unitId: number }
  | { type: "build_improvement"; side: Side; unitId: number; improvementType: TileImprovementType; x: number; y: number }
  | { type: "begin_turn"; side: Side }
  | { type: "end_turn"; side: Side };
