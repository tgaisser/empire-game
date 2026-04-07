import { GAME_TYPE_OPTIONS } from "@/lib/empire/config";
import type { ManualCampaignEntry } from "@/lib/empire/manual/types";

const CAMPAIGN_SUMMARIES: Record<ManualCampaignEntry["gameType"], string> = {
  normal: "Balanced fronts with room for land, sea, and air play.",
  naval: "Water-heavy maps where inland naval pressure matters early.",
  archipelago: "Island chains reward transports, carriers, and distributed basing.",
  pangea: "A giant landmass with fractures, channels, and long continental campaigns.",
  ocean: "Two main land powers divided by deep water and a small number of stepping stones.",
  alpine: "Mountain barriers make engineers, tunnels, and pass control decisive.",
  globe: "Large procedural world where logistics and recon scale up with the map.",
};

export const CAMPAIGN_ENTRIES: ManualCampaignEntry[] = GAME_TYPE_OPTIONS.map((gameType) => ({
  gameType: gameType.id,
  title: gameType.label,
  summary: CAMPAIGN_SUMMARIES[gameType.id],
  sections: [
    {
      title: "What It Rewards",
      body: [
        CAMPAIGN_SUMMARIES[gameType.id],
      ],
    },
    {
      title: "Operational Pattern",
      body: [
        gameType.id === "normal"
          ? "Build a balanced force and react to the geography the map generator gives you."
          : gameType.id === "naval"
            ? "Ports, sea lanes, and destroyer screens become relevant much earlier than on balanced maps."
            : gameType.id === "archipelago"
              ? "Plan your campaign around transports, carriers, and distributed airfields rather than one huge land front."
              : gameType.id === "pangea"
                ? "The supercontinent rewards long logistics chains, flank collapses, and mountain-route engineering."
                : gameType.id === "ocean"
                  ? "Cross-ocean invasion timing is the central question. Build the fleet before you need it."
                  : gameType.id === "alpine"
                    ? "Terrain denial matters more than raw speed. Secure passes and tunnel lines before committing armor."
                    : "Globe games reward sustainable recon, basing depth, and layered logistics more than quick raids.",
      ],
    },
  ],
}));
