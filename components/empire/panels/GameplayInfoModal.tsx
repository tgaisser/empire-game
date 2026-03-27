'use client';

import { useRef } from "react";
import { BookOpen, X } from "lucide-react";
import {
  getFactionUnitBadgeClass,
  getFactionUnitBadgeStyle,
  getFactionUnitIconClass,
} from "@/components/empire/shared/domainStyles";
import { ImprovementIcon } from "@/components/empire/shared/ImprovementIcon";
import { UnitTypeIcon } from "@/components/empire/shared/UnitTypeIcon";
import { getImprovementTypeLabel, IMPROVEMENT_TYPE_ORDER, UNIT_TYPE_ORDER } from "@/lib/empire/catalog";
import { GAME_TYPE_OPTIONS, TERRAIN, UNIT_STATS } from "@/lib/empire/config";
import type { Faction, GameType, TileImprovementType, UnitType } from "@/lib/empire/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GameplayInfoModalProps = {
  open: boolean;
  playerFaction: Faction;
  onClose: () => void;
};

const unitNotes: Record<UnitType, string> = {
  infantry: "Baseline ground force. Captures cities, holds lines, and benefits well from fortification and city defense.",
  scout: "Fast recon unit with wider sight. Good for exploration and screening, but poor in direct combat.",
  tank: "Heavy land breakthrough unit. Strong against surface forces, but cannot cross raw mountains without tunnels.",
  engineer: "Builds bridges, ports, airfields, radar upgrades, and tunnels. Engineers also work as sappers and can demolish bridges or tunnels beside them. They are pinned to active worksites until construction finishes.",
  wraith: "Spy unit. Weak in open combat, excellent for stealth and deep reconnaissance while stationary.",
  "special-ops": "Elite infiltrators. Hard to spot while holding still, dangerous in direct raids, and able to call in devastating air strikes on nearby visible targets.",
  destroyer: "Sea combatant with strong anti-air missiles and naval guns. Hits ships, aircraft, and shore targets but cannot capture cities.",
  "troop-transport": "Slow naval transport with no offensive capability. Carries either one tank or up to three infantry, engineers, spies, or special-ops teams. Gains extra protection when screened by destroyers.",
  carrier: "Fast fleet carrier with strong radar coverage. Fighters, choppers, and other carrier-capable aircraft can land aboard.",
  submarine: "Stealth sea predator built to kill capital ships. A torpedo strike can cripple or outright sink a carrier.",
  apache: "Chopper gunship built to shred armor and strike fortified ground positions. It can also carry a special-ops team into deep territory.",
  fighter: "Air superiority aircraft. Built for hunting other aircraft and defending your skies.",
  bomber: "Long-range air-to-ground strike aircraft. Must fly directly over the target to bomb, can also demolish bridges and tunnels directly below, carries six bombs before rearming at a friendly airfield, and only lands at airfields.",
  "drone-swarm": "Cheap expendable strike craft. Flies over the target and detonates on attack.",
};

const improvementNotes: Record<TileImprovementType, string> = {
  bridge: "Single-tile river crossing for land forces. Bridges cannot chain across large bodies of water.",
  port: "Naval production site on land beside water. Required for sustained fleet operations.",
  airfield: "Aircraft production site and air base. Aircraft may land in cities too, but only airfields build them.",
  radar: "Airfield upgrade that reveals enemy aircraft within 5 tiles, even through fog of war.",
  tunnel: "Mountain route that reduces movement through the tunnel tile and allows tanks through mountain barriers.",
  outpost: "Forward operating position used to extend map control, vision, and staging near contested areas.",
  minefield: "Hidden explosive trap laid by engineers (2 turns). Invisible to enemies unless an enemy engineer is nearby. Deals heavy damage when a land unit walks over it. Engineers disarm them safely.",
};

const gameTypeNotes: Record<GameType, string> = {
  normal: "Balanced fronts with mixed land, sea, and mountain play.",
  naval: "Lakes and rivers maps with stronger inland water pressure.",
  archipelago: "Many islands and scattered objectives. Sea control matters immediately.",
  ocean: "Two continental powers divided by a wide ocean with only a few stepping-stone islands.",
  alpine: "Mountain-heavy campaign focused on passes, tunnels, and hard ground combat.",
  globe: "Massive procedural world with continents, oceans, island chains, rivers, and mountain ranges.",
};

function getImprovementBadgeClass(improvementType: TileImprovementType) {
  if (improvementType === "port") {
    return "border-[#ff3b30]/72 bg-[linear-gradient(135deg,rgba(61,143,255,0.26),rgba(15,39,72,0.96))]";
  }
  if (improvementType === "airfield" || improvementType === "radar") {
    return "border-[#ff3b30]/72 bg-[linear-gradient(135deg,rgba(61,143,255,0.30),rgba(95,118,143,0.94))]";
  }
  return "border-stone-300/55 bg-[linear-gradient(135deg,rgba(214,211,209,0.22),rgba(51,65,85,0.92))]";
}

