import { detectLanguage, locale, setLocaleState, t, tn, type Language, msg } from "./i18n";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  BookmarkSimple,
  Check,
  CheckCircle,
  ChefHat,
  Clock,
  CookingPot,
  Drop,
  Fire,
  Info,
  Jar,
  Leaf,
  CalendarCheck,
  ListChecks,
  Notebook,
  Trash,
  PencilSimple,
  Pizza,
  Snowflake,
  Sparkle,
  Timer,
  UserCircle,
  Warning,
  Grains as Wheat,
  X,
} from "@phosphor-icons/react";
import { catalog } from "./data/catalog";
import {
  bakeSurfaceLabels,
  MIN_COLD_HOURS,
  buildTimeline,
  calculate,
  deriveAutomaticSchedule,
  recommendedBakeMinutes,
  validateConfig,
} from "./domain/calculator";
import {
  bakingDefaults,
  defaultConfig,
  recommendedExtras,
  localDateTime,
  styles,
} from "./domain/styles";
import type {
  SourdoughProfile,
  UserPan,
  BakeCalibration,
  DoughConfig,
  Flour,
  Recipe,
  StarterFeeding,
  StoredState,
} from "./domain/types";
import { NumberField, SliderField, Stepper } from "./components/Fields";
import { FlourPicker } from "./components/FlourPicker";
import { FlourLibrary } from "./components/FlourLibrary";
import { Guide } from "./components/Guide";
import { HydrationChart, YeastChart } from "./components/DoughCharts";
import { AdvancedPlanner } from "./components/AdvancedPlanner";
import { DoughAnalysis } from "./components/DoughAnalysis";
import { BlendManager } from "./components/BlendManager";
import { ovenById, ovenProfiles } from "./data/ovens";
import { ToppingPlanner } from "./components/ToppingPlanner";
import { DoughRescue } from "./components/DoughRescue";
import { ProfilePage } from "./components/ProfilePage";
import { isPanInUse, panSize } from "./components/UserPans";
import { BakingPlanner } from "./components/BakingPlanner";
import { SourdoughCare } from "./components/SourdoughCare";
import { StarterDoughLink } from "./components/StarterDoughLink";
import { Diary, type DiaryView } from "./components/Diary";
import { durationLabel } from "./domain/duration";
import { strengthLine } from "./domain/flourStrength";
import { applyAutomaticPlan, configFromTemplate, countForPeople, ratedHistory, recipeStatus, startTiming, suggestStart, yeastLabel } from "./domain/recipes";
import { emptyState, readState, writeState } from "./services/storage";
import {
  cancelReminders,
  cancelStarterReminders,
  onReminderOpened,
  scheduleReminders,
  scheduleStarterReminders,
} from "./services/notifications";
import {
  addStarterFeeding,
  createStarterProfile,
  nextStarterFeedAt,
  starterReminderDates,
} from "./domain/sourdough";
import { useCloseOnBack } from "./services/backNavigation";
import { buildCalendar, downloadCalendar, stagesToEvents } from "./services/calendar";
import { usesCalendarReminders } from "./services/platform";
import { formatTemp, formatWeight, normalizeUnits, setUnits, type Units } from "./services/units";
import { WeightValue } from "./components/WeightValue";
import { FlourSuggestions } from "./components/FlourSuggestions";
import { normalizeLanguage } from "./i18n";
import { markTutorialSeen, tutorialSeen } from "./services/tutorial";
import { Onboarding } from "./components/Onboarding";
import { InstallPrompt } from "./components/InstallPrompt";
import { LateStartDialog } from "./components/LateStartDialog";
import { SelectSheet } from "./components/SelectSheet";
import { HelpTip } from "./components/HelpTip";
import { SupportCard } from "./components/SupportCard";
import pizzaLabLogo from "./assets/pizzalab-logo.png";

const APP_VERSION = "0.23.0";
type Tab = "impasto" | "farine" | "condimenti" | "madre" | "diario" | "guida" | "profilo";
type PlannerStage = "dough" | "fermentation" | "baking" | "summary";
const nav = [
  { id: "impasto", label: msg("Il tuo impasto"), short: msg("Impasto"), icon: CookingPot },
  { id: "farine", label: msg("Farine"), short: msg("Farine"), icon: Wheat },
  { id: "condimenti", label: msg("Condimenti"), short: msg("Condimenti"), icon: Pizza },
  { id: "madre", label: msg("Lievito"), short: msg("Lievito"), icon: Jar },
  { id: "diario", label: msg("Diario"), short: msg("Diario"), icon: Notebook },
  { id: "guida", label: msg("Impara"), short: msg("Impara"), icon: BookOpen },
  { id: "profilo", label: msg("Profilo"), short: msg("Profilo"), icon: UserCircle },
] as const;
const plannerSteps = [
  ["dough", "1", msg("Impasto"), msg("Farina e dosi"), Wheat],
  ["fermentation", "2", msg("Lievitazione"), msg("Tempi e lievito"), Clock],
  ["baking", "3", msg("Cottura"), msg("Forno e tempi"), Fire],
  ["summary", "4", msg("Riepilogo"), msg("Parti o salva"), ListChecks],
] as const;
const styleTaglines: Record<string, string> = {
  napoletana: msg("Il grande classico"),
  contemporanea: msg("Alta e ariosa"),
  romana: msg("Sottile e croccante"),
  teglia: msg("Da condividere"),
  pala: msg("Leggera e croccante"),
  padellino: msg("Soffice e dorata"),
  focaccia: msg("Soffice e oliata"),
  "focaccia-barese": msg("Pomodorini e olive"),
  "new-york": msg("Grande e pieghevole"),
  detroit: msg("Alta, bordi croccanti"),
  pinsa: msg("Ovale e leggera"),
  sfincione: msg("Alta e soffice"),
  "tonda-casa": msg("Ideale per iniziare"),
};
const fmt = (n: number, digits = 0) =>
  n.toLocaleString(locale(), { maximumFractionDigits: digits });
