'use client';

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, RotateCcw, Skull, Sparkles, Swords, X } from "lucide-react";
import type { Side } from "@/lib/empire/types";
import { Button } from "@/components/ui/button";

type EndgameOverlayProps = {
  open: boolean;
  winner: Side | null;
  turn: number;
  playerCities: number;
  playerUnits: number;
  onClose: () => void;
  onReset: () => void;
};

export function EndgameOverlay({
  open,
  winner,
  turn,
  playerCities,
  playerUnits,
  onClose,
  onReset,
}: EndgameOverlayProps) {
  const isVictory = winner === "player";

  const particles = useMemo(
    () =>
      Array.from({ length: isVictory ? 18 : 14 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 19) % 100}%`,
        delay: index * 0.08,
        duration: 2.8 + (index % 4) * 0.35,
      })),
    [isVictory]
  );

  return (
    <AnimatePresence>
      {open && winner && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={[
              "absolute inset-0",
              isVictory
                ? "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.28),_rgba(15,23,42,0.94)_55%)]"
                : "bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_rgba(2,6,23,0.96)_55%)]",
            ].join(" ")}
          />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {particles.map((particle) => (
              <motion.span
                key={particle.id}
                className={[
                  "absolute block rounded-full",
                  isVictory ? "h-3 w-3 bg-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.6)]" : "h-2.5 w-10 bg-red-300/20",
                ].join(" ")}
                style={{ left: particle.left, top: particle.top }}
                initial={isVictory ? { opacity: 0, y: -24, scale: 0.7 } : { opacity: 0, x: -12, rotate: -12 }}
                animate={
                  isVictory
                    ? {
                        opacity: [0, 1, 0.15],
                        y: [0, 160, 260],
                        x: [0, (particle.id % 2 === 0 ? 24 : -24)],
                        scale: [0.7, 1, 0.9],
                      }
                    : {
                        opacity: [0, 0.7, 0],
                        x: [0, 42],
                        y: [0, 18, 34],
                        rotate: [-10, 8, 20],
                      }
                }
                transition={{
                  repeat: Infinity,
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <motion.div
            className={[
              "relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-md",
              isVictory
                ? "border-amber-300/30 bg-slate-950/82"
                : "border-red-400/20 bg-slate-950/88",
            ].join(" ")}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 170, damping: 20 }}
          >
            <div
              className={[
                "absolute inset-x-0 top-0 h-40",
                isVictory
                  ? "bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.28),_transparent_70%)]"
                  : "bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.18),_transparent_70%)]",
              ].join(" ")}
            />

            <div className="relative p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={[
                      "flex h-16 w-16 items-center justify-center rounded-3xl border",
                      isVictory
                        ? "border-amber-300/40 bg-amber-300/12 text-amber-200"
                        : "border-red-300/20 bg-red-300/10 text-red-200",
                    ].join(" ")}
                  >
                    {isVictory ? <Crown className="h-8 w-8" /> : <Skull className="h-8 w-8" />}
                  </div>
                  <div>
                    <div className={["text-sm uppercase tracking-[0.28em]", isVictory ? "text-amber-200/80" : "text-red-200/75"].join(" ")}>
                      {isVictory ? "Campaign Secured" : "Command Broken"}
                    </div>
                    <h2 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">
                      {isVictory ? "Victory" : "Defeat"}
                    </h2>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div
                className={[
                  "mt-6 rounded-[1.5rem] border p-5 text-sm leading-6",
                  isVictory
                    ? "border-amber-300/20 bg-amber-300/8 text-amber-50"
                    : "border-red-300/15 bg-red-400/6 text-red-50/95",
                ].join(" ")}
              >
                {isVictory
                  ? "The front finally broke. Your colors are flying over the map, the enemy line has collapsed, and the campaign belongs to you."
                  : "The line failed. Cities fell, formations shattered, and the map slipped out of your hands before the counterstroke arrived."}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                    <Sparkles className="h-4 w-4" />
                    Final Turn
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">{turn}</div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                    <Crown className="h-4 w-4" />
                    Cities Held
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">{playerCities}</div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                    <Swords className="h-4 w-4" />
                    Forces Left
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">{playerUnits}</div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  className={[
                    "h-12 rounded-2xl px-6 text-sm font-semibold",
                    isVictory
                      ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                      : "bg-red-400 text-slate-950 hover:bg-red-300",
                  ].join(" ")}
                  onClick={onReset}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Start New Campaign
                </Button>
                <Button variant="outline" className="h-12 rounded-2xl px-6" onClick={onClose}>
                  Return To Map
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
