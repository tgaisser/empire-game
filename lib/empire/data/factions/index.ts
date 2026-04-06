import africa from "@/lib/empire/data/factions/africa.json";
import argentina from "@/lib/empire/data/factions/argentina.json";
import asia from "@/lib/empire/data/factions/asia.json";
import australia from "@/lib/empire/data/factions/australia.json";
import canada from "@/lib/empire/data/factions/canada.json";
import china from "@/lib/empire/data/factions/china.json";
import europeanUnion from "@/lib/empire/data/factions/european-union.json";
import greatBritain from "@/lib/empire/data/factions/great-britain.json";
import iran from "@/lib/empire/data/factions/iran.json";
import israel from "@/lib/empire/data/factions/israel.json";
import japan from "@/lib/empire/data/factions/japan.json";
import mexico from "@/lib/empire/data/factions/mexico.json";
import northKorea from "@/lib/empire/data/factions/north-korea.json";
import russia from "@/lib/empire/data/factions/russia.json";
import southKorea from "@/lib/empire/data/factions/south-korea.json";
import ukraine from "@/lib/empire/data/factions/ukraine.json";
import usa from "@/lib/empire/data/factions/usa.json";
import type { Faction } from "@/lib/empire/types";

export type FactionDefinition = {
  id: Faction;
  label: string;
  cityListLabel: string;
  capitalCity: string;
  accentClass: string;
  chipClass: string;
  textClass: string;
  ringClass: string;
  primaryClass: string;
  secondaryClass: string;
  tertiaryClass: string;
  badgeBackgroundClass: string;
  borderClass: string;
  cityNames: string[];
};

export const FACTIONS = [
  usa,
  china,
  asia,
  africa,
  iran,
  israel,
  canada,
  mexico,
  europeanUnion,
  greatBritain,
  argentina,
  australia,
  japan,
  northKorea,
  southKorea,
  russia,
  ukraine,
] as FactionDefinition[];

export const FACTIONS_BY_ID = Object.fromEntries(FACTIONS.map((faction) => [faction.id, faction])) as Record<
  Faction,
  FactionDefinition
>;
