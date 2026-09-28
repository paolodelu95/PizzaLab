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
import { applyAutomaticPlan, recipeStatus, startTiming } from "./domain/recipes";
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
import { markTutorialSeen, tutorialSeen } from "./services/tutorial";
import { Onboarding } from "./components/Onboarding";
import { InstallPrompt } from "./components/InstallPrompt";
import { LateStartDialog } from "./components/LateStartDialog";
import { SelectSheet } from "./components/SelectSheet";
import { HelpTip } from "./components/HelpTip";
import { SupportCard } from "./components/SupportCard";
import pizzaLabLogo from "./assets/pizzalab-logo.png";

const APP_VERSION = "0.21.2";
type Tab = "impasto" | "farine" | "condimenti" | "madre" | "diario" | "guida" | "profilo";
type PlannerStage = "dough" | "fermentation" | "baking" | "summary";
const nav = [
  { id: "impasto", label: "Il tuo impasto", short: "Impasto", icon: CookingPot },
  { id: "farine", label: "Farine", short: "Farine", icon: Wheat },
  { id: "condimenti", label: "Condimenti", short: "Condimenti", icon: Pizza },
  { id: "madre", label: "Lievito", short: "Lievito", icon: Jar },
  { id: "diario", label: "Diario", short: "Diario", icon: Notebook },
  { id: "guida", label: "Impara", short: "Impara", icon: BookOpen },
  { id: "profilo", label: "Profilo", short: "Profilo", icon: UserCircle },
] as const;
const plannerSteps = [
  ["dough", "1", "Impasto", "Farina e dosi", Wheat],
  ["fermentation", "2", "Lievitazione", "Tempi e lievito", Clock],
  ["baking", "3", "Cottura", "Forno e tempi", Fire],
  ["summary", "4", "Riepilogo", "Parti o salva", ListChecks],
] as const;
const styleTaglines: Record<string, string> = {
  napoletana: "Il grande classico",
  contemporanea: "Alta e ariosa",
  romana: "Sottile e croccante",
  teglia: "Da condividere",
  pala: "Leggera e croccante",
  padellino: "Soffice e dorata",
  focaccia: "Soffice e oliata",
  "focaccia-barese": "Pomodorini e olive",
  "new-york": "Grande e pieghevole",
  detroit: "Alta, bordi croccanti",
  pinsa: "Ovale e leggera",
  sfincione: "Alta e soffice",
  "tonda-casa": "Ideale per iniziare",
};
const fmt = (n: number, digits = 0) =>
  n.toLocaleString("it-IT", { maximumFractionDigits: digits });
