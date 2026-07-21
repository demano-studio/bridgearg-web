export const CM_TO_IN = 0.393701;
export const KG_TO_LB = 2.20462;

function isMissingValue(value: number | null | undefined): boolean {
  return value == null || Number.isNaN(value) || value === 0;
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

export function cmToIn(cm: number | null | undefined): number | null {
  if (isMissingValue(cm)) return null;
  return cm * CM_TO_IN;
}

export function kgToLb(kg: number | null | undefined): number | null {
  if (isMissingValue(kg)) return null;
  return kg * KG_TO_LB;
}

export function formatPounds(kg: number | null | undefined): string {
  const converted = kgToLb(kg);
  if (converted == null) return "—";
  return `${formatOneDecimal(converted)} lb`;
}

export function parseDimensionsCm(dimensions: string | null | undefined): number[] {
  if (!dimensions || !dimensions.trim()) return [];

  const normalized = dimensions
    .toLowerCase()
    .trim()
    .replace(/[×*x]/g, "x")
    .replace(/\s*cm\b/g, "");

  return normalized
    .split("x")
    .map((part) => Number.parseFloat(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function formatDimensionsFromString(dimensions: string | null | undefined): string {
  const valuesInCm = parseDimensionsCm(dimensions);
  if (!valuesInCm.length) return "Dimensions on request";

  const valuesInInches = valuesInCm
    .map((valueCm) => cmToIn(valueCm))
    .filter((valueIn): valueIn is number => valueIn != null)
    .map((valueIn) => formatOneDecimal(valueIn));

  if (!valuesInInches.length) return "Dimensions on request";
  return `${valuesInInches.join(" x ")} in`;
}
