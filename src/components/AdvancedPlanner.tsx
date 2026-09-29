import { locale, t, msg } from "../i18n";
import {
  ArrowSquareOut,
  Drop,
  Fire,
  Flask,
  Gauge,
  MagicWand,
  Thermometer,
  Timer,
} from "@phosphor-icons/react";
import { recommendedBakeMinutes, type calculate } from "../domain/calculator";
import { durationLabel } from "../domain/duration";
import type { DoughConfig, Flour, UserOven } from "../domain/types";
import { ovenProfiles } from "../data/ovens";
import { mixerProfiles } from "../data/mixers";
import { recommendedFolds, styles } from "../domain/styles";
import { NumberField } from "./Fields";
import { FlourPicker } from "./FlourPicker";
import { SelectSheet } from "./SelectSheet";
import { HelpTip } from "./HelpTip";
import { mixerOptions, ovenOptions, planetaryOptions } from "../data/options";
import { formatTemp, formatWeight, localizeTemperatures } from "../services/units";

type GoodResult = Extract<ReturnType<typeof calculate>, { ok: true }>;
type Props = {
  config: DoughConfig;
  flours: Flour[];
  result: GoodResult;
  section: "dough" | "fermentation" | "baking";
  onUpdate: (patch: Partial<DoughConfig>) => void;
  userOvens?: UserOven[];
};
const fmt = (n: number, d = 1) =>
  n.toLocaleString(locale(), { maximumFractionDigits: d });

