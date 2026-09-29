import { weightParts } from "../services/units";

/** Peso nell’unità scelta, con l’unità in un elemento a parte (`span` o `small`) come nelle tessere delle dosi. */
export function WeightValue({ grams, digits = 0, tag = "span" }: { grams: number; digits?: number; tag?: "span" | "small" }) {
  const { value, unit } = weightParts(grams, digits);
  return tag === "small" ? (
    <>
      {value}
      <small> {unit}</small>
    </>
  ) : (
    <>
      {value} <span>{unit}</span>
    </>
  );
}
