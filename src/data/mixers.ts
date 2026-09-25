export interface MixerProfile {
  id: string;
  name: string;
  family: string;
  tool: string;
  start: string;
  knead: string;
  finish: string;
  source?: string;
  note: string;
}

// The speed labels deliberately mirror each manufacturer's controls rather than
// pretending that a "2" is equivalent across different machines.
export const mixerProfiles: MixerProfile[] = [
  {
    id: 'generic-planetary', name: 'Planetaria generica', family: 'Qualsiasi marca',
    tool: 'Gancio impastatore', start: 'Minima · 1–2 min', knead: 'Bassa · 4–6 min',
    finish: 'Bassa/media, solo a impulsi brevi',
    note: 'Parti sempre dalla velocità minima. Fermati se la testa oscilla, il motore fatica o l’impasto supera la temperatura obiettivo.'
  },
  {
    id: 'kitchenaid-tilt', name: 'KitchenAid Classic / Artisan', family: 'KitchenAid testa reclinabile',
    tool: 'Gancio impastatore', start: 'Velocità 1 · 1–2 min', knead: 'Velocità 2 · max 4–6 min totali',
    finish: 'Resta a velocità 2', source: 'https://www.kitchenaid.it/faq/tempi-e-velocita-di-impasto',
    note: 'KitchenAid indica la velocità 2 per gli impasti lievitati: non superarla e rispetta il carico massimo del tuo modello.'
  },
  {
    id: 'kenwood-chef', name: 'Kenwood Chef / kMix', family: 'Kenwood Chef e kMix',
    tool: 'Gancio impastatore', start: 'Minimo · 1 min', knead: 'Velocità 1 · circa 4 min',
    finish: 'Velocità 1; brevi pause tra le aggiunte', source: 'https://www.kenwoodworld.com/it-it/r/recipes/pasta-per-la-pizza%3A-la-ricetta-classica/bltf608b7c073038917',
    note: 'Per impasti molto idratati versa l’acqua di riserva in più riprese, aspettando ogni volta che venga assorbita.'
  },
  {
    id: 'bosch-mum5', name: 'Bosch MUM5', family: 'Bosch Serie MUM5',
    tool: 'Gancio impastatore', start: 'Velocità 1 · 30 sec', knead: 'Velocità 3 · 4–5 min',
    finish: 'Velocità 3, controllando la temperatura', source: 'https://media3.bosch-home.com/Documents/8001180752_A.pdf',
    note: 'Il riferimento viene dalla lavorazione per pane del ricettario MUM5. Non oltrepassare quantità e durata indicate dal manuale del tuo codice prodotto.'
  },
  {
    id: 'moulinex-masterchef', name: 'Moulinex Masterchef', family: 'Masterchef Essential / Gourmet',
    tool: 'Gancio impastatore', start: 'Velocità 1 · 1–2 min', knead: 'Velocità 2 · 4–6 min',
    finish: 'Velocità 2–3 solo se la macchina resta stabile', source: 'https://www.moulinex.it/istruzioni-per-uso/preparazione-di-alimenti/impastatrici/impastatrice-masterchef-gourmet/csp/2820510110',
    note: 'Indicazione prudenziale per la famiglia Masterchef: la scala e la capacità cambiano tra modelli, quindi verifica il manuale della tua referenza.'
  }
];
