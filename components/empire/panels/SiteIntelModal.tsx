'use client';

import { Castle } from "lucide-react";
import { ImprovementIcon } from "@/components/empire/shared/ImprovementIcon";
import { Button } from "@/components/ui/button";
import { getFactionOption } from "@/lib/empire/factions";
import { getImprovementLabel, getUnitStats } from "@/lib/empire/game";
import type { Faction, Tile, Unit } from "@/lib/empire/types";

type SiteIntelModalProps = {
  open: boolean;
  tile: Tile | null;
  visible: boolean;
  surfaceUnits: Unit[];
  airUnits: Unit[];
  playerFaction: Faction;
  aiFaction: Faction;
  onClose: () => void;
};

export function SiteIntelModal({
  open,
  tile,
  visible,
  surfaceUnits,
  airUnits,
  playerFaction,
  aiFaction,
  onClose,
}: SiteIntelModalProps) {
  if (!open || !tile) return null;

  const siteType = tile.city
    ? "city"
    : tile.improvement?.type === "port" || tile.improvement?.type === "airfield"
      ? tile.improvement.type
      : tile.improvement?.type ?? tile.improvementProject?.type ?? "site";
  const owner = tile.improvement?.owner ?? tile.improvementProject?.owner ?? tile.owner ?? null;
  const title = tile.city
    ? tile.cityName ?? `City at (${tile.x + 1}, ${tile.y + 1})`
    : siteType === "port" || siteType === "airfield"
      ? `${getImprovementLabel(siteType)} at (${tile.x + 1}, ${tile.y + 1})`
      : `Site at (${tile.x + 1}, ${tile.y + 1})`;
  const typeLabel = siteType === "city" ? "City" : siteType === "port" || siteType === "airfield" ? getImprovementLabel(siteType) : "Site";
  const ownerLabel =
    owner === "player"
      ? getFactionOption(playerFaction).label
      : owner === "ai"
        ? getFactionOption(aiFaction).label
        : "Neutral";

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close site intel" />
      <div className="relative z-10 w-full max-w-lg rounded-[1.75rem] border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{visible ? "Site Intel" : "Last Known Site Intel"}</div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-lg">
              {siteType === "city" ? <Castle className="h-7 w-7" /> : siteType === "port" || siteType === "airfield" ? <ImprovementIcon improvementType={siteType} /> : <Castle className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-2xl font-black text-white">{title}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
                <span>{typeLabel}</span>
                <span>{ownerLabel}</span>
                <span>Grid ({tile.x + 1}, {tile.y + 1})</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <IntelCard label="Owner" value={ownerLabel} />
            <IntelCard label="Type" value={typeLabel} />
            <IntelCard label="Status" value={visible ? "Currently visible" : "Out of sight"} />
            <IntelCard label="Position" value={`${tile.x + 1}, ${tile.y + 1}`} />
          </div>

          {visible ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <IntelCard
                  label="Production"
                  value={
                    tile.production
                      ? `${getUnitStats({
                          id: -1,
                          owner: "ai",
                          type: tile.production.unitType,
                          x: tile.x,
                          y: tile.y,
                          hp: 1,
                          moveSpent: 0,
                          fortified: false,
                          entrenched: false,
                          sentry: false,
                          concealed: false,
                          turnsAwayFromBase: 0,
                        }).name} ${tile.production.turnsRemaining}/${tile.production.totalTurns}`
                      : "Idle"
                  }
                />
                <IntelCard
                  label="Garrison"
                  value={`${surfaceUnits.length} surface / ${airUnits.length} air`}
                />
              </div>
              {(surfaceUnits.length > 0 || airUnits.length > 0) ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Observed Units</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    {[...surfaceUnits, ...airUnits].map((unit) => {
                      const stats = getUnitStats(unit);
                      return (
                        <div key={unit.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2">
                          {(unit.name ?? stats.name)} · HP {unit.hp}/{stats.maxHp}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {tile.improvement ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                  Improvement: {getImprovementLabel(tile.improvement.type)}
                  {tile.improvement.type === "airfield" && tile.improvement.hasRadar ? " with radar" : ""}
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-4 text-sm text-amber-50">
              No current visual on this site. Production, garrison, and embedded units are hidden until you regain vision nearby.
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" className="rounded-2xl" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
