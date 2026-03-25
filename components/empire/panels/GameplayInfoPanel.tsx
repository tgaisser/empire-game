'use client';

import { BookOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GameplayInfoPanel() {
  return (
    <Card className="border-slate-800 bg-slate-900/90 rounded-3xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Gameplay Info
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <details className="group rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-200">
            <span>Show gameplay rules and reminders</span>
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
            <p>Select one of your units, then click a highlighted tile to move or attack.</p>
            <p>Fog of war hides unseen territory. Dim tiles are stale intel from your last sighting.</p>
            <p>Units differ by attack, armor, piercing, movement, vision, domain, and cost.</p>
            <p>Units spend movement each turn. Mountains cost 2, land costs 1, and water is impassable to land units.</p>
            <p>Units that hold position fortify and take lighter losses. City defenders get that city bonus too.</p>
            <p>Exploration pays: every 10% of the world you have charted adds +1 income.</p>
            <p>Click one of your cities to open its production panel and choose what to build.</p>
            <p>Wipe out enemy cities and forces to win.</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
