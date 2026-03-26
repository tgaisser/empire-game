import asianCapitals from "@/lib/empire/data/asian-capitals.json";
import africaCapitals from "@/lib/empire/data/africa-capitals.json";
import canadaCities from "@/lib/empire/data/canada-cities.json";
import chinaCapitals from "@/lib/empire/data/china-capitals.json";
import iranCities from "@/lib/empire/data/iran-cities.json";
import israelCities from "@/lib/empire/data/israel-cities.json";
import mexicoCities from "@/lib/empire/data/mexico-cities.json";
import usaStateCapitals from "@/lib/empire/data/usa-state-capitals.json";
import type { Faction, Side } from "@/lib/empire/types";

export type FactionOption = {
  id: Faction;
  label: string;
  cityListLabel: string;
  accentClass: string;
  chipClass: string;
  textClass: string;
  ringClass: string;
  primaryClass: string;
  secondaryClass: string;
  tertiaryClass: string;
  badgeBackgroundClass: string;
  borderClass: string;
};

export type SideDisplayOption = {
  id: Side;
  label: string;
  chipClass: string;
  textClass: string;
  ringClass: string;
  primaryClass: string;
  secondaryClass: string;
  tertiaryClass: string;
  badgeBackgroundClass: string;
  borderClass: string;
  hex: string;
};

export const FACTION_OPTIONS: Array<FactionOption> = [
  {
    id: "usa",
    label: "USA",
    cityListLabel: "USA State Capitals",
    accentClass: "from-[#b31942]/42 via-[#0a3161]/18 to-white/8",
    chipClass: "bg-[#b31942]/24 border-[#0a3161]/52",
    textClass: "text-[#b31942]",
    ringClass: "ring-[#0a3161] border-blue-950/20",
    primaryClass: "text-[#0a3161]",
    secondaryClass: "text-[#b31942]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#0a3161]",
    borderClass: "border-[#b31942]",
  },
  {
    id: "asia",
    label: "Asia",
    cityListLabel: "Asian Capitals",
    accentClass: "from-[#facc15]/34 via-white/12 to-[#ef4444]/10",
    chipClass: "bg-[#facc15]/20 border-white/44",
    textClass: "text-[#facc15]",
    ringClass: "ring-white border-slate-200/20",
    primaryClass: "text-[#facc15]",
    secondaryClass: "text-white",
    tertiaryClass: "text-[#ef4444]",
    badgeBackgroundClass: "bg-[#facc15]",
    borderClass: "border-white",
  },
  {
    id: "china",
    label: "China",
    cityListLabel: "Chinese Command Cities",
    accentClass: "from-[#EE1C25]/36 via-[#FFFF00]/12 to-yellow-100/6",
    chipClass: "bg-[#EE1C25]/20 border-[#FFFF00]/44",
    textClass: "text-[#EE1C25]",
    ringClass: "ring-[#FFFF00] border-yellow-900/20",
    primaryClass: "text-[#EE1C25]",
    secondaryClass: "text-[#EE1C25]",
    tertiaryClass: "text-[#FFFF00]",
    badgeBackgroundClass: "bg-[#EE1C25]",
    borderClass: "border-[#EE1C25]",
  },
  {
    id: "africa",
    label: "Africa",
    cityListLabel: "African Capitals",
    accentClass: "from-[#dc2626]/34 via-[#0f8a43]/12 to-black/10",
    chipClass: "bg-[#dc2626]/20 border-[#0f8a43]/44",
    textClass: "text-[#dc2626]",
    ringClass: "ring-[#0f8a43] border-emerald-950/20",
    primaryClass: "text-[#dc2626]",
    secondaryClass: "text-[#0f8a43]",
    tertiaryClass: "text-black",
    badgeBackgroundClass: "bg-[#dc2626]",
    borderClass: "border-[#0f8a43]",
  },
  {
    id: "iran",
    label: "Iran",
    cityListLabel: "Iranian Cities",
    accentClass: "from-[#239f40]/34 via-[#da0000]/10 to-white/10",
    chipClass: "bg-[#239f40]/20 border-[#da0000]/40",
    textClass: "text-[#239f40]",
    ringClass: "ring-[#da0000] border-red-950/20",
    primaryClass: "text-[#239f40]",
    secondaryClass: "text-[#da0000]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#239f40]",
    borderClass: "border-[#da0000]",
  },
  {
    id: "israel",
    label: "Israel",
    cityListLabel: "Israeli Cities",
    accentClass: "from-[#005EB8]/34 via-white/10 to-sky-100/8",
    chipClass: "bg-[#005EB8]/20 border-[#93c5fd]/44",
    textClass: "text-[#005EB8]",
    ringClass: "ring-white border-slate-200/20",
    primaryClass: "text-white",
    secondaryClass: "text-white",
    tertiaryClass: "text-[#005EB8]",
    badgeBackgroundClass: "bg-[#ffffff]",
    borderClass: "border-white",
  },
  {
    id: "canada",
    label: "Canada",
    cityListLabel: "Canadian Cities",
    accentClass: "from-[#d80621]/38 via-white/12 to-[#d80621]/10",
    chipClass: "bg-[#d80621]/20 border-white/44",
    textClass: "text-[#d80621]",
    ringClass: "ring-white border-slate-200/20",
    primaryClass: "text-white",
    secondaryClass: "text-white",
    tertiaryClass: "text-[#d80621]",
    badgeBackgroundClass: "bg-[#ffffff]",
    borderClass: "border-white",
  },
  {
    id: "mexico",
    label: "Mexico",
    cityListLabel: "Mexican Cities",
    accentClass: "from-[#006847]/36 via-white/12 to-[#ce1126]/10",
    chipClass: "bg-[#006847]/20 border-[#ce1126]/40",
    textClass: "text-[#006847]",
    ringClass: "ring-[#ce1126] border-red-950/20",
    primaryClass: "text-[#006847]",
    secondaryClass: "text-[#ce1126]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#006847]",
    borderClass: "border-[#ce1126]",
  },
];

