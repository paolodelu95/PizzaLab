import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  Notebook,
  Pizza,
  Play,
  Scales as Scale,
  Snowflake,
  Star,
  Timer,
  Trash,
  UploadSimple,
  Warning,
  Grains as Wheat,
  X,
} from "@phosphor-icons/react";
import { catalog } from "./data/catalog";
import {
  bakeSurfaceLabels,
  buildTimeline,
  calculate,
  validateConfig,
} from "./domain/calculator";
import {
  bakingDefaults,
  defaultConfig,
  localDateTime,
  styles,
} from "./domain/styles";
import type {
  DoughConfig,
  Flour,
  Recipe,
  StarterFeeding,
  StoredState,
} from "./domain/types";
import { NumberField, Stepper } from "./components/Fields";
import { FlourPicker } from "./components/FlourPicker";
import { FlourLibrary } from "./components/FlourLibrary";
import { Guide } from "./components/Guide";
import { HydrationChart, YeastChart } from "./components/DoughCharts";
import { AdvancedPlanner } from "./components/AdvancedPlanner";
import { DoughAnalysis } from "./components/DoughAnalysis";
import { BlendManager } from "./components/BlendManager";
import { InsightsDashboard } from "./components/InsightsDashboard";
import { ovenProfiles } from "./data/ovens";
import { TemperatureLog } from "./components/TemperatureLog";
import { ToppingPlanner } from "./components/ToppingPlanner";
import { DoughRescue } from "./components/DoughRescue";
import { EquipmentProfiles } from "./components/EquipmentProfiles";
import { GuidedMode } from "./components/GuidedMode";
import { ScaleMode, type ScaleItem } from "./components/ScaleMode";
import { BakingPlanner } from "./components/BakingPlanner";
import { SourdoughCare } from "./components/SourdoughCare";
import { StarterDoughLink } from "./components/StarterDoughLink";
import { FermentationCheck } from "./components/FermentationCheck";
import { emptyState, readState, writeState } from "./services/storage";
import {
  cancelReminders,
  cancelStarterReminders,
  scheduleReminders,
  scheduleStarterReminders,
} from "./services/notifications";
import {
  addStarterFeeding,
  createStarterProfile,
  nextStarterFeedAt,
} from "./domain/sourdough";
import pizzaLabLogo from "./assets/pizzalab-logo.png";

