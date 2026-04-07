import type { ImprovementDefinition, TileImprovementType } from "@/lib/empire/types";
import {
  MINEFIELD_DAMAGE,
  OUTPOST_ARMOR,
  OUTPOST_MAX_HP,
  RADAR_DETECTION_RANGE,
} from "@/lib/empire/data/rules";

export const IMPROVEMENT_DEFINITIONS: Record<TileImprovementType, ImprovementDefinition> = {
  bridge: {
    name: "Bridge",
    shortLabel: "B",
    buildCost: 0,
    buildTime: 1,
  },
  port: {
    name: "Port",
    shortLabel: "P",
    buildCost: 8,
    buildTime: 3,
  },
  airfield: {
    name: "Airfield",
    shortLabel: "A",
    buildCost: 10,
    buildTime: 3,
  },
  radar: {
    name: "Radar Upgrade",
    shortLabel: "R",
    buildCost: 6,
    buildTime: 3,
    detectionRange: RADAR_DETECTION_RANGE,
    upgradeOf: "airfield",
  },
  tunnel: {
    name: "Tunnel",
    shortLabel: "T",
    buildCost: 0,
    buildTime: 2,
  },
  outpost: {
    name: "Outpost",
    shortLabel: "O",
    buildCost: 2,
    buildTime: 3,
    maxHp: OUTPOST_MAX_HP,
    armor: OUTPOST_ARMOR,
  },
  minefield: {
    name: "Minefield",
    shortLabel: "M",
    buildCost: 4,
    buildTime: 2,
    triggerDamage: MINEFIELD_DAMAGE,
    hiddenUntilDetected: true,
  },
};

export function getImprovementDefinition(improvementType: TileImprovementType) {
  return IMPROVEMENT_DEFINITIONS[improvementType];
}
