import asianCapitals from "@/lib/empire/data/asian-capitals.json";
import argentinaCities from "@/lib/empire/data/argentina-cities.json";
import africaCapitals from "@/lib/empire/data/africa-capitals.json";
import australiaCities from "@/lib/empire/data/australia-cities.json";
import canadaCities from "@/lib/empire/data/canada-cities.json";
import chinaCapitals from "@/lib/empire/data/china-capitals.json";
import europeanUnionCities from "@/lib/empire/data/european-union-cities.json";
import greatBritainCities from "@/lib/empire/data/great-britain-cities.json";
import iranCities from "@/lib/empire/data/iran-cities.json";
import israelCities from "@/lib/empire/data/israel-cities.json";
import japanCities from "@/lib/empire/data/japan-cities.json";
import mexicoCities from "@/lib/empire/data/mexico-cities.json";
import northKoreaCities from "@/lib/empire/data/north-korea-cities.json";
import russiaCities from "@/lib/empire/data/russia-cities.json";
import southKoreaCities from "@/lib/empire/data/south-korea-cities.json";
import ukraineCities from "@/lib/empire/data/ukraine-cities.json";
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
  {
    id: "european-union",
    label: "European Union",
    cityListLabel: "European Union Capitals",
    accentClass: "from-[#003399]/36 via-[#ffcc00]/12 to-white/8",
    chipClass: "bg-[#003399]/20 border-[#ffcc00]/44",
    textClass: "text-[#003399]",
    ringClass: "ring-[#ffcc00] border-blue-950/20",
    primaryClass: "text-[#003399]",
    secondaryClass: "text-[#ffcc00]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#003399]",
    borderClass: "border-[#ffcc00]",
  },
  {
    id: "great-britain",
    label: "Great Britain",
    cityListLabel: "British Cities",
    accentClass: "from-[#012169]/38 via-white/12 to-[#C8102E]/10",
    chipClass: "bg-[#012169]/22 border-[#C8102E]/42",
    textClass: "text-[#012169]",
    ringClass: "ring-[#C8102E] border-blue-950/20",
    primaryClass: "text-[#012169]",
    secondaryClass: "text-white",
    tertiaryClass: "text-[#C8102E]",
    badgeBackgroundClass: "bg-[#012169]",
    borderClass: "border-[#C8102E]",
  },
  {
    id: "argentina",
    label: "Argentina",
    cityListLabel: "Argentine Cities",
    accentClass: "from-[#6CB4EE]/36 via-white/14 to-[#F6B40E]/8",
    chipClass: "bg-[#6CB4EE]/20 border-white/44",
    textClass: "text-[#6CB4EE]",
    ringClass: "ring-white border-sky-950/20",
    primaryClass: "text-[#6CB4EE]",
    secondaryClass: "text-white",
    tertiaryClass: "text-[#F6B40E]",
    badgeBackgroundClass: "bg-[#6CB4EE]",
    borderClass: "border-white",
  },
  {
    id: "australia",
    label: "Australia",
    cityListLabel: "Australian Cities",
    accentClass: "from-[#012169]/38 via-white/12 to-[#E4002B]/10",
    chipClass: "bg-[#012169]/22 border-[#E4002B]/42",
    textClass: "text-[#012169]",
    ringClass: "ring-white border-blue-950/20",
    primaryClass: "text-[#012169]",
    secondaryClass: "text-white",
    tertiaryClass: "text-[#E4002B]",
    badgeBackgroundClass: "bg-[#012169]",
    borderClass: "border-white",
  },
  {
    id: "japan",
    label: "Japan",
    cityListLabel: "Japanese Cities",
    accentClass: "from-white/26 via-[#bc002d]/16 to-white/8",
    chipClass: "bg-white/18 border-[#bc002d]/40",
    textClass: "text-white",
    ringClass: "ring-[#bc002d] border-slate-200/20",
    primaryClass: "text-white",
    secondaryClass: "text-[#bc002d]",
    tertiaryClass: "text-[#bc002d]",
    badgeBackgroundClass: "bg-white",
    borderClass: "border-[#bc002d]",
  },
  {
    id: "north-korea",
    label: "North Korea",
    cityListLabel: "North Korean Cities",
    accentClass: "from-[#024FA2]/34 via-white/12 to-[#ED1C27]/10",
    chipClass: "bg-[#024FA2]/20 border-[#ED1C27]/42",
    textClass: "text-[#024FA2]",
    ringClass: "ring-white border-blue-950/20",
    primaryClass: "text-[#024FA2]",
    secondaryClass: "text-white",
    tertiaryClass: "text-[#ED1C27]",
    badgeBackgroundClass: "bg-[#024FA2]",
    borderClass: "border-[#ED1C27]",
  },
  {
    id: "south-korea",
    label: "South Korea",
    cityListLabel: "South Korean Cities",
    accentClass: "from-white/24 via-[#C60C30]/14 to-[#003478]/12",
    chipClass: "bg-white/18 border-[#003478]/42",
    textClass: "text-white",
    ringClass: "ring-[#003478] border-slate-200/20",
    primaryClass: "text-white",
    secondaryClass: "text-[#C60C30]",
    tertiaryClass: "text-[#003478]",
    badgeBackgroundClass: "bg-white",
    borderClass: "border-[#003478]",
  },
  {
    id: "russia",
    label: "Russia",
    cityListLabel: "Russian Cities",
    accentClass: "from-white/24 via-[#0039A6]/14 to-[#D52B1E]/12",
    chipClass: "bg-[#0039A6]/18 border-[#D52B1E]/40",
    textClass: "text-[#0039A6]",
    ringClass: "ring-white border-blue-950/20",
    primaryClass: "text-white",
    secondaryClass: "text-[#0039A6]",
    tertiaryClass: "text-[#D52B1E]",
    badgeBackgroundClass: "bg-white",
    borderClass: "border-[#0039A6]",
  },
  {
    id: "ukraine",
    label: "Ukraine",
    cityListLabel: "Ukrainian Cities",
    accentClass: "from-[#0057B7]/38 via-[#FFD700]/16 to-white/8",
    chipClass: "bg-[#0057B7]/20 border-[#FFD700]/44",
    textClass: "text-[#0057B7]",
    ringClass: "ring-[#FFD700] border-blue-950/20",
    primaryClass: "text-[#0057B7]",
    secondaryClass: "text-[#FFD700]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#0057B7]",
    borderClass: "border-[#FFD700]",
  },
];

