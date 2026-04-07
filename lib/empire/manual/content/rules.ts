import type { ManualRuleEntry } from "@/lib/empire/manual/types";

export const RULE_ENTRIES: ManualRuleEntry[] = [
  {
    id: "movement-and-fortification",
    title: "Movement And Fortification",
    summary: "Movement is domain-specific, and stationary units harden their positions at the end of a turn.",
    sections: [
      {
        title: "Movement",
        body: [
          "Each unit spends movement based on its domain and the terrain it crosses.",
          "Bridges, tunnels, mountains, and legal landing sites matter as much as raw move points.",
          "A route is only good if the whole force can use it. Tanks, aircraft, and transports obey very different access rules.",
        ],
      },
      {
        title: "Fortification And Entrenchment",
        body: [
          "Units that hold position fortify. City defenders benefit from the site as well as their own fortification status.",
          "Owned cities can hold a small friendly surface garrison stack, so one dug-in defender does not consume the city's land-production slot.",
          "Infantry that holds position also entrenches, gaining a stronger damage reduction than standard fortification.",
          "Some attackers ignore fortification entirely, which makes them ideal for cracking prepared defenses.",
        ],
      },
    ],
    related: [
      { kind: "domain", id: "land", label: "Land Doctrine" },
      { kind: "unit", id: "chopper", label: "Chopper" },
      { kind: "unit", id: "tank", label: "Tank" },
    ],
  },
  {
    id: "stealth-and-detection",
    title: "Stealth And Detection",
    summary: "Stealth rules are asymmetric. Detection depends on the observer, not just distance.",
    sections: [
      {
        title: "Concealment",
        body: [
          "Special Ops and submarines can stay concealed when they hold still under the right conditions.",
          "Ordinary vision does not guarantee a reveal; certain counters are required.",
        ],
      },
      {
        title: "Counters",
        body: [
          "Sonar-upgraded destroyers are the practical answer to submarines, but both submarine classes can also spend a turn on active sonar when they need to search.",
          "Engineers and appropriate recon units help expose hidden threats like minefields and stealth troops.",
          "Detection is a system property. Vision, upgrades, radar, and proper unit mix determine what your force can actually see.",
        ],
      },
      {
        title: "Last Known Positions",
        body: [
          "When you detect an enemy unit, the intel layer records its position as a ghost marker.",
          "Ghost markers persist for one full turn after detection. If the unit is re-detected, the marker refreshes.",
          "A ghost marker shows where the enemy was last seen, not where it is now. Use fresh recon to confirm whether the threat has moved.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "special-ops", label: "Special Ops" },
      { kind: "unit", id: "submarine", label: "Submarine" },
      { kind: "unit", id: "engineer", label: "Engineer" },
    ],
  },
  {
    id: "air-basing-and-rearm",
    title: "Air Basing And Rearm",
    summary: "Air units are constrained by legal landing sites, capacity, and endurance away from base.",
    sections: [
      {
        title: "Landing And Capacity",
        body: [
          "Cities, airfields, and carriers do not all support the same aircraft. Check each unit's basing rules.",
          "If you do not build enough basing depth, your aircraft become range-limited regardless of their speed.",
          "Total aircraft your side can field is capped at two per owned city. Losing cities can prevent new aircraft production.",
        ],
      },
      {
        title: "Rearm",
        body: [
          "Bombers rearm only when back on a friendly legal base.",
          "Forward airfields and carriers keep operations continuous while static bases keep them economical.",
          "If you only build enough airfields to launch aircraft, but not enough to recover them safely, your air campaign will stall.",
        ],
      },
    ],
    related: [
      { kind: "domain", id: "air", label: "Air Doctrine" },
      { kind: "unit", id: "bomber", label: "Bomber" },
      { kind: "unit", id: "carrier", label: "Carrier" },
    ],
  },
  {
    id: "transport-and-escort",
    title: "Transport And Escort",
    summary: "Transports are logistics pieces, and logistics only survives if it is screened.",
    sections: [
      {
        title: "Embark And Unload",
        body: [
          "Troop transports embark from adjacent coastal land, ports, or coastal cities and still obey cargo-space rules. Submarines and choppers use separate Special Ops loading rules.",
          "Beachheads are usually created in waves, not in one perfect drop.",
        ],
      },
      {
        title: "Escort",
        body: [
          "Destroyers improve troop-transport survivability when screening nearby.",
          "Escorts also make air and sub threats less attractive by forcing the attacker to fight through a proper task group.",
          "This is one of the most important invisible combat modifiers in naval play, so build transports and escorts together.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "troop-transport", label: "Troop Transport" },
      { kind: "unit", id: "destroyer", label: "Destroyer" },
      { kind: "unit", id: "submarine", label: "Submarine" },
    ],
  },
  {
    id: "economy-and-exploration",
    title: "Economy And Exploration",
    summary: "Territory matters, but intel also pays. Exploration translates into income.",
    sections: [
      {
        title: "Income",
        body: [
          "Cities generate credits when they are not tied up in production.",
          "Exploring the map grants additional income in steps, which makes recon and expansion economically relevant.",
        ],
      },
      {
        title: "Tempo",
        body: [
          "Breaking enemy income is often stronger than winning a local duel. Threaten ports, airfields, and cities to slow the opponent's whole system.",
          "Recon is therefore an economic tool as well as a military one: it lets you attack the most valuable node instead of the nearest one.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "scout", label: "Scout" },
      { kind: "unit", id: "special-ops", label: "Special Ops" },
      { kind: "campaign", id: "archipelago", label: "Archipelago" },
    ],
  },
];
