const ALIASES: [RegExp, string][] = [
  [/^dados mestres\b/i, "Mestres"],
  [/^ia[,\s]/i, "IA/Analytics"],
];

export function shortDimensionLabel(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";

  for (const [pattern, label] of ALIASES) {
    if (pattern.test(trimmed)) return label;
  }

  const [first] = trimmed.split(/\s+/);
  return first.replace(/[,.;:]+$/, "");
}
