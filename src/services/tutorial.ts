import { Preferences } from "@capacitor/preferences";

const KEY = "pizzalab-tutorial-v1";

/** Il tutorial compare una sola volta; il segno è separato dall’archivio delle ricette. */
export async function tutorialSeen() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return value === "done";
  } catch {
    return true;
  }
}

export async function markTutorialSeen() {
  try {
    await Preferences.set({ key: KEY, value: "done" });
  } catch {
    /* Se la memoria non è disponibile il tutorial ricomparirà: nessun dato va perso. */
  }
}
