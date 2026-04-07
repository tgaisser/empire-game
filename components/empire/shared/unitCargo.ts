import { getTroopTransportRemainingCapacity, getUnitStats } from "@/lib/empire/game";
import type { TransportableTroopUnitType, Unit, UnitType } from "@/lib/empire/types";

export type UnitCargoManifest = {
  summary: string;
  lines: string[];
  badge: string;
};

const MANIFEST_UNIT_BASE = {
  id: -1,
  owner: "player" as const,
  x: 0,
  y: 0,
  hp: 1,
  moveSpent: 0,
  fortified: false,
  entrenched: false,
  sentry: false,
  concealed: false,
  turnsAwayFromBase: 0,
};

function getManifestUnitName(unitType: UnitType) {
  return getUnitStats({ ...MANIFEST_UNIT_BASE, type: unitType }).name;
}

function getManifestUnitMaxHp(unitType: UnitType) {
  return getUnitStats({ ...MANIFEST_UNIT_BASE, type: unitType }).maxHp;
}

function formatTroopCargoLine(entry: {
  type: TransportableTroopUnitType;
  hp: number;
  name?: string | null;
}) {
  const name = entry.name?.trim() || getManifestUnitName(entry.type);
  return `${name} · HP ${entry.hp}/${getManifestUnitMaxHp(entry.type)}`;
}

export function getUnitCargoManifest(unit: Unit | null): UnitCargoManifest | null {
  if (!unit) return null;

  if (unit.type === "troop-transport") {
    const cargo = unit.carriedTroops ?? [];
    if (cargo.length === 0) return null;

    return {
      summary: `${cargo.length} ${cargo.length === 1 ? "unit" : "units"} loaded · ${getTroopTransportRemainingCapacity(unit)} capacity free`,
      lines: cargo.map((entry) => formatTroopCargoLine(entry)),
      badge: String(cargo.length),
    };
  }

  if ((unit.type === "chopper" || unit.type === "submarine") && unit.carriedSpecialOps) {
    const specialOpsName = unit.carriedSpecialOps.name?.trim() || getManifestUnitName("special-ops");

    return {
      summary: "Special Ops team loaded",
      lines: [`${specialOpsName} · HP ${unit.carriedSpecialOps.hp}/${getManifestUnitMaxHp("special-ops")}`],
      badge: "SO",
    };
  }

  return null;
}
