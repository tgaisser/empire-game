import { UNIT_STATS } from "@/lib/empire/config";
import type { TileImprovementType, UnitDefinition, UnitType } from "@/lib/empire/types";

export const UNIT_TYPE_ORDER: UnitType[] = [
  "infantry",
  "scout",
  "tank",
  "engineer",
  "spy",
  "special-ops",
  "destroyer",
  "troop-transport",
  "carrier",
  "submarine",
  "chopper",
  "fighter",
  "bomber",
  "drone-swarm",
];

export const IMPROVEMENT_TYPE_ORDER: TileImprovementType[] = ["bridge", "port", "airfield", "radar", "tunnel", "outpost", "minefield"];

export function getUnitTypeLabel(unitType: UnitType) {
  return UNIT_STATS[unitType]?.name ?? unitType;
}

export function getImprovementTypeLabel(improvementType: TileImprovementType) {
  if (improvementType === "radar") return "Radar Upgrade";
  if (improvementType === "airfield") return "Airfield";
  if (improvementType === "bridge") return "Bridge";
  if (improvementType === "port") return "Port";
  if (improvementType === "outpost") return "Outpost";
  if (improvementType === "minefield") return "Minefield";
  return "Tunnel";
}

export function getOrderedUnitDefinitions() {
  return UNIT_TYPE_ORDER.reduce<Record<UnitType, UnitDefinition>>((accumulator, unitType) => {
    accumulator[unitType] = UNIT_STATS[unitType];
    return accumulator;
  }, {} as Record<UnitType, UnitDefinition>);
}
