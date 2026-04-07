import type { ManualQuickStartCard } from "@/lib/empire/manual/types";

export const QUICK_START_CARDS: ManualQuickStartCard[] = [
  {
    id: "first-turn",
    title: "Your First Turn",
    body: [
      "Select a friendly unit, then click a highlighted tile to move or attack.",
      "Use cities, ports, and airfields as your production and staging network.",
    ],
  },
  {
    id: "movement",
    title: "Movement And Position",
    body: [
      "Land, sea, and air units obey different movement and basing rules.",
      "Units that hold position fortify at end of turn, which makes them harder to dislodge.",
    ],
  },
  {
    id: "production",
    title: "Build Network",
    body: [
      "Cities build land units, ports build fleets, and airfields build aircraft.",
      "Engineers extend your network with ports, airfields, tunnels, radar, outposts, bridges, and minefields.",
    ],
  },
  {
    id: "vision",
    title: "Fog And Recon",
    body: [
      "Exploration matters. Vision reveals the map, and every 10 percent explored adds income.",
      "Use scouts, Special Ops, radar, carriers, and engineers to keep your intel fresh.",
    ],
  },
  {
    id: "victory",
    title: "How To Win",
    body: [
      "Capture enemy cities, break their production web, and destroy stranded forces.",
      "Combined arms usually beats brute force: escorts, recon, and basing decide campaigns.",
    ],
  },
];
