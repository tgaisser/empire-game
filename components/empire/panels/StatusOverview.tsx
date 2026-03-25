'use client';

import { Bot, Coins, User } from "lucide-react";
import { CITY_INCOME, UNIT_STATS } from "@/lib/empire/config";
import { Card, CardContent } from "@/components/ui/card";

type StatusOverviewProps = {
  playerCities: number;
  aiCities: number;
  playerUnits: number;
  aiUnits: number;
  playerCredits: number;
  aiCredits: number;
  playerExploredPercent: number;
  aiExploredPercent: number;
  playerExplorationIncome: number;
  aiExplorationIncome: number;
};

export function StatusOverview({
  playerCities,
  aiCities,
  playerUnits,
  aiUnits,
  playerCredits,
  aiCredits,
  playerExploredPercent,
  aiExploredPercent,
  playerExplorationIncome,
  aiExplorationIncome,
}: StatusOverviewProps) {
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
      <Card className="bg-slate-950 border-slate-800 rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <User className="w-4 h-4" /> Player
          </div>
          <div className="flex items-center justify-between text-slate-300"><span>Cities</span><span>{playerCities}</span></div>
          <div className="flex items-center justify-between text-slate-300"><span>Units</span><span>{playerUnits}</span></div>
          <div className="flex items-center justify-between text-slate-300"><span>Explored</span><span>{playerExploredPercent}%</span></div>
          <div className="flex items-center justify-between text-slate-300"><span>Scout income</span><span>+{playerExplorationIncome}</span></div>
          <div className="flex items-center justify-between text-slate-300"><span>Credits</span><span>{playerCredits}</span></div>
        </CardContent>
      </Card>
      <Card className="bg-slate-950 border-slate-800 rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <Bot className="w-4 h-4" /> Enemy
          </div>
          <div className="flex items-center justify-between text-slate-300"><span>Cities</span><span>{aiCities}</span></div>
          <div className="flex items-center justify-between text-slate-300"><span>Units</span><span>{aiUnits}</span></div>
          <div className="flex items-center justify-between text-slate-300"><span>Explored</span><span>{aiExploredPercent}%</span></div>
          <div className="flex items-center justify-between text-slate-300"><span>Scout income</span><span>+{aiExplorationIncome}</span></div>
          <div className="flex items-center justify-between text-slate-300"><span>Credits</span><span>{aiCredits}</span></div>
        </CardContent>
      </Card>
      <Card className="bg-slate-950 border-slate-800 rounded-2xl">
        <CardContent className="p-4 space-y-2 text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <Coins className="w-4 h-4" /> Economy
          </div>
          <div className="flex items-center justify-between"><span>Infantry cost</span><span>{UNIT_STATS.infantry.cost}</span></div>
          <div className="flex items-center justify-between"><span>Tank build time</span><span>{UNIT_STATS.tank.buildTime} turns</span></div>
          <div className="flex items-center justify-between"><span>City income</span><span>{CITY_INCOME}/turn</span></div>
          <div className="flex items-center justify-between"><span>Exploration income</span><span>+1 / 10%</span></div>
          <div className="flex items-center justify-between"><span>Mountain move cost</span><span>2</span></div>
          <div className="flex items-center justify-between"><span>Build</span><span>Click your city panel</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
