// Foto da Unsplash (vedi src/assets/photos/CREDITS.md), incluse nell'app perché funzioni anche offline.
import napoletana from "../assets/photos/napoletana.webp";
import contemporanea from "../assets/photos/contemporanea.webp";
import romana from "../assets/photos/romana.webp";
import teglia from "../assets/photos/teglia.webp";
import pala from "../assets/photos/pala.webp";
import padellino from "../assets/photos/padellino.webp";
import focaccia from "../assets/photos/focaccia.webp";
import focacciaBarese from "../assets/photos/focaccia-barese.webp";
import newYork from "../assets/photos/new-york.webp";
import detroit from "../assets/photos/detroit.webp";
import pinsa from "../assets/photos/pinsa.webp";
import sfincione from "../assets/photos/sfincione.webp";
import tondaCasa from "../assets/photos/tonda-casa.webp";
import heroFire from "../assets/photos/hero-fire.webp";
import heroDough from "../assets/photos/hero-dough.webp";
import doughDark from "../assets/photos/dough-dark.webp";
import pantry from "../assets/photos/pantry.webp";
import starter from "../assets/photos/starter.webp";
import toppings from "../assets/photos/toppings.webp";
import kneading from "../assets/photos/kneading.webp";

const stylePhotos: Record<string, string> = {
  napoletana,
  contemporanea,
  romana,
  teglia,
  pala,
  padellino,
  focaccia,
  "focaccia-barese": focacciaBarese,
  "new-york": newYork,
  detroit,
  pinsa,
  sfincione,
  "tonda-casa": tondaCasa,
};

export const stylePhoto = (styleId: string) => stylePhotos[styleId] ?? napoletana;
export const photos = { heroFire, heroDough, doughDark, pantry, starter, toppings, kneading };