export function AdvancedPlanner({
  config: c,
  flours,
  result,
  section,
  onUpdate,
  userOvens = [],
}: Props) {
  const oven =
    ovenProfiles.find((item) => item.id === c.ovenType) ?? ovenProfiles[0];
  const mixerProfile =
    mixerProfiles.find((item) => item.id === c.mixerProfileId) ??
    mixerProfiles[0];
  const naturalStarter = ["sourdough", "licoli"].includes(c.yeast);
  const minimumFoldMinutes = c.foldCount * c.foldIntervalMinutes;
  const foldAdvice = recommendedFolds(c.styleId);
  const styleName = styles.find((item) => item.id === c.styleId)?.name ?? "pizza";
  const optimizePreferment = () => {
    const target = c.preferment === "biga" ? 16 : 12;
    onUpdate({
      prefermentHours: Math.max(
        3,
        Math.min(
          36,
          Math.round((target / 2 ** ((c.prefermentTemp - 20) / 10)) * 2) / 2,
        ),
      ),
    });
  };
  const heading =
    section === "dough"
      ? [msg("Laboratorio impasto"), msg("Metodo, autolisi e temperatura finale.")]
      : section === "fermentation"
        ? [
            msg("Controllo fermentazione"),
            msg("Scegli il lievito e rendi la dose realmente pesabile."),
          ]
        : [msg("Il tuo forno"), msg("Profilo, temperatura reale e preriscaldamento.")];
  return (
    <section className="panel advanced-planner">
      <div className="panel-title">
        <span className="section-icon">
          <Flask />
        </span>
        <div>
          <h2>{t(heading[0])}</h2>
          <p>{t(heading[1])}</p>
        </div>
      </div>

      {section === "dough" && (
        <>
          <div className="advanced-block">
            <div className="advanced-heading">
              <div>
                <MagicWand />
                <strong>{t("Metodo")}</strong>
                <HelpTip topic="metodo" />
              </div>
              <span>{t("Diretto, poolish o biga")}</span>
            </div>
            <div className="method-toggle three">
              <button
                className={c.preferment === "none" ? "selected" : ""}
                onClick={() => onUpdate({ preferment: "none" })}
              >
                {t("Diretto")}
              </button>
              <button
                disabled={naturalStarter}
                className={c.preferment === "poolish" ? "selected" : ""}
                onClick={() => onUpdate({ preferment: "poolish" })}
              >
                {t("Poolish")}
              </button>
              <button
                disabled={naturalStarter}
                className={c.preferment === "biga" ? "selected" : ""}
                onClick={() => onUpdate({ preferment: "biga" })}
              >
                {t("Biga")}
              </button>
            </div>
            {naturalStarter && (
              <p className="natural-note">
                {t("Il lievito naturale è già un prefermento: poolish e biga vengono disattivati.")}
              </p>
            )}
            {c.preferment !== "none" && (
              <>
                <div className="field-grid">
                  <NumberField
                    label={t("Farina nel prefermento")}
                    value={c.prefermentPercent}
                    onChange={(v) => onUpdate({ prefermentPercent: v })}
                    min={5}
                    max={80}
                    step={5}
                    unit="%"
                  />
                  <NumberField
                    label={t("Durata prefermento")}
                    value={c.prefermentHours}
                    onChange={(v) => onUpdate({ prefermentHours: v })}
                    min={3}
                    max={36}
                    step={0.5}
                    unit="ore"
                  />
                  <NumberField
                    label={t("Temperatura prefermento")}
                    value={c.prefermentTemp}
                    onChange={(v) => onUpdate({ prefermentTemp: v })}
                    min={8}
                    max={32}
                    quantity="temp"
                  />
                  <FlourPicker
                    label={t("Farina del prefermento")}
                    value={c.prefermentFlourId}
                    flours={flours}
                    allowEmpty
                    emptyLabel={t("Usa la farina principale")}
                    onChange={(value) => onUpdate({ prefermentFlourId: value })}
                  />
                </div>
                <div className="maturity-row">
                  <div>
                    <span>{t("MATURITÀ STIMATA")} <HelpTip topic="maturita" /></span>
                    <strong>{result.preferment.maturity}</strong>
                  </div>
                  <div className="maturity-track">
                    <span
                      style={{
                        width: `${Math.min(100, (result.preferment.progress / 1.35) * 100)}%`,
                      }}
                    />
                  </div>
                  <button
                    className="button secondary"
                    onClick={optimizePreferment}
                  >
                    <MagicWand /> {t("Ottimizza")}
                  </button>
                </div>
                <div className="preferment-split">
                  <div>
                    <span>{c.preferment}</span>
                    <strong>
                      {formatWeight(result.preferment.flour, 0)} {t("farina ·")}{" "}
                      {formatWeight(result.preferment.water, 0)} {t("acqua ·")}{" "}
                      {formatWeight(result.preferment.yeast, 2)} {t("lievito")}
                    </strong>
                  </div>
                  <div>
                    <span>{t("Impasto finale")}</span>
                    <strong>
                      {formatWeight(result.preferment.mainFlour, 0)} {t("farina ·")}{" "}
                      {formatWeight(result.preferment.mainWater, 0)} {t("acqua ·")}{" "}
                      {formatWeight(result.preferment.mainYeast, 2)} {t("lievito")}
                    </strong>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="advanced-block autolyse-block">
            <div className="advanced-heading">
              <div>
                <Drop />
                <strong>{t("Autolisi breve")}</strong>
                <HelpTip topic="autolisi" />
              </div>
              <span>{t("Utile per impasti molto idratati")}</span>
            </div>
            <div className="method-toggle">
              <button
                className={!c.autolyse ? "selected" : ""}
                onClick={() => onUpdate({ autolyse: false })}
              >
                {t("Non prevista")}
              </button>
              <button
                className={c.autolyse ? "selected" : ""}
                onClick={() => onUpdate({ autolyse: true })}
              >
                {t("Aggiungi autolisi")}
              </button>
            </div>
            {c.autolyse && (
              <>
                <div className="field-grid">
                  <NumberField
                    label={t("Acqua usata nell’autolisi")}
                    value={c.autolyseWaterPercent}
                    onChange={(v) => onUpdate({ autolyseWaterPercent: v })}
                    min={30}
                    max={95}
                    step={5}
                    unit="%"
                    hint={t("Percentuale dell’acqua disponibile nell’impasto finale.")}
                  />
                  <NumberField
                    label={t("Durata del riposo")}
                    value={c.autolyseMinutes}
                    onChange={(v) => onUpdate({ autolyseMinutes: v })}
                    min={10}
                    max={60}
                    step={5}
                    unit="min"
                  />
                </div>
                <div className="autolyse-recipe">
                  <div>
                    <span>{t("AUTOLISI")}</span>
                    <strong>
                      {formatWeight(result.autolyse.flour, 0)} {t("farina +")}{" "}
                      {formatWeight(result.autolyse.water, 0)} {t("acqua")}
                    </strong>
                  </div>
                  <div>
                    <span>{t("ACQUA DI RISERVA")}</span>
                    <strong>
                      {formatWeight(result.autolyse.reservedWater, 0)} {t("con il lievito, poi poco alla volta")}
                    </strong>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="advanced-block folds-block">
            <div className="advanced-heading">
              <div>
                <Timer />
                <strong>{t("Pieghe di rinforzo")}</strong>
                <HelpTip topic="pieghe" />
              </div>
              <span>{t("Programmate durante la puntata")}</span>
            </div>
            <div className={`fold-advice ${foldAdvice.count ? "is-recommended" : ""}`}>
              <div>
                <strong>
                  {foldAdvice.count
                    ? t("Consigliate per lo stile «{styleName}»: {count} pieghe ogni {interval} min", { styleName, count: foldAdvice.count, interval: foldAdvice.interval })
                    : t("Non necessarie per lo stile «{styleName}»", { styleName })}
                </strong>
                <span>{t("Perché")} {t(foldAdvice.reason)}.</span>
              </div>
              {c.foldCount !== foldAdvice.count && (
                <button
                  className="button secondary"
                  onClick={() =>
                    onUpdate({
                      foldCount: foldAdvice.count,
                      foldIntervalMinutes: foldAdvice.count ? foldAdvice.interval : c.foldIntervalMinutes,
                      bulkHours: Math.max(c.bulkHours, (foldAdvice.count * (foldAdvice.count ? foldAdvice.interval : c.foldIntervalMinutes)) / 60),
                    })
                  }
                >
                  {foldAdvice.count ? t("Usa {count} pieghe", { count: foldAdvice.count }) : t("Togli le pieghe")}
                </button>
              )}
            </div>
            <div className="field-grid">
              <NumberField
                label={t("Numero di pieghe")}
                value={c.foldCount}
                onChange={(value) => {
                  const foldCount = Math.round(value);
                  onUpdate({
                    foldCount,
                    bulkHours: Math.max(
                      c.bulkHours,
                      (foldCount * c.foldIntervalMinutes) / 60,
                    ),
                  });
                }}
                min={0}
                max={8}
                step={1}
              />
              <NumberField
                label={t("Intervallo tra le pieghe")}
                value={c.foldIntervalMinutes}
                onChange={(foldIntervalMinutes) =>
                  onUpdate({
                    foldIntervalMinutes,
                    bulkHours: Math.max(
                      c.bulkHours,
                      (c.foldCount * foldIntervalMinutes) / 60,
                    ),
                  })
                }
                min={15}
                max={60}
                step={5}
                unit="min"
              />
            </div>
            {c.foldCount > 0 && (
              <div className="folds-summary">
                <strong>
                  {t("Puntata minima:")} {durationLabel(minimumFoldMinutes / 60)}
                </strong>
                <span>
                  {c.foldCount} {c.foldCount === 1 ? t("piega") : t("pieghe")} {t("· ai minuti")}{" "}
                  {Array.from(
                    { length: c.foldCount },
                    (_, index) => (index + 1) * c.foldIntervalMinutes,
                  ).join(", ")}
                </span>
                <small>
                  {t("PizzaLab non permette di mettere l’impasto in frigo prima dell’ultima piega.")}
                </small>
              </div>
            )}
          </div>

          <div className="advanced-block">
            <div className="advanced-heading">
              <div>
                <Thermometer />
                <strong>{t("Temperatura impasto")}</strong>
                <HelpTip topic="temperatura" />
              </div>
              <span>{t("Metodo del fattore 3")}</span>
            </div>
            <div className="field-grid">
              <SelectSheet
                label={t("Lavorazione")}
                help="lavorazione"
                value={c.mixer}
                options={mixerOptions}
                onChange={(mixer) => onUpdate({ mixer })}
              />
              <NumberField
                label={t("Temperatura farina")}
                value={c.flourTemp}
                onChange={(v) => onUpdate({ flourTemp: v })}
                min={5}
                max={35}
                quantity="temp"
              />
              <NumberField
                label={t("Temperatura impasto desiderata")}
                value={c.desiredDoughTemp}
                onChange={(v) => onUpdate({ desiredDoughTemp: v })}
                min={18}
                max={30}
                quantity="temp"
              />
              <div className="water-temp">
                <Drop />
                <span>{t("Acqua consigliata")}</span>
                <strong>{formatTemp(result.waterTemp)}</strong>
              </div>
            </div>
            {c.mixer === "stand" && (
              <div className="mixer-guide">
                <SelectSheet
                  label={t("La tua planetaria")}
                  value={mixerProfile.id}
                  options={planetaryOptions}
                  onChange={(mixerProfileId) => onUpdate({ mixerProfileId })}
                />
                <div className="mixer-steps">
                  <div>
                    <span>{t("INSERTO")}</span>
                    <strong>{t(mixerProfile.tool)}</strong>
                  </div>
                  <div>
                    <span>{t("PARTENZA")}</span>
                    <strong>{t(mixerProfile.start)}</strong>
                  </div>
                  <div>
                    <span>{t("IMPASTO")}</span>
                    <strong>{t(mixerProfile.knead)}</strong>
                  </div>
                  <div>
                    <span>{t("CHIUSURA")}</span>
                    <strong>{t(mixerProfile.finish)}</strong>
                  </div>
                </div>
                <p>{t(mixerProfile.note)}</p>
                {mixerProfile.source && (
                  <a
                    href={mixerProfile.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Indicazioni del produttore")} <ArrowSquareOut />
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {section === "fermentation" && (
        <div className="advanced-block">
          <div className="advanced-heading">
            <div>
              <Timer />
              <strong>{t("Controllo lievito")}</strong>
                <HelpTip topic="dosaggio" />
            </div>
            <span>
              {naturalStarter
                ? t("Dose e idratazione della coltura")
                : t("Automatico o dose bloccata")}
            </span>
          </div>
          {c.planMode === "automatic" ? (
            <div className="automatic-yeast-lock">
              <MagicWand />
              <div><strong>{t("Dose sincronizzata con gli orari")}</strong><p>{naturalStarter ? t("PizzaLab stima la quantità dai tempi e dalle temperature. Verifica sempre la vitalità reale della coltura dalla sua crescita.") : t("In modalità automatica PizzaLab calcola il lievito dai tempi e dalle temperature. Passa a Manuale per bloccare grammi o percentuale.")}</p></div>
              <span>{formatWeight(result.yeast, 2)}</span>
            </div>
          ) : naturalStarter ? (
            <div className="field-grid">
              <NumberField
                label={
                  c.yeast === "licoli"
                    ? t("Licoli sulla farina")
                    : t("Pasta madre sulla farina")
                }
                value={c.starterPercent}
                onChange={(v) => onUpdate({ starterPercent: v })}
                min={5}
                max={50}
                step={1}
                unit="%"
                hint={t("Percentuale sul peso totale della farina.")}
              />
              <NumberField
                label={t("Idratazione del lievito")}
                value={c.starterHydration}
                onChange={(v) => onUpdate({ starterHydration: v })}
                min={40}
                max={150}
                step={5}
                unit="%"
                hint={t("In genere 45–55% per pasta madre e 100% per licoli.")}
              />
            </div>
          ) : <>
              <div className="method-toggle three">
                <button
                  className={c.yeastMode === "auto" ? "selected" : ""}
                  onClick={() => onUpdate({ yeastMode: "auto" })}
                >
                  {t("Automatico")}
                </button>
                <button
                  className={c.yeastMode === "weighable" ? "selected" : ""}
                  onClick={() => onUpdate({ yeastMode: "weighable" })}
                >
                  {t("Grammi interi")}
                </button>
                <button
                  className={c.yeastMode === "manual" ? "selected" : ""}
                  onClick={() => onUpdate({ yeastMode: "manual" })}
                >
                  {t("Percentuale")}
                </button>
              </div>
              {c.yeastMode === "manual" && (
                <NumberField
                  label={c.yeast === "fresh" ? t("Lievito fresco sulla farina") : t("Lievito secco sulla farina")}
                  value={c.manualYeastPercent}
                  onChange={(v) => onUpdate({ manualYeastPercent: v })}
                  min={0.001}
                  max={5}
                  step={0.01}
                  unit="%"
                  hint={t("Il programma mantiene fissi gli orari e mostra come cambia la maturazione.")}
                />
              )}
              {c.yeastMode === "weighable" && (
                <div className="weighable-yeast">
                  <NumberField
                    label={c.yeast === "fresh" ? t("Lievito fresco da pesare") : t("Lievito secco da pesare")}
                    value={c.weighableYeastGrams}
                    onChange={(v) => onUpdate({ weighableYeastGrams: v })}
                    min={1}
                    max={30}
                    step={1}
                    unit="g"
                    hint={t("Solo grammi interi: utile con una bilancia sensibile a 1 g.")}
                  />
                  {result.yeastAdjustment && (
                    <div className="yeast-compensation">
                      <div>
                        <span>{t("STIMA AUTOMATICA")}</span>
                        <strong>
                          {fmt(result.yeastAdjustment.autoGrams, 2)} {t("g → userai")}{" "}
                          {fmt(result.yeastAdjustment.selectedGrams, 0)} g
                        </strong>
                        <p>{result.yeastAdjustment.summary}</p>
                      </div>
                      <div className="compensation-times">
                        <span>
                          <small>{t("PUNTATA")}</small>
                          {durationLabel(result.yeastAdjustment.bulkHours)}
                        </span>
                        <span>
                          <small>{t("FRIGO")}</small>
                          {durationLabel(result.yeastAdjustment.coldHours)}
                        </span>
                        <span>
                          <small>{t("APPRETTO")}</small>
                          {durationLabel(result.yeastAdjustment.proofHours)}
                        </span>
                      </div>
                      <button
                        className="button primary"
                        onClick={() =>
                          onUpdate({
                            bulkHours: result.yeastAdjustment!.bulkHours,
                            coldHours: result.yeastAdjustment!.coldHours,
                            proofHours: result.yeastAdjustment!.proofHours,
                          })
                        }
                      >
                        {t("Applica tempi compensati")}
                      </button>
                      <small>
                        {t("È una stima basata sulla temperatura indicata: volume e consistenza dell’impasto restano il controllo principale.")}
                      </small>
                    </div>
                  )}
                </div>
              )}
            </>}
        </div>
      )}

      {section === "baking" && (
        <div className="advanced-block">
          <div className="advanced-heading">
            <div>
              <Fire />
              <strong>{t("Profilo del forno")}</strong>
            </div>
            <span>{t("Indicazioni coerenti con l’attrezzatura")}</span>
          </div>
          <div className="field-grid">
            <SelectSheet
              label={t("Tipo di forno")}
              value={c.ovenType}
              options={ovenOptions()}
              searchPlaceholder={t("Cerca Ariete, Ooni, legna…")}
              onChange={(id) => {
                const next = ovenProfiles.find((o) => o.id === id)!;
                const patch: Partial<DoughConfig> = {
                  ovenType: next.id,
                  ...(next.id === "custom" ? {} : { ovenTemp: next.maxTemp }),
                  ...(next.surface ? { bakeSurface: next.surface } : {}),
                  ...(next.fixedRack ? { ovenRack: "middle" as const } : {}),
                };
                onUpdate({ ...patch, bakeMinutes: recommendedBakeMinutes({ ...c, ...patch }) });
              }}
            />
            <NumberField
              label={t("Temperatura effettiva")}
              value={c.ovenTemp}
              onChange={(v) => onUpdate({ ovenTemp: v })}
              min={180}
              max={500}
              step={5}
              quantity="temp"
            />
          </div>
          <div className="oven-hint">
            <Gauge />
            <p>
              <strong>
                {t(oven.family)} {t("· preriscaldamento indicativo")} {oven.preheat} {t("min")}
              </strong>
              {localizeTemperatures(t(oven.note))}
              {oven.source && (
                <>
                  {" "}
                  <a href={oven.source} target="_blank" rel="noreferrer">
                    {t("Scheda del produttore")} <ArrowSquareOut />
                  </a>
                </>
              )}
            </p>
          </div>
          {userOvens.length > 0 && (
            <div className="my-ovens-picker">
              <span>{t("I tuoi forni")}</span>
              <div>
                {userOvens.map((item) => (
                  <button
                    key={item.id}
                    className={c.ovenType === item.ovenType && c.ovenTemp === item.temp ? "selected" : ""}
                    onClick={() => {
                      const model = ovenProfiles.find((o) => o.id === item.ovenType);
                      const patch: Partial<DoughConfig> = {
                        ovenType: item.ovenType,
                        ovenTemp: item.temp,
                        bakeSurface: item.bakeSurface,
                        ...(model?.fixedRack ? { ovenRack: "middle" as const } : {}),
                      };
                      onUpdate({ ...patch, bakeMinutes: recommendedBakeMinutes({ ...c, ...patch }) });
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
