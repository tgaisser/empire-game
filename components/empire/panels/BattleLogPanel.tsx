'use client';

import { useMemo, useState } from "react";
import { ChevronRight, ScrollText } from "lucide-react";
import { BATTLE_LOG_FILTERS, filterBattleLogs, getBattleLogFilterLabel } from "@/components/empire/panels/battleLogUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type BattleLogPanelProps = {
  logs: string[];
};

export function BattleLogPanel({ logs }: BattleLogPanelProps) {
  const [filter, setFilter] = useState<(typeof BATTLE_LOG_FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const filteredLogs = useMemo(() => filterBattleLogs(logs, filter, query), [filter, logs, query]);

  return (
    <Card className="border-slate-800 bg-slate-900/90 rounded-3xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <ScrollText className="w-5 h-5" /> Battle Log
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <details className="group rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-200">
            <span>Show battle log ({filteredLogs.length}/{logs.length} entries)</span>
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-4 flex flex-wrap gap-2">
            {BATTLE_LOG_FILTERS.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setFilter(entry)}
                className={`rounded-full border px-3 py-1 text-xs ${filter === entry ? "border-cyan-400/60 bg-cyan-950/40 text-cyan-100" : "border-slate-800 bg-slate-950 text-slate-300"}`}
              >
                {getBattleLogFilterLabel(entry)}
              </button>
            ))}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search log"
              className="min-w-36 flex-1 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-500"
            />
          </div>
          <ScrollArea className="mt-4 h-[340px] pr-4">
            <div className="space-y-2 text-sm">
              {filteredLogs
                .slice()
                .reverse()
                .map((log, index) => (
                  <div key={`${log}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-slate-300">
                    {log}
                  </div>
                ))}
            </div>
          </ScrollArea>
        </details>
      </CardContent>
    </Card>
  );
}
