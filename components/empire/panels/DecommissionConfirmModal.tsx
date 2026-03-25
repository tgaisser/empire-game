'use client';

import { TriangleAlert, X } from "lucide-react";
import { getUnitTypeLabel } from "@/lib/empire/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UnitType } from "@/lib/empire/types";

type DecommissionConfirmModalProps = {
  open: boolean;
  unitType: UnitType | null;
  unitName: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DecommissionConfirmModal({
  open,
  unitType,
  unitName,
  onCancel,
  onConfirm,
}: DecommissionConfirmModalProps) {
  if (!open || !unitType) return null;

  const label = unitName?.trim() || getUnitTypeLabel(unitType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-lg border-red-900/40 bg-slate-900 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-xl">
            <TriangleAlert className="h-5 w-5 text-red-300" /> Decommission Unit?
          </CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-4 text-sm text-slate-200">
            <div className="font-semibold text-red-200">{label} will be removed permanently.</div>
            <div className="mt-2 text-slate-300">
              This cannot be undone with the move undo button and will immediately remove the unit from the battlefield.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-2xl" onClick={onCancel}>
              Keep Unit
            </Button>
            <Button className="rounded-2xl bg-red-500 text-slate-950 hover:bg-red-400" onClick={onConfirm} autoFocus>
              Decommission
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
