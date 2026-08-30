const DIGIT: Record<number, string> = {
  0: "#0a0a0a",
  1: "#7c2d12",
  2: "#ef4444",
  3: "#f97316",
  4: "#eab308",
  5: "#22c55e",
  6: "#3b82f6",
  7: "#a855f7",
  8: "#6b7280",
  9: "#f8fafc",
};

export function resistorBands(ohms: number): string[] {
  if (ohms <= 0) return ["#0a0a0a", "#0a0a0a", "#0a0a0a", "#fbbf24"];
  const exp = Math.floor(Math.log10(ohms));
  const mult = exp - 1;
  const digits = Math.round(ohms / 10 ** mult);
  const d1 = Math.floor(digits / 10) % 10;
  const d2 = digits % 10;
  return [DIGIT[d1] ?? "#0a0a0a", DIGIT[d2] ?? "#0a0a0a", DIGIT[mult] ?? "#7c2d12", "#fbbf24"];
}