const dateLabel = (s: string) =>
  new Date(s).toLocaleString(locale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function App() {
  const [state, setState] = useState<StoredState>(emptyState);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("impasto");
  const [message, setMessage] = useState("");
  const [plannerStage, setPlannerStage] = useState<PlannerStage>("dough");
  const [storageError, setStorageError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [recipeName, setRecipeName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [lateStart, setLateStart] = useState<{ source: "planner" } | { source: "recipe"; recipe: Recipe } | null>(null);
  const [diaryView, setDiaryView] = useState<DiaryView>("active");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    window.history.replaceState({ tab: "impasto" }, "");
    const onPop = (event: PopStateEvent) => {
      const previous = (event.state as { tab?: Tab } | null)?.tab;
      if (previous) setTab(previous);
    };
    window.addEventListener("popstate", onPop);
    const stopListening = onReminderOpened((section) => {
      if (section === "dough") setDiaryView("active");
      openTab(section === "dough" ? "diario" : "madre");
    });
    return () => {
      window.removeEventListener("popstate", onPop);
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useCloseOnBack(Boolean(deleteId), () => setDeleteId(null));
  useEffect(() => {
    void tutorialSeen().then((seen) => {
      if (!seen) setTutorialOpen(true);
    });
  }, []);
  function closeTutorial() {
    setTutorialOpen(false);
    void markTutorialSeen();
  }
  useEffect(() => {
    let alive = true;
    readState()
      .then((s) => {
        if (alive) {
          setState(s);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) {
          setStorageError(
            t("Non riesco a leggere l’archivio locale. I dati esistenti non sono stati sovrascritti."),
          );
          setLoadError(true);
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (ready && !loadError)
      void writeState(state).catch(() =>
        setStorageError(
          t("Salvataggio locale non riuscito. Mantieni aperta l’app e riprova."),
        ),
      );
  }, [state, ready, loadError]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const flours = useMemo(
    () => [...catalog, ...state.customFlours],
    [state.customFlours],
  );
  const c = state.config;
  // Le unità sono uno stato di modulo (vedi services/units): si impostano prima che i figli si disegnino,
  // e le chiavi entrano nelle dipendenze dei memo perché i testi del dominio contengono già g/oz e °C/°F.
  const units = normalizeUnits(state.units);
  setUnits(units);
  const language = state.language ?? detectLanguage();
  setLocaleState({ language, imperial: units.weight === "oz" || units.temp === "F" });
  const unitsKey = `${units.weight}${units.temp}${language}`;
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const activeSourdough = state.sourdoughProfiles.find(
    (profile) => profile.id === state.activeSourdoughId,
  ) ?? null;
  const selectedFlour = flours.find((f) => f.id === c.flourId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => calculate(c, flours), [c, flours, unitsKey]);
  const automaticPlan = useMemo(() => deriveAutomaticSchedule(c), [c]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timeline = useMemo(() => buildTimeline(c, flours), [c, flours, unitsKey]);
  const currentStyle = styles.find((s) => s.id === c.styleId)!;
  const history = ratedHistory(state.recipes, c);
  const active = state.recipes.find((r) => r.id === state.activeId);
  const activeNext = active
    ? buildTimeline(active.config).find((s) => new Date(s.at).getTime() > now)
    : undefined;
  function normalizePlanning(config: DoughConfig) {
    if (config.planMode === "automatic") return applyAutomaticPlan(config);
    if (config.planMode === "duration") {
      const total =
        config.bulkHours +
        config.coldHours +
        config.proofHours +
        (config.preferment === "none" ? 0 : config.prefermentHours);
      const prepMinutes = 20 + (config.autolyse ? config.autolyseMinutes : 0);
      return {
        ...config,
        bakeAt: localDateTime(
          new Date(Date.now() + (total * 60 + prepMinutes) * 60000),
        ),
      };
    }
    return config;
  }
  function update<K extends keyof DoughConfig>(key: K, value: DoughConfig[K]) {
    setState((s) => ({
      ...s,
      config: normalizePlanning({
        ...s.config,
        [key]: value,
        ...(key === "count" ? { toppingCount: value as number } : {}),
        ...(key === "panWidth" ? { toppingWidth: value as number } : {}),
        ...(key === "panLength" ? { toppingLength: value as number } : {}),
        ...(key === "panDiameter" ? { pizzaDiameter: value as number } : {}),
      }),
    }));
  }
  function updateMany(patch: Partial<DoughConfig>) {
    setState((s) => ({
      ...s,
      config: normalizePlanning({ ...s.config, ...patch }),
    }));
  }
  /** «Voglio mangiare alle…» al contrario: propone l’orario di inizio con la lievitazione tipica dello stile. */
  function suggestStartTime() {
    const suggestion = suggestStart(c, Date.now());
    if (!suggestion) return;
    updateMany({ startAt: suggestion.startAt, bakeAt: suggestion.bakeAt });
    setMessage(
      suggestion.movedMeal
        ? t("Con quell’orario non c’è tempo per una buona lievitazione: ho spostato il pasto a {bake} e si parte {start} (circa {hours} di lievitazione). Se vuoi mangiare prima, rimetti l’orario e accetta una lievitazione breve.", { bake: dateLabel(suggestion.bakeAt), start: dateLabel(suggestion.startAt), hours: durationLabel(suggestion.hours) })
        : suggestion.shortened
          ? t("L’orario ideale è già passato: si parte adesso, con una lievitazione più breve (circa {hours}).", { hours: durationLabel(suggestion.hours) })
          : t("Si parte {when}: circa {hours} di lievitazione.", { when: dateLabel(suggestion.startAt), hours: durationLabel(suggestion.hours) }),
    );
  }
  function saveTemplate() {
    if (!result.ok) return;
    const name = recipeName.trim() || t(currentStyle.name);
    setState((s) => ({
      ...s,
      templates: [{ id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), config: { ...s.config } }, ...(s.templates ?? [])],
    }));
    setMessage(t("Modello «{name}» salvato: lo trovi in cima, sotto «I tuoi modelli».", { name }));
  }
  function useTemplate(id: string) {
    const template = (state.templates ?? []).find((item) => item.id === id);
    if (!template) return;
    setState((s) => ({ ...s, config: normalizePlanning(configFromTemplate(template, defaultConfig())) }));
    setEditingId(null);
    setRecipeName(template.name);
    setPlannerStage("fermentation");
    setMessage(t("Modello «{name}» caricato: scegli quando mangiare.", { name: template.name }));
  }
  function goToPlannerStage(stage: PlannerStage) {
    setPlannerStage(stage);
    requestAnimationFrame(() =>
      document
        .getElementById("planner-anchor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  function openTab(next: Tab) {
    // Ogni sezione entra nella cronologia: il tasto «Indietro» di Android torna alla precedente.
    if (next !== tab) window.history.pushState({ tab: next }, "");
    setTab(next);
    window.scrollTo({ top: 0 });
  }
  function changeStyle(id: string) {
    const style = styles.find((s) => s.id === id)!;
    setState((s) => {
      const oven = ovenProfiles.find((o) => o.id === s.config.ovenType);
      // Alcuni stili nascono in teglia tonda (focaccia barese): si parte da forma e spessore tipici.
      const panShape = style.panShape ?? s.config.panShape;
      const panDiameter = style.panDiameter ?? s.config.panDiameter;
      return {
        ...s,
        config: normalizePlanning({
          ...s.config,
          styleId: id,
          ...(style.pan ? { panShape, panDiameter, panDensity: style.panDensity ?? 0.6 } : {}),
          ...(id === "focaccia-barese" ? { toppingPresetId: "barese" } : {}),
          pizzaDiameter: style.pan && panShape === "round" ? panDiameter : id === "padellino" ? 20 : id === "new-york" ? 35 : 32,
          toppingCount: s.config.count,
          toppingWidth: s.config.panWidth,
          toppingLength: s.config.panLength,
          hydration: style.hydration,
          ballWeight: style.ballWeight,
          ...recommendedExtras(id),
          // Il malto è difficile da trovare: si suggerisce, ma si parte senza.
          malt: 0,
          coldHours: style.cold,
          bulkHours: style.bulk,
          proofHours: style.proof,
          ovenTemp:
            oven && oven.id !== "custom"
              ? Math.min(style.oven, oven.maxTemp)
              : style.oven,
          ...bakingDefaults(id),
          // Nei forni con pietra fissa l’altezza non si sceglie.
          ...(oven?.fixedRack ? { ovenRack: "middle" as const } : {}),
        }),
      };
    });
  }
  function selectFlour(f: Flour) {
    update("flourId", f.id);
    setTab("impasto");
    setMessage(t("{brand} {name} selezionata.", { brand: f.brand, name: f.name }));
    window.scrollTo({ top: 0 });
  }
  function saveBlend() {
    const shares = [
      100 - c.secondFlourPercent - c.thirdFlourPercent - c.fourthFlourPercent,
      c.secondFlourPercent,
      c.thirdFlourPercent,
      c.fourthFlourPercent,
    ];
    const ids = [c.flourId, c.secondFlourId, c.thirdFlourId, c.fourthFlourId];
    const components = ids
      .map((flourId, index) => ({ flourId, percent: shares[index] }))
      .filter((item) => item.flourId && item.percent > 0);
    if (components.length < 2) return;
    const name = components
      .map(
        (item) => flours.find((f) => f.id === item.flourId)?.brand ?? msg("Farina"),
      )
      .join(" + ");
    setState((s) => ({
      ...s,
      savedBlends: [
        {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          components,
        },
        ...s.savedBlends,
      ],
    }));
    setMessage(t("Miscela salvata e pronta da riutilizzare."));
  }
  function loadBlend(blend: StoredState["savedBlends"][number]) {
    const p = blend.components;
    updateMany({
      flourId: p[0]?.flourId ?? c.flourId,
      secondFlourId: p[1]?.flourId ?? "",
      secondFlourPercent: p[1]?.percent ?? 0,
      thirdFlourId: p[2]?.flourId ?? "",
      thirdFlourPercent: p[2]?.percent ?? 0,
      fourthFlourId: p[3]?.flourId ?? "",
      fourthFlourPercent: p[3]?.percent ?? 0,
    });
    setMessage(t("Miscela “{name}” caricata.", { name: blend.name }));
  }
  const fileSlug = (text: string) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pizza";
  /** Sul web (iPhone o browser) gli avvisi a orario arrivano dal Calendario del telefono. */
  function addRecipeToCalendar(recipe: Recipe) {
    const events = stagesToEvents(recipe.id, recipe.name, buildTimeline(recipe.config, flours));
    if (!events.length) {
      setMessage(t("Non ci sono fasi future da aggiungere al calendario."));
      return;
    }
    downloadCalendar(`pizzalab-${fileSlug(recipe.name)}.ics`, buildCalendar(`PizzaLab · ${recipe.name}`, events, leadMinutes));
    setMessage(
      t("{count} fasi pronte: nel Calendario conferma «Aggiungi tutti» e riceverai un avviso {when}.", {
        count: events.length,
        when: leadMinutes ? t("{minutes} minuti prima di ogni fase", { minutes: leadMinutes }) : t("all’inizio di ogni fase"),
      }),
    );
  }
  function addStarterToCalendar(profile: SourdoughProfile) {
    const events = starterReminderDates(profile, 14).map((at, index) => ({
      uid: `${profile.id}-feed-${at.getTime()}@pizzalab`,
      title: `PizzaLab · Rinfresca ${profile.name}`,
      description: index === 0 ? t("Osserva il lievito e procedi con il rinfresco.") : t("Rinfresco programmato dalla routine del lievito."),
      start: at,
      end: new Date(at.getTime() + 15 * 60000),
    }));
    downloadCalendar(`pizzalab-lievito-${fileSlug(profile.name)}.ics`, buildCalendar(`PizzaLab · ${profile.name}`, events, leadMinutes));
    setMessage(t("{length} rinfreschi pronti: nel Calendario conferma «Aggiungi tutti» per ricevere gli avvisi.", { length: events.length }));
  }
  function usePan(pan: UserPan) {
    const round = pan.shape === "round";
    updateMany({
      panShape: round ? "round" : "rect",
      ...(round
        ? { panDiameter: pan.diameter ?? 28, pizzaDiameter: pan.diameter ?? 28 }
        : { panWidth: pan.width, panLength: pan.length, toppingWidth: pan.width, toppingLength: pan.length }),
      bakeSurface: pan.surface,
    });
    setMessage(t("Userai «{name}» ({panSize}) per gli impasti in teglia.", { name: pan.name, panSize: panSize(pan) }));
  }
  function exportArchive() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            app: "PizzaLab",
            version: APP_VERSION,
            recipes: state.recipes,
            customFlours: state.customFlours,
            savedBlends: state.savedBlends,
            equipmentProfiles: state.equipmentProfiles,
            sourdoughProfiles: state.sourdoughProfiles,
            activeSourdoughId: state.activeSourdoughId,
            bakeCalibrations: state.bakeCalibrations,
            userOvens: state.userOvens,
            userPans: state.userPans,
            templates: state.templates,
            profileName: state.profileName,
            units,
            language: state.language,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pizzalab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(t("Archivio esportato in formato JSON."));
  }
  async function importArchive(file: File) {
    try {
      const data = JSON.parse(await file.text()) as Partial<StoredState> & {
        sourdoughProfile?: StoredState["sourdoughProfiles"][number];
      };
      const recipes = Array.isArray(data.recipes)
        ? data.recipes
            .filter(
              (r) =>
                r?.config &&
                !validateConfig({ ...defaultConfig(), ...r.config }).length,
            )
            .map((r) => ({ ...r, config: { ...defaultConfig(), ...r.config } }))
        : [];
      const customFlours = Array.isArray(data.customFlours)
        ? data.customFlours
        : [];
      const savedBlends = Array.isArray(data.savedBlends)
        ? data.savedBlends
        : [];
      const equipmentProfiles = Array.isArray(data.equipmentProfiles)
        ? data.equipmentProfiles
        : [];
      const sourdoughProfiles = Array.isArray(data.sourdoughProfiles)
        ? data.sourdoughProfiles
        : data.sourdoughProfile
          ? [data.sourdoughProfile]
          : [];
      const bakeCalibrations = Array.isArray(data.bakeCalibrations) ? data.bakeCalibrations : [];
      const userOvens = Array.isArray(data.userOvens) ? data.userOvens : [];
      const userPans = Array.isArray(data.userPans) ? data.userPans : [];
      const templates = Array.isArray(data.templates) ? data.templates : [];
      if (
        !recipes.length &&
        !customFlours.length &&
        !savedBlends.length &&
        !equipmentProfiles.length &&
        !sourdoughProfiles.length &&
        !bakeCalibrations.length &&
        !userOvens.length &&
        !userPans.length &&
        !templates.length
      )
        throw new Error();
      setState((s) => ({
        ...s,
        recipes: [
          ...recipes,
          ...s.recipes.filter((old) => !recipes.some((r) => r.id === old.id)),
        ],
        customFlours: [
          ...customFlours,
          ...s.customFlours.filter(
            (old) => !customFlours.some((f) => f.id === old.id),
          ),
        ],
        savedBlends: [
          ...savedBlends,
          ...s.savedBlends.filter(
            (old) => !savedBlends.some((b) => b.id === old.id),
          ),
        ],
        equipmentProfiles: [
          ...equipmentProfiles,
          ...s.equipmentProfiles.filter(
            (old) => !equipmentProfiles.some((p) => p.id === old.id),
          ),
        ],
        sourdoughProfiles: [
          ...sourdoughProfiles,
          ...s.sourdoughProfiles.filter(
            (old) => !sourdoughProfiles.some((profile) => profile.id === old.id),
          ),
        ],
        activeSourdoughId:
          data.activeSourdoughId ?? sourdoughProfiles[0]?.id ?? s.activeSourdoughId,
        bakeCalibrations: [
          ...bakeCalibrations,
          ...s.bakeCalibrations.filter((old) => !bakeCalibrations.some((item) => item.id === old.id)),
        ],
        userOvens: [
          ...userOvens,
          ...(s.userOvens ?? []).filter((old) => !userOvens.some((item) => item.id === old.id)),
        ],
        userPans: [
          ...userPans,
          ...(s.userPans ?? []).filter((old) => !userPans.some((item) => item.id === old.id)),
        ],
        templates: [
          ...templates,
          ...(s.templates ?? []).filter((old) => !templates.some((item) => item.id === old.id)),
        ],
        profileName: s.profileName || (typeof data.profileName === "string" ? data.profileName : ""),
        units: data.units ? normalizeUnits(data.units) : s.units,
        language: normalizeLanguage(data.language) ?? s.language,
      }));
      setMessage(
        t("Importazione completata: {length} ricette recuperate.", { length: recipes.length }),
      );
    } catch {
      setMessage(
        t("File non riconosciuto: usa un archivio JSON esportato da PizzaLab."),
      );
    }
  }
  async function shareRecipe(recipe: Recipe) {
    const r = calculate(recipe.config, flours);
    if (!r.ok) return;
    const flourLines = r.flourBreakdown
      .map(
        (item) =>
          `• ${item.name}: ${formatWeight(item.grams)} (${fmt(item.percent, 1)}%)`,
      )
      .join("\n");
    const text = `${recipe.name}\n${t(r.style.name)}\n${t("Farina totale: {flour}", { flour: formatWeight(r.flour) })}\n${flourLines}\n${t("Acqua: {water} · Sale: {salt} · Lievito: {yeast}.", { water: formatWeight(r.water), salt: formatWeight(r.salt, 1), yeast: formatWeight(r.yeast, 2) })}\n${t("Cottura: {when}.", { when: dateLabel(recipe.config.bakeAt) })}`;
    try {
      if (navigator.share) await navigator.share({ title: recipe.name, text });
      else {
        await navigator.clipboard.writeText(text);
        setMessage(t("Ricetta copiata negli appunti."));
      }
    } catch {
      /* L’utente può chiudere il pannello di condivisione senza conseguenze. */
    }
  }
  /** Salva il piano del calcolatore: "later" lo mette tra le salvate, "start" lo avvia con i promemoria. */
  async function saveRecipe(mode: "later" | "start", configOverride?: DoughConfig) {
    if (!result.ok || loadError) return;
    const cfg = configOverride ?? c;
    const existing = editingId ? state.recipes.find((r) => r.id === editingId) : undefined;
    const recipe: Recipe = {
      ...(existing ?? { notes: "", rating: 0, createdAt: new Date().toISOString() }),
      id: existing?.id ?? crypto.randomUUID(),
      name:
        recipeName.trim() ||
        existing?.name ||
        `${t(result.style.name)} · ${new Date(cfg.bakeAt).toLocaleDateString(locale(), { day: "numeric", month: "short" })}`,
      config: { ...cfg },
      completedStages: [],
      temperatureReadings: [],
      startedAt: undefined,
      finishedAt: undefined,
    } as Recipe;
    const next = {
      ...state,
      config: { ...cfg },
      recipes: existing
        ? state.recipes.map((r) => (r.id === recipe.id ? recipe : r))
        : [recipe, ...state.recipes],
    };
    try {
      await writeState(next);
      setState(next);
      setEditingId(null);
      setRecipeName("");
      setPlannerStage("dough");
      if (mode === "start") {
        await activate(recipe);
      } else {
        setDiaryView("saved");
        setMessage(t("Pizza salvata per dopo: la trovi nel diario, tra le salvate. Quando vuoi, premi «Programma» e partirà da sola all’orario impostato."));
      }
      openTab("diario");
    } catch {
      setStorageError(t("Piano non salvato: memoria locale non disponibile."));
    }
  }
  async function activate(recipe: Recipe) {
    setBusy(true);
    try {
      const note = await scheduleReminders(recipe, leadMinutes);
      const startedAt = new Date().toISOString();
      setState((s) => ({
        ...s,
        activeId: recipe.id,
        recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...r, startedAt, finishedAt: undefined } : r)),
      }));
      setDiaryView("active");
      const first = buildTimeline(recipe.config, flours)[0];
      const future = first && new Date(first.at).getTime() > Date.now() + 15 * 60000;
      setMessage(
        future
          ? usesCalendarReminders()
            ? t("Programmata! Si parte {dateLabel}. {note}", { dateLabel: dateLabel(first.at), note })
            : t("Programmata! Si parte {dateLabel}: riceverai una notifica a ogni fase. {note}", { dateLabel: dateLabel(first.at), note })
          : t("Si parte! {note}", { note }),
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : t("Non riesco a programmare i promemoria."),
      );
      setDiaryView("saved");
    } finally {
      setBusy(false);
    }
  }
  async function deactivate() {
    setBusy(true);
    try {
      await cancelReminders();
      setState((s) => ({ ...s, activeId: null }));
      setDiaryView("saved");
      setMessage(t("Impasto interrotto e promemoria cancellati: lo ritrovi tra le salvate."));
    } catch {
      setMessage(t("Cancellazione dei promemoria non riuscita. Riprova."));
    } finally {
      setBusy(false);
    }
  }
  async function finishRecipe(recipe: Recipe) {
    setBusy(true);
    try {
      if (state.activeId === recipe.id) await cancelReminders();
      const finishedAt = new Date().toISOString();
      setState((s) => ({
        ...s,
        activeId: s.activeId === recipe.id ? null : s.activeId,
        recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...r, finishedAt } : r)),
      }));
      setDiaryView("past");
      setMessage(t("Buon appetito! Ora dai un voto e, se vuoi, registra com’è andata la cottura."));
    } catch {
      setMessage(t("Non riesco a cancellare i promemoria. Riprova."));
    } finally {
      setBusy(false);
    }
  }
  function openInPlanner(recipe: Recipe, mode: "edit" | "reschedule" | "copy") {
    setState((s) => ({ ...s, config: normalizePlanning({ ...recipe.config }) }));
    setEditingId(mode === "copy" ? null : recipe.id);
    setRecipeName(recipe.name);
    setPlannerStage(mode === "reschedule" ? "fermentation" : "dough");
    openTab("impasto");
    setMessage(
      mode === "copy"
        ? t("Ricetta caricata: scegli la nuova data nel passaggio 2 e salva un nuovo piano.")
        : mode === "reschedule"
          ? t("Scegli una nuova data di cottura, poi conferma dal riepilogo.")
          : t("Stai modificando «{name}»: le modifiche si salvano dal riepilogo.", { name: recipe.name }),
    );
  }
  function openDiary() {
    const counts = { active: 0, saved: 0, past: 0 };
    for (const recipe of state.recipes) counts[recipeStatus(recipe, state.activeId, now)] += 1;
    setDiaryView(counts.active ? "active" : counts.saved ? "saved" : counts.past ? "past" : "active");
    openTab("diario");
  }
  function startNewDough() {
    setEditingId(null);
    setRecipeName("");
    setPlannerStage("dough");
    openTab("impasto");
  }
  function startSourdough(kind: "licoli" | "solid", existing: boolean, name: string) {
    const profile = createStarterProfile(kind, existing, new Date(), name);
    setState((s) => ({
      ...s,
      sourdoughProfiles: [...s.sourdoughProfiles, profile],
      activeSourdoughId: profile.id,
    }));
    setMessage(
      existing
        ? t("Profilo creato: registra tre rinfreschi per valutarne la forza.")
        : t("Percorso avviato. Il primo rinfresco è nella tua routine."),
    );
  }
  function changeSourdough(profile: StoredState["sourdoughProfiles"][number]) {
    const previous = state.sourdoughProfiles.find((item) => item.id === profile.id);
    const scheduleChanged =
      previous?.preferredTime !== profile.preferredTime ||
      previous?.storage !== profile.storage ||
      previous?.phase !== profile.phase;
    const updated = scheduleChanged
      ? { ...profile, nextFeedAt: nextStarterFeedAt(profile) }
      : profile;
    setState((s) => ({
      ...s,
      sourdoughProfiles: s.sourdoughProfiles.map((item) =>
        item.id === updated.id ? updated : item,
      ),
    }));
    if (scheduleChanged && updated.remindersEnabled)
      void scheduleStarterReminders(updated, leadMinutes).catch(() =>
        setMessage(t("Routine aggiornata, ma non ho potuto riprogrammare le notifiche.")),
      );
  }
  function logStarterFeeding(feeding: StarterFeeding) {
    if (!activeSourdough) return;
    const updated = addStarterFeeding(activeSourdough, feeding);
    setState((s) => ({
      ...s,
      sourdoughProfiles: s.sourdoughProfiles.map((profile) =>
        profile.id === updated.id ? updated : profile,
      ),
    }));
    setMessage(
      updated.phase === "mature" && activeSourdough.phase !== "mature"
        ? t("Tre crescite efficaci consecutive: il lievito è entrato nella fase matura.")
        : t("Rinfresco registrato. Prossimo controllo: {dateLabel}.", { dateLabel: dateLabel(updated.nextFeedAt) }),
    );
    if (updated.remindersEnabled)
      void scheduleStarterReminders(updated, leadMinutes).catch(() =>
        setMessage(t("Rinfresco salvato, ma non ho potuto aggiornare le notifiche.")),
      );
  }
  async function enableStarterReminders() {
    if (!activeSourdough) return;
    try {
      const profile = { ...activeSourdough, remindersEnabled: true };
      const note = await scheduleStarterReminders(profile, leadMinutes);
      changeSourdough(profile);
      setMessage(note);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Non riesco ad attivare i promemoria."));
    }
  }
  async function disableStarterReminders() {
    if (!activeSourdough) return;
    await cancelStarterReminders(activeSourdough.id);
    setState((s) => ({
      ...s,
      sourdoughProfiles: s.sourdoughProfiles.map((profile) =>
        profile.id === activeSourdough.id
          ? { ...profile, remindersEnabled: false }
          : profile,
      ),
    }));
    setMessage(t("Promemoria del lievito madre disattivati."));
  }
  async function deleteSourdough(id: string) {
    await cancelStarterReminders(id);
    setState((s) => {
      const remaining = s.sourdoughProfiles.filter((profile) => profile.id !== id);
      return {
        ...s,
        sourdoughProfiles: remaining,
        activeSourdoughId:
          s.activeSourdoughId === id ? remaining[0]?.id ?? null : s.activeSourdoughId,
      };
    });
    setMessage(t("Lievito eliminato insieme ai suoi promemoria."));
  }
  async function deleteRecipe(id: string) {
    setBusy(true);
    try {
      if (state.activeId === id) await cancelReminders();
      setState((s) => ({
        ...s,
        recipes: s.recipes.filter((r) => r.id !== id),
        activeId: s.activeId === id ? null : s.activeId,
      }));
      if (editingId === id) setEditingId(null);
      setDeleteId(null);
    } catch {
      setMessage(
        t("Non riesco a cancellare i promemoria. Il piano è stato conservato."),
      );
    } finally {
      setBusy(false);
    }
  }
  function editRecipe(id: string, patch: Partial<Recipe>) {
    const current = state.recipes.find((r) => r.id === id);
    setState((s) => ({
      ...s,
      recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    // Se il check di fermentazione cambia i tempi dell’impasto in corso, i promemoria vanno riallineati.
    if (current && patch.config && state.activeId === id)
      void scheduleReminders({ ...current, ...patch }, leadMinutes).catch(() =>
        setMessage(t("Tempi aggiornati, ma non ho potuto riprogrammare i promemoria.")),
      );
  }
  async function changeLeadMinutes(minutes: number) {
    setState((s) => ({ ...s, reminderLeadMinutes: minutes }));
    const label = minutes ? t("{minutes} minuti prima di ogni fase", { minutes }) : t("all’orario esatto di ogni fase");
    try {
      const running = state.recipes.find((r) => r.id === state.activeId);
      if (running) await scheduleReminders(running, minutes);
      for (const profile of state.sourdoughProfiles.filter((item) => item.remindersEnabled))
        await scheduleStarterReminders(profile, minutes);
      setMessage(t("Ti avviserò {label}.", { label }));
    } catch {
      setMessage(t("Impostazione salvata ({label}), ma non ho potuto aggiornare le notifiche già programmate.", { label }));
    }
  }
  function saveCalibration(recipe: Recipe, calibration: BakeCalibration) {
    setState((s) => ({
      ...s,
      bakeCalibrations: [calibration, ...s.bakeCalibrations.filter((item) => item.id !== calibration.id)].slice(0, 100),
      recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...r, calibrationId: calibration.id } : r)),
    }));
    setMessage(t("Taratura salvata: le prossime previsioni di cottura con questo forno terranno conto del risultato reale."));
  }
  const isPan = Boolean(styles.find((s) => s.id === c.styleId)?.pan);
  const startPast =
    timeline.length > 0 && new Date(timeline[0].at).getTime() < now;
  const timing = startTiming(timeline, c.bakeAt, now);
  const leadMinutes = state.reminderLeadMinutes ?? 0;
  const recommended = recommendedExtras(c.styleId);
  const extrasMatch =
    Math.abs(c.salt - recommended.salt) < 0.05 &&
    Math.abs(c.oil - recommended.oil) < 0.05 &&
    Math.abs(c.sugar - recommended.sugar) < 0.05;
  const editingRecipe = editingId ? state.recipes.find((r) => r.id === editingId) : undefined;
  const activeRecipe = state.recipes.find((r) => r.id === state.activeId);
  if (!ready)
    return (
      <div className="loading">
        <Pizza size={44} />
        <p>{t("Prepariamo il banco…")}</p>
      </div>
    );
  return (
    <div className={`app-shell tab-${tab}`}>
      <nav className="app-nav" aria-label={t("Navigazione principale")}>
        <a
          href="#impasto"
          className="brand nav-brand"
          onClick={(e) => {
            e.preventDefault();
            openTab("impasto");
          }}
        >
          <span className="brand-icon">
            <img src={pizzaLabLogo} alt="" />
          </span>
          <span className="brand-name">
            Pizza<span className="brand-amico">Lab</span>
          </span>
        </a>
        <div className="app-nav-items">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item nav-${n.id} ${tab === n.id ? "active" : ""}`}
              aria-label={t(n.label)}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => (n.id === "diario" ? openDiary() : openTab(n.id))}
            >
              <span className="nav-icon">
                <n.icon size={22} weight={tab === n.id ? "fill" : "regular"} />
                {n.id === "diario" && state.recipes.length > 0 && (
                  <small className="nav-badge">{state.recipes.length}</small>
                )}
              </span>
              <span className="nav-label nav-label-long">{t(n.label)}</span>
              <span className="nav-label nav-label-short">{t(n.short)}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <Leaf size={18} />
          <p>
            <strong>{t("I tuoi dati restano sul dispositivo.")}</strong> {t("Nessun account, funziona anche offline.")}
          </p>
        </div>
      </nav>
      <div className="workspace">
        <header className="topbar">
          <a
            href="#impasto"
            className="brand topbar-brand"
            onClick={(e) => {
              e.preventDefault();
              openTab("impasto");
            }}
          >
            <span className="brand-icon">
              <img src={pizzaLabLogo} alt="" />
            </span>
            <span className="brand-name">
              Pizza<span className="brand-amico">Lab</span>
            </span>
          </a>
          <span className="topbar-title">
            {t(nav.find((n) => n.id === tab)?.label ?? "")}
          </span>
          <div className="topbar-actions">
            {active && tab !== "diario" && (
              <button
                className="live-chip"
                onClick={() => openDiary()}
                aria-label={t("Impasto in corso: {name}", { name: active.name })}
              >
                <span className="live-dot" aria-hidden="true" />
                <span>{t("In corso")}</span>
              </button>
            )}
            <button
              className={`profile-button ${tab === "profilo" ? "active" : ""}`}
              aria-label={t("Profilo")}
              onClick={() => openTab("profilo")}
            >
              {state.profileName?.trim() ? (
                <span>{state.profileName.trim()[0].toUpperCase()}</span>
              ) : (
                <UserCircle size={24} weight={tab === "profilo" ? "fill" : "regular"} />
              )}
            </button>
            <button
              className={`learn-button ${tab === "guida" ? "active" : ""}`}
              onClick={() => openTab("guida")}
            >
              <BookOpen size={20} weight={tab === "guida" ? "fill" : "regular"} />
              <span>{t("Impara")}</span>
            </button>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="notice warning" role="alert">
              <Warning />
              <div>
                {storageError}
                {loadError && (
                  <p>
                    {t("Ricarica l’app per riprovare. Il salvataggio è sospeso per proteggere l’archivio.")}
                  </p>
                )}
              </div>
            </div>
          )}
          {message && (
            <div className="toast" role="status">
              <Info size={22} weight="fill" />
              <p>{message}</p>
              <button
                aria-label={t("Chiudi messaggio")}
                onClick={() => setMessage("")}
              >
                <X />
              </button>
            </div>
          )}
          {tab === "impasto" && (
            <>
              <div className="page-heading home-heading">
                <div>
                  <span className="eyebrow">{t("Il tuo laboratorio della pizza")}</span>
                  <h1>
                    {t("Progetta. Impasta.")} <span>{t("Perfeziona.")}</span>
                  </h1>
                  <p>
                    {t("Scegli lo stile e segui i quattro passaggi: dosi, tempi e promemoria li calcola PizzaLab per te.")}
                  </p>
                </div>
                <div className="heading-illustration" aria-hidden="true">
                  <Pizza weight="duotone" />
                </div>
              </div>
              <InstallPrompt />
              {active && (
                <button
                  className="active-banner"
                  onClick={() => openDiary()}
                >
                  <span className="active-banner-icon">
                    <Clock size={22} weight="bold" />
                  </span>
                  <div>
                    <small>{t("Impasto in corso ·")} {active.name}</small>
                    <strong>
                      {activeNext
                        ? `${activeNext.title} · ${dateLabel(activeNext.at)}`
                        : t("Tabella di marcia terminata. Com’è andata?")}
                    </strong>
                  </div>
                  <ArrowRight />
                </button>
              )}
              {(state.templates ?? []).length > 0 && (
                <section className="panel user-ovens" aria-labelledby="templates-title">
                  <div className="panel-title">
                    <span className="section-icon"><BookmarkSimple /></span>
                    <div>
                      <h2 id="templates-title">{t("I tuoi modelli")}</h2>
                      <p>{t("Le tue ricette da rifare: un tocco e ripartono, tu scegli solo quando mangiare.")}</p>
                    </div>
                  </div>
                  <div className="oven-list">
                    {(state.templates ?? []).map((template) => (
                      <article key={template.id}>
                        <span className="oven-icon" aria-hidden="true"><Pizza weight="duotone" /></span>
                        <div>
                          <strong>{template.name}</strong>
                          <span>{t(styles.find((s) => s.id === template.config.styleId)?.name ?? "")} · {template.config.hydration}%</span>
                        </div>
                        <button className="button secondary" onClick={() => useTemplate(template.id)}>{t("Usa")}</button>
                        <button
                          className="icon-button"
                          aria-label={t("Elimina modello {name}", { name: template.name })}
                          onClick={() => setState((s) => ({ ...s, templates: (s.templates ?? []).filter((item) => item.id !== template.id) }))}
                        >
                          <Trash />
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              <section className="style-section">
                <div className="section-title">
                  <h2>{t("Che pizza ti va?")}</h2>
                  <span>{t("Tocca uno stile: dosi e tempi si impostano da soli.")}</span>
                </div>
                <div className="style-options">
                  {styles.map((s, i) => (
                    <button
                      key={s.id}
                      className={`style-option ${c.styleId === s.id ? "is-selected" : ""}`}
                      aria-pressed={c.styleId === s.id}
                      onClick={() => changeStyle(s.id)}
                      style={{ "--art-hue": `${(i * 29) % 360}` } as CSSProperties}
                    >
                      <span className={`style-art art-${i}`} aria-hidden="true">
                        {s.pan ? (
                          <CookingPot weight="duotone" />
                        ) : (
                          <Pizza weight="duotone" />
                        )}
                      </span>
                      <strong>{t(s.name)}</strong>
                      <small>{t(styleTaglines[s.id] ?? (s.pan ? "Da condividere" : "Il grande classico"))}</small>
                      {c.styleId === s.id && (
                        <CheckCircle className="style-check" weight="fill" />
                      )}
                    </button>
                  ))}
                </div>
              </section>
              {result.ok && plannerStage !== "summary" && (
                <div
                  className="mobile-dose"
                  aria-label={t("Dosi rapide")}
                >
                  <div>
                    <small>{t("Farina")}</small>
                    <strong>
                      <WeightValue grams={result.flour} />
                    </strong>
                  </div>
                  <div>
                    <small>{t("Acqua")}</small>
                    <strong>
                      <WeightValue grams={result.water} />
                    </strong>
                  </div>
                  <div>
                    <small>{["sourdough", "licoli"].includes(c.yeast) ? t("Madre") : t("Lievito")}</small>
                    <strong>
                      <WeightValue grams={result.yeast} digits={["sourdough", "licoli"].includes(c.yeast) ? 0 : 2} />
                    </strong>
                  </div>
                  <div className="dose-salt">
                    <small>{t("Sale")}</small>
                    <strong>
                      <WeightValue grams={result.salt} digits={1} />
                    </strong>
                  </div>
                  <button
                    aria-label={t("Vai al riepilogo della ricetta")}
                    onClick={() => goToPlannerStage("summary")}
                  >
                    <span>{t("Riepilogo")}</span>
                    <ArrowRight weight="bold" />
                  </button>
                </div>
              )}
              <span id="planner-anchor" className="planner-anchor" aria-hidden="true" />
              <nav id="planner-steps" className="planner-steps" aria-label={t("Fasi di progettazione")}>
                {plannerSteps.map(([id, number, label, detail, Icon]) => (
                  <button
                    key={id}
                    className={`${plannerStage === id ? "active" : ""} ${plannerSteps.findIndex(([step]) => step === plannerStage) > Number(number) - 1 ? "done" : ""}`}
                    aria-current={plannerStage === id ? "step" : undefined}
                    onClick={() => goToPlannerStage(id)}
                  >
                    <span>{number}</span>
                    <Icon />
                    <div>
                      <strong>{t(label)}</strong>
                      <small>{t(detail)}</small>
                    </div>
                  </button>
                ))}
              </nav>
              <div className={`planner-grid ${plannerStage === "summary" ? "is-summary" : ""}`}>
                <div className="planner-fields">
                  {!result.ok && plannerStage !== "summary" && (
                    <div className="notice warning" role="alert">
                      <Warning />
                      <div>
                        <strong>{t("Controlla questi valori")}</strong>
                        <ul>
                          {result.errors.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {plannerStage === "dough" && (
                    <section className="panel">
                      <div className="panel-title">
                        <span className="section-icon">
                          <Wheat />
                        </span>
                        <div>
                          <h2>{t("La base giusta")}</h2>
                          <p>{t("Farina e quantità, come piacciono a te.")}</p>
                        </div>
                      </div>
                      <FlourPicker
                        label={t("La tua farina")}
                        value={c.flourId}
                        flours={flours}
                        onChange={(value) => update("flourId", value)}
                      />
                      <div className="flour-selected-meta">
                        <span>
                          {selectedFlour ? strengthLine(selectedFlour) : t("W non disponibile")}
                        </span>
                        <HelpTip topic="forza" />
                        <span>
                          {selectedFlour?.protein !== null &&
                          selectedFlour?.protein !== undefined
                            ? t("{fmt}% proteine", { fmt: fmt(selectedFlour.protein, 1) })
                            : t("Proteine n.d.")}
                        </span>
                        <button onClick={() => openTab("farine")}>
                          {t("Esplora le farine")} <ArrowRight />
                        </button>
                      </div>
                      {history.flour.count > 0 && (
                        <p className="flour-history">
                          <Notebook /> {t("Le tue pizze con questa farina: {pizzas}, voto medio {average}/5.", { pizzas: tn(history.flour.count, "{count} pizza", "{count} pizze"), average: fmt(history.flour.average, 1) })}
                          {history.flourAndOven.count > 0 && history.flourAndOven.count !== history.flour.count
                            ? ` ${t("Con questo forno: {pizzas}, voto medio {average}/5.", { pizzas: tn(history.flourAndOven.count, "{count} pizza", "{count} pizze"), average: fmt(history.flourAndOven.average, 1) })}`
                            : ""}
                        </p>
                      )}
                      <FlourSuggestions config={c} flours={flours} onUse={(id) => update("flourId", id)} />
                      <details className="blend-details">
                        <summary>
                          <span>
                            <b>{t("Miscela di farine")}</b>
                            <small>
                              {c.secondFlourId
                                ? t("{v} farine in miscela", { v: result.ok ? result.flourBreakdown.length : 2 })
                                : t("Una sola farina · aggiungine fino ad altre tre")}
                            </small>
                            <em className="optional-badge">{t("Facoltativo")}</em>
                          </span>
                        </summary>
                        <div className="blend-section">
                        <p>{t("Vuoi mescolare più farine? Aggiungine fino ad altre tre e scegli la quota di ciascuna.")} <HelpTip topic="miscela" /></p>
                        <div className="field-grid blend-fields">
                            <FlourPicker
                              label={t("Seconda farina")}
                              value={c.secondFlourId}
                              flours={flours}
                              allowEmpty
                              emptyLabel={t("Una sola farina")}
                              onChange={(value) => {
                                if (value) update("secondFlourId", value);
                                else
                                  updateMany({
                                    secondFlourId: "",
                                    secondFlourPercent: 0,
                                    thirdFlourId: "",
                                    thirdFlourPercent: 0,
                                    fourthFlourId: "",
                                    fourthFlourPercent: 0,
                                  });
                              }}
                            />
                            {c.secondFlourId && (
                              <NumberField
                                label={t("Quota seconda farina")}
                                value={c.secondFlourPercent}
                                onChange={(v) => update("secondFlourPercent", v)}
                                min={0}
                                max={Math.max(
                                  0,
                                  100 -
                                    c.thirdFlourPercent -
                                    c.fourthFlourPercent,
                                )}
                                unit="%"
                              />
                            )}
                            {c.secondFlourId && (
                              <FlourPicker
                                label={t("Terza farina")}
                                value={c.thirdFlourId}
                                flours={flours}
                                allowEmpty
                                emptyLabel={t("Nessuna terza farina")}
                                onChange={(value) => {
                                  if (value) update("thirdFlourId", value);
                                  else
                                    updateMany({
                                      thirdFlourId: "",
                                      thirdFlourPercent: 0,
                                      fourthFlourId: "",
                                      fourthFlourPercent: 0,
                                    });
                                }}
                              />
                            )}
                            {c.thirdFlourId && (
                              <NumberField
                                label={t("Quota terza farina")}
                                value={c.thirdFlourPercent}
                                onChange={(v) => update("thirdFlourPercent", v)}
                                min={0}
                                max={Math.max(
                                  0,
                                  100 -
                                    c.secondFlourPercent -
                                    c.fourthFlourPercent,
                                )}
                                unit="%"
                              />
                            )}
                            {c.thirdFlourId && (
                              <FlourPicker
                                label={t("Quarta farina")}
                                value={c.fourthFlourId}
                                flours={flours}
                                allowEmpty
                                emptyLabel={t("Nessuna quarta farina")}
                                onChange={(value) => {
                                  update("fourthFlourId", value);
                                  if (!value) update("fourthFlourPercent", 0);
                                }}
                              />
                            )}
                            {c.fourthFlourId && (
                              <NumberField
                                label={t("Quota quarta farina")}
                                value={c.fourthFlourPercent}
                                onChange={(v) => update("fourthFlourPercent", v)}
                                min={0}
                                max={Math.max(
                                  0,
                                  100 -
                                    c.secondFlourPercent -
                                    c.thirdFlourPercent,
                                )}
                                unit="%"
                              />
                            )}
                        </div>
                        <BlendManager
                          config={c}
                          flours={flours}
                          blends={state.savedBlends}
                          onSave={saveBlend}
                          onLoad={loadBlend}
                          onDelete={(id) =>
                            setState((s) => ({
                              ...s,
                              savedBlends: s.savedBlends.filter(
                                (b) => b.id !== id,
                              ),
                            }))
                          }
                        />
                      </div>
                      </details>
                      <div className="field-grid quantity-fields">
                        <Stepper
                          label={isPan ? t("Numero di teglie") : t("Numero di pizze")}
                          value={c.count}
                          onChange={(v) => update("count", v)}
                          min={1}
                          max={30}
                        />
                        <div className="lead-options" role="group" aria-label={t("Per quante persone?")}>
                          <span>{t("Per quante persone?")}</span>
                          <div>
                            {[2, 4, 6, 8, 10].map((people) => (
                              <button
                                key={people}
                                className={c.count === countForPeople(people, isPan) ? "selected" : ""}
                                aria-pressed={c.count === countForPeople(people, isPan)}
                                onClick={() => update("count", countForPeople(people, isPan))}
                              >
                                {people}
                              </button>
                            ))}
                          </div>
                          <small>{isPan ? t("Circa 4 porzioni per teglia.") : t("Una pizza a testa.")}</small>
                        </div>
                        {!isPan && (
                          <NumberField
                            label={t("Peso del panetto")}
                            value={c.ballWeight}
                            onChange={(v) => update("ballWeight", v)}
                            min={100}
                            max={2000}
                            step={10}
                            quantity="weight"
                            hint={t("Il peso di ogni pallina di impasto.")}
                          />
                        )}
                      </div>
                      {isPan && (state.userPans ?? []).length > 0 && (
                        <div className="my-ovens-picker pan-picker">
                          <span>{t("Le tue teglie")}</span>
                          <div>
                            {(state.userPans ?? []).map((pan) => (
                              <button
                                key={pan.id}
                                className={isPanInUse(pan, c) ? "selected" : ""}
                                aria-pressed={isPanInUse(pan, c)}
                                onClick={() => usePan(pan)}
                              >
                                {pan.name} · {panSize(pan)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {isPan && (state.userPans ?? []).length === 0 && (
                        <p className="small-muted pan-tip">
                          {t("Hai più teglie? Salvale nel")} <button className="text-button inline-link" aria-label={t("Apri il profilo")} onClick={() => openTab("profilo")}>{t("Profilo")}</button> {t("e le sceglierai con un tocco.")}
                        </p>
                      )}
                      {isPan && (
                        <div className="method-toggle pan-shape-toggle" role="group" aria-label={t("Forma della teglia")}>
                          <button
                            className={c.panShape !== "round" ? "selected" : ""}
                            aria-pressed={c.panShape !== "round"}
                            onClick={() => update("panShape", "rect")}
                          >
                            <span className="shape-icon rect" aria-hidden="true" /> {t("Rettangolare")}
                          </button>
                          <button
                            className={c.panShape === "round" ? "selected" : ""}
                            aria-pressed={c.panShape === "round"}
                            onClick={() => updateMany({ panShape: "round", pizzaDiameter: c.panDiameter })}
                          >
                            <span className="shape-icon round" aria-hidden="true" /> {t("Tonda")}
                          </button>
                        </div>
                      )}
                      {isPan && (
                        <div className="field-grid">
                          {c.panShape === "round" ? (
                            <NumberField
                              label={t("Diametro teglia")}
                              value={c.panDiameter}
                              onChange={(v) => update("panDiameter", v)}
                              min={14}
                              max={60}
                              unit="cm"
                              hint={t("Misurato sul fondo, da bordo interno a bordo interno.")}
                            />
                          ) : (
                            <>
                              <NumberField
                                label={t("Larghezza teglia")}
                                value={c.panWidth}
                                onChange={(v) => update("panWidth", v)}
                                min={10}
                                max={80}
                                unit="cm"
                              />
                              <NumberField
                                label={t("Lunghezza teglia")}
                                value={c.panLength}
                                onChange={(v) => update("panLength", v)}
                                min={10}
                                max={100}
                                unit="cm"
                              />
                            </>
                          )}
                          <NumberField
                            label={t("Impasto per superficie")}
                            help="superficie"
                            value={c.panDensity}
                            onChange={(v) => update("panDensity", v)}
                            min={0.3}
                            max={1}
                            step={0.05}
                            unit="g/cm²"
                            hint={t("0,6 è un punto di partenza; aumenta per una pizza più alta.")}
                          />
                        </div>
                      )}
                      <div className="hydration-field">
                        <SliderField
                          label={t("Idratazione")}
                          help="idratazione"
                          value={c.hydration}
                          onChange={(v) => update("hydration", v)}
                          min={45}
                          max={90}
                          step={1}
                          unit="%"
                          hint={t("Acqua ogni 100 g di farina: 65% = 650 g d’acqua per 1 kg. Più bassa è più facile da lavorare; più alta dà una pizza ariosa ma più impegnativa.")}
                        />
                      </div>
                      {result.ok && (
                        <HydrationChart
                          value={c.hydration}
                          style={currentStyle}
                          w={result.w}
                          wLow={result.wLow}
                          estimated={result.wEstimated}
                        />
                      )}
                      <details className="extras-details">
                        <summary>
                          <span>
                            {t("Ingredienti aggiuntivi")}
                            <small>
                              {t("Sale")} {fmt(c.salt, 1)}{t("% · Olio")} {fmt(c.oil, 1)}{t("% · Zucchero")} {fmt(c.sugar, 1)}{t("% · Malto")} {fmt(c.malt, 1)}%
                            </small>
                            <em className={`optional-badge ${extrasMatch ? "saved-badge" : ""}`}>
                              {extrasMatch ? t("Come da ricetta") : t("Personalizzati")}
                            </em>
                          </span>
                        </summary>
                        <div className="extras-content">
                          <p className="field-explainer">
                            <Info size={16} />
                            <span>
                              {t("Per la")} <strong>{t(currentStyle.name)}</strong> {t("la ricetta prevede sale")} {fmt(recommended.salt, 1)}%
                              {recommended.oil ? t(", olio {fmt}%", { fmt: fmt(recommended.oil, 1) }) : t(", niente olio")}
                              {recommended.sugar ? t(", zucchero {fmt}%", { fmt: fmt(recommended.sugar, 1) }) : ""}
                              {recommended.malt ? t(" e malto {fmt}% (facoltativo)", { fmt: fmt(recommended.malt, 1) }) : ""}{t(". Le percentuali sono calcolate sul peso della farina.")}
                            </span>
                          </p>
                          {!extrasMatch && (
                            <button
                              className="button secondary"
                              onClick={() =>
                                updateMany({
                                  salt: recommended.salt,
                                  oil: recommended.oil,
                                  sugar: recommended.sugar,
                                })
                              }
                            >
                              <Sparkle /> {t("Usa i valori della ricetta")}
                            </button>
                          )}
                          <div className="field-grid">
                          <NumberField
                            label={t("Sale sulla farina")}
                            hint={t("Consigliato: {fmt}%", { fmt: fmt(recommended.salt, 1) })}
                            value={c.salt}
                            onChange={(v) => update("salt", v)}
                            min={0}
                            max={4}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label={t("Olio sulla farina")}
                            hint={recommended.oil ? t("Consigliato: {fmt}%", { fmt: fmt(recommended.oil, 1) }) : t("Questo stile non lo prevede")}
                            value={c.oil}
                            onChange={(v) => update("oil", v)}
                            min={0}
                            max={10}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label={t("Zucchero sulla farina")}
                            hint={recommended.sugar ? t("Consigliato: {fmt}%", { fmt: fmt(recommended.sugar, 1) }) : t("Questo stile non lo prevede")}
                            value={c.sugar}
                            onChange={(v) => update("sugar", v)}
                            min={0}
                            max={15}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label={t("Malto diastatico")}
                            hint={recommended.malt ? t("Facoltativo · la ricetta ne prevede {fmt}%", { fmt: fmt(recommended.malt, 1) }) : t("Facoltativo · questo stile non lo prevede")}
                            value={c.malt}
                            onChange={(v) => update("malt", v)}
                            min={0}
                            max={5}
                            step={0.1}
                            unit="%"
                          />
                          </div>
                          {recommended.malt > 0 && c.malt === 0 && result.ok && (
                            <div className="notice malt-note">
                              <Info />
                              <div>
                                <strong>{t("Il malto è facoltativo")}</strong>
                                <p>
                                  {t("La ricetta")} {t(currentStyle.name)} {t("ne prevede")} {fmt(recommended.malt, 1)}% ({formatWeight((result.flour * recommended.malt) / 100, 1)}{t("): aiuta colore e morbidezza, ma è difficile da trovare e si può omettere senza problemi.")}
                                </p>
                                <button className="text-button" onClick={() => update("malt", recommended.malt)}>
                                  {t("Ce l’ho: aggiungilo")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    </section>
                  )}
                  {plannerStage === "fermentation" && (
                    <section className="panel">
                      <div className="panel-title">
                        <span className="section-icon">
                          <Clock />
                        </span>
                        <div>
                          <h2>{t("Il tempo fa la sua parte")}</h2>
                          <p>{t("Fasi calde e fredde, con i ritmi che scegli tu.")}</p>
                        </div>
                      </div>
                      <div className="planning-mode-card">
                        <div>
                          <span className="eyebrow">{t("COME VUOI PIANIFICARE?")} <HelpTip topic="pianificazione" /></span>
                          <strong>{c.planMode === "automatic" ? t("L’app costruisce il piano") : t("Decidi tu ogni fase")}</strong>
                          <p>{c.planMode === "automatic" ? t("Indica quando inizi e quando vuoi mangiare: tempi e lievito li calcola PizzaLab.") : t("Scegli tu le ore di ogni riposo. Consigliato se conosci già il tuo impasto.")}</p>
                        </div>
                        <div className="method-toggle" aria-label={t("Modalità di pianificazione")}>
                          <button
                            className={c.planMode !== "automatic" ? "selected" : ""}
                            aria-pressed={c.planMode !== "automatic"}
                            onClick={() => update("planMode", "date")}
                          >
                            <Timer /> {t("Manuale")}
                          </button>
                          <button
                            className={c.planMode === "automatic" ? "selected" : ""}
                            aria-pressed={c.planMode === "automatic"}
                            onClick={() => updateMany({ planMode: "automatic", yeastMode: "auto" })}
                          >
                            <Sparkle /> {t("Automatica")}
                          </button>
                        </div>
                      </div>
                      {c.planMode === "automatic" && (
                        <div className="automatic-window">
                          <div className="automatic-dates">
                            <label className="field">
                              {t("Voglio iniziare")}
                              <input type="datetime-local" value={c.startAt} onChange={(e) => update("startAt", e.target.value)} />
                            </label>
                            <label className="field">
                              {t("Voglio mangiare")}
                              <input type="datetime-local" value={c.bakeAt} onChange={(e) => update("bakeAt", e.target.value)} />
                            </label>
                          </div>
                          <button className="text-button" onClick={suggestStartTime}>
                            <Clock /> {t("Suggerisci quando iniziare")}
                          </button>
                          {automaticPlan.ok ? (
                            <>
                              <div className="automatic-phase-grid">
                                <div><span>{t("PUNTATA")}</span><strong>{durationLabel(c.bulkHours)}</strong><small>{t("fuori frigo")}</small></div>
                                <div className="cold"><span>{t("FRIGO")}</span><strong>{c.coldHours > 0 ? durationLabel(c.coldHours) : "—"}</strong><small>{c.coldHours > 0 ? t("massa coperta") : t("non necessario")}</small></div>
                                <div><span>{t("APPRETTO")}</span><strong>{durationLabel(c.proofHours)}</strong><small>{t("prima del forno")}</small></div>
                                <div className="yeast"><span>{t("LIEVITO CALCOLATO")}</span><strong>{result.ok ? formatWeight(result.yeast, 2) : "—"}</strong><small>{c.yeast === "fresh" ? t("fresco") : c.yeast === "instant" ? t("secco") : t("coltura naturale")}</small></div>
                              </div>
                              <p className="automatic-plan-note"><Sparkle /> {(["sourdough", "licoli"] as DoughConfig["yeast"][]).includes(c.yeast) ? t("Orari e dose della coltura si aggiornano insieme; la vitalità reale del lievito madre va sempre verificata dalla crescita.") : t("Orari e lievito si aggiornano insieme in base a stile, temperature, pieghe e lavorazioni.")}</p>
                            </>
                          ) : (
                            <div className="notice warning"><Warning /><div><strong>{t("Finestra non compatibile")}</strong><p>{automaticPlan.error}</p></div></div>
                          )}
                        </div>
                      )}
                      {c.planMode !== "automatic" && (
                        <>
                      <div
                        className="method-toggle"
                        aria-label={t("Metodo di maturazione")}
                      >
                        <button
                          className={c.coldHours > 0 ? "selected" : ""}
                          aria-pressed={c.coldHours > 0}
                          onClick={() =>
                            update(
                              "coldHours",
                              Math.max(MIN_COLD_HOURS, styles.find((s) => s.id === c.styleId)!.cold),
                            )
                          }
                        >
                          <Snowflake /> {t("Con passaggio in frigo")}
                        </button>
                        <button
                          className={c.coldHours === 0 ? "selected" : ""}
                          aria-pressed={c.coldHours === 0}
                          onClick={() => update("coldHours", 0)}
                        >
                          <Leaf /> {t("Tutto fuori frigo")}
                        </button>
                      </div>
                      <div className="time-fields slider-time-fields">
                        <SliderField
                          label={t("Puntata fuori frigo")}
                          help="puntata"
                          value={c.bulkHours}
                          onChange={(v) =>
                            update(
                              "bulkHours",
                              Math.max(
                                v,
                                (c.foldCount * c.foldIntervalMinutes) / 60,
                              ),
                            )
                          }
                          min={(c.foldCount * c.foldIntervalMinutes) / 60}
                          max={24}
                          sliderMax={Math.max(12, c.bulkHours)}
                          step={0.25}
                          unit="ore"
                          hint={
                            c.foldCount > 0
                              ? t("Minimo {durationLabel} per completare le pieghe", { durationLabel: durationLabel((c.foldCount * c.foldIntervalMinutes) / 60) })
                              : t("Primo riposo dell’impasto intero, prima di dividerlo in panetti")
                          }
                        />
                        {c.coldHours > 0 && (
                          <SliderField
                            label={t("Riposo in frigo")}
                            help="frigo"
                            value={c.coldHours}
                            onChange={(v) => update("coldHours", v)}
                            min={MIN_COLD_HOURS}
                            max={96}
                            sliderMax={Math.max(72, c.coldHours)}
                            step={0.5}
                            unit="ore"
                            hint={t("Almeno {MIN_COLD_HOURS} ore: con meno l’impasto fa appena in tempo a raffreddarsi. Se hai poco tempo scegli «Tutto fuori frigo».", { MIN_COLD_HOURS })}
                          />
                        )}
                        <SliderField
                          label={t("Appretto fuori frigo")}
                          help="appretto"
                          value={c.proofHours}
                          onChange={(v) => update("proofHours", v)}
                          min={0}
                          max={24}
                          sliderMax={Math.max(12, c.proofHours)}
                          step={0.5}
                          unit="ore"
                          hint={t("Ultimo riposo dei panetti già formati, prima di stendere")}
                        />
                      </div>
                      <div className="time-breakdown">
                        <span style={{ flex: Math.max(0.1, c.bulkHours) }} />
                        <span
                          className="cold"
                          style={{
                            flex: Math.max(0, c.coldHours),
                            display: c.coldHours === 0 ? "none" : undefined,
                          }}
                        />
                        <span style={{ flex: Math.max(0.1, c.proofHours) }} />
                      </div>
                      <div className="time-legend" aria-hidden="true">
                        <span>{t("Puntata")} {durationLabel(c.bulkHours)}</span>
                        {c.coldHours > 0 && <span className="cold">{t("Frigo")} {durationLabel(c.coldHours)}</span>}
                        <span className="proof">{t("Appretto")} {durationLabel(c.proofHours)}</span>
                      </div>
                      <div className="time-total">
                        <span>{t("Tempo di fermentazione")}</span>
                        <strong>
                          {result.ok ? durationLabel(result.hours) : "—"}{" "}
                          <small>{t("+ 20 min di impasto")}</small>
                        </strong>
                      </div>
                        </>
                      )}
                      <div className="field-grid temperature-fields slider-temperature-fields">
                        <SliderField
                          label={t("Temperatura ambiente")}
                          value={c.roomTemp}
                          onChange={(v) => update("roomTemp", v)}
                          min={10}
                          max={35}
                          quantity="temp"
                          hint={t("Dove lievita l’impasto")}
                        />
                        {c.coldHours > 0 && (
                          <SliderField
                            label={t("Temperatura del frigo")}
                            value={c.fridgeTemp}
                            onChange={(v) => update("fridgeTemp", v)}
                            min={1}
                            max={12}
                            quantity="temp"
                          />
                        )}
                        <SelectSheet
                          label={t("Lievito")}
                          help="lievito"
                          value={c.yeast}
                          options={[
                            { value: "fresh", label: t("Di birra fresco"), description: t("Il panetto del banco frigo") },
                            { value: "instant", label: t("Secco istantaneo"), description: t("In bustina, circa 3 volte più concentrato") },
                            { value: "sourdough", label: t("Pasta madre solida"), description: t("Lievito naturale, idratazione circa 50%") },
                            { value: "licoli", label: t("Licoli"), description: t("Lievito naturale liquido, idratazione 100%") },
                          ]}
                          onChange={(yeast) =>
                            updateMany({
                              yeast,
                              ...(yeast === "sourdough"
                                ? { preferment: "none", starterHydration: 50 }
                                : yeast === "licoli"
                                  ? { preferment: "none", starterHydration: 100 }
                                  : {}),
                            })
                          }
                        />
                      </div>
                      {result.ok &&
                        !["sourdough", "licoli"].includes(c.yeast) && (
                          <YeastChart
                            config={c}
                            currentPercent={result.yeastPercent}
                          />
                        )}
                      {result.ok && ["sourdough", "licoli"].includes(c.yeast) && (
                        <StarterDoughLink profiles={state.sourdoughProfiles} config={c} starterGrams={result.starter.grams} onUpdate={updateMany} onManage={() => openTab("madre")} />
                      )}
                    </section>
                  )}
                  {result.ok && plannerStage !== "summary" && (
                    <AdvancedPlanner
                      config={c}
                      flours={flours}
                      result={result}
                      section={plannerStage}
                      onUpdate={updateMany}
                      userOvens={state.userOvens}
                    />
                  )}
                  {result.ok && plannerStage === "dough" && (
                    <DoughAnalysis config={c} result={result} />
                  )}
                  {plannerStage === "baking" && (
                    <BakingPlanner
                      config={c}
                      onUpdate={updateMany}
                      calibrations={state.bakeCalibrations}
                      userPans={state.userPans}
                      onUsePan={usePan}
                      onOpenProfile={() => openTab("profilo")}
                    />
                  )}
                  {plannerStage === "fermentation" && (
                    <section className="panel">
                      <div className="panel-title">
                        <span className="section-icon">
                          <Fire />
                        </span>
                        <div>
                          <h2>{t("Quando si mangia?")}</h2>
                          <p>{t("Da qui costruiamo la tua tabella di marcia.")}</p>
                        </div>
                      </div>
                      {c.planMode !== "automatic" ? (
                        <label className="field">
                          {t("Giorno e ora della prima infornata")}
                          <input
                            type="datetime-local"
                            value={c.bakeAt}
                            onChange={(e) => update("bakeAt", e.target.value)}
                          />
                        </label>
                      ) : (
                        <div className="duration-result">
                          <Sparkle />
                          <div>
                            <span>{t("PIANO AUTOMATICO")}</span>
                            <strong>{dateLabel(c.startAt)} → {dateLabel(c.bakeAt)}</strong>
                          </div>
                        </div>
                      )}
                      {timeline[0] && (
                        <div className={`plan-window ${startPast ? "is-late" : ""}`}>
                          <Clock />
                          <div>
                            <span>{t("Inizi a impastare")}</span>
                            <strong>{dateLabel(timeline[0].at)}</strong>
                            <small>{t("La tabella di marcia completa è nel riepilogo (passaggio 4).")}</small>
                          </div>
                        </div>
                      )}
                      {startPast && (
                        <div className="notice warning">
                          <Warning />
                          <div>
                            <strong>{t("L’inizio del piano è già passato")}</strong>
                            <p>
                              {t("Sposta la cottura in avanti o riduci i tempi per poter seguire tutte le fasi.")}
                            </p>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                  {plannerStage === "summary" && (
                    <section className="panel summary-panel">
                      <div className="panel-title">
                        <span className="section-icon">
                          <ListChecks />
                        </span>
                        <div>
                          <h2>{t("Il tuo programma")}</h2>
                          <p>{t("Controlla tempi e dosi. Poi scegli: inizi subito con i promemoria o lo salvi per un altro giorno.")}</p>
                        </div>
                      </div>
                      {editingRecipe && (
                        <div className="notice editing-notice">
                          <PencilSimple />
                          <div>
                            <strong>{t("Stai modificando «{name}»", { name: editingRecipe.name })}</strong>
                            <p>{t("Salvando aggiorni la pizza già presente nel diario, senza crearne una nuova.")}</p>
                          </div>
                        </div>
                      )}
                      <div className="summary-facts">
                        <div><span>{t("Inizi")}</span><strong>{timeline[0] ? dateLabel(timeline[0].at) : "—"}</strong></div>
                        <div><span>{t("Inforni")}</span><strong>{dateLabel(c.bakeAt)}</strong></div>
                        <div><span>{t("Lievitazione")}</span><strong>{result.ok ? durationLabel(result.hours) : "—"}</strong></div>
                        <div><span>{isPan ? t("Teglie") : t("Pizze")}</span><strong>{c.count} · {t(currentStyle.name)}</strong></div>
                      </div>
                      {startPast && (
                        <div className="notice warning">
                          <Warning />
                          <div>
                            <strong>{t("L’inizio del piano è già passato")}</strong>
                            <p>{t("Per iniziare adesso torna al passaggio 2 e sposta la cottura più avanti. Puoi comunque salvarla per dopo.")}</p>
                          </div>
                        </div>
                      )}
                      <h3 className="summary-subtitle">{t("Tabella di marcia")}</h3>
                      <div className="timeline">
                        {timeline.map((stage) => (
                          <div
                            className={`timeline-item ${stage.id === "cold" ? "is-cold" : ""}`}
                            key={stage.id}
                          >
                            <div className="timeline-point">
                              {stage.id === "bake" ? (
                                <Fire />
                              ) : stage.id === "cold" ? (
                                <Snowflake />
                              ) : (
                                <Check size={12} />
                              )}
                            </div>
                            <div>
                              <strong>{stage.title}</strong>
                              <span>{dateLabel(stage.at)}</span>
                              <p>{stage.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {result.ok && (
                    <div className="advice-section">
                      <div className="section-title">
                        <h3>
                          <ChefHat /> {t("Il consiglio di PizzaLab")}
                        </h3>
                      </div>
                      {result.advice.length === 0 ? (
                        <div className="advice info">
                          <CheckCircle />
                          <div>
                            <strong>{t("Un buon punto di partenza")}</strong>
                            <p>
                              {t("I parametri rientrano nei riferimenti del calcolatore. Osserva comunque l’impasto durante la lievitazione.")}
                            </p>
                          </div>
                        </div>
                      ) : (
                        result.advice.map((a) => (
                          <div key={a.id} className={`advice ${a.level}`}>
                            {a.level === "info" ? <Info /> : <Warning />}
                            <div>
                              <strong>{a.title}</strong>
                              <p>{a.text}</p>
                              {a.fix && (
                                <button className="text-button" onClick={() => update("hydration", a.fix!.hydration)}>
                                  {t("Imposta {value}%", { value: a.fix.hydration })}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <div className="style-tip">
                        <Leaf />
                        <p>{t(result.style.tip)}</p>
                      </div>
                      <small className="bake-note">
                        {t(result.style.bake)} {t("I tempi dipendono da forno, supporto e condimento.")}
                      </small>
                    </div>
                  )}
                  {plannerStage !== "summary" && (
                    <div className="step-footer">
                      {plannerStage !== "dough" && (
                        <button className="button secondary step-back" onClick={() => goToPlannerStage(plannerStage === "baking" ? "fermentation" : "dough")}>
                          <ArrowLeft /> {t("Indietro")}
                        </button>
                      )}
                      {plannerStage === "dough" && (
                        <button className="journey-next" onClick={() => goToPlannerStage("fermentation")}>
                          <span><small>{t("Passaggio 2 di 4")}</small><strong>{t("Passa a lievitazione")}</strong></span>
                          <ArrowRight weight="bold" />
                        </button>
                      )}
                      {plannerStage === "fermentation" && (
                        <button className="journey-next" onClick={() => goToPlannerStage("baking")}>
                          <span><small>{t("Passaggio 3 di 4")}</small><strong>{t("Passa a cottura")}</strong></span>
                          <ArrowRight weight="bold" />
                        </button>
                      )}
                      {plannerStage === "baking" && (
                        <button className="journey-next" onClick={() => goToPlannerStage("summary")}>
                          <span><small>{t("Passaggio 4 di 4")}</small><strong>{t("Vai al riepilogo")}</strong></span>
                          <ArrowRight weight="bold" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {plannerStage === "summary" && (
                <aside className="recipe-sidebar" id="recipe-summary">
                  <div className="recipe-sheet">
                    <span className="eyebrow">{t("IL TUO IMPASTO")}</span>
                    <div className="recipe-title">
                      <h2>{t(styles.find((s) => s.id === c.styleId)?.name ?? "")}</h2>
                      <Pizza size={35} weight="duotone" />
                    </div>
                    <p>
                      {result.ok
                        ? t("{count} {kind} da {weight}", { count: c.count, kind: isPan ? t("teglie") : t("panetti"), weight: formatWeight(result.unitWeight) })
                        : t("Completa i valori del piano")}
                    </p>
                    {result.ok ? (
                      <>
                        <div className="recipe-badges">
                          <span>
                            <Drop />
                            {fmt(c.hydration, 1)}%
                          </span>
                          <span>
                            <Clock />
                            {durationLabel(result.hours)}
                          </span>
                          <span>
                            <Fire />
                            {formatTemp(c.ovenTemp)}
                          </span>
                        </div>
                        <div className="flour-total">
                          <span>{t("FARINA TOTALE")}</span>
                          <strong>
                            <WeightValue grams={result.flour} tag="small" />
                          </strong>
                          <div className="flour-breakdown">
                            {result.flourBreakdown.map((item) => (
                              <div key={item.id}>
                                <span>{item.name}</span>
                                <strong>
                                  {formatWeight(item.grams)}{" "}
                                  <small>· {fmt(item.percent, 1)}%</small>
                                </strong>
                              </div>
                            ))}
                          </div>
                          {result.flourBreakdown.length > 1 && (
                            <small className="w-average">
                              {t("W medio indicativo:")}{" "}
                              {result.w === null ? "n.d." : fmt(result.w)}
                              {result.wEstimated ? ` (${t("stimato")})` : ""}
                            </small>
                          )}
                        </div>
                        <div className="ingredients">
                          {[
                            [t("Acqua totale"), result.water, 0],
                            [t("Sale"), result.salt, 1],
                            [
                              yeastLabel(c.yeast),
                              result.yeast,
                              ["sourdough", "licoli"].includes(c.yeast) ? 0 : 2,
                            ],
                            ...(result.oil > 0
                              ? [[t("Olio"), result.oil, 1]]
                              : []),
                            ...(result.sugar > 0
                              ? [[t("Zucchero"), result.sugar, 1]]
                              : []),
                            ...(result.malt > 0
                              ? [[t("Malto"), result.malt, 1]]
                              : []),
                          ].map(([label, value, digits]) => (
                            <div key={label}>
                              <span>{label}</span>
                              <strong>
                                <WeightValue grams={Number(value)} digits={Number(digits)} tag="small" />
                              </strong>
                            </div>
                          ))}
                        </div>
                        {result.starter.active && (
                          <div className="phase-note">
                            <strong>
                              {c.yeast === "licoli" ? t("Licoli") : t("Pasta madre")}{" "}
                              · {formatWeight(result.starter.grams)}
                            </strong>
                            <span>
                              {t("Contiene")} {formatWeight(result.starter.flour)} {t("farina +")}{" "}
                              {formatWeight(result.starter.water)} {t("acqua")}
                            </span>
                            <small>
                              {t("Le quantità di farina e acqua da pesare sono già state ridotte correttamente.")}
                            </small>
                          </div>
                        )}
                        {c.autolyse && (
                          <div className="phase-note">
                            <strong>{t("Autolisi ·")} {c.autolyseMinutes} {t("min")}</strong>
                            <span>
                              {formatWeight(result.autolyse.flour)} {t("farina +")}{" "}
                              {formatWeight(result.autolyse.water)} {t("acqua")}
                            </span>
                            <small>
                              {formatWeight(result.autolyse.reservedWater)} {t("d’acqua restano per lievito e inserimento graduale.")}
                            </small>
                          </div>
                        )}
                        {c.preferment !== "none" && (
                          <div className="phase-note">
                            <strong>
                              {c.preferment} · {result.preferment.maturity}
                            </strong>
                            <span>
                              {formatWeight(result.preferment.flour)} {t("farina +")}{" "}
                              {formatWeight(result.preferment.water)} {t("acqua")}
                            </span>
                            <small>
                              {formatWeight(result.preferment.yeast, 2)} {t("lievito nel prefermento.")}
                            </small>
                          </div>
                        )}
                        <div className="phase-note baking-note">
                          <strong>
                            {t("Cottura ·")} {c.bakeMinutes} {t("min a")} {formatTemp(c.ovenTemp)}
                          </strong>
                          <span>
                            {t("Crosta")} {result.bakeOutcome.crustLabel.toLowerCase()} {t("· mollica")} {result.bakeOutcome.crumbLabel.toLowerCase()} {t("· fondo")} {result.bakeOutcome.baseLabel.toLowerCase()}
                          </span>
                          <small>
                            {ovenById(c.ovenType).fixedRack
                              ? t(ovenById(c.ovenType).name)
                              : t("Posizione nel forno: {rack}", {
                                  rack:
                                    c.ovenRack === "bottom"
                                      ? t("bassa")
                                      : c.ovenRack === "lower-middle"
                                        ? t("medio-bassa")
                                        : c.ovenRack === "middle"
                                          ? t("centrale")
                                          : c.ovenRack === "upper-middle"
                                            ? t("medio-alta")
                                            : t("alta"),
                                })}
                            {" "}· {bakeSurfaceLabels[c.bakeSurface]}.
                          </small>
                        </div>
                        <div className="total-weight">
                          <span>{t("Impasto totale")}</span>
                          <strong>{formatWeight(result.total)}</strong>
                        </div>
                        <div className="yeast-note">
                          <Info />
                          <span>
                            {t("Lievito stimato: verifica la crescita reale. Le quantità mostrate sono arrotondate.")}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="notice warning" role="alert">
                        <Warning />
                        <div>
                          <strong>{t("Controlla questi valori")}</strong>
                          <ul>
                            {result.errors.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                  {plannerStage === "summary" && (
                    <section className="panel final-save-panel" aria-labelledby="final-save-title">
                      <span className="eyebrow">{t("Passaggio 4 di 4 · Tutto pronto?")}</span>
                      <h2 id="final-save-title">{t("Partiamo o lo salvi per dopo?")}</h2>
                      <label className="field recipe-name">
                        {t("Nome del piano")}
                        <input maxLength={80} value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder={t("Es. La pizza del sabato")} />
                      </label>
                      <div className="final-choice">
                        <button
                          className="button primary full final-start-button"
                          disabled={loadError || !result.ok || timing === "expired" || busy}
                          onClick={() => (timing === "late" ? setLateStart({ source: "planner" }) : void saveRecipe("start"))}
                        >
                          {timing === "future" ? <><CalendarCheck /> {t("Programma")}</> : timing === "late" ? <><Clock /> {t("Parti adesso")}</> : <><Bell /> {t("Inizia ora")}</>}
                        </button>
                        <p>
                          {timing === "future"
                            ? usesCalendarReminders()
                              ? t("Partirà da sola {v}. Nel diario, tra quelle «In corso», potrai aggiungere le fasi al Calendario per ricevere gli avvisi.", { v: timeline[0] ? dateLabel(timeline[0].at) : "" })
                              : t("Partirà da sola {when}: riceverai una notifica a ogni fase{lead}. La trovi nel diario tra quelle «In corso».", {
                                  when: timeline[0] ? dateLabel(timeline[0].at) : "",
                                  lead: leadMinutes ? t(", {minutes} minuti prima", { minutes: leadMinutes }) : "",
                                })
                            : timing === "now"
                              ? t("È l’ora giusta: si parte subito e ricevi una notifica a ogni fase. Bilancia e guida passo passo ti aspettano nel diario.")
                              : timing === "late"
                                ? t("L’orario di inizio è già passato: puoi partire adesso spostando la cena, oppure mantenerla e ricalcolare lievito e tempi.")
                                : t("Anche l’orario di cottura è passato: scegli una nuova data al passaggio 2, oppure salvala per dopo.")}
                        </p>
                        {timing !== "expired" && activeRecipe && activeRecipe.id !== editingId && (
                          <p className="replace-note"><Warning /> {t("Hai già «{name}» in corso: {action} questa, l’altra tornerà tra le salvate.", { name: activeRecipe.name, action: timing === "future" ? t("programmando") : t("iniziando") })}</p>
                        )}
                      </div>
                      <div className="final-choice">
                        <button className="button secondary full final-save-button" disabled={loadError || !result.ok || busy} onClick={() => void saveRecipe("later")}>
                          <BookmarkSimple /> {editingRecipe ? t("Salva le modifiche") : t("Salva per dopo")}
                        </button>
                        <p>{t("Nessun promemoria per ora: la ritrovi nel diario, tra le «Salvate», e la avvii quando vuoi.")}</p>
                      </div>
                      <button className="text-button" disabled={!result.ok} onClick={saveTemplate}>
                        <BookmarkSimple /> {t("Salva come modello")}
                      </button>
                      <button className="text-button step-back-link" onClick={() => goToPlannerStage("baking")}>
                        <ArrowLeft /> {t("Torna alla cottura")}
                      </button>
                    </section>
                  )}
                </aside>
                )}
              </div>
            </>
          )}
          {tab === "farine" && (
            <FlourLibrary
              flours={flours}
              selectedId={c.flourId}
              onSelect={selectFlour}
              onAdd={(f) => {
                setState((s) => ({
                  ...s,
                  customFlours: [...s.customFlours, f],
                }));
                setMessage(t("Farina personale aggiunta."));
              }}
            />
          )}
          {tab === "condimenti" && (
            <>
              <div className="page-heading toppings-heading">
                <div>
                  <span className="eyebrow">{t("DOPO L’IMPASTO, IL GUSTO")}</span>
                  <h1>{t("Condimenti.")}</h1>
                  <p>
                    {t("Quantità, bilanciamento e ordine di aggiunta in uno spazio dedicato.")}
                  </p>
                </div>
                <div className="heading-illustration" aria-hidden="true">
                  <Pizza weight="duotone" />
                  <span>
                    {t("Parti dal tuo stile")}
                    <br />{t("e completa la pizza.")}
                  </span>
                </div>
              </div>
              {result.ok ? (
                <div className="standalone-toppings">
                  <ToppingPlanner config={c} result={result} onUpdate={updateMany} />
                </div>
              ) : (
                <div className="notice warning">
                  <Warning />
                  <div>
                    <strong>{t("Prima completa l’impasto")}</strong>
                    <p>
                      {t("Le quantità dei condimenti dipendono dal numero e dalla dimensione delle pizze.")}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          {tab === "madre" && (
            <SourdoughCare
              profiles={state.sourdoughProfiles}
              profile={activeSourdough}
              now={now}
              onStart={startSourdough}
              onSelect={(id) => setState((s) => ({ ...s, activeSourdoughId: id }))}
              onDelete={(id) => void deleteSourdough(id)}
              onChange={changeSourdough}
              onLog={logStarterFeeding}
              onSchedule={() => void enableStarterReminders()}
              onDisableReminders={() => void disableStarterReminders()}
              onCalendar={addStarterToCalendar}
            />
          )}
          {tab === "profilo" && (
            <ProfilePage
              state={state}
              flours={flours}
              now={now}
              config={c}
              version={APP_VERSION}
              onNameChange={(profileName) => setState((s) => ({ ...s, profileName }))}
              onAddOven={(oven) => {
                setState((s) => ({ ...s, userOvens: [...(s.userOvens ?? []), oven] }));
                setMessage(t("Forno «{name}» salvato: lo trovi anche nel passaggio Cottura.", { name: oven.name }));
              }}
              onDeleteOven={(id) => setState((s) => ({ ...s, userOvens: (s.userOvens ?? []).filter((item) => item.id !== id) }))}
              onUseOven={(oven) => {
                const patch: Partial<DoughConfig> = {
                  ovenType: oven.ovenType,
                  ovenTemp: oven.temp,
                  bakeSurface: oven.bakeSurface,
                  ...(ovenById(oven.ovenType).fixedRack ? { ovenRack: "middle" as const } : {}),
                };
                updateMany({ ...patch, bakeMinutes: recommendedBakeMinutes({ ...c, ...patch }) });
                setMessage(t("Userai «{name}» per i prossimi impasti.", { name: oven.name }));
              }}
              onAddPan={(pan) => {
                setState((s) => ({ ...s, userPans: [...(s.userPans ?? []), pan] }));
                setMessage(t("Teglia «{name}» salvata: la ritrovi negli stili in teglia.", { name: pan.name }));
              }}
              onDeletePan={(id) => setState((s) => ({ ...s, userPans: (s.userPans ?? []).filter((item) => item.id !== id) }))}
              onUsePan={usePan}
              onMixerChange={(patch) => updateMany(patch)}
              onExport={exportArchive}
              onImport={(file) => void importArchive(file)}
              onShowTutorial={() => setTutorialOpen(true)}
              onLeadChange={(minutes) => void changeLeadMinutes(minutes)}
              onLanguageChange={(next: Language) => setState((s) => ({ ...s, language: next }))}
              language={language}
              onUnitsChange={(patch: Partial<Units>) => setState((s) => ({ ...s, units: { ...normalizeUnits(s.units), ...patch } }))}
            />
          )}
          {tab === "guida" && (
            <>
              <Guide onShowTutorial={() => setTutorialOpen(true)} />
              <DoughRescue />
              <SupportCard />
            </>
          )}
          {tab === "diario" && (
            <Diary
              recipes={state.recipes}
              activeId={state.activeId}
              flours={flours}
              now={now}
              busy={busy}
              view={diaryView}
              calibrations={state.bakeCalibrations}
              onViewChange={setDiaryView}
              onNew={startNewDough}
              onStart={(recipe) => void activate(recipe)}
              onLateStart={(recipe) => setLateStart({ source: "recipe", recipe })}
              onStop={() => void deactivate()}
              onFinish={(recipe) => void finishRecipe(recipe)}
              onEdit={editRecipe}
              onDelete={setDeleteId}
              onOpenInPlanner={openInPlanner}
              onShare={(recipe) => void shareRecipe(recipe)}
              onCalendar={addRecipeToCalendar}
              onMessage={setMessage}
              onSaveCalibration={saveCalibration}
            />
          )}
          <footer className="page-footer">
            <span>PizzaLab</span> {t("Fatto per chi ama mettere le mani in pasta.")}
          </footer>
        </main>
      </div>
      {deleteId && (
        <div className="dialog-backdrop">
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">{t("Eliminare questo piano?")}</h2>
            <p>
              {t("Verranno rimossi ricetta, appunti e gli eventuali promemoria attivi.")}
            </p>
            <div>
              <button
                autoFocus
                className="button secondary"
                onClick={() => setDeleteId(null)}
              >
                {t("Conserva")}
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => void deleteRecipe(deleteId)}
              >
                {t("Elimina piano")}
              </button>
            </div>
          </div>
        </div>
      )}
      {lateStart && (
        <LateStartDialog
          config={lateStart.source === "planner" ? c : lateStart.recipe.config}
          flours={flours}
          now={now}
          onClose={() => setLateStart(null)}
          onChoose={(config) => {
            const target = lateStart;
            setLateStart(null);
            if (target.source === "planner") void saveRecipe("start", config);
            else {
              editRecipe(target.recipe.id, { config });
              void activate({ ...target.recipe, config });
            }
          }}
        />
      )}
      {tutorialOpen && ready && <Onboarding onClose={closeTutorial} />}
    </div>
  );
}
