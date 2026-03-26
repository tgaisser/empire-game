'use client';

import { motion } from "framer-motion";
import { BookOpen, ChevronDown, Flag, Mountain, Ship, Swords } from "lucide-react";
import { FACTION_OPTIONS, getDisplayFactionOption, getFactionOption } from "@/lib/empire/factions";
import { Button } from "@/components/ui/button";
import type { Faction, GameType, WorldSizeOption } from "@/lib/empire/types";

type StartGameModalProps = {
  open: boolean;
  canCancel?: boolean;
  selectedGameType: GameType;
  selectedPlayerFaction: Faction;
  selectedAiFaction: Faction;
  selectedWorldSizeId: string;
  worldSizeOptions: WorldSizeOption[];
  onChangeGameType: (value: GameType) => void;
  onChangePlayerFaction: (value: Faction) => void;
  onChangeAiFaction: (value: Faction) => void;
  onChangeWorldSize: (value: string) => void;
  onOpenDocs: () => void;
  onCancel?: () => void;
  onStart: () => void;
};

const GAME_TYPE_COPY: Record<Exclude<GameType, "michigan">, { title: string; summary: string; accent: string; Icon: typeof Swords }> = {
  normal: {
    title: "Normal Campaign",
    summary: "Balanced continents, mixed fronts, and the standard empire crawl.",
    accent: "from-amber-300/30 via-sky-300/10 to-emerald-300/10",
    Icon: Swords,
  },
  naval: {
    title: "Lakes and Rivers",
    summary: "Broad lakes, river cuts, and mixed land-water fronts without going full island warfare.",
    accent: "from-sky-300/30 via-cyan-300/10 to-slate-300/10",
    Icon: Ship,
  },
  archipelago: {
    title: "Archipelago",
    summary: "Many islands, scattered neutral ports, and constant amphibious pressure across broken seas.",
    accent: "from-cyan-300/30 via-sky-300/10 to-emerald-300/10",
    Icon: Ship,
  },
  ocean: {
    title: "Open Ocean",
    summary: "Major powers begin apart across broad water, with only a few stepping-stone islands between them.",
    accent: "from-blue-300/30 via-cyan-300/10 to-slate-300/10",
    Icon: Ship,
  },
  alpine: {
    title: "Alpine War",
    summary: "Heavier mountain dominance, tighter passes, and a sharper ground war.",
    accent: "from-stone-300/30 via-slate-300/10 to-emerald-300/10",
    Icon: Mountain,
  },
};

