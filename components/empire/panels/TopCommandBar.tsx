'use client';

import { Bug, BookOpen, Coins, Map, ScrollText, Shield, Trophy } from "lucide-react";
import type { Side } from "@/lib/empire/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TopCommandBarProps = {
  turn: number;
  side: Side;
  winner: Side | null;
  playerCredits: number;
  aiCredits: number;
  playerCities: number;
  aiCities: number;
  playerUnits: number;
  aiUnits: number;
  playerExploredPercent: number;
  aiExploredPercent: number;
  playerExplorationIncome: number;
  aiExplorationIncome: number;
  onOpenLog: () => void;
  onOpenHelp: () => void;
  onToggleDevDrawer: () => void;
  onReset: () => void;
};

export function TopCommandBar({
  turn,
  side,
  winner,
  playerCredits,
  aiCredits,
  playerCities,
  aiCities,
  playerUnits,
  aiUnits,
  playerExploredPercent,
  aiExploredPercent,
  playerExplorationIncome,
  aiExplorationIncome,
  onOpenLog,
  onOpenHelp,
  onToggleDevDrawer,
  onReset,
}: TopCommandBarProps) {
  const statCards = [
    {
      label: "Credits",
      playerValue: playerCredits,
      aiValue: aiCredits,
      icon: Coins,
      accent: "from-amber-300/45 to-amber-600/10",
      ratio: Math.min(1, Math.max(playerCredits, aiCredits) / 180),
    },
    {
      label: "Cities",
      playerValue: playerCities,
      aiValue: aiCities,
      icon: Trophy,
      accent: "from-cyan-300/45 to-cyan-600/10",
      ratio: Math.min(1, Math.max(playerCities, aiCities) / 18),
    },
    {
      label: "Units",
      playerValue: playerUnits,
      aiValue: aiUnits,
      icon: Shield,
      accent: "from-red-300/40 to-red-600/10",
      ratio: Math.min(1, Math.max(playerUnits, aiUnits) / 60),
    },
    {
      label: "Explored",
      playerValue: `${playerExploredPercent}%`,
      aiValue: `${aiExploredPercent}%`,
      icon: Map,
      accent: "from-emerald-300/45 to-emerald-600/10",
      ratio: Math.min(1, Math.max(playerExploredPercent, aiExploredPercent) / 100),
    },
    {
      label: "Intel Income",
      playerValue: `+${playerExplorationIncome}`,
      aiValue: `+${aiExplorationIncome}`,
      icon: ScrollText,
      accent: "from-fuchsia-300/40 to-fuchsia-700/10",
      ratio: Math.min(1, Math.max(playerExplorationIncome, aiExplorationIncome) / 12),
    },
  ] as const;

  return (
    <Card className="border-slate-800 bg-slate-900/90 rounded-3xl shadow-2xl">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-xl px-3 py-1 text-sm bg-slate-800 text-slate-100">
              Turn {turn}
            </Badge>
            <Badge variant="secondary" className="rounded-xl px-3 py-1 text-sm bg-slate-800 text-slate-100">
              {side === "player" ? "Your Turn" : "Enemy Turn"}
            </Badge>
            {winner && (
              <Badge variant="secondary" className="rounded-xl px-3 py-1 text-sm bg-slate-100 text-slate-900">
                {winner === "player" ? "Victory" : "Defeat"}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={onOpenLog}>
              <ScrollText className="w-4 h-4 mr-2" />
              Log
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={onOpenHelp}>
              <BookOpen className="w-4 h-4 mr-2" />
              Docs
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={onToggleDevDrawer}>
              <Bug className="w-4 h-4 mr-2" />
              Dev
            </Button>
            <Button variant="secondary" className="rounded-2xl" onClick={onReset}>
              Start New Game
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-slate-100">
                <card.icon className="w-4 h-4" /> {card.label}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <ComparisonPill label="You" value={card.playerValue} delta={getDelta(card.playerValue, card.aiValue)} positive />
                <ComparisonPill label="Enemy" value={card.aiValue} delta={getDelta(card.aiValue, card.playerValue)} positive={false} />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${card.accent}`}
                  style={{ width: `${Math.max(10, Math.round(card.ratio * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonPill({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: string | number;
  delta: number;
  positive: boolean;
}) {
  const deltaColor = delta === 0 ? "text-slate-400" : delta > 0 ? "text-emerald-300" : "text-red-300";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <span>{label}</span>
        <span className={deltaColor}>
          {delta === 0 ? "even" : `${delta > 0 && positive ? "+" : ""}${delta}`}
        </span>
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function getDelta(a: string | number, b: string | number) {
  const parse = (value: string | number) => Number.parseInt(String(value).replace(/[^0-9-]/g, ""), 10) || 0;
  return parse(a) - parse(b);
}
