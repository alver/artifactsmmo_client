// The page's small text helpers (task 019's Roadmap, task 028's one page): UTC times, hours, ages, a skill's name.

export const DAY = 864e5;
export const when = (t: number): string => new Date(t).toISOString().slice(5, 16).replace("T", " ") + "Z";
export const date = (t: number): string => new Date(t).toISOString().slice(0, 10);
export const hrs = (h: number): string => (h < 10 ? h.toFixed(1) : String(Math.round(h)));
export function ago(t: number): string {
  const m = Math.max(0, (Date.now() - t) / 60_000);
  return m < 90 ? `${Math.round(m)} min ago` : m < 48 * 60 ? `${hrs(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}
/** "weaponcrafting" → "weapon", "jewelrycrafting" → "jewelry": the short names of a narrow card. */
export const skillShort = (s: string): string => s.replace(/crafting$/, "");
