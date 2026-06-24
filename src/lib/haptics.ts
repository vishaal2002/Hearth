/** Light haptic feedback when supported (mobile). */
export function haptic(kind: "light" | "medium" | "success" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const pattern = kind === "light" ? 8 : kind === "medium" ? 16 : [12, 40, 12];
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
