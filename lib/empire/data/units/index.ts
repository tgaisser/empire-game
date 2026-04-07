import bomber from "@/lib/empire/data/units/bomber.json";
import carrier from "@/lib/empire/data/units/carrier.json";
import chopper from "@/lib/empire/data/units/chopper.json";
import destroyer from "@/lib/empire/data/units/destroyer.json";
import droneSwarm from "@/lib/empire/data/units/drone-swarm.json";
import engineer from "@/lib/empire/data/units/engineer.json";
import fighter from "@/lib/empire/data/units/fighter.json";
import infantry from "@/lib/empire/data/units/infantry.json";
import scout from "@/lib/empire/data/units/scout.json";
import specialOps from "@/lib/empire/data/units/special-ops.json";
import submarine from "@/lib/empire/data/units/submarine.json";
import tank from "@/lib/empire/data/units/tank.json";
import troopTransport from "@/lib/empire/data/units/troop-transport.json";
import type { UnitDefinition, UnitType } from "@/lib/empire/types";

export const UNIT_STATS: Record<UnitType, UnitDefinition> = {
  infantry,
  scout,
  tank,
  engineer,
  "special-ops": specialOps,
  chopper,
  destroyer,
  "troop-transport": troopTransport,
  carrier,
  submarine,
  fighter,
  bomber,
  "drone-swarm": droneSwarm,
} as Record<UnitType, UnitDefinition>;
