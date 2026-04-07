'use client';

import { Crosshair, Eye, Rocket, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TargetActionChoice = {
  id: "attack" | "missile" | "inspect-unit" | "inspect-site";
  label: string;
  detail: string;
};

type TargetActionModalProps = {
  open: boolean;
  title: string;
  subtitle: string;
  actions: TargetActionChoice[];
  onChoose: (actionId: TargetActionChoice["id"]) => void;
  onClose: () => void;
};

const ACTION_STYLES: Record<TargetActionChoice["id"], { icon: typeof Crosshair; accent: string; badge: string }> = {
  attack: {
    icon: Crosshair,
    accent: "border-red-400/25 bg-red-500/10 hover:border-red-300/40 hover:bg-red-500/14",
    badge: "text-red-200",
  },
  missile: {
    icon: Rocket,
    accent: "border-amber-400/25 bg-amber-500/10 hover:border-amber-300/40 hover:bg-amber-500/14",
    badge: "text-amber-200",
  },
  "inspect-unit": {
    icon: Eye,
    accent: "border-cyan-400/25 bg-cyan-500/10 hover:border-cyan-300/40 hover:bg-cyan-500/14",
    badge: "text-cyan-200",
  },
  "inspect-site": {
    icon: Zap,
    accent: "border-emerald-400/25 bg-emerald-500/10 hover:border-emerald-300/40 hover:bg-emerald-500/14",
    badge: "text-emerald-200",
  },
};

export function TargetActionModal({
  open,
  title,
  subtitle,
  actions,
  onChoose,
  onClose,
}: TargetActionModalProps) {
  if (!open || actions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[106] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close target actions" />
      <div className="relative z-10 w-full max-w-lg rounded-[1.75rem] border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Target Options</div>
            <div className="mt-2 text-2xl font-black text-white">{title}</div>
            <div className="mt-1 text-sm text-slate-300">{subtitle}</div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3 px-6 py-5">
          {actions.map((action) => {
            const style = ACTION_STYLES[action.id];
            const Icon = style.icon;
            return (
              <button
                key={action.id}
                type="button"
                className={`flex w-full items-center justify-between rounded-3xl border px-4 py-4 text-left transition ${style.accent}`}
                onClick={() => onChoose(action.id)}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-base font-semibold text-white">{action.label}</span>
                    <span className="block text-xs text-slate-300">{action.detail}</span>
                  </span>
                </span>
                <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${style.badge}`}>
                  {action.id === "attack"
                    ? "Attack"
                    : action.id === "missile"
                      ? "Missile"
                      : action.id === "inspect-unit"
                        ? "Unit Intel"
                        : "Site Intel"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
