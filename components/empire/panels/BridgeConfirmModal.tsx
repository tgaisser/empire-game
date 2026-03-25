'use client';

import { Construction, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BridgeConfirmModalProps = {
  open: boolean;
  x: number;
  y: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function BridgeConfirmModal({ open, x, y, onCancel, onConfirm }: BridgeConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-lg border-cyan-700/40 bg-slate-900 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Construction className="h-5 w-5 text-cyan-300" /> Build Bridge Here?
          </CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-cyan-700/30 bg-cyan-950/20 p-4 text-sm text-slate-200">
            <div className="font-semibold text-cyan-200">River crossing at ({x + 1}, {y + 1})</div>
            <div className="mt-2 text-slate-300">
              The engineer will begin a one-turn bridge project on this water tile and remain committed until the span is complete.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-2xl" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="rounded-2xl bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={onConfirm}>
              Start Bridge
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
