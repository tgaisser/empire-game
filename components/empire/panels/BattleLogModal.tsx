'use client';

import { useMemo, useState } from "react";
import { ScrollText, X } from "lucide-react";
import { BATTLE_LOG_FILTERS, filterBattleLogs, getBattleLogFilterLabel } from "@/components/empire/panels/battleLogUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type BattleLogModalProps = {
  open: boolean;
  logs: string[];
  onClose: () => void;
};

export function BattleLogModal({ open, logs, onClose }: BattleLogModalProps) {
  const [filter, setFilter] = useState<(typeof BATTLE_LOG_FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const filteredLogs = useMemo(() => filterBattleLogs(logs, filter, query), [filter, logs, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-3xl border-slate-800 bg-slate-900 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl flex items-center gap-2">
            <ScrollText className="w-5 h-5" /> Battle Log
          </CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
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
              className="min-w-44 flex-1 rounded-full border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
            />
          </div>
          <ScrollArea className="h-[420px] pr-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
