import { t, msg } from "../i18n";
import { FirstAid, Warning } from '@phosphor-icons/react';
import { useState } from 'react';
import { SelectSheet } from './SelectSheet';

const fixes={
  sticky:[msg('Troppo appiccicoso'),msg('Ferma la macchina 10 minuti, bagna leggermente le mani e fai una piega. Non aggiungere farina di scatto: prima verifica se una pausa restituisce struttura.')],
  hot:[msg('Impasto troppo caldo'),msg('Sospendi la lavorazione, allarga la massa in un contenitore fresco e portala brevemente in frigo. Riprendi solo quando la temperatura si avvicina all’obiettivo.')],
  weak:[msg('Non prende corda'),msg('Riduci la velocità, fai una pausa di 10 minuti e riparti con brevi cicli. Se hai acqua di riserva, non aggiungerla finché la massa non pulisce la ciotola.')],
  fast:[msg('Sta crescendo troppo'),msg('Anticipa staglio o frigorifero. Non sgonfiare ripetutamente: abbassa la temperatura e controlla di nuovo dopo 20–30 minuti.')],
  slow:[msg('Non sta crescendo'),msg('Porta l’impasto in un punto più tiepido e attendi senza aggiungere altro lievito. Controlla temperatura interna e vitalità del lievito usato.')],
  torn:[msg('Si strappa in stesura'),msg('Copri e lascia rilassare 15–20 minuti. Stendi con meno forza; se resta tenace, la massa è ancora fredda o poco rilassata.')],
} as const;
export function DoughRescue(){const [issue,setIssue]=useState<keyof typeof fixes>('sticky');const fix=fixes[issue];return <section className="panel rescue"><div className="panel-title"><span className="section-icon"><FirstAid/></span><div><h2>{t("Pronto soccorso impasto")}</h2><p>{t("Dimmi cosa vedi, non cosa dice l’orologio.")}</p></div></div><SelectSheet label={t("Cosa sta succedendo?")} value={issue} options={(Object.keys(fixes) as (keyof typeof fixes)[]).map(id=>({value:id,label:t(fixes[id][0])}))} onChange={setIssue}/><div className="rescue-answer"><Warning/><div><strong>{t(fix[0])}</strong><p>{t(fix[1])}</p></div></div></section>}