export function StartGameModal({
  open,
  canCancel = false,
  selectedGameType,
  selectedPlayerFaction,
  selectedAiFaction,
  selectedWorldSizeId,
  worldSizeOptions,
  onChangeGameType,
  onChangePlayerFaction,
  onChangeAiFaction,
  onChangeWorldSize,
  onOpenDocs,
  onCancel,
  onStart,
}: StartGameModalProps) {
  if (!open) return null;

  const normalizedGameType = selectedGameType === "michigan" ? "normal" : selectedGameType;
  const preview = GAME_TYPE_COPY[normalizedGameType];
  const PreviewIcon = preview.Icon;
  const selectedWorldSize = worldSizeOptions.find((option) => option.id === selectedWorldSizeId) ?? worldSizeOptions[0];
  const playerFaction = getFactionOption(selectedPlayerFaction);
  const aiFaction = getFactionOption(selectedAiFaction);
  const aiDisplayFaction = getDisplayFactionOption(selectedPlayerFaction, selectedAiFaction, "ai") ?? aiFaction;
  const factionsConflict = selectedPlayerFaction === selectedAiFaction;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-700/80 bg-slate-950 shadow-[0_30px_100px_rgba(2,6,23,0.75)]"
      >
        <div className={`absolute inset-x-0 top-0 h-64 bg-gradient-to-br ${preview.accent}`} />
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <svg viewBox="0 0 1200 700" className="h-full w-full">
            <defs>
              <linearGradient id="commandSky" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(251,191,36,0.30)" />
                <stop offset="50%" stopColor="rgba(96,165,250,0.14)" />
                <stop offset="100%" stopColor="rgba(16,185,129,0.10)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="1200" height="700" fill="url(#commandSky)" />
            <path d="M0 520 C140 470 220 560 340 520 C470 475 540 380 680 420 C840 468 900 620 1200 500 L1200 700 L0 700 Z" fill="rgba(15,23,42,0.78)" />
            <path d="M0 580 C120 540 220 620 330 590 C470 550 570 470 710 500 C860 534 940 640 1200 560" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="4" />
            <path d="M160 418 L220 290 L290 418 Z" fill="rgba(203,213,225,0.18)" />
            <path d="M760 430 L820 260 L900 430 Z" fill="rgba(203,213,225,0.16)" />
            <path d="M1000 438 L1048 330 L1100 438 Z" fill="rgba(203,213,225,0.13)" />
            <rect x="530" y="310" width="140" height="152" rx="10" fill="rgba(248,250,252,0.10)" stroke="rgba(248,250,252,0.20)" />
            <rect x="558" y="260" width="34" height="72" rx="6" fill="rgba(248,250,252,0.12)" />
            <rect x="607" y="240" width="34" height="92" rx="6" fill="rgba(248,250,252,0.16)" />
            <rect x="500" y="462" width="200" height="18" rx="9" fill="rgba(248,250,252,0.12)" />
            <path d="M312 470 C390 430 440 500 516 466" fill="none" stroke="rgba(125,211,252,0.28)" strokeWidth="7" strokeLinecap="round" />
            <path d="M860 520 C930 470 1000 560 1090 500" fill="none" stroke="rgba(125,211,252,0.22)" strokeWidth="7" strokeLinecap="round" />
            <g stroke="rgba(251,191,36,0.22)" strokeWidth="2">
              <path d="M88 120 L240 120" />
              <path d="M76 160 L210 160" />
              <path d="M926 144 L1088 144" />
            </g>
          </svg>
        </div>

        <div className="relative p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Empire Command</div>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Start New Game</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200/90">
                Choose the kind of campaign you want to launch. Each mode now generates a different strategic geography,
                from balanced fronts to water isolation and alpine choke points.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-700/70 bg-slate-900/70 p-5 shadow-xl">
                <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  Forces
                </label>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className={`rounded-2xl border ${playerFaction.chipClass} bg-slate-950/70 p-4`}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Play As</div>
                    <div className="relative">
                      <select
                        value={selectedPlayerFaction}
                        onChange={(event) => onChangePlayerFaction(event.target.value as Faction)}
                        className="h-12 w-full appearance-none rounded-2xl border border-slate-700 bg-slate-950/80 px-4 pr-12 text-base font-semibold text-white outline-none transition focus:border-amber-300"
                      >
                        {FACTION_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                    <div className={`mt-2 text-xs ${playerFaction.textClass}`}>{playerFaction.cityListLabel}</div>
                  </div>
                  <div className={`rounded-2xl border ${aiFaction.chipClass} ${aiDisplayFaction.borderClass}/45 bg-slate-950/70 p-4`}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Play Against</div>
                    <div className="relative">
                      <select
                        value={selectedAiFaction}
                        onChange={(event) => onChangeAiFaction(event.target.value as Faction)}
                        className="h-12 w-full appearance-none rounded-2xl border border-slate-700 bg-slate-950/80 px-4 pr-12 text-base font-semibold text-white outline-none transition focus:border-amber-300"
                      >
                        {FACTION_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id} disabled={option.id === selectedPlayerFaction}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                    <div className={`mt-2 text-xs ${aiDisplayFaction.textClass}`}>{aiFaction.cityListLabel}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <FactionPreviewCard title="Command Palette" faction={playerFaction} />
                  <FactionPreviewCard title="Opposition Palette" faction={aiDisplayFaction} />
                </div>
                {factionsConflict ? (
                  <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-950/30 p-3 text-xs text-red-100">
                    Mirror matches are disabled for now. Choose a different opposing faction.
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.5rem] border border-slate-700/70 bg-slate-900/70 p-5 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-600/80 bg-slate-950/80 text-amber-200">
                    <PreviewIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                      Game Type
                    </label>
                    <div className="mt-1 text-lg font-bold text-white">{preview.title}</div>
                    <div className="text-sm text-slate-300">{preview.summary}</div>
                  </div>
                </div>
                <div className="relative mt-3">
                  <select
                    value={normalizedGameType}
                    onChange={(event) => onChangeGameType(event.target.value as GameType)}
                    className="h-14 w-full appearance-none rounded-2xl border border-slate-700 bg-slate-950/80 px-4 pr-12 text-base font-semibold text-white outline-none transition focus:border-amber-300"
                  >
                    <option value="normal">Normal Game</option>
                    <option value="naval">Lakes and Rivers</option>
                    <option value="archipelago">Archipelago</option>
                    <option value="ocean">Open Ocean</option>
                    <option value="alpine">Alpine War</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-700/70 bg-slate-900/70 p-5 shadow-xl">
                <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  World Size
                </label>
                <div className="relative mt-3">
                  <select
                    value={selectedWorldSizeId}
                    onChange={(event) => onChangeWorldSize(event.target.value)}
                    className="h-14 w-full appearance-none rounded-2xl border border-slate-700 bg-slate-950/80 px-4 pr-12 text-base font-semibold text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {worldSizeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-700/70 bg-slate-900/75 p-5 shadow-xl">
              <div className="flex items-center gap-3 text-slate-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/12 text-amber-200">
                  <Flag className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.22em] text-slate-400">Campaign Brief</div>
                  <div className="mt-1 text-xl font-bold text-white">{preview.title}</div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
                {`Launch a fresh war on a ${selectedWorldSize.label.toLowerCase()} map with the selected terrain doctrine.`}
                {` ${playerFaction.label} cities will draw from ${playerFaction.cityListLabel}, enemy cities will draw from ${aiFaction.cityListLabel}, and neutral cities begin unnamed until captured.`}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Button variant="outline" className="h-12 rounded-2xl" onClick={onOpenDocs}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Documents
                </Button>
                <Button
                  className="h-12 rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300"
                  onClick={onStart}
                  disabled={factionsConflict}
                >
                  Deploy Campaign
                </Button>
                {canCancel && onCancel && (
                  <Button variant="outline" className="h-12 rounded-2xl" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FactionPreviewCard({
  title,
  faction,
}: {
  title: string;
  faction: ReturnType<typeof getFactionOption>;
}) {
  const swatches = [faction.primaryClass, faction.secondaryClass, faction.tertiaryClass].map((value) =>
    value.match(/\[#([^\]]+)\]/)?.[1]
  );

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-2 text-sm font-semibold text-white">{faction.label}</div>
      <div className="mt-3 flex gap-2">
        {swatches.map((swatch, index) => (
          <span
            key={`${title}-${index}`}
            className="h-6 w-6 rounded-full border border-white/15"
            style={{ backgroundColor: swatch ? `#${swatch}` : "#ffffff" }}
          />
        ))}
      </div>
      <div className="mt-3 text-xs leading-5 text-slate-400">
        Cities draw from {faction.cityListLabel}. Badge and map visuals now follow this same palette in play.
      </div>
    </div>
  );
}
