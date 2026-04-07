'use client';

import { Castle, X } from "lucide-react";
import { getImprovementLabel, getRemainingMove, getUnitStats } from "@/lib/empire/game";
import { getFactionUnitBadgeClass, getFactionUnitBadgeStyle, getFactionUnitIconClass } from "@/components/empire/shared/domainStyles";
import { ImprovementIcon } from "@/components/empire/shared/ImprovementIcon";
import { UnitTypeIcon } from "@/components/empire/shared/UnitTypeIcon";
import { Button } from "@/components/ui/button";
import type { Faction, Tile, Unit } from "@/lib/empire/types";

type TileContentsModalProps = {
  open: boolean;
  tile: Tile | null;
  units: Unit[];
  playerFaction: Faction;
  onSelectSite: (x: number, y: number) => void;
  onSelectUnit: (unit: Unit) => void;
  onClose: () => void;
};

export function TileContentsModal({
  open,
  tile,
  units,
  playerFaction,
  onSelectSite,
  onSelectUnit,
  onClose,
}: TileContentsModalProps) {
  if (!open || !tile) return null;

  const siteType = tile.city ? "city" : tile.improvement?.type === "port" || tile.improvement?.type === "airfield" ? tile.improvement.type : null;
  const siteImprovementType = siteType === "city" ? null : siteType;
  const siteTitle = tile.city
    ? tile.cityName ?? `City at (${tile.x + 1}, ${tile.y + 1})`
    : siteImprovementType
      ? `${getImprovementLabel(siteImprovementType)} at (${tile.x + 1}, ${tile.y + 1})`
      : `Tile ${tile.x + 1}, ${tile.y + 1}`;
  const siteButtonTitle = siteType === "city" ? "Open City Panel" : siteImprovementType ? `Open ${getImprovementLabel(siteImprovementType)} Panel` : "Open Site Panel";
  const siteButtonHint = siteType === "city" ? "Manage production and inspect the garrison." : "Manage production and inspect units on the site.";

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close tile contents" />
      <div className="relative z-10 w-full max-w-lg rounded-[1.75rem] border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Tile Contents</div>
            <div className="mt-2 text-2xl font-black text-white">{siteTitle}</div>
            <div className="mt-1 text-sm text-slate-300">
              Grid ({tile.x + 1}, {tile.y + 1})
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {siteType && (tile.owner === "player" || tile.improvement?.owner === "player") ? (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-3xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-4 text-left transition hover:border-emerald-300/40 hover:bg-emerald-500/14"
              onClick={() => onSelectSite(tile.x, tile.y)}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200/30 bg-slate-950/70 text-emerald-100">
                  {siteType === "city" ? <Castle className="h-5 w-5" /> : <ImprovementIcon improvementType={siteImprovementType as "port" | "airfield"} />}
                </span>
                <span>
                  <span className="block text-base font-semibold text-white">{siteButtonTitle}</span>
                  <span className="block text-xs text-slate-300">{siteButtonHint}</span>
                </span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                {siteType === "city" ? "City" : getImprovementLabel(siteImprovementType as "port" | "airfield")}
              </span>
            </button>
          ) : null}
          <div className="space-y-2">
            {units.map((unit) => {
              const stats = getUnitStats(unit);
              return (
                <button
                  key={unit.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-left transition hover:border-slate-600 hover:bg-slate-900"
                  onClick={() => onSelectUnit(unit)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-900/20 shadow-sm",
                        getFactionUnitBadgeClass(unit.type, stats.domain, playerFaction),
                      ].join(" ")}
                      style={getFactionUnitBadgeStyle(unit.type, stats.domain, playerFaction)}
                    >
                      <UnitTypeIcon unitType={unit.type} className={getFactionUnitIconClass(playerFaction)} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-white">{unit.name ?? stats.name}</span>
                      <span className="block text-xs text-slate-300">
                        {stats.domain} unit · HP {unit.hp}/{stats.maxHp} · Move {getRemainingMove(unit)}/{stats.move}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {unit.fortified ? (unit.entrenched ? "Entrenched" : "Fortified") : "Ready"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