const dateLabel = (s: string) =>
  new Date(s).toLocaleString("it-IT", {
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
            "Non riesco a leggere l’archivio locale. I dati esistenti non sono stati sovrascritti.",
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
          "Salvataggio locale non riuscito. Mantieni aperta l’app e riprova.",
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
  const activeSourdough = state.sourdoughProfiles.find(
    (profile) => profile.id === state.activeSourdoughId,
  ) ?? null;
  const selectedFlour = flours.find((f) => f.id === c.flourId);
  const result = useMemo(() => calculate(c, flours), [c, flours]);
  const automaticPlan = useMemo(() => deriveAutomaticSchedule(c), [c]);
  const timeline = useMemo(() => buildTimeline(c, flours), [c, flours]);
  const currentStyle = styles.find((s) => s.id === c.styleId)!;
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
    setMessage(`${f.brand} ${f.name} selezionata.`);
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
        (item) => flours.find((f) => f.id === item.flourId)?.brand ?? "Farina",
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
    setMessage("Miscela salvata e pronta da riutilizzare.");
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
    setMessage(`Miscela “${blend.name}” caricata.`);
  }
  const fileSlug = (text: string) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pizza";
  /** Sul web (iPhone o browser) gli avvisi a orario arrivano dal Calendario del telefono. */
  function addRecipeToCalendar(recipe: Recipe) {
    const events = stagesToEvents(recipe.id, recipe.name, buildTimeline(recipe.config, flours));
    if (!events.length) {
      setMessage("Non ci sono fasi future da aggiungere al calendario.");
      return;
    }
    downloadCalendar(`pizzalab-${fileSlug(recipe.name)}.ics`, buildCalendar(`PizzaLab · ${recipe.name}`, events, leadMinutes));
    setMessage(
      `${events.length} fasi pronte: nel Calendario conferma «Aggiungi tutti» e riceverai un avviso ${leadMinutes ? `${leadMinutes} minuti prima di ogni fase` : "all’inizio di ogni fase"}.`,
    );
  }
  function addStarterToCalendar(profile: SourdoughProfile) {
    const events = starterReminderDates(profile, 14).map((at, index) => ({
      uid: `${profile.id}-feed-${at.getTime()}@pizzalab`,
      title: `PizzaLab · Rinfresca ${profile.name}`,
      description: index === 0 ? "Osserva il lievito e procedi con il rinfresco." : "Rinfresco programmato dalla routine del lievito.",
      start: at,
      end: new Date(at.getTime() + 15 * 60000),
    }));
    downloadCalendar(`pizzalab-lievito-${fileSlug(profile.name)}.ics`, buildCalendar(`PizzaLab · ${profile.name}`, events, leadMinutes));
    setMessage(`${events.length} rinfreschi pronti: nel Calendario conferma «Aggiungi tutti» per ricevere gli avvisi.`);
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
    setMessage(`Userai «${pan.name}» (${panSize(pan)}) per gli impasti in teglia.`);
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
            profileName: state.profileName,
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
    setMessage("Archivio esportato in formato JSON.");
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
      if (
        !recipes.length &&
        !customFlours.length &&
        !savedBlends.length &&
        !equipmentProfiles.length &&
        !sourdoughProfiles.length &&
        !bakeCalibrations.length &&
        !userOvens.length &&
        !userPans.length
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
        profileName: s.profileName || (typeof data.profileName === "string" ? data.profileName : ""),
      }));
      setMessage(
        `Importazione completata: ${recipes.length} ricette recuperate.`,
      );
    } catch {
      setMessage(
        "File non riconosciuto: usa un archivio JSON esportato da PizzaLab.",
      );
    }
  }
  async function shareRecipe(recipe: Recipe) {
    const r = calculate(recipe.config, flours);
    if (!r.ok) return;
    const flourLines = r.flourBreakdown
      .map(
        (item) =>
          `• ${item.name}: ${fmt(item.grams)} g (${fmt(item.percent, 1)}%)`,
      )
      .join("\n");
    const text = `${recipe.name}\n${r.style.name}\nFarina totale: ${fmt(r.flour)} g\n${flourLines}\nAcqua: ${fmt(r.water)} g · Sale: ${fmt(r.salt, 1)} g · Lievito: ${fmt(r.yeast, 2)} g.\nCottura: ${dateLabel(recipe.config.bakeAt)}.`;
    try {
      if (navigator.share) await navigator.share({ title: recipe.name, text });
      else {
        await navigator.clipboard.writeText(text);
        setMessage("Ricetta copiata negli appunti.");
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
        `${result.style.name} · ${new Date(cfg.bakeAt).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`,
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
        setMessage("Pizza salvata per dopo: la trovi nel diario, tra le salvate. Quando vuoi, premi «Programma» e partirà da sola all’orario impostato.");
      }
      openTab("diario");
    } catch {
      setStorageError("Piano non salvato: memoria locale non disponibile.");
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
            ? `Programmata! Si parte ${dateLabel(first.at)}. ${note}`
            : `Programmata! Si parte ${dateLabel(first.at)}: riceverai una notifica a ogni fase. ${note}`
          : `Si parte! ${note}`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Non riesco a programmare i promemoria.",
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
      setMessage("Impasto interrotto e promemoria cancellati: lo ritrovi tra le salvate.");
    } catch {
      setMessage("Cancellazione dei promemoria non riuscita. Riprova.");
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
      setMessage("Buon appetito! Ora dai un voto e, se vuoi, registra com’è andata la cottura.");
    } catch {
      setMessage("Non riesco a cancellare i promemoria. Riprova.");
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
        ? "Ricetta caricata: scegli la nuova data nel passaggio 2 e salva un nuovo piano."
        : mode === "reschedule"
          ? "Scegli una nuova data di cottura, poi conferma dal riepilogo."
          : `Stai modificando «${recipe.name}»: le modifiche si salvano dal riepilogo.`,
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
        ? "Profilo creato: registra tre rinfreschi per valutarne la forza."
        : "Percorso avviato. Il primo rinfresco è nella tua routine.",
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
        setMessage("Routine aggiornata, ma non ho potuto riprogrammare le notifiche."),
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
        ? "Tre crescite efficaci consecutive: il lievito è entrato nella fase matura."
        : `Rinfresco registrato. Prossimo controllo: ${dateLabel(updated.nextFeedAt)}.`,
    );
    if (updated.remindersEnabled)
      void scheduleStarterReminders(updated, leadMinutes).catch(() =>
        setMessage("Rinfresco salvato, ma non ho potuto aggiornare le notifiche."),
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
      setMessage(error instanceof Error ? error.message : "Non riesco ad attivare i promemoria.");
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
    setMessage("Promemoria del lievito madre disattivati.");
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
    setMessage("Lievito eliminato insieme ai suoi promemoria.");
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
        "Non riesco a cancellare i promemoria. Il piano è stato conservato.",
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
        setMessage("Tempi aggiornati, ma non ho potuto riprogrammare i promemoria."),
      );
  }
  async function changeLeadMinutes(minutes: number) {
    setState((s) => ({ ...s, reminderLeadMinutes: minutes }));
    const label = minutes ? `${minutes} minuti prima di ogni fase` : "all’orario esatto di ogni fase";
    try {
      const running = state.recipes.find((r) => r.id === state.activeId);
      if (running) await scheduleReminders(running, minutes);
      for (const profile of state.sourdoughProfiles.filter((item) => item.remindersEnabled))
        await scheduleStarterReminders(profile, minutes);
      setMessage(`Ti avviserò ${label}.`);
    } catch {
      setMessage(`Impostazione salvata (${label}), ma non ho potuto aggiornare le notifiche già programmate.`);
    }
  }
  function saveCalibration(recipe: Recipe, calibration: BakeCalibration) {
    setState((s) => ({
      ...s,
      bakeCalibrations: [calibration, ...s.bakeCalibrations.filter((item) => item.id !== calibration.id)].slice(0, 100),
      recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...r, calibrationId: calibration.id } : r)),
    }));
    setMessage("Taratura salvata: le prossime previsioni di cottura con questo forno terranno conto del risultato reale.");
  }
  const isPan = styles.find((s) => s.id === c.styleId)?.pan;
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
        <p>Prepariamo il banco…</p>
      </div>
    );
  return (
    <div className={`app-shell tab-${tab}`}>
      <nav className="app-nav" aria-label="Navigazione principale">
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
              aria-label={n.label}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => (n.id === "diario" ? openDiary() : openTab(n.id))}
            >
              <span className="nav-icon">
                <n.icon size={22} weight={tab === n.id ? "fill" : "regular"} />
                {n.id === "diario" && state.recipes.length > 0 && (
                  <small className="nav-badge">{state.recipes.length}</small>
                )}
              </span>
              <span className="nav-label nav-label-long">{n.label}</span>
              <span className="nav-label nav-label-short">{n.short}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <Leaf size={18} />
          <p>
            <strong>I tuoi dati restano sul dispositivo.</strong> Nessun account,
            funziona anche offline.
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
            {nav.find((n) => n.id === tab)?.label}
          </span>
          <div className="topbar-actions">
            {active && tab !== "diario" && (
              <button
                className="live-chip"
                onClick={() => openDiary()}
                aria-label={`Impasto in corso: ${active.name}`}
              >
                <span className="live-dot" aria-hidden="true" />
                <span>In corso</span>
              </button>
            )}
            <button
              className={`profile-button ${tab === "profilo" ? "active" : ""}`}
              aria-label="Profilo"
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
              <span>Impara</span>
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
                    Ricarica l’app per riprovare. Il salvataggio è sospeso per
                    proteggere l’archivio.
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
                aria-label="Chiudi messaggio"
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
                  <span className="eyebrow">Il tuo laboratorio della pizza</span>
                  <h1>
                    Progetta. Impasta. <span>Perfeziona.</span>
                  </h1>
                  <p>
                    Scegli lo stile e segui i quattro passaggi: dosi, tempi e
                    promemoria li calcola PizzaLab per te.
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
                    <small>Impasto in corso · {active.name}</small>
                    <strong>
                      {activeNext
                        ? `${activeNext.title} · ${dateLabel(activeNext.at)}`
                        : "Tabella di marcia terminata. Com’è andata?"}
                    </strong>
                  </div>
                  <ArrowRight />
                </button>
              )}
              <section className="style-section">
                <div className="section-title">
                  <h2>Che pizza ti va?</h2>
                  <span>Tocca uno stile: dosi e tempi si impostano da soli.</span>
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
                      <strong>{s.name}</strong>
                      <small>{styleTaglines[s.id] ?? (s.pan ? "Da condividere" : "Il grande classico")}</small>
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
                  aria-label="Dosi rapide"
                >
                  <div>
                    <small>Farina</small>
                    <strong>
                      {fmt(result.flour)} <span>g</span>
                    </strong>
                  </div>
                  <div>
                    <small>Acqua</small>
                    <strong>
                      {fmt(result.water)} <span>g</span>
                    </strong>
                  </div>
                  <div>
                    <small>{["sourdough", "licoli"].includes(c.yeast) ? "Madre" : "Lievito"}</small>
                    <strong>
                      {fmt(result.yeast, ["sourdough", "licoli"].includes(c.yeast) ? 0 : 2)} <span>g</span>
                    </strong>
                  </div>
                  <div className="dose-salt">
                    <small>Sale</small>
                    <strong>
                      {fmt(result.salt, 1)} <span>g</span>
                    </strong>
                  </div>
                  <button
                    aria-label="Vai al riepilogo della ricetta"
                    onClick={() => goToPlannerStage("summary")}
                  >
                    <span>Riepilogo</span>
                    <ArrowRight weight="bold" />
                  </button>
                </div>
              )}
              <span id="planner-anchor" className="planner-anchor" aria-hidden="true" />
              <nav id="planner-steps" className="planner-steps" aria-label="Fasi di progettazione">
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
                      <strong>{label}</strong>
                      <small>{detail}</small>
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
                        <strong>Controlla questi valori</strong>
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
                          <h2>La base giusta</h2>
                          <p>Farina e quantità, come piacciono a te.</p>
                        </div>
                      </div>
                      <FlourPicker
                        label="La tua farina"
                        value={c.flourId}
                        flours={flours}
                        onChange={(value) => update("flourId", value)}
                      />
                      <div className="flour-selected-meta">
                        <span>
                          {selectedFlour?.w
                            ? `W ${selectedFlour.w.join("–")}`
                            : "W non disponibile"}
                        </span>
                        <HelpTip topic="forza" />
                        <span>
                          {selectedFlour?.protein !== null &&
                          selectedFlour?.protein !== undefined
                            ? `${fmt(selectedFlour.protein, 1)}% proteine`
                            : "Proteine n.d."}
                        </span>
                        <button onClick={() => openTab("farine")}>
                          Esplora le farine <ArrowRight />
                        </button>
                      </div>
                      <details className="blend-details">
                        <summary>
                          <span>
                            <b>Miscela di farine</b>
                            <small>
                              {c.secondFlourId
                                ? `${result.ok ? result.flourBreakdown.length : 2} farine in miscela`
                                : "Una sola farina · aggiungine fino ad altre tre"}
                            </small>
                            <em className="optional-badge">Facoltativo</em>
                          </span>
                        </summary>
                        <div className="blend-section">
                        <p>Vuoi mescolare più farine? Aggiungine fino ad altre tre e scegli la quota di ciascuna. <HelpTip topic="miscela" /></p>
                        <div className="field-grid blend-fields">
                            <FlourPicker
                              label="Seconda farina"
                              value={c.secondFlourId}
                              flours={flours}
                              allowEmpty
                              emptyLabel="Una sola farina"
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
                                label="Quota seconda farina"
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
                                label="Terza farina"
                                value={c.thirdFlourId}
                                flours={flours}
                                allowEmpty
                                emptyLabel="Nessuna terza farina"
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
                                label="Quota terza farina"
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
                                label="Quarta farina"
                                value={c.fourthFlourId}
                                flours={flours}
                                allowEmpty
                                emptyLabel="Nessuna quarta farina"
                                onChange={(value) => {
                                  update("fourthFlourId", value);
                                  if (!value) update("fourthFlourPercent", 0);
                                }}
                              />
                            )}
                            {c.fourthFlourId && (
                              <NumberField
                                label="Quota quarta farina"
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
                          label={isPan ? "Numero di teglie" : "Numero di pizze"}
                          value={c.count}
                          onChange={(v) => update("count", v)}
                          min={1}
                          max={30}
                        />
                        {!isPan && (
                          <NumberField
                            label="Peso del panetto"
                            value={c.ballWeight}
                            onChange={(v) => update("ballWeight", v)}
                            min={100}
                            max={2000}
                            step={10}
                            unit="g"
                            hint="Il peso di ogni pallina di impasto."
                          />
                        )}
                      </div>
                      {isPan && (state.userPans ?? []).length > 0 && (
                        <div className="my-ovens-picker pan-picker">
                          <span>Le tue teglie</span>
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
                          Hai più teglie? Salvale nel <button className="text-button inline-link" aria-label="Apri il profilo" onClick={() => openTab("profilo")}>Profilo</button> e le sceglierai con un tocco.
                        </p>
                      )}
                      {isPan && (
                        <div className="method-toggle pan-shape-toggle" role="group" aria-label="Forma della teglia">
                          <button
                            className={c.panShape !== "round" ? "selected" : ""}
                            aria-pressed={c.panShape !== "round"}
                            onClick={() => update("panShape", "rect")}
                          >
                            <span className="shape-icon rect" aria-hidden="true" /> Rettangolare
                          </button>
                          <button
                            className={c.panShape === "round" ? "selected" : ""}
                            aria-pressed={c.panShape === "round"}
                            onClick={() => updateMany({ panShape: "round", pizzaDiameter: c.panDiameter })}
                          >
                            <span className="shape-icon round" aria-hidden="true" /> Tonda
                          </button>
                        </div>
                      )}
                      {isPan && (
                        <div className="field-grid">
                          {c.panShape === "round" ? (
                            <NumberField
                              label="Diametro teglia"
                              value={c.panDiameter}
                              onChange={(v) => update("panDiameter", v)}
                              min={14}
                              max={60}
                              unit="cm"
                              hint="Misurato sul fondo, da bordo interno a bordo interno."
                            />
                          ) : (
                            <>
                              <NumberField
                                label="Larghezza teglia"
                                value={c.panWidth}
                                onChange={(v) => update("panWidth", v)}
                                min={10}
                                max={80}
                                unit="cm"
                              />
                              <NumberField
                                label="Lunghezza teglia"
                                value={c.panLength}
                                onChange={(v) => update("panLength", v)}
                                min={10}
                                max={100}
                                unit="cm"
                              />
                            </>
                          )}
                          <NumberField
                            label="Impasto per superficie"
                            help="superficie"
                            value={c.panDensity}
                            onChange={(v) => update("panDensity", v)}
                            min={0.3}
                            max={1}
                            step={0.05}
                            unit="g/cm²"
                            hint="0,6 è un punto di partenza; aumenta per una pizza più alta."
                          />
                        </div>
                      )}
                      <div className="hydration-field">
                        <SliderField
                          label="Idratazione"
                          help="idratazione"
                          value={c.hydration}
                          onChange={(v) => update("hydration", v)}
                          min={45}
                          max={90}
                          step={1}
                          unit="%"
                          hint="Acqua ogni 100 g di farina: 65% = 650 g d’acqua per 1 kg. Più bassa è più facile da lavorare; più alta dà una pizza ariosa ma più impegnativa."
                        />
                      </div>
                      {result.ok && (
                        <HydrationChart
                          value={c.hydration}
                          style={currentStyle}
                          w={result.w}
                        />
                      )}
                      <details className="extras-details">
                        <summary>
                          <span>
                            Ingredienti aggiuntivi
                            <small>
                              Sale {fmt(c.salt, 1)}% · Olio {fmt(c.oil, 1)}% · Zucchero {fmt(c.sugar, 1)}% · Malto {fmt(c.malt, 1)}%
                            </small>
                            <em className={`optional-badge ${extrasMatch ? "saved-badge" : ""}`}>
                              {extrasMatch ? "Come da ricetta" : "Personalizzati"}
                            </em>
                          </span>
                        </summary>
                        <div className="extras-content">
                          <p className="field-explainer">
                            <Info size={16} />
                            <span>
                              Per la <strong>{currentStyle.name}</strong> la ricetta prevede sale {fmt(recommended.salt, 1)}%
                              {recommended.oil ? `, olio ${fmt(recommended.oil, 1)}%` : ", niente olio"}
                              {recommended.sugar ? `, zucchero ${fmt(recommended.sugar, 1)}%` : ""}
                              {recommended.malt ? ` e malto ${fmt(recommended.malt, 1)}% (facoltativo)` : ""}. Le percentuali sono calcolate sul peso della farina.
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
                              <Sparkle /> Usa i valori della ricetta
                            </button>
                          )}
                          <div className="field-grid">
                          <NumberField
                            label="Sale sulla farina"
                            hint={`Consigliato: ${fmt(recommended.salt, 1)}%`}
                            value={c.salt}
                            onChange={(v) => update("salt", v)}
                            min={0}
                            max={4}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label="Olio sulla farina"
                            hint={recommended.oil ? `Consigliato: ${fmt(recommended.oil, 1)}%` : "Questo stile non lo prevede"}
                            value={c.oil}
                            onChange={(v) => update("oil", v)}
                            min={0}
                            max={10}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label="Zucchero sulla farina"
                            hint={recommended.sugar ? `Consigliato: ${fmt(recommended.sugar, 1)}%` : "Questo stile non lo prevede"}
                            value={c.sugar}
                            onChange={(v) => update("sugar", v)}
                            min={0}
                            max={15}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label="Malto diastatico"
                            hint={recommended.malt ? `Facoltativo · la ricetta ne prevede ${fmt(recommended.malt, 1)}%` : "Facoltativo · questo stile non lo prevede"}
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
                                <strong>Il malto è facoltativo</strong>
                                <p>
                                  La ricetta {currentStyle.name} ne prevede {fmt(recommended.malt, 1)}% ({fmt((result.flour * recommended.malt) / 100, 1)} g): aiuta colore e
                                  morbidezza, ma è difficile da trovare e si può omettere senza problemi.
                                </p>
                                <button className="text-button" onClick={() => update("malt", recommended.malt)}>
                                  Ce l’ho: aggiungilo
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
                          <h2>Il tempo fa la sua parte</h2>
                          <p>Fasi calde e fredde, con i ritmi che scegli tu.</p>
                        </div>
                      </div>
                      <div className="planning-mode-card">
                        <div>
                          <span className="eyebrow">COME VUOI PIANIFICARE? <HelpTip topic="pianificazione" /></span>
                          <strong>{c.planMode === "automatic" ? "L’app costruisce il piano" : "Decidi tu ogni fase"}</strong>
                          <p>{c.planMode === "automatic" ? "Indica quando inizi e quando vuoi mangiare: tempi e lievito li calcola PizzaLab." : "Scegli tu le ore di ogni riposo. Consigliato se conosci già il tuo impasto."}</p>
                        </div>
                        <div className="method-toggle" aria-label="Modalità di pianificazione">
                          <button
                            className={c.planMode !== "automatic" ? "selected" : ""}
                            aria-pressed={c.planMode !== "automatic"}
                            onClick={() => update("planMode", "date")}
                          >
                            <Timer /> Manuale
                          </button>
                          <button
                            className={c.planMode === "automatic" ? "selected" : ""}
                            aria-pressed={c.planMode === "automatic"}
                            onClick={() => updateMany({ planMode: "automatic", yeastMode: "auto" })}
                          >
                            <Sparkle /> Automatica
                          </button>
                        </div>
                      </div>
                      {c.planMode === "automatic" && (
                        <div className="automatic-window">
                          <div className="automatic-dates">
                            <label className="field">
                              Voglio iniziare
                              <input type="datetime-local" value={c.startAt} onChange={(e) => update("startAt", e.target.value)} />
                            </label>
                            <label className="field">
                              Voglio mangiare
                              <input type="datetime-local" value={c.bakeAt} onChange={(e) => update("bakeAt", e.target.value)} />
                            </label>
                          </div>
                          {automaticPlan.ok ? (
                            <>
                              <div className="automatic-phase-grid">
                                <div><span>PUNTATA</span><strong>{durationLabel(c.bulkHours)}</strong><small>fuori frigo</small></div>
                                <div className="cold"><span>FRIGO</span><strong>{c.coldHours > 0 ? durationLabel(c.coldHours) : "—"}</strong><small>{c.coldHours > 0 ? "massa coperta" : "non necessario"}</small></div>
                                <div><span>APPRETTO</span><strong>{durationLabel(c.proofHours)}</strong><small>prima del forno</small></div>
                                <div className="yeast"><span>LIEVITO CALCOLATO</span><strong>{result.ok ? `${fmt(result.yeast, 2)} g` : "—"}</strong><small>{c.yeast === "fresh" ? "fresco" : c.yeast === "instant" ? "secco" : "coltura naturale"}</small></div>
                              </div>
                              <p className="automatic-plan-note"><Sparkle /> {(["sourdough", "licoli"] as DoughConfig["yeast"][]).includes(c.yeast) ? "Orari e dose della coltura si aggiornano insieme; la vitalità reale del lievito madre va sempre verificata dalla crescita." : "Orari e lievito si aggiornano insieme in base a stile, temperature, pieghe e lavorazioni."}</p>
                            </>
                          ) : (
                            <div className="notice warning"><Warning /><div><strong>Finestra non compatibile</strong><p>{automaticPlan.error}</p></div></div>
                          )}
                        </div>
                      )}
                      {c.planMode !== "automatic" && (
                        <>
                      <div
                        className="method-toggle"
                        aria-label="Metodo di maturazione"
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
                          <Snowflake /> Con passaggio in frigo
                        </button>
                        <button
                          className={c.coldHours === 0 ? "selected" : ""}
                          aria-pressed={c.coldHours === 0}
                          onClick={() => update("coldHours", 0)}
                        >
                          <Leaf /> Tutto fuori frigo
                        </button>
                      </div>
                      <div className="time-fields slider-time-fields">
                        <SliderField
                          label="Puntata fuori frigo"
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
                              ? `Minimo ${durationLabel((c.foldCount * c.foldIntervalMinutes) / 60)} per completare le pieghe`
                              : "Primo riposo dell’impasto intero, prima di dividerlo in panetti"
                          }
                        />
                        {c.coldHours > 0 && (
                          <SliderField
                            label="Riposo in frigo"
                            help="frigo"
                            value={c.coldHours}
                            onChange={(v) => update("coldHours", v)}
                            min={MIN_COLD_HOURS}
                            max={96}
                            sliderMax={Math.max(72, c.coldHours)}
                            step={0.5}
                            unit="ore"
                            hint={`Almeno ${MIN_COLD_HOURS} ore: con meno l’impasto fa appena in tempo a raffreddarsi. Se hai poco tempo scegli «Tutto fuori frigo».`}
                          />
                        )}
                        <SliderField
                          label="Appretto fuori frigo"
                          help="appretto"
                          value={c.proofHours}
                          onChange={(v) => update("proofHours", v)}
                          min={0}
                          max={24}
                          sliderMax={Math.max(12, c.proofHours)}
                          step={0.5}
                          unit="ore"
                          hint="Ultimo riposo dei panetti già formati, prima di stendere"
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
                        <span>Puntata {durationLabel(c.bulkHours)}</span>
                        {c.coldHours > 0 && <span className="cold">Frigo {durationLabel(c.coldHours)}</span>}
                        <span className="proof">Appretto {durationLabel(c.proofHours)}</span>
                      </div>
                      <div className="time-total">
                        <span>Tempo di fermentazione</span>
                        <strong>
                          {result.ok ? durationLabel(result.hours) : "—"}{" "}
                          <small>+ 20 min di impasto</small>
                        </strong>
                      </div>
                        </>
                      )}
                      <div className="field-grid temperature-fields slider-temperature-fields">
                        <SliderField
                          label="Temperatura ambiente"
                          value={c.roomTemp}
                          onChange={(v) => update("roomTemp", v)}
                          min={10}
                          max={35}
                          unit="°C"
                          hint="Dove lievita l’impasto"
                        />
                        {c.coldHours > 0 && (
                          <SliderField
                            label="Temperatura del frigo"
                            value={c.fridgeTemp}
                            onChange={(v) => update("fridgeTemp", v)}
                            min={1}
                            max={12}
                            unit="°C"
                          />
                        )}
                        <SelectSheet
                          label="Lievito"
                          help="lievito"
                          value={c.yeast}
                          options={[
                            { value: "fresh", label: "Di birra fresco", description: "Il panetto del banco frigo" },
                            { value: "instant", label: "Secco istantaneo", description: "In bustina, circa 3 volte più concentrato" },
                            { value: "sourdough", label: "Pasta madre solida", description: "Lievito naturale, idratazione circa 50%" },
                            { value: "licoli", label: "Licoli", description: "Lievito naturale liquido, idratazione 100%" },
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
                          <h2>Quando si mangia?</h2>
                          <p>Da qui costruiamo la tua tabella di marcia.</p>
                        </div>
                      </div>
                      {c.planMode !== "automatic" ? (
                        <label className="field">
                          Giorno e ora della prima infornata
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
                            <span>PIANO AUTOMATICO</span>
                            <strong>{dateLabel(c.startAt)} → {dateLabel(c.bakeAt)}</strong>
                          </div>
                        </div>
                      )}
                      {timeline[0] && (
                        <div className={`plan-window ${startPast ? "is-late" : ""}`}>
                          <Clock />
                          <div>
                            <span>Inizi a impastare</span>
                            <strong>{dateLabel(timeline[0].at)}</strong>
                            <small>La tabella di marcia completa è nel riepilogo (passaggio 4).</small>
                          </div>
                        </div>
                      )}
                      {startPast && (
                        <div className="notice warning">
                          <Warning />
                          <div>
                            <strong>L’inizio del piano è già passato</strong>
                            <p>
                              Sposta la cottura in avanti o riduci i tempi per
                              poter seguire tutte le fasi.
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
                          <h2>Il tuo programma</h2>
                          <p>Controlla tempi e dosi. Poi scegli: inizi subito con i promemoria o lo salvi per un altro giorno.</p>
                        </div>
                      </div>
                      {editingRecipe && (
                        <div className="notice editing-notice">
                          <PencilSimple />
                          <div>
                            <strong>Stai modificando «{editingRecipe.name}»</strong>
                            <p>Salvando aggiorni la pizza già presente nel diario, senza crearne una nuova.</p>
                          </div>
                        </div>
                      )}
                      <div className="summary-facts">
                        <div><span>Inizi</span><strong>{timeline[0] ? dateLabel(timeline[0].at) : "—"}</strong></div>
                        <div><span>Inforni</span><strong>{dateLabel(c.bakeAt)}</strong></div>
                        <div><span>Lievitazione</span><strong>{result.ok ? durationLabel(result.hours) : "—"}</strong></div>
                        <div><span>{isPan ? "Teglie" : "Pizze"}</span><strong>{c.count} · {currentStyle.name}</strong></div>
                      </div>
                      {startPast && (
                        <div className="notice warning">
                          <Warning />
                          <div>
                            <strong>L’inizio del piano è già passato</strong>
                            <p>Per iniziare adesso torna al passaggio 2 e sposta la cottura più avanti. Puoi comunque salvarla per dopo.</p>
                          </div>
                        </div>
                      )}
                      <h3 className="summary-subtitle">Tabella di marcia</h3>
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
                          <ChefHat /> Il consiglio di PizzaLab
                        </h3>
                      </div>
                      {result.advice.length === 0 ? (
                        <div className="advice info">
                          <CheckCircle />
                          <div>
                            <strong>Un buon punto di partenza</strong>
                            <p>
                              I parametri rientrano nei riferimenti del
                              calcolatore. Osserva comunque l’impasto durante la
                              lievitazione.
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
                            </div>
                          </div>
                        ))
                      )}
                      <div className="style-tip">
                        <Leaf />
                        <p>{result.style.tip}</p>
                      </div>
                      <small className="bake-note">
                        {result.style.bake} I tempi dipendono da forno, supporto
                        e condimento.
                      </small>
                    </div>
                  )}
                  {plannerStage !== "summary" && (
                    <div className="step-footer">
                      {plannerStage !== "dough" && (
                        <button className="button secondary step-back" onClick={() => goToPlannerStage(plannerStage === "baking" ? "fermentation" : "dough")}>
                          <ArrowLeft /> Indietro
                        </button>
                      )}
                      {plannerStage === "dough" && (
                        <button className="journey-next" onClick={() => goToPlannerStage("fermentation")}>
                          <span><small>Passaggio 2 di 4</small><strong>Passa a lievitazione</strong></span>
                          <ArrowRight weight="bold" />
                        </button>
                      )}
                      {plannerStage === "fermentation" && (
                        <button className="journey-next" onClick={() => goToPlannerStage("baking")}>
                          <span><small>Passaggio 3 di 4</small><strong>Passa a cottura</strong></span>
                          <ArrowRight weight="bold" />
                        </button>
                      )}
                      {plannerStage === "baking" && (
                        <button className="journey-next" onClick={() => goToPlannerStage("summary")}>
                          <span><small>Passaggio 4 di 4</small><strong>Vai al riepilogo</strong></span>
                          <ArrowRight weight="bold" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {plannerStage === "summary" && (
                <aside className="recipe-sidebar" id="recipe-summary">
                  <div className="recipe-sheet">
                    <span className="eyebrow">IL TUO IMPASTO</span>
                    <div className="recipe-title">
                      <h2>{styles.find((s) => s.id === c.styleId)?.name}</h2>
                      <Pizza size={35} weight="duotone" />
                    </div>
                    <p>
                      {result.ok
                        ? `${c.count} ${isPan ? "teglie" : "panetti"} da ${fmt(result.unitWeight)} g`
                        : "Completa i valori del piano"}
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
                            {c.ovenTemp} °C
                          </span>
                        </div>
                        <div className="flour-total">
                          <span>FARINA TOTALE</span>
                          <strong>
                            {fmt(result.flour)}
                            <small> g</small>
                          </strong>
                          <div className="flour-breakdown">
                            {result.flourBreakdown.map((item) => (
                              <div key={item.id}>
                                <span>{item.name}</span>
                                <strong>
                                  {fmt(item.grams)} g{" "}
                                  <small>· {fmt(item.percent, 1)}%</small>
                                </strong>
                              </div>
                            ))}
                          </div>
                          {result.flourBreakdown.length > 1 && (
                            <small className="w-average">
                              W medio indicativo:{" "}
                              {result.w === null ? "n.d." : fmt(result.w)}
                            </small>
                          )}
                        </div>
                        <div className="ingredients">
                          {[
                            ["Acqua totale", result.water, 0],
                            ["Sale", result.salt, 1],
                            [
                              c.yeast === "sourdough"
                                ? "Pasta madre"
                                : c.yeast === "licoli"
                                  ? "Licoli"
                                  : `Lievito ${c.yeast === "fresh" ? "fresco" : "secco"}`,
                              result.yeast,
                              ["sourdough", "licoli"].includes(c.yeast) ? 0 : 2,
                            ],
                            ...(result.oil > 0
                              ? [["Olio", result.oil, 1]]
                              : []),
                            ...(result.sugar > 0
                              ? [["Zucchero", result.sugar, 1]]
                              : []),
                            ...(result.malt > 0
                              ? [["Malto", result.malt, 1]]
                              : []),
                          ].map(([label, value, digits]) => (
                            <div key={label}>
                              <span>{label}</span>
                              <strong>
                                {fmt(Number(value), Number(digits))}
                                <small> g</small>
                              </strong>
                            </div>
                          ))}
                        </div>
                        {result.starter.active && (
                          <div className="phase-note">
                            <strong>
                              {c.yeast === "licoli" ? "Licoli" : "Pasta madre"}{" "}
                              · {fmt(result.starter.grams)} g
                            </strong>
                            <span>
                              Contiene {fmt(result.starter.flour)} g farina +{" "}
                              {fmt(result.starter.water)} g acqua
                            </span>
                            <small>
                              Le quantità di farina e acqua da pesare sono già
                              state ridotte correttamente.
                            </small>
                          </div>
                        )}
                        {c.autolyse && (
                          <div className="phase-note">
                            <strong>Autolisi · {c.autolyseMinutes} min</strong>
                            <span>
                              {fmt(result.autolyse.flour)} g farina +{" "}
                              {fmt(result.autolyse.water)} g acqua
                            </span>
                            <small>
                              {fmt(result.autolyse.reservedWater)} g d’acqua
                              restano per lievito e inserimento graduale.
                            </small>
                          </div>
                        )}
                        {c.preferment !== "none" && (
                          <div className="phase-note">
                            <strong>
                              {c.preferment} · {result.preferment.maturity}
                            </strong>
                            <span>
                              {fmt(result.preferment.flour)} g farina +{" "}
                              {fmt(result.preferment.water)} g acqua
                            </span>
                            <small>
                              {fmt(result.preferment.yeast, 2)} g lievito nel
                              prefermento.
                            </small>
                          </div>
                        )}
                        <div className="phase-note baking-note">
                          <strong>
                            Cottura · {c.bakeMinutes} min a {c.ovenTemp} °C
                          </strong>
                          <span>
                            Crosta {result.bakeOutcome.crustLabel.toLowerCase()} · mollica {result.bakeOutcome.crumbLabel.toLowerCase()} · fondo {result.bakeOutcome.baseLabel.toLowerCase()}
                          </span>
                          <small>
                            {ovenById(c.ovenType).fixedRack
                              ? ovenById(c.ovenType).name
                              : `Posizione nel forno: ${
                                  c.ovenRack === "bottom"
                                    ? "bassa"
                                    : c.ovenRack === "lower-middle"
                                      ? "medio-bassa"
                                      : c.ovenRack === "middle"
                                        ? "centrale"
                                        : c.ovenRack === "upper-middle"
                                          ? "medio-alta"
                                          : "alta"
                                }`}
                            {" "}· {bakeSurfaceLabels[c.bakeSurface]}.
                          </small>
                        </div>
                        <div className="total-weight">
                          <span>Impasto totale</span>
                          <strong>{fmt(result.total)} g</strong>
                        </div>
                        <div className="yeast-note">
                          <Info />
                          <span>
                            Lievito stimato: verifica la crescita reale. Le
                            quantità mostrate sono arrotondate.
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="notice warning" role="alert">
                        <Warning />
                        <div>
                          <strong>Controlla questi valori</strong>
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
                      <span className="eyebrow">Passaggio 4 di 4 · Tutto pronto?</span>
                      <h2 id="final-save-title">Partiamo o lo salvi per dopo?</h2>
                      <label className="field recipe-name">
                        Nome del piano
                        <input maxLength={80} value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Es. La pizza del sabato" />
                      </label>
                      <div className="final-choice">
                        <button
                          className="button primary full final-start-button"
                          disabled={loadError || !result.ok || timing === "expired" || busy}
                          onClick={() => (timing === "late" ? setLateStart({ source: "planner" }) : void saveRecipe("start"))}
                        >
                          {timing === "future" ? <><CalendarCheck /> Programma</> : timing === "late" ? <><Clock /> Parti adesso</> : <><Bell /> Inizia ora</>}
                        </button>
                        <p>
                          {timing === "future"
                            ? usesCalendarReminders()
                              ? `Partirà da sola ${timeline[0] ? dateLabel(timeline[0].at) : ""}. Nel diario, tra quelle «In corso», potrai aggiungere le fasi al Calendario per ricevere gli avvisi.`
                              : `Partirà da sola ${timeline[0] ? dateLabel(timeline[0].at) : ""}: riceverai una notifica a ogni fase${leadMinutes ? `, ${leadMinutes} minuti prima` : ""}. La trovi nel diario tra quelle «In corso».`
                            : timing === "now"
                              ? "È l’ora giusta: si parte subito e ricevi una notifica a ogni fase. Bilancia e guida passo passo ti aspettano nel diario."
                              : timing === "late"
                                ? "L’orario di inizio è già passato: puoi partire adesso spostando la cena, oppure mantenerla e ricalcolare lievito e tempi."
                                : "Anche l’orario di cottura è passato: scegli una nuova data al passaggio 2, oppure salvala per dopo."}
                        </p>
                        {timing !== "expired" && activeRecipe && activeRecipe.id !== editingId && (
                          <p className="replace-note"><Warning /> Hai già «{activeRecipe.name}» in corso: {timing === "future" ? "programmando" : "iniziando"} questa, l’altra tornerà tra le salvate.</p>
                        )}
                      </div>
                      <div className="final-choice">
                        <button className="button secondary full final-save-button" disabled={loadError || !result.ok || busy} onClick={() => void saveRecipe("later")}>
                          <BookmarkSimple /> {editingRecipe ? "Salva le modifiche" : "Salva per dopo"}
                        </button>
                        <p>Nessun promemoria per ora: la ritrovi nel diario, tra le «Salvate», e la avvii quando vuoi.</p>
                      </div>
                      <button className="text-button step-back-link" onClick={() => goToPlannerStage("baking")}>
                        <ArrowLeft /> Torna alla cottura
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
                setMessage("Farina personale aggiunta.");
              }}
            />
          )}
          {tab === "condimenti" && (
            <>
              <div className="page-heading toppings-heading">
                <div>
                  <span className="eyebrow">DOPO L’IMPASTO, IL GUSTO</span>
                  <h1>Condimenti.</h1>
                  <p>
                    Quantità, bilanciamento e ordine di aggiunta in uno spazio
                    dedicato.
                  </p>
                </div>
                <div className="heading-illustration" aria-hidden="true">
                  <Pizza weight="duotone" />
                  <span>
                    Parti dal tuo stile
                    <br />e completa la pizza.
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
                    <strong>Prima completa l’impasto</strong>
                    <p>
                      Le quantità dei condimenti dipendono dal numero e dalla
                      dimensione delle pizze.
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
                setMessage(`Forno «${oven.name}» salvato: lo trovi anche nel passaggio Cottura.`);
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
                setMessage(`Userai «${oven.name}» per i prossimi impasti.`);
              }}
              onAddPan={(pan) => {
                setState((s) => ({ ...s, userPans: [...(s.userPans ?? []), pan] }));
                setMessage(`Teglia «${pan.name}» salvata: la ritrovi negli stili in teglia.`);
              }}
              onDeletePan={(id) => setState((s) => ({ ...s, userPans: (s.userPans ?? []).filter((item) => item.id !== id) }))}
              onUsePan={usePan}
              onMixerChange={(patch) => updateMany(patch)}
              onExport={exportArchive}
              onImport={(file) => void importArchive(file)}
              onShowTutorial={() => setTutorialOpen(true)}
              onLeadChange={(minutes) => void changeLeadMinutes(minutes)}
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
            <span>PizzaLab</span> Fatto per chi ama mettere le mani in pasta.
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
            <h2 id="delete-title">Eliminare questo piano?</h2>
            <p>
              Verranno rimossi ricetta, appunti e gli eventuali promemoria
              attivi.
            </p>
            <div>
              <button
                autoFocus
                className="button secondary"
                onClick={() => setDeleteId(null)}
              >
                Conserva
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => void deleteRecipe(deleteId)}
              >
                Elimina piano
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
