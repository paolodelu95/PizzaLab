import { t } from "../i18n";
import type { Stage } from "../domain/types";

export interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
// Testo nel formato iCalendar: virgole, punti e virgola e a capo vanno protetti.
const escape = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Le righe oltre 75 caratteri si spezzano con uno spazio all’inizio della riga seguente.
const fold = (line: string) => {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
};

/** File .ics con un avviso per ogni evento: il Calendario del telefono avvisa anche a app chiusa. */
export function buildCalendar(name: string, events: CalendarEvent[], leadMinutes: number) {
  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PizzaLab//Piano impasto//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(event.end)}`,
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(event.description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escape(event.title)}`,
      `TRIGGER:-PT${Math.max(0, leadMinutes)}M`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Fasi future dell’impasto come eventi di calendario (almeno 5 minuti ciascuno). */
export function stagesToEvents(recipeId: string, recipeName: string, stages: Stage[], now = Date.now()): CalendarEvent[] {
  return stages
    .filter((stage) => new Date(stage.at).getTime() > now)
    .map((stage) => {
      const start = new Date(stage.at);
      const until = new Date(stage.until).getTime();
      return {
        uid: `${recipeId}-${stage.id}@pizzalab`,
        title: t("PizzaLab · {title}", { title: stage.title }),
        description: `${recipeName}\n${stage.detail}`,
        start,
        end: new Date(Math.max(start.getTime() + 5 * 60000, Number.isFinite(until) ? Math.min(until, start.getTime() + 60 * 60000) : 0)),
      };
    });
}

/** Scarica il file: iPhone e Android lo aprono nel Calendario, che chiede se aggiungere gli eventi. */
export function downloadCalendar(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