export function GameplayInfoModal({ open, playerFaction, onClose }: GameplayInfoModalProps) {
  const howToRef = useRef<HTMLDivElement | null>(null);
  const unitsRef = useRef<HTMLDivElement | null>(null);
  const improvementsRef = useRef<HTMLDivElement | null>(null);
  const terrainRef = useRef<HTMLDivElement | null>(null);
  const modesRef = useRef<HTMLDivElement | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <Card className="relative z-10 flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden border-slate-800 bg-slate-900 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-800 bg-slate-950/50">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5" /> Game Documentation
            </CardTitle>
            <div className="mt-1 text-sm text-slate-400">
              Unit reference, construction rules, terrain notes, and campaign guidance.
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto p-6">
          <div className="sticky top-0 z-20 mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/85 p-3 backdrop-blur">
            {[
              { label: "How To Play", ref: howToRef },
              { label: "Units", ref: unitsRef },
              { label: "Improvements", ref: improvementsRef },
              { label: "Terrain", ref: terrainRef },
              { label: "Campaign Types", ref: modesRef },
            ].map((entry) => (
              <button
                key={entry.label}
                type="button"
                onClick={() => entry.ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-200"
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div className="space-y-8 text-sm text-slate-300">
            <section ref={howToRef} className="grid items-start gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-base font-semibold text-slate-100">How To Play</div>
                <div className="mt-3 space-y-2">
                  <p>Select a friendly unit, then click a highlighted tile to move or attack.</p>
                  <p>Click a city, port, or airfield to open the production context panel.</p>
                  <p>Units spend movement point-by-point. Fortified units and city defenders take lighter losses.</p>
                  <p>Aircraft must return to a city or airfield after limited turns away from base.</p>
                  <p>Fog of war hides unseen territory. Radar upgrades are your best tool for tracking enemy aircraft.</p>
                  <p>Troop transports embark adjacent ground units from friendly ports or coastal cities, then unload them one-by-one onto adjacent shore tiles.</p>
                  <p>Engineers and bombers can demolish bridges or tunnels when you need to break an enemy route.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-base font-semibold text-slate-100">Core Rules</div>
                <div className="mt-3 space-y-2">
                  <p>Cities generate income unless they are busy producing a unit.</p>
                  <p>Every 10% explored grants +1 exploration income.</p>
                  <p>Air units and surface units can share a tile, but attacks resolve if the moving unit can hit the other layer.</p>
                  <p>Destroyers bombard shore and strike aircraft, but cannot capture territory.</p>
                  <p>Engineers can reshape the map with bridges, tunnels, ports, airfields, and radar upgrades.</p>
                </div>
              </div>
            </section>

            <section>
              <div ref={unitsRef} className="h-0 w-0 overflow-hidden" />
              <div className="mb-4 text-lg font-semibold text-slate-100">Units</div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {UNIT_TYPE_ORDER.map((unitType) => {
                  const unit = UNIT_STATS[unitType];
                  return (
                    <div key={unitType} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            "flex h-12 w-12 items-center justify-center rounded-full border border-slate-900/20 shadow-sm",
                            getFactionUnitBadgeClass(unitType, unit.domain, playerFaction),
                          ].join(" ")}
                          style={getFactionUnitBadgeStyle(unitType, unit.domain, playerFaction)}
                        >
                          <UnitTypeIcon unitType={unitType} className={getFactionUnitIconClass(playerFaction)} />
                        </span>
                        <div>
                          <div className="text-base font-semibold text-slate-100">{unit.name}</div>
                          <div className="text-xs uppercase tracking-wide text-slate-400">{unit.domain} unit</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <div>Cost {unit.cost}</div>
                        <div>Build {unit.buildTime}t</div>
                        <div>Move {unit.move}</div>
                        <div>Vision {unit.vision}</div>
                        <div>Attack {unit.atk}</div>
                        <div>Armor {unit.armor}</div>
                        <div>Piercing {unit.piercing}</div>
                        <div>HP {unit.maxHp}</div>
                      </div>
                      <div className="mt-3 text-xs text-slate-400">
                        {unit.canCapture ? "Can capture cities." : "Cannot capture cities."}{" "}
                        {unit.attackDomains.length > 0 ? `Attacks ${unit.attackDomains.join(", ")} targets.` : "Non-combat unit."}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-slate-300">{unitNotes[unitType]}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div>
                  <div ref={improvementsRef} className="mb-4 text-lg font-semibold text-slate-100">Improvements</div>
                <div className="grid gap-4">
                  {IMPROVEMENT_TYPE_ORDER.map((improvementType) => (
                    <div key={improvementType} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border text-white shadow-sm",
                            getImprovementBadgeClass(improvementType),
                          ].join(" ")}
                        >
                          <span className="absolute inset-[12%] rounded-[26%] bg-white/6" />
                          <span className="absolute inset-x-[16%] top-[14%] h-[14%] rounded-full bg-white/10" />
                          <span className="absolute inset-x-[8%] bottom-[8%] h-[24%] rounded-t-[35%] bg-slate-950/28" />
                          <ImprovementIcon improvementType={improvementType} />
                        </span>
                        <div>
                          <div className="text-base font-semibold capitalize text-slate-100">
                            {getImprovementTypeLabel(improvementType)}
                          </div>
                          <div className="text-xs text-slate-400">{improvementNotes[improvementType]}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div ref={terrainRef} className="mb-4 text-lg font-semibold text-slate-100">Terrain</div>
                  <div className="grid gap-4">
                    {Object.entries(TERRAIN).map(([terrainKey, terrain]) => (
                      <div key={terrainKey} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="text-base font-semibold text-slate-100">{terrain.name}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {terrain.moveCost >= 999 ? "Normally impassable to land units." : `Base move cost ${terrain.moveCost}.`}
                        </div>
                        <div className="mt-2 text-xs leading-5 text-slate-300">
                          {terrainKey === "water" && "Sea units operate here. Bridges only span single-tile river crossings, not open ocean."}
                          {terrainKey === "land" && "Core terrain for cities, airfields, ports, and most maneuver warfare."}
                          {terrainKey === "mountain" && "Slows land forces, blocks tanks, and can be penetrated by engineer-built tunnels."}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div ref={modesRef} className="mb-4 text-lg font-semibold text-slate-100">Campaign Types</div>
                  <div className="grid gap-4">
                    {GAME_TYPE_OPTIONS.map((gameType) => (
                      <div key={gameType.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="text-base font-semibold text-slate-100">{gameType.label}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-300">{gameTypeNotes[gameType.id]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