type Tab = "impasto" | "farine" | "condimenti" | "madre" | "diario" | "guida";
type PlannerStage = "dough" | "fermentation" | "baking";
const nav = [
  { id: "impasto", label: "Il tuo impasto", icon: CookingPot },
  { id: "farine", label: "Farine", icon: Wheat },
  { id: "condimenti", label: "Condimenti", icon: Pizza },
  { id: "madre", label: "Lievito madre", icon: Jar },
  { id: "diario", label: "Diario", icon: Notebook },
  { id: "guida", label: "Impara", icon: BookOpen },
] as const;
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
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
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
  const timeline = useMemo(() => buildTimeline(c, flours), [c, flours]);
  const currentStyle = styles.find((s) => s.id === c.styleId)!;
  const active = state.recipes.find((r) => r.id === state.activeId);
  const activeNext = active
    ? buildTimeline(active.config).find((s) => new Date(s.at).getTime() > now)
    : undefined;
  const scaleItems: ScaleItem[] = result.ok
    ? [
        ...result.mainFlourBreakdown.map((item) => ({
          label: item.name,
          grams: item.grams,
          note: "Farina da aggiungere direttamente all’impasto.",
        })),
        ...(c.preferment !== "none"
          ? [
              {
                label: `Farina per ${c.preferment}`,
                grams: result.preferment.flour,
              },
            ]
          : []),
        {
          label: "Acqua da aggiungere",
          grams: result.waterToWeigh,
          note: c.autolyse
            ? `${fmt(result.autolyse.water)} g nell’autolisi e ${fmt(result.autolyse.reservedWater)} g di riserva.`
            : undefined,
        },
        {
          label:
            c.yeast === "sourdough"
              ? "Pasta madre"
              : c.yeast === "licoli"
                ? "Licoli"
                : `Lievito ${c.yeast === "fresh" ? "fresco" : "secco"}`,
          grams: result.yeast,
        },
        { label: "Sale", grams: result.salt },
        ...(result.oil > 0 ? [{ label: "Olio", grams: result.oil }] : []),
        ...(result.sugar > 0
          ? [{ label: "Zucchero", grams: result.sugar }]
          : []),
        ...(result.malt > 0 ? [{ label: "Malto", grams: result.malt }] : []),
      ]
    : [];
  function normalizeDuration(config: DoughConfig) {
    if (config.planMode !== "duration") return config;
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
  function update<K extends keyof DoughConfig>(key: K, value: DoughConfig[K]) {
    setState((s) => ({
      ...s,
      config: normalizeDuration({
        ...s.config,
        [key]: value,
        ...(key === "count" ? { toppingCount: value as number } : {}),
        ...(key === "panWidth" ? { toppingWidth: value as number } : {}),
        ...(key === "panLength" ? { toppingLength: value as number } : {}),
      }),
    }));
  }
  function updateMany(patch: Partial<DoughConfig>) {
    setState((s) => ({
      ...s,
      config: normalizeDuration({ ...s.config, ...patch }),
    }));
  }
  function goToPlannerStage(stage: PlannerStage) {
    setPlannerStage(stage);
    requestAnimationFrame(() =>
      document
        .getElementById("planner-steps")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  function changeStyle(id: string) {
    const style = styles.find((s) => s.id === id)!;
    setState((s) => {
      const oven = ovenProfiles.find((o) => o.id === s.config.ovenType);
      return {
        ...s,
        config: normalizeDuration({
          ...s.config,
          styleId: id,
          pizzaDiameter: id === "padellino" ? 20 : id === "new-york" ? 35 : 32,
          toppingCount: s.config.count,
          toppingWidth: s.config.panWidth,
          toppingLength: s.config.panLength,
          hydration: style.hydration,
          ballWeight: style.ballWeight,
          salt: style.salt,
          oil: style.oil,
          sugar: id === "new-york" ? 2 : id === "detroit" ? 1 : 0,
          malt: id === "new-york" ? 0.4 : 0,
          coldHours: style.cold,
          bulkHours: style.bulk,
          proofHours: style.proof,
          ovenTemp:
            oven && oven.id !== "custom"
              ? Math.min(style.oven, oven.maxTemp)
              : style.oven,
          ...bakingDefaults(id),
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
  function saveEquipment(name: string) {
    setState((s) => ({
      ...s,
      equipmentProfiles: [
        {
          id: crypto.randomUUID(),
          name,
          mixer: c.mixer,
          mixerProfileId: c.mixerProfileId,
          ovenType: c.ovenType,
          ovenTemp: c.ovenTemp,
          ovenRack: c.ovenRack,
          bakeSurface: c.bakeSurface,
          panWidth: c.panWidth,
          panLength: c.panLength,
          createdAt: new Date().toISOString(),
        },
        ...s.equipmentProfiles,
      ],
    }));
    setMessage("Profilo attrezzatura salvato.");
  }
  function loadEquipment(p: StoredState["equipmentProfiles"][number]) {
    updateMany({
      mixer: p.mixer,
      mixerProfileId: p.mixerProfileId,
      ovenType: p.ovenType,
      ovenTemp: p.ovenTemp,
      ovenRack: p.ovenRack ?? c.ovenRack,
      bakeSurface: p.bakeSurface ?? c.bakeSurface,
      panWidth: p.panWidth,
      panLength: p.panLength,
    });
    setMessage(`Profilo “${p.name}” applicato.`);
  }
  function exportArchive() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            app: "PizzaLab",
            version: "0.9.0",
            recipes: state.recipes,
            customFlours: state.customFlours,
            savedBlends: state.savedBlends,
            equipmentProfiles: state.equipmentProfiles,
            sourdoughProfiles: state.sourdoughProfiles,
            activeSourdoughId: state.activeSourdoughId,
            bakeCalibrations: state.bakeCalibrations,
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
      if (
        !recipes.length &&
        !customFlours.length &&
        !savedBlends.length &&
        !equipmentProfiles.length &&
        !sourdoughProfiles.length &&
        !bakeCalibrations.length
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
      }));
      setMessage(
        `Importazione completata: ${recipes.length} ricette recuperate.`,
      );
    } catch {
      setMessage(
        "File non riconosciuto: usa un archivio JSON esportato da PizzaLab.",
      );
    } finally {
      if (importRef.current) importRef.current.value = "";
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
  async function saveRecipe() {
    if (!result.ok || loadError) return;
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      name:
        recipeName.trim() ||
        `${result.style.name} · ${new Date(c.bakeAt).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`,
      createdAt: new Date().toISOString(),
      config: { ...c },
      notes: "",
      rating: 0,
      completedStages: [],
    };
    const next = { ...state, recipes: [recipe, ...state.recipes] };
    try {
      await writeState(next);
      setState(next);
      setMessage(
        "Piano salvato nel diario. Puoi attivare i promemoria dalla sua scheda.",
      );
      setTab("diario");
    } catch {
      setStorageError("Piano non salvato: memoria locale non disponibile.");
    }
  }
  async function activate(recipe: Recipe) {
    setBusy(true);
    try {
      const note = await scheduleReminders(recipe);
      setState((s) => ({ ...s, activeId: recipe.id }));
      setMessage(note);
    } catch (e) {
      try {
        await cancelReminders();
        setState((s) => ({ ...s, activeId: null }));
      } catch {
        /* Conserva lo stato visibile se Android non conferma la cancellazione. */
      }
      setMessage(
        e instanceof Error
          ? e.message
          : "Non riesco a programmare i promemoria.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deactivate() {
    setBusy(true);
    try {
      await cancelReminders();
      setState((s) => ({ ...s, activeId: null }));
      setMessage("Piano disattivato e promemoria cancellati.");
    } catch {
      setMessage("Cancellazione dei promemoria non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
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
      void scheduleStarterReminders(updated).catch(() =>
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
      void scheduleStarterReminders(updated).catch(() =>
        setMessage("Rinfresco salvato, ma non ho potuto aggiornare le notifiche."),
      );
  }
  async function enableStarterReminders() {
    if (!activeSourdough) return;
    try {
      const profile = { ...activeSourdough, remindersEnabled: true };
      const note = await scheduleStarterReminders(profile);
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
    setState((s) => ({
      ...s,
      recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }
  const isPan = styles.find((s) => s.id === c.styleId)?.pan;
  const startPast =
    timeline.length > 0 && new Date(timeline[0].at).getTime() < now;
  if (!ready)
    return (
      <div className="loading">
        <Pizza size={44} />
        <p>Prepariamo il banco…</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#impasto"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setTab("impasto");
          }}
        >
          <span className="brand-icon">
            <img src={pizzaLabLogo} alt="" />
          </span>
          <span>
            Pizza<span className="brand-amico">Lab</span>
            <small>IMPASTO. METODO. RISULTATI.</small>
          </span>
        </a>
        <nav aria-label="Navigazione principale">
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => {
                setTab(n.id);
                window.scrollTo({ top: 0 });
              }}
            >
              <n.icon size={22} weight={tab === n.id ? "fill" : "regular"} />
              <span>{n.label}</span>
              {n.id === "diario" && state.recipes.length > 0 && (
                <small>{state.recipes.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Leaf size={21} />
          <p>
            Farina, acqua, tempo.
            <br />
            <strong>Il tuo laboratorio della pizza.</strong>
          </p>
          <span>Dati sul tuo dispositivo · Senza account</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>PizzaLab · il tuo laboratorio d’impasti</span>
          <div>
            <span className="offline-dot" /> Disponibile offline su Android
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
              <Info size={22} />
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
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    IL TUO LABORATORIO DELLA PIZZA
                  </span>
                  <h1>
                    Progetta. Impasta.
                    <br /> <span>Perfeziona.</span>
                  </h1>
                  <p>Un percorso chiaro, dallo stile alla cottura.</p>
                </div>
                <div className="heading-illustration" aria-hidden="true">
                  <Pizza weight="duotone" />
                  <span>
                    Ogni impasto
                    <br />è un esperimento.
                  </span>
                </div>
              </div>
              {active && (
                <button
                  className="active-banner"
                  onClick={() => setTab("diario")}
                >
                  <Clock size={25} />
                  <div>
                    <strong>{active.name}</strong>
                    <span>
                      {activeNext
                        ? `Prossima fase: ${activeNext.title} · ${dateLabel(activeNext.at)}`
                        : "La tabella di marcia è terminata. Com’è andata?"}
                    </span>
                  </div>
                  <ArrowRight />
                </button>
              )}
              <section className="style-section">
                <div className="section-title">
                  <h2>Che pizza ti va?</h2>
                  <span>Ogni stile, il suo impasto</span>
                </div>
                <div className="style-options">
                  {styles.map((s, i) => (
                    <button
                      key={s.id}
                      className={`style-option ${c.styleId === s.id ? "is-selected" : ""}`}
                      aria-pressed={c.styleId === s.id}
                      onClick={() => changeStyle(s.id)}
                    >
                      <span className={`style-art art-${i}`} aria-hidden="true">
                        {s.pan ? (
                          <CookingPot weight="duotone" />
                        ) : (
                          <Pizza weight="duotone" />
                        )}
                      </span>
                      <strong>{s.name}</strong>
                      <small>
                        {s.pan
                          ? "Da condividere"
                          : i === 2
                            ? "Sottile e croccante"
                            : i === 1
                              ? "Alta e ariosa"
                              : i === 4
                                ? "Leggera e croccante"
                                : i === 5
                                  ? "Soffice e dorata"
                                  : "Il grande classico"}
                      </small>
                      {c.styleId === s.id && (
                        <CheckCircle className="style-check" weight="fill" />
                      )}
                    </button>
                  ))}
                </div>
              </section>
              {result.ok && (
                <div className="mobile-dose" aria-label="Dosi rapide">
                  <div>
                    <small>FARINA</small>
                    <strong>
                      {fmt(result.flour)} <span>g</span>
                    </strong>
                  </div>
                  <div>
                    <small>ACQUA</small>
                    <strong>
                      {fmt(result.water)} <span>g</span>
                    </strong>
                  </div>
                  <div>
                    <small>LIEVITO</small>
                    <strong>
                      {fmt(result.yeast, 2)} <span>g</span>
                    </strong>
                  </div>
                  <button
                    aria-label="Vai alla ricetta completa"
                    onClick={() =>
                      document
                        .getElementById("recipe-summary")
                        ?.scrollIntoView({ behavior: "auto", block: "start" })
                    }
                  >
                    <ArrowRight />
                  </button>
                </div>
              )}
              <nav id="planner-steps" className="planner-steps" aria-label="Fasi di progettazione">
                {(
                  [
                    ["dough", "1", "Impasto", "Dosi e metodo", Wheat],
                    [
                      "fermentation",
                      "2",
                      "Lievitazione",
                      "Tempi e lievito",
                      Clock,
                    ],
                    ["baking", "3", "Cottura", "Anteprima dinamica", Fire],
                  ] as const
                ).map(([id, number, label, detail, Icon]) => (
                  <button
                    key={id}
                    className={plannerStage === id ? "active" : ""}
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
              <div className="planner-grid">
                <div className="planner-fields">
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
                        <span>
                          {selectedFlour?.protein !== null &&
                          selectedFlour?.protein !== undefined
                            ? `${fmt(selectedFlour.protein, 1)}% proteine`
                            : "Proteine n.d."}
                        </span>
                        <button onClick={() => setTab("farine")}>
                          Esplora le farine <ArrowRight />
                        </button>
                      </div>
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
                          />
                        )}
                      </div>
                      {isPan && (
                        <div className="field-grid">
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
                          <NumberField
                            label="Impasto per superficie"
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
                        <label htmlFor="hydration">
                          Idratazione{" "}
                          <strong>
                            {fmt(c.hydration, 1)}
                            <small>%</small>
                          </strong>
                        </label>
                        <input
                          id="hydration"
                          type="range"
                          min="45"
                          max="90"
                          value={c.hydration}
                          onChange={(e) =>
                            update("hydration", Number(e.target.value))
                          }
                        />
                        <div className="range-labels">
                          <span>Più facile da lavorare</span>
                          <span>Più ariosa</span>
                        </div>
                      </div>
                      {result.ok && (
                        <HydrationChart
                          value={c.hydration}
                          style={currentStyle}
                          w={result.w}
                        />
                      )}
                      <details>
                        <summary>
                          Ingredienti e miscela fino a quattro farine
                        </summary>
                        <div className="field-grid details-content">
                          <NumberField
                            label="Sale sulla farina"
                            value={c.salt}
                            onChange={(v) => update("salt", v)}
                            min={0}
                            max={4}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label="Olio sulla farina"
                            value={c.oil}
                            onChange={(v) => update("oil", v)}
                            min={0}
                            max={10}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label="Zucchero sulla farina"
                            value={c.sugar}
                            onChange={(v) => update("sugar", v)}
                            min={0}
                            max={15}
                            step={0.1}
                            unit="%"
                          />
                          <NumberField
                            label="Malto diastatico"
                            value={c.malt}
                            onChange={(v) => update("malt", v)}
                            min={0}
                            max={5}
                            step={0.1}
                            unit="%"
                          />
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
                              styles.find((s) => s.id === c.styleId)!.cold,
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
                      <div className="time-fields">
                        <NumberField
                          label="Puntata fuori frigo"
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
                          step={0.25}
                          clampToRange
                          unit="ore"
                          hint={
                            c.foldCount > 0
                              ? `Minimo ${fmt((c.foldCount * c.foldIntervalMinutes) / 60, 2)} ore per completare le pieghe`
                              : "Primo riposo, in massa"
                          }
                        />
                        <NumberField
                          label="Riposo in frigo"
                          value={c.coldHours}
                          onChange={(v) => update("coldHours", v)}
                          min={0}
                          max={96}
                          step={0.5}
                          unit="ore"
                          hint="Massa coperta al freddo"
                        />
                        <NumberField
                          label="Appretto fuori frigo"
                          value={c.proofHours}
                          onChange={(v) => update("proofHours", v)}
                          min={0}
                          max={24}
                          step={0.5}
                          unit="ore"
                          hint="Ultimo riposo, già diviso"
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
                      <div className="time-total">
                        <span>Tempo di fermentazione</span>
                        <strong>
                          {result.ok ? fmt(result.hours, 1) : "—"} ore{" "}
                          <small>+ 20 min di impasto</small>
                        </strong>
                      </div>
                      <div className="field-grid temperature-fields">
                        <NumberField
                          label="Temperatura ambiente"
                          value={c.roomTemp}
                          onChange={(v) => update("roomTemp", v)}
                          min={10}
                          max={35}
                          unit="°C"
                        />
                        {c.coldHours > 0 && (
                          <NumberField
                            label="Temperatura del frigo"
                            value={c.fridgeTemp}
                            onChange={(v) => update("fridgeTemp", v)}
                            min={1}
                            max={12}
                            unit="°C"
                          />
                        )}
                        <label className="field">
                          Lievito
                          <select
                            value={c.yeast}
                            onChange={(e) => {
                              const yeast = e.target
                                .value as DoughConfig["yeast"];
                              updateMany({
                                yeast,
                                ...(yeast === "sourdough"
                                  ? { preferment: "none", starterHydration: 50 }
                                  : yeast === "licoli"
                                    ? {
                                        preferment: "none",
                                        starterHydration: 100,
                                      }
                                    : {}),
                              });
                            }}
                          >
                            <option value="fresh">Di birra fresco</option>
                            <option value="instant">Secco istantaneo</option>
                            <option value="sourdough">
                              Pasta madre solida
                            </option>
                            <option value="licoli">Licoli</option>
                          </select>
                        </label>
                      </div>
                      {result.ok &&
                        !["sourdough", "licoli"].includes(c.yeast) && (
                          <YeastChart
                            config={c}
                            currentPercent={result.yeastPercent}
                          />
                        )}
                      {result.ok && ["sourdough", "licoli"].includes(c.yeast) && (
                        <StarterDoughLink profiles={state.sourdoughProfiles} config={c} starterGrams={result.starter.grams} onUpdate={updateMany} onManage={() => setTab("madre")} />
                      )}
                    </section>
                  )}
                  {plannerStage === "fermentation" && (
                    <section className="panel"><FermentationCheck config={c} onUpdate={updateMany} /></section>
                  )}
                  {result.ok && (
                    <AdvancedPlanner
                      config={c}
                      flours={flours}
                      result={result}
                      section={plannerStage}
                      onUpdate={updateMany}
                    />
                  )}
                  {plannerStage === "dough" && (
                    <EquipmentProfiles
                      profiles={state.equipmentProfiles}
                      onSave={saveEquipment}
                      onLoad={loadEquipment}
                      onDelete={(id) =>
                        setState((s) => ({
                          ...s,
                          equipmentProfiles: s.equipmentProfiles.filter(
                            (p) => p.id !== id,
                          ),
                        }))
                      }
                    />
                  )}
                  {result.ok && plannerStage === "dough" && (
                    <DoughAnalysis config={c} result={result} />
                  )}
                  {plannerStage === "baking" && (
                    <BakingPlanner config={c} onUpdate={updateMany} calibrations={state.bakeCalibrations} onAddCalibration={(calibration) => { setState((s) => ({ ...s, bakeCalibrations: [calibration, ...s.bakeCalibrations].slice(0, 100) })); setMessage("Risultato salvato: la taratura personale è stata aggiornata."); }} />
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
                      <div className="method-toggle">
                        <button
                          className={c.planMode === "date" ? "selected" : ""}
                          onClick={() => update("planMode", "date")}
                        >
                          <Clock /> Data di cottura
                        </button>
                        <button
                          className={
                            c.planMode === "duration" ? "selected" : ""
                          }
                          onClick={() => update("planMode", "duration")}
                        >
                          <Timer /> Comincio adesso
                        </button>
                      </div>
                      {c.planMode === "date" ? (
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
                          <Clock />
                          <div>
                            <span>Impasta ora, prima infornata prevista</span>
                            <strong>{dateLabel(c.bakeAt)}</strong>
                          </div>
                        </div>
                      )}
                      <button
                        className="link-button"
                        onClick={() => {
                          if (result.ok) updateMany({ planMode: "duration" });
                        }}
                      >
                        Ricalcola partendo da adesso <ArrowRight />
                      </button>
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
                  {plannerStage === "dough" && (
                    <button className="journey-next" onClick={() => goToPlannerStage("fermentation")}>
                      <span><small>PASSAGGIO 2</small><strong>Passa a lievitazione</strong></span>
                      <ArrowRight />
                    </button>
                  )}
                  {plannerStage === "fermentation" && (
                    <button className="journey-next" onClick={() => goToPlannerStage("baking")}>
                      <span><small>PASSAGGIO 3</small><strong>Passa a cottura</strong></span>
                      <ArrowRight />
                    </button>
                  )}
                  {plannerStage === "baking" && (
                    <section className="panel final-save-panel">
                      <span className="eyebrow">PIANO COMPLETO</span>
                      <h2>Pronto per il tuo diario</h2>
                      <p>Salva dosi, lievitazione e previsione di cottura in un unico piano.</p>
                      <label className="field recipe-name">
                        Nome del piano
                        <input maxLength={80} value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Es. La pizza del sabato" />
                      </label>
                      <button className="button primary full final-save-button" disabled={loadError || !result.ok} onClick={() => void saveRecipe()}>
                        <BookmarkSimple /> Salva il piano <ArrowRight />
                      </button>
                      <small>Lo ritrovi nel diario, anche offline.</small>
                    </section>
                  )}
                </div>
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
                            {fmt(result.hours, 1)} h
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
                            Posizione nel forno:{" "}
                            {c.ovenRack === "bottom"
                              ? "bassa"
                              : c.ovenRack === "lower-middle"
                                ? "medio-bassa"
                                : c.ovenRack === "middle"
                                  ? "centrale"
                                  : c.ovenRack === "upper-middle"
                                    ? "medio-alta"
                                    : "alta"}
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
                        <div className="recipe-tools">
                          <button
                            className="button secondary"
                            onClick={() => setScaleOpen(true)}
                          >
                            <Scale /> Pesa
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => setGuidedOpen(true)}
                          >
                            <Play /> Guida
                          </button>
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
                            {a.level === "warning" ? <Warning /> : <Info />}
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
                </aside>
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
            />
          )}
          {tab === "guida" && (
            <>
              <Guide />
              <DoughRescue />
            </>
          )}
          {tab === "diario" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">OGNI IMPASTO INSEGNA QUALCOSA</span>
                  <h1>Il tuo diario di pizza.</h1>
                  <p>Ricette, promemoria e piccoli progressi.</p>
                </div>
                <div className="heading-actions">
                  <input
                    ref={importRef}
                    hidden
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importArchive(file);
                    }}
                  />
                  <button
                    className="button secondary"
                    onClick={() => importRef.current?.click()}
                  >
                    <UploadSimple /> Importa
                  </button>
                  <button
                    className="button secondary"
                    disabled={!state.recipes.length}
                    onClick={exportArchive}
                  >
                    Esporta
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setTab("impasto")}
                  >
                    Nuovo impasto <ArrowRight />
                  </button>
                </div>
              </div>
              {state.recipes.length > 0 && (
                <InsightsDashboard recipes={state.recipes} flours={flours} />
              )}{" "}
              {state.recipes.length === 0 ? (
                <div className="empty-state">
                  <Notebook size={52} weight="duotone" />
                  <h2>La prima pagina è tutta tua.</h2>
                  <p>
                    Salva un piano, segui le fasi e annota com’è andata.
                    <br />
                    La prossima pizza partirà da qui.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setTab("impasto")}
                  >
                    Prepara il primo impasto <ArrowRight />
                  </button>
                </div>
              ) : (
                <div className="journal-list">
                  {[...state.recipes]
                    .sort(
                      (a, b) =>
                        Number(Boolean(b.favorite)) -
                        Number(Boolean(a.favorite)),
                    )
                    .map((recipe) => {
                      const r = calculate(recipe.config, flours);
                      const stages = buildTimeline(recipe.config, flours);
                      const isActive = state.activeId === recipe.id;
                      const expired =
                        new Date(recipe.config.bakeAt).getTime() <= now;
                      return (
                        <article
                          className={`journal-card ${isActive ? "active-recipe" : ""}`}
                          key={recipe.id}
                        >
                          <div className="journal-title">
                            <div>
                              <span className="eyebrow">
                                {isActive
                                  ? "PIANO ATTIVO"
                                  : recipe.favorite
                                    ? "PREFERITA"
                                    : expired
                                      ? "DA RICORDARE"
                                      : "IN PROGRAMMA"}
                              </span>
                              <h2>{recipe.name}</h2>
                              <p>
                                {dateLabel(recipe.config.bakeAt)} ·{" "}
                                {recipe.config.count}{" "}
                                {r.ok && r.style.pan ? "teglie" : "pizze"} ·{" "}
                                {recipe.config.hydration}% acqua
                              </p>
                            </div>
                            <button
                              className={`icon-button favorite-button ${recipe.favorite ? "selected" : ""}`}
                              aria-label={`${recipe.favorite ? "Rimuovi dai" : "Aggiungi ai"} preferiti ${recipe.name}`}
                              onClick={() =>
                                editRecipe(recipe.id, {
                                  favorite: !recipe.favorite,
                                })
                              }
                            >
                              <Star
                                weight={recipe.favorite ? "fill" : "regular"}
                              />
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Elimina ${recipe.name}`}
                              onClick={() => setDeleteId(recipe.id)}
                            >
                              <Trash />
                            </button>
                          </div>
                          {r.ok && (
                            <div className="journal-ingredients">
                              <strong>Farina totale {fmt(r.flour)} g</strong>
                              <br />
                              <small>
                                {r.flourBreakdown
                                  .map(
                                    (item) =>
                                      `${item.name}: ${fmt(item.grams)} g (${fmt(item.percent, 1)}%)`,
                                  )
                                  .join(" · ")}
                              </small>
                              <br />
                              Acqua {fmt(r.water)} g · Sale {fmt(r.salt, 1)} g ·{" "}
                              {recipe.config.yeast === "sourdough"
                                ? "Pasta madre"
                                : recipe.config.yeast === "licoli"
                                  ? "Licoli"
                                  : `Lievito ${recipe.config.yeast === "fresh" ? "fresco" : "secco"}`}{" "}
                              {fmt(
                                r.yeast,
                                ["sourdough", "licoli"].includes(
                                  recipe.config.yeast,
                                )
                                  ? 0
                                  : 2,
                              )}{" "}
                              g{r.oil > 0 ? ` · Olio ${fmt(r.oil, 1)} g` : ""}
                            </div>
                          )}
                          <div className="journal-actions">
                            <button
                              className="button secondary"
                              onClick={() => {
                                setState((s) => ({
                                  ...s,
                                  config: { ...recipe.config },
                                }));
                                setTab("impasto");
                                setRecipeName(recipe.name);
                              }}
                            >
                              Apri nel calcolatore
                            </button>
                            <button
                              className="button secondary"
                              onClick={() => void shareRecipe(recipe)}
                            >
                              Condividi
                            </button>
                            {isActive ? (
                              <button
                                className="button secondary"
                                disabled={busy}
                                onClick={() => void deactivate()}
                              >
                                <Bell /> Disattiva piano
                              </button>
                            ) : (
                              <button
                                className="button primary"
                                disabled={busy || expired}
                                onClick={() => void activate(recipe)}
                              >
                                <Bell /> Attiva piano e promemoria
                              </button>
                            )}
                          </div>
                          {isActive && (
                            <p className="small-muted">
                              Un solo piano attivo alla volta. Riattivarlo
                              sostituisce i promemoria precedenti. Nel browser è
                              disponibile solo il piano visivo.
                            </p>
                          )}
                          <details open={isActive}>
                            <summary>Le fasi del tuo impasto</summary>
                            <div className="checklist">
                              {stages.map((stage) => (
                                <label key={stage.id}>
                                  <input
                                    type="checkbox"
                                    checked={recipe.completedStages.includes(
                                      stage.id,
                                    )}
                                    onChange={(e) =>
                                      editRecipe(recipe.id, {
                                        completedStages: e.target.checked
                                          ? [
                                              ...recipe.completedStages,
                                              stage.id,
                                            ]
                                          : recipe.completedStages.filter(
                                              (id) => id !== stage.id,
                                            ),
                                      })
                                    }
                                  />
                                  <span>
                                    <strong>{stage.title}</strong>
                                    <small>{dateLabel(stage.at)}</small>
                                    <p>{stage.detail}</p>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </details>
                          <TemperatureLog
                            recipe={recipe}
                            onChange={(temperatureReadings) =>
                              editRecipe(recipe.id, { temperatureReadings })
                            }
                          />
                          <div className="recipe-review">
                            <span>Com’è venuta?</span>
                            <div className="stars">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  aria-label={`${n} stelle per ${recipe.name}`}
                                  aria-pressed={recipe.rating === n}
                                  onClick={() =>
                                    editRecipe(recipe.id, {
                                      rating: recipe.rating === n ? 0 : n,
                                    })
                                  }
                                >
                                  <Star
                                    weight={
                                      recipe.rating >= n ? "fill" : "regular"
                                    }
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                          <label className="field">
                            Appunti per la prossima volta
                            <textarea
                              rows={3}
                              maxLength={4000}
                              placeholder="Com’era l’impasto? Cosa cambieresti?"
                              value={recipe.notes}
                              onChange={(e) =>
                                editRecipe(recipe.id, { notes: e.target.value })
                              }
                            />
                          </label>
                        </article>
                      );
                    })}
                </div>
              )}
            </>
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
      {guidedOpen && result.ok && (
        <GuidedMode
          title={result.style.name}
          stages={timeline}
          onClose={() => setGuidedOpen(false)}
        />
      )}
      {scaleOpen && result.ok && (
        <ScaleMode items={scaleItems} onClose={() => setScaleOpen(false)} />
      )}
    </div>
  );
}