const SIDE_DISPLAY_OPTIONS: Record<Side, SideDisplayOption> = {
  player: {
    id: "player",
    label: "Player",
    chipClass: "bg-[#a3e635]/20 border-[#d9f99d]/40",
    textClass: "text-[#a3e635]",
    ringClass: "ring-[#a3e635] border-lime-950/20",
    primaryClass: "text-[#a3e635]",
    secondaryClass: "text-[#d9f99d]",
    tertiaryClass: "text-[#111827]",
    badgeBackgroundClass: "bg-[#a3e635]",
    borderClass: "border-[#d9f99d]",
    hex: "#a3e635",
  },
  ai: {
    id: "ai",
    label: "Computer",
    chipClass: "bg-[#ef4444]/20 border-[#fecaca]/38",
    textClass: "text-[#ef4444]",
    ringClass: "ring-[#ef4444] border-red-950/20",
    primaryClass: "text-[#ef4444]",
    secondaryClass: "text-[#fecaca]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#ef4444]",
    borderClass: "border-[#fecaca]",
    hex: "#ef4444",
  },
};

export function getFactionOption(faction: Faction) {
  return FACTION_OPTIONS.find((option) => option.id === faction) ?? FACTION_OPTIONS[0];
}

export function getSideDisplayOption(sideOrOwner: Side | null) {
  if (!sideOrOwner) return null;
  return SIDE_DISPLAY_OPTIONS[sideOrOwner];
}

function replaceClassPrefix(value: string, prefix: "text" | "bg" | "border" | "ring") {
  return value.replace(/^(text|bg|border|ring)-/, `${prefix}-`);
}

function swapFactionDisplayColors(option: FactionOption): FactionOption {
  const swappedPrimaryClass = option.secondaryClass;
  const swappedSecondaryClass = option.primaryClass;
  const ringParts = option.ringClass.split(" ");
  const ringTail = ringParts.slice(1).join(" ");

  return {
    ...option,
    textClass: swappedPrimaryClass,
    primaryClass: swappedPrimaryClass,
    secondaryClass: swappedSecondaryClass,
    badgeBackgroundClass: replaceClassPrefix(swappedPrimaryClass, "bg"),
    borderClass: replaceClassPrefix(swappedSecondaryClass, "border"),
    ringClass: [replaceClassPrefix(swappedSecondaryClass, "ring"), ringTail].filter(Boolean).join(" "),
  };
}

function applyTertiaryAsPrimary(option: FactionOption): FactionOption {
  const nextPrimaryClass = option.tertiaryClass;
  const nextSecondaryClass = option.primaryClass;
  const ringParts = option.ringClass.split(" ");
  const ringTail = ringParts.slice(1).join(" ");

  return {
    ...option,
    textClass: nextPrimaryClass,
    primaryClass: nextPrimaryClass,
    secondaryClass: nextSecondaryClass,
    badgeBackgroundClass: replaceClassPrefix(nextPrimaryClass, "bg"),
    borderClass: replaceClassPrefix(nextSecondaryClass, "border"),
    ringClass: [replaceClassPrefix(nextSecondaryClass, "ring"), ringTail].filter(Boolean).join(" "),
  };
}

export function getDisplayFactionOption(playerFaction: Faction, aiFaction: Faction, sideOrOwner: Side | null) {
  const faction = sideOrOwner === "player" ? playerFaction : sideOrOwner === "ai" ? aiFaction : null;
  if (!faction) return null;

  const option = getFactionOption(faction);
  if (sideOrOwner !== "ai") return option;

  const playerOption = getFactionOption(playerFaction);
  const secondaryCollision = playerOption.secondaryClass === option.secondaryClass;
  const primaryCollision = playerOption.primaryClass === option.primaryClass;

  if (!secondaryCollision && !primaryCollision) return option;

  const swappedOption = swapFactionDisplayColors(option);
  if (
    swappedOption.primaryClass !== playerOption.primaryClass &&
    swappedOption.secondaryClass !== playerOption.secondaryClass
  ) {
    return swappedOption;
  }

  const tertiaryOption = applyTertiaryAsPrimary(option);
  if (
    tertiaryOption.primaryClass !== playerOption.primaryClass &&
    tertiaryOption.primaryClass !== playerOption.secondaryClass
  ) {
    return tertiaryOption;
  }

  return swappedOption;
}

export function getFactionCityNames(faction: Faction) {
  if (faction === "asia") return asianCapitals;
  if (faction === "china") return chinaCapitals;
  if (faction === "africa") return africaCapitals;
  if (faction === "canada") return canadaCities;
  if (faction === "iran") return iranCities;
  if (faction === "israel") return israelCities;
  if (faction === "mexico") return mexicoCities;
  return usaStateCapitals;
}

export function getSideFaction(playerFaction: Faction, aiFaction: Faction, sideOrOwner: Side | null) {
  if (sideOrOwner === "player") return playerFaction;
  if (sideOrOwner === "ai") return aiFaction;
  return null;
}
