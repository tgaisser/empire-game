import type {
  GameType,
  TileImprovementType,
  UnitDomain,
  UnitType,
} from "@/lib/empire/types";

export type ManualMode = "quick-start" | "reference" | "tactics";

export type ManualReferenceSection =
  | "units"
  | "improvements"
  | "domains"
  | "rules"
  | "terrain"
  | "campaigns";

export type ManualFact = {
  label: string;
  value: string;
};

export type ManualSection = {
  title: string;
  body: string[];
};

export type ManualRelatedLink = {
  kind: "unit" | "improvement" | "domain" | "rule" | "terrain" | "campaign" | "tactic";
  id: string;
  label: string;
  note?: string;
};

export type ManualQuickStartCard = {
  id: string;
  title: string;
  body: string[];
};

export type ManualUnitEntry = {
  unitType: UnitType;
  summary: string;
  role: string[];
  strengths: string[];
  weaknesses: string[];
  tips: string[];
  worksWellWith: ManualRelatedLink[];
  counteredBy: ManualRelatedLink[];
  related: ManualRelatedLink[];
};

export type ManualImprovementEntry = {
  improvementType: TileImprovementType;
  summary: string;
  whenToBuild: string[];
  strengths: string[];
  risks: string[];
  related: ManualRelatedLink[];
};

export type ManualDomainEntry = {
  domain: UnitDomain;
  summary: string;
  sections: ManualSection[];
  related: ManualRelatedLink[];
};

export type ManualRuleEntry = {
  id: string;
  title: string;
  summary: string;
  sections: ManualSection[];
  related: ManualRelatedLink[];
};

export type ManualTerrainEntry = {
  id: "land" | "water" | "mountain";
  title: string;
  summary: string;
  sections: ManualSection[];
  related: ManualRelatedLink[];
};

export type ManualCampaignEntry = {
  gameType: GameType;
  title: string;
  summary: string;
  sections: ManualSection[];
};

export type ManualTacticEntry = {
  id: string;
  title: string;
  summary: string;
  sections: ManualSection[];
  related: ManualRelatedLink[];
};

export type ManualUnitReference = {
  id: UnitType;
  title: string;
  summary: string;
  domain: UnitDomain;
  facts: ManualFact[];
  capabilities: string[];
  specialRules: string[];
  entry: ManualUnitEntry;
};

export type ManualImprovementReference = {
  id: TileImprovementType;
  title: string;
  summary: string;
  facts: ManualFact[];
  specialRules: string[];
  entry: ManualImprovementEntry;
};
