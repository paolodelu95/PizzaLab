import type { SelectOption } from "../components/SelectSheet";
import type { DoughConfig, UserOven } from "../domain/types";
import { bakeSurfaceLabels } from "../domain/calculator";
import { mixerProfiles } from "./mixers";
import { ovenProfiles } from "./ovens";
import { formatTemp } from "../services/units";

export const mixerOptions: SelectOption<DoughConfig["mixer"]>[] = [
  { value: "hand", label: "A mano", description: "L’impasto si scalda poco: servono pause e pieghe" },
  { value: "stand", label: "Planetaria", description: "KitchenAid, Kenwood, Bosch e simili" },
  { value: "spiral", label: "Impastatrice a spirale", description: "Scalda poco e sviluppa bene la maglia" },
  { value: "thermomix", label: "Robot da cucina riscaldante", description: "Tipo Bimby: attenzione al calore" },
];

export const planetaryOptions: SelectOption<string>[] = mixerProfiles.map((item) => ({
  value: item.id,
  label: item.name,
  description: item.tool,
}));

export const ovenOptions = (prefix = ""): SelectOption<string>[] =>
  ovenProfiles.map((item) => ({
    value: `${prefix}${item.id}`,
    label: item.name,
    description: `${item.family} · fino a ${formatTemp(item.maxTemp)}`,
    group: item.group === "pizza" ? "Forni per pizza" : "Tipi di forno",
  }));

export const userOvenOptions = (ovens: UserOven[], prefix = ""): SelectOption<string>[] =>
  ovens.map((oven) => ({
    value: `${prefix}${oven.id}`,
    label: oven.name,
    description: `Fino a ${formatTemp(oven.temp)} · ${bakeSurfaceLabels[oven.bakeSurface].toLowerCase()}`,
    group: "I tuoi forni",
  }));

const surfaceDescriptions: Record<DoughConfig["bakeSurface"], string> = {
  biscotto: "Cottura delicata, ideale per la napoletana",
  stone: "Il supporto più comune, uniforme",
  steel: "Trasmette molto calore: ottimo nel forno di casa",
  "light-pan": "Colora il fondo più lentamente",
  "dark-pan": "Fondo più colorito e croccante",
  "perforated-pan": "Fondo asciutto e croccante",
  "cast-iron": "Tanto calore, ideale per il padellino",
};
export const surfaceOptions: SelectOption<DoughConfig["bakeSurface"]>[] = (
  Object.entries(bakeSurfaceLabels) as [DoughConfig["bakeSurface"], string][]
).map(([value, label]) => ({ value, label, description: surfaceDescriptions[value] }));
