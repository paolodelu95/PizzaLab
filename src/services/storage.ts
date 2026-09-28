import { Preferences } from "@capacitor/preferences";
import { defaultConfig } from "../domain/styles";
import { validateConfig } from "../domain/calculator";
import type { StoredState } from "../domain/types";
const KEY = "pizzalab-state-v1";
export const emptyState = (): StoredState => ({
  version: 1,
  config: defaultConfig(),
  recipes: [],
  activeId: null,
  customFlours: [],
  savedBlends: [],
  equipmentProfiles: [],
  sourdoughProfiles: [],
  activeSourdoughId: null,
  bakeCalibrations: [],
  profileName: "",
  userOvens: [],
  userPans: [],
});
export async function readState(): Promise<StoredState> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return emptyState();
  const parsed = JSON.parse(value) as StoredState;
  if (
    parsed.version !== 1 ||
    !parsed.config ||
    !Array.isArray(parsed.recipes) ||
    !Array.isArray(parsed.customFlours)
  )
    throw new Error("Archivio non riconosciuto");
  parsed.savedBlends = Array.isArray(parsed.savedBlends)
    ? parsed.savedBlends
    : [];
  parsed.equipmentProfiles = Array.isArray(parsed.equipmentProfiles)
    ? parsed.equipmentProfiles
    : [];
  parsed.bakeCalibrations = Array.isArray(parsed.bakeCalibrations)
    ? parsed.bakeCalibrations
    : [];
  parsed.userOvens = Array.isArray(parsed.userOvens)
    ? parsed.userOvens.filter((oven) => oven && typeof oven.id === "string" && typeof oven.ovenType === "string")
    : [];
  parsed.profileName = typeof parsed.profileName === "string" ? parsed.profileName : "";
  // Le vecchie «attrezzature» contenevano una teglia: la recuperiamo come teglia salvata.
  parsed.userPans = Array.isArray(parsed.userPans)
    ? parsed.userPans.filter((pan) => pan && typeof pan.id === "string" && Number.isFinite(pan.width) && Number.isFinite(pan.length))
    : parsed.equipmentProfiles
        .filter((profile, index, all) => all.findIndex((other) => other.panWidth === profile.panWidth && other.panLength === profile.panLength) === index)
        .map((profile) => ({
          id: `pan-${profile.id}`,
          name: `Teglia ${profile.panWidth}×${profile.panLength}`,
          width: profile.panWidth,
          length: profile.panLength,
          surface: profile.bakeSurface && ["light-pan", "dark-pan", "perforated-pan", "cast-iron"].includes(profile.bakeSurface) ? profile.bakeSurface : "dark-pan",
          createdAt: profile.createdAt,
        }));
  parsed.reminderLeadMinutes = [0, 5, 10, 15, 30].includes(parsed.reminderLeadMinutes ?? 0) ? parsed.reminderLeadMinutes ?? 0 : 0;
  const legacyStarter = (parsed as StoredState & { sourdoughProfile?: StoredState["sourdoughProfiles"][number] }).sourdoughProfile;
  parsed.sourdoughProfiles = Array.isArray(parsed.sourdoughProfiles)
    ? parsed.sourdoughProfiles
    : legacyStarter
      ? [{ ...legacyStarter, id: legacyStarter.id || crypto.randomUUID() }]
      : [];
  parsed.activeSourdoughId = parsed.activeSourdoughId ?? parsed.sourdoughProfiles[0]?.id ?? null;
  // Keep plans created by versions that supported two flours only.
  parsed.config = { ...defaultConfig(), ...parsed.config };
  if (parsed.config.planMode === "duration") parsed.config.planMode = "date";
  parsed.recipes = parsed.recipes.map((recipe) =>
    recipe?.config
      ? {
          ...recipe,
          config: {
            ...defaultConfig(),
            ...recipe.config,
            planMode: recipe.config.planMode === "duration" ? "date" : (recipe.config.planMode ?? "date"),
          },
        }
      : recipe,
  );
  if (validateConfig(parsed.config).length) parsed.config = defaultConfig();
  parsed.recipes = parsed.recipes.filter(
    (r) =>
      r &&
      typeof r.id === "string" &&
      r.config &&
      !validateConfig(r.config).length &&
      Array.isArray(r.completedStages) &&
      typeof r.notes === "string" &&
      typeof r.name === "string" &&
      Number.isFinite(r.rating),
  );
  parsed.customFlours = parsed.customFlours.filter(
    (f) =>
      f &&
      typeof f.id === "string" &&
      typeof f.name === "string" &&
      typeof f.brand === "string" &&
      (f.w === null ||
        (Array.isArray(f.w) &&
          f.w.length === 2 &&
          f.w.every((n) => Number.isFinite(n) && n >= 50 && n <= 500))),
  );
  parsed.savedBlends = parsed.savedBlends.filter(
    (b) =>
      b &&
      typeof b.id === "string" &&
      typeof b.name === "string" &&
      Array.isArray(b.components) &&
      b.components.length >= 2 &&
      b.components.length <= 4,
  );
  parsed.equipmentProfiles = parsed.equipmentProfiles.filter(
    (p) =>
      p &&
      typeof p.id === "string" &&
      typeof p.name === "string" &&
      ["hand", "stand", "spiral", "thermomix"].includes(p.mixer),
  );
  parsed.bakeCalibrations = parsed.bakeCalibrations.filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      Number.isFinite(item.actualMinutes) &&
      Number.isFinite(item.plannedMinutes),
  );
  parsed.sourdoughProfiles = parsed.sourdoughProfiles.filter(
    (profile) =>
      profile &&
      typeof profile.id === "string" &&
      typeof profile.name === "string" &&
      ["licoli", "solid"].includes(profile.kind) &&
      Array.isArray(profile.feedings),
  );
  if (!parsed.sourdoughProfiles.some((profile) => profile.id === parsed.activeSourdoughId))
    parsed.activeSourdoughId = parsed.sourdoughProfiles[0]?.id ?? null;
  if (!parsed.recipes.some((r) => r.id === parsed.activeId && !r.finishedAt))
    parsed.activeId = null;
  return parsed;
}
let pending = Promise.resolve();
export function writeState(state: StoredState): Promise<void> {
  const value = JSON.stringify(state);
  pending = pending
    .catch(() => {})
    .then(() => Preferences.set({ key: KEY, value }));
  return pending;
}
