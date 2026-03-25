'use client';

import { Hourglass, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EndTurnConfirmModalProps = {
  open: boolean;
  unmovedUnitCount: number;
  suppressForGame: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onSuppressForGameChange: (checked: boolean) => void;
};

export function EndTurnConfirmModal({
  open,
  unmovedUnitCount,
  suppressForGame,
  onCancel,
  onConfirm,
  onSuppressForGameChange,
}: EndTurnConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-lg border-amber-700/40 bg-slate-900 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl flex items-center gap-2">
            <TriangleAlert className="w-5 h-5 text-amber-300" /> Hold Or Advance?
          </CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-amber-700/30 bg-amber-950/20 p-4 text-sm text-slate-200">
            <div className="font-semibold text-amber-200">{unmovedUnitCount} units have not moved yet.</div>
            <div className="mt-2 text-slate-300">
              If you end the turn now, those units will hold position, fortify where possible, and the enemy will seize initiative.
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={suppressForGame}
              onChange={(event) => onSuppressForGameChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-amber-400 focus:ring-amber-400"
            />
            <span>Don&apos;t ask again for this game</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-2xl" onClick={onCancel}>
              Keep Command
            </Button>
            <Button className="rounded-2xl" onClick={onConfirm} autoFocus>
              <Hourglass className="w-4 h-4 mr-2" />
              End Turn Anyway
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
