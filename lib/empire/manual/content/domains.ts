import type { ManualDomainEntry } from "@/lib/empire/manual/types";

export const DOMAIN_ENTRIES: ManualDomainEntry[] = [
  {
    domain: "land",
    summary: "Land forces capture ground, fortify positions, and rely on terrain and engineers to shape the front.",
    sections: [
      {
        title: "Front Line Rules",
        body: [
          "Most land units fight and capture on the surface layer. They contest cities, ports, airfields, and outposts directly.",
          "Units that end the turn without moving fortify, which reduces incoming damage unless the attacker ignores fortification.",
        ],
      },
      {
        title: "Terrain And Mobility",
        body: [
          "Mountains slow land units and completely block tanks unless a tunnel has been built.",
          "Bridges and tunnels rewrite movement lanes, so engineers determine where armor can break through.",
        ],
      },
      {
        title: "Stealth And Sapping",
        body: [
          "Special Ops conceal themselves while stationary. Engineers are your practical counter for hidden minefields, and some units can detect stealth units directly.",
          "Land warfare is where support units matter most: scouts for vision, engineers for access, and tanks or Special Ops for decisive assaults.",
          "Because cities, ports, and airfields all live on land, a successful land push often has economic impact even before it kills many units.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "engineer", label: "Engineer" },
      { kind: "unit", id: "tank", label: "Tank" },
      { kind: "rule", id: "movement-and-fortification", label: "Movement And Fortification" },
      { kind: "rule", id: "stealth-and-detection", label: "Stealth And Detection" },
    ],
  },
  {
    domain: "sea",
    summary: "Sea forces project power across water, screen invasions, and provide air and transport infrastructure offshore.",
    sections: [
      {
        title: "Escort And Screening",
        body: [
          "Fleets are not just raw stats. Destroyers screen troop transports and protect naval operations against aircraft and submarines.",
          "A transport without escorts is a logistics target, not a task force.",
        ],
      },
      {
        title: "Subsurface Warfare",
        body: [
          "Submarines are stealth predators. They are not revealed by ordinary vision; sonar-equipped destroyers are the key counter.",
          "Carriers must respect submarine lanes because a few successful torpedo attacks can sink even the toughest capital ship.",
        ],
      },
      {
        title: "Carrier Operations",
        body: [
          "Carriers act as moving air bases and detection platforms. They extend fleet reach and keep fighters or choppers forward.",
          "Radar-relay upgrades and destroyer coordination allow naval groups to engage threats they would otherwise only detect.",
          "Sea power is a logistics arm as much as a combat arm. If you can move, screen, and rebase across water, you can decide where the war happens.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "destroyer", label: "Destroyer" },
      { kind: "unit", id: "carrier", label: "Carrier" },
      { kind: "unit", id: "submarine", label: "Attack Sub" },
      { kind: "rule", id: "transport-and-escort", label: "Transport And Escort" },
    ],
  },
  {
    domain: "air",
    summary: "Air power is the fastest arm in the game, but it is constrained by basing, capacity, endurance, and detection support.",
    sections: [
      {
        title: "Basing",
        body: [
          "Aircraft need legal landing sites. Some can land in cities, some require airfields, and some can also recover to carriers.",
          "Capacity matters. Forward basing is not infinite, so carriers and airfields are operational assets, not just production sites.",
        ],
      },
      {
        title: "Detection And Control",
        body: [
          "Carriers and radar upgrades help reveal aircraft through fog, which makes interception and fleet defense possible.",
          "Air superiority is as much an intel problem as a combat problem.",
        ],
      },
      {
        title: "Strike Behavior",
        body: [
          "Not all aircraft attack the same way. Fighters hunt air targets, bombers perform same-tile bomb runs, and drone swarms self-destruct on impact.",
          "Air units are strongest when they operate with basing, recon, and naval or land support already in place.",
          "Air power punishes overextension better than it creates front lines on its own. Use it to break plans that are already under pressure.",
        ],
      },
    ],
    related: [
      { kind: "unit", id: "fighter", label: "Fighter" },
      { kind: "unit", id: "bomber", label: "Bomber" },
      { kind: "unit", id: "carrier", label: "Carrier" },
      { kind: "rule", id: "air-basing-and-rearm", label: "Air Basing And Rearm" },
    ],
  },
];
