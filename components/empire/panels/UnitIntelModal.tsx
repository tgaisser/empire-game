'use client';

import { getUnitStats } from "@/lib/empire/game";
import type { Faction, Unit } from "@/lib/empire/types";
import { getSideUnitBadgeStyle, getSideUnitIconClass } from "@/components/empire/shared/domainStyles";
import { UnitTypeIcon } from "@/components/empire/shared/UnitTypeIcon";
import { Button } from "@/components/ui/button";

type UnitIntelModalProps = {
  open: boolean;
  unit: Unit | null;
  playerFaction: Faction;
  aiFaction: Faction;
  onClose: () => void;
};

export function UnitIntelModal({ open, unit, playerFaction, aiFaction, onClose }: UnitIntelModalProps) {
  if (!open || !unit) return null;

  const stats = getUnitStats(unit);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Unit Intel</div>
          <div className="mt-3 flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-900/20 shadow-lg"
              style={getSideUnitBadgeStyle(unit.type, stats.domain, playerFaction, aiFaction, unit.owner)}
            >
              <UnitTypeIcon unitType={unit.type} className={getSideUnitIconClass(playerFaction, aiFaction, unit.owner)} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats.name}</div>
              <div className="text-sm text-slate-300">
                {unit.owner === "ai" ? "Enemy" : "Friendly"} {stats.domain} unit
              </div>
              {unit.name ? <div className="mt-1 text-xs text-slate-400">{unit.name}</div> : null}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-6 py-5 text-sm">
          <IntelCard label="Strength" value={`${unit.hp}/${stats.maxHp}`} />
          <IntelCard label="Attack" value={stats.atk} />
          <IntelCard label="Armor" value={stats.armor} />
          <IntelCard label="Move" value={stats.move} />
          <IntelCard label="Detection" value={stats.airDetectionRange ?? stats.radarRelayRange ?? 0} />
          <IntelCard label="Vision" value={stats.vision} />
        </div>
        <div className="px-6 pb-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-6 text-slate-300">
            {stats.canCapture ? "Can seize cities and strategic sites. " : ""}
            {stats.canDetectWraiths ? "Can detect stealth threats. " : ""}
            {stats.canLandOnCarrier ? "Can recover to carriers. " : ""}
            {stats.canOnlyLandOnAirfield ? "Requires an airfield or approved landing base. " : ""}
            {unit.type === "troop-transport" ? "Carries one tank or up to three light ground units. Destroyer escorts within 2 tiles improve its defense. " : ""}
            {stats.attackRequiresSameTile ? "Attacks are resolved on the occupied target square." : "Uses normal ranged or adjacent attack rules."}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" className="rounded-2xl" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
