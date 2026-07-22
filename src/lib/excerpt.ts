/** Primera oración completa, o hasta `max` caracteres cortados en el último espacio + "…". */
export function excerpt(text: string | null | undefined, max = 140): string {
  if (!text?.trim()) return "";

  const normalized = text.trim().replace(/\s+/g, " ");
  const sentenceMatch = normalized.match(/^[^.!?]+[.!?]/);
  if (sentenceMatch) {
    const sentence = sentenceMatch[0].trim();
    if (sentence.length <= max) return sentence;
  }

  if (normalized.length <= max) return normalized;

  const slice = normalized.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd();
  return `${cut}…`;
}