const SIDE_DISPLAY_OPTIONS: Record<Side, SideDisplayOption> = {
  player: {
    id: "player",
    label: "Player",
    chipClass: "bg-[#38bdf8]/20 border-[#bae6fd]/40",
    textClass: "text-[#38bdf8]",
    ringClass: "ring-[#38bdf8] border-sky-950/20",
    primaryClass: "text-[#38bdf8]",
    secondaryClass: "text-[#bae6fd]",
    tertiaryClass: "text-[#111827]",
    badgeBackgroundClass: "bg-[#38bdf8]",
    borderClass: "border-[#bae6fd]",
    hex: "#38bdf8",
  },
  ai: {
    id: "ai",
    label: "Computer",
    chipClass: "bg-[#ec4899]/20 border-[#fbcfe8]/38",
    textClass: "text-[#ec4899]",
    ringClass: "ring-[#ec4899] border-pink-950/20",
    primaryClass: "text-[#ec4899]",
    secondaryClass: "text-[#fbcfe8]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#ec4899]",
    borderClass: "border-[#fbcfe8]",
    hex: "#ec4899",
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
  if (faction === "european-union") return europeanUnionCities;
  if (faction === "great-britain") return greatBritainCities;
  if (faction === "argentina") return argentinaCities;
  if (faction === "australia") return australiaCities;
  if (faction === "japan") return japanCities;
  if (faction === "north-korea") return northKoreaCities;
  if (faction === "south-korea") return southKoreaCities;
  if (faction === "russia") return russiaCities;
  if (faction === "ukraine") return ukraineCities;
  return usaStateCapitals;
}

export function getSideFaction(playerFaction: Faction, aiFaction: Faction, sideOrOwner: Side | null) {
  if (sideOrOwner === "player") return playerFaction;
  if (sideOrOwner === "ai") return aiFaction;
  return null;
}
