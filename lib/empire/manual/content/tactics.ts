import type { ManualTacticEntry } from "@/lib/empire/manual/types";

export const TACTIC_ENTRIES: ManualTacticEntry[] = [
  {
    id: "fleet-screening",
    title: "Fleet Screening",
    summary: "Your navy works best as a layered formation, not as isolated hulls.",
    sections: [
      {
        title: "Core Idea",
        body: [
          "Keep destroyers near carriers and troop transports so the expensive ships are not exposed to direct punishment.",
          "A screened fleet sees more, survives longer, and makes enemy submarines far less comfortable.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "destroyer", label: "Destroyer" },
      { kind: "unit", id: "carrier", label: "Carrier" },
      { kind: "unit", id: "troop-transport", label: "Troop Transport" },
    ],
  },
  {
    id: "layered-air-campaign",
    title: "Layered Air Campaign",
    summary: "Air power is strongest when recon, basing, and strike assets are built in that order.",
    sections: [
      {
        title: "Core Idea",
        body: [
          "Start with basing and detection, then add fighters for control, then commit bombers and drones once the air picture is clear.",
          "Without that order, air units often spend more time relocating than applying pressure.",
        ],
      },
    ],
    related: [
      { kind: "improvement", id: "airfield", label: "Airfield" },
      { kind: "improvement", id: "radar", label: "Radar Upgrade" },
      { kind: "unit", id: "fighter", label: "Fighter" },
      { kind: "unit", id: "bomber", label: "Bomber" },
    ],
  },
  {
    id: "engineer-led-breakthrough",
    title: "Engineer-Led Breakthrough",
    summary: "Engineers turn impossible routes into armored attack lanes.",
    sections: [
      {
        title: "Core Idea",
        body: [
          "Let engineers build the route first, then commit tanks and infantry through the improved corridor.",
          "Bridges and tunnels are worth more when they open an objective, not when they are built in empty space.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "engineer", label: "Engineer" },
      { kind: "unit", id: "tank", label: "Tank" },
      { kind: "improvement", id: "bridge", label: "Bridge" },
      { kind: "improvement", id: "tunnel", label: "Tunnel" },
    ],
  },
  {
    id: "covert-insertion",
    title: "Covert Insertion",
    summary: "Submarines, choppers, and Special Ops let you attack the enemy system from inside it.",
    sections: [
      {
        title: "Core Idea",
        body: [
          "Recon first, insert second, strike third. Covert units fail when they are asked to do all three at once.",
          "A hidden team in the right place can force a much larger reaction than its price suggests.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "special-ops", label: "Special Ops" },
      { kind: "unit", id: "submarine", label: "Submarine" },
      { kind: "unit", id: "chopper", label: "Chopper" },
    ],
  },
];
