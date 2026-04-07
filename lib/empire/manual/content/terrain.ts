import type { ManualTerrainEntry } from "@/lib/empire/manual/types";

export const TERRAIN_ENTRIES: ManualTerrainEntry[] = [
  {
    id: "land",
    title: "Land",
    summary: "The default surface for cities, airfields, ports, and most maneuver warfare.",
    sections: [
      {
        title: "Operational Use",
        body: [
          "Land is where capture, production, and most direct positional warfare happen.",
          "It is also where engineers have the most influence over the map.",
        ],
      },
    ],
    related: [
      { kind: "domain", id: "land", label: "Land Doctrine" },
      { kind: "improvement", id: "outpost", label: "Outpost" },
    ],
  },
  {
    id: "water",
    title: "Water",
    summary: "Sea lanes separate fronts, enable invasions, and demand dedicated naval support.",
    sections: [
      {
        title: "Operational Use",
        body: [
          "Sea units move freely on water, but land units need bridges, ports, or transports to project power across it.",
          "Water is also where carriers and submarines create the biggest swings in strategic tempo.",
        ],
      },
    ],
    related: [
      { kind: "domain", id: "sea", label: "Sea Doctrine" },
      { kind: "unit", id: "carrier", label: "Carrier" },
    ],
  },
  {
    id: "mountain",
    title: "Mountain",
    summary: "Mountains slow land forces, block tanks, and create natural choke points.",
    sections: [
      {
        title: "Operational Use",
        body: [
          "Mountains are a barrier until engineers cut tunnels or forces fight through narrow passes.",
          "They reward prepared defenders and punish unsupported armor pushes.",
        ],
      },
    ],
    related: [
      { kind: "improvement", id: "tunnel", label: "Tunnel" },
      { kind: "unit", id: "engineer", label: "Engineer" },
      { kind: "campaign", id: "alpine", label: "Alpine War" },
    ],
  },
];
