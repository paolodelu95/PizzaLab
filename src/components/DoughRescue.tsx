import { FirstAid, Warning } from '@phosphor-icons/react';
import { useState } from 'react';

const fixes={
  sticky:['Troppo appiccicoso','Ferma la macchina 10 minuti, bagna leggermente le mani e fai una piega. Non aggiungere farina di scatto: prima verifica se una pausa restituisce struttura.'],
  hot:['Impasto troppo caldo','Sospendi la lavorazione, allarga la massa in un contenitore fresco e portala brevemente in frigo. Riprendi solo quando la temperatura si avvicina all’obiettivo.'],
  weak:['Non prende corda','Riduci la velocità, fai una pausa di 10 minuti e riparti con brevi cicli. Se hai acqua di riserva, non aggiungerla finché la massa non pulisce la ciotola.'],
  fast:['Sta crescendo troppo','Anticipa staglio o frigorifero. Non sgonfiare ripetutamente: abbassa la temperatura e controlla di nuovo dopo 20–30 minuti.'],
  slow:['Non sta crescendo','Porta l’impasto in un punto più tiepido e attendi senza aggiungere altro lievito. Controlla temperatura interna e vitalità del lievito usato.'],
  torn:['Si strappa in stesura','Copri e lascia rilassare 15–20 minuti. Stendi con meno forza; se resta tenace, la massa è ancora fredda o poco rilassata.'],
} as const;
export function DoughRescue(){const [issue,setIssue]=useState<keyof typeof fixes>('sticky');const fix=fixes[issue];return <section className="panel rescue"><div className="panel-title"><span className="section-icon"><FirstAid/></span><div><h2>Pronto soccorso impasto</h2><p>Dimmi cosa vedi, non cosa dice l’orologio.</p></div></div><label className="field">Cosa sta succedendo?<select value={issue} onChange={e=>setIssue(e.target.value as keyof typeof fixes)}>{Object.entries(fixes).map(([id,[title]])=><option key={id} value={id}>{title}</option>)}</select></label><div className="rescue-answer"><Warning/><div><strong>{fix[0]}</strong><p>{fix[1]}</p></div></div></section>}
