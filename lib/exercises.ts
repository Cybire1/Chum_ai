// Fitness data layer — wraps the vendored free-exercise-db (public domain,
// ~873 exercises, fully offline). Images are pulled from the repo's raw CDN
// for now (swap to a bundled/curated subset before a privacy-clean prod build).
import data from "../assets/data/exercises.json";

export type Level = "beginner" | "intermediate" | "expert";

export type Exercise = {
  id: string;
  name: string;
  force: string | null;
  level: Level;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
};

export const EXERCISES = data as unknown as Exercise[];

const RAW_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export const imageUrl = (path: string): string => RAW_BASE + path;
export const exerciseImage = (ex: Exercise): string | null => {
  const first = ex.images?.[0];
  return first ? imageUrl(first) : null;
};

export const CATEGORIES = [...new Set(EXERCISES.map((e) => e.category))].sort();
export const MUSCLES = [...new Set(EXERCISES.flatMap((e) => e.primaryMuscles))].sort();
export const EQUIPMENT = [
  ...new Set(EXERCISES.map((e) => e.equipment).filter((x): x is string => Boolean(x))),
].sort();

export const titleCase = (s: string | null): string =>
  (s ?? "").replace(/\b\w/g, (c) => c.toUpperCase());

// On-brand visual per category — a playful gradient/tinted tile + icon, so the
// list reads cohesive instead of leaning on the clinical stock photos.
export type CategoryVisual = { icon: string; color: string; soft: string };
// Dark candy tiles — pink/mint/blue icons on a translucent dark tint of the same
// hue (no purple, no orange). soft = the chip background on near-black.
const CATEGORY_VISUAL: Record<string, CategoryVisual> = {
  strength: { icon: "barbell", color: "#5FE0AE", soft: "rgba(95,224,174,0.14)" },
  "olympic weightlifting": { icon: "barbell", color: "#5FB0FF", soft: "rgba(95,176,255,0.14)" },
  powerlifting: { icon: "barbell", color: "#FF6FA5", soft: "rgba(255,111,165,0.14)" },
  strongman: { icon: "fitness", color: "#5FB0FF", soft: "rgba(95,176,255,0.14)" },
  cardio: { icon: "heart", color: "#FF6FA5", soft: "rgba(255,111,165,0.14)" },
  plyometrics: { icon: "flash", color: "#5FE0AE", soft: "rgba(95,224,174,0.14)" },
  stretching: { icon: "accessibility", color: "#5FB0FF", soft: "rgba(95,176,255,0.14)" },
};
export const categoryVisual = (category: string): CategoryVisual =>
  CATEGORY_VISUAL[category] ?? { icon: "fitness", color: "#5FE0AE", soft: "rgba(95,224,174,0.14)" };

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

// Match a free-text exercise name (e.g. from an AI plan) to a DB exercise so it
// becomes tappable → form + how-to. Exact-normalized first, then token overlap.
const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["the", "a", "an", "with", "to", "and", "of", "for", "on"]);

const ALIAS: Record<string, string> = {
  "pull up": "Pullups",
  "pull ups": "Pullups",
  "chin up": "Chin-Up",
  dips: "Dips - Triceps Version",
  "tricep dips": "Dips - Triceps Version",
  "triceps dips": "Dips - Triceps Version",
  "mountain climber": "Mountain Climbers",
  "mountain climbers": "Mountain Climbers",
};

export function findExerciseByName(name: string): Exercise | undefined {
  const q = norm(name);
  if (!q) return undefined;
  const exact = EXERCISES.find((e) => norm(e.name) === q);
  if (exact) return exact;
  const aliased = ALIAS[q];
  if (aliased) {
    const e = EXERCISES.find((x) => norm(x.name) === norm(aliased));
    if (e) return e;
  }
  // single-token queries ("push", "pull") are too ambiguous — only fuzzy-match
  // multi-word names (the compound lifts an AI plan actually returns).
  const qTokens = q.split(" ").filter((t) => t.length > 2 && !STOP.has(t));
  if (qTokens.length < 2) return undefined;
  let best: Exercise | undefined;
  let bestScore = 0;
  let bestLen = Infinity;
  for (const e of EXERCISES) {
    const eTokens = norm(e.name).split(" ");
    const eSet = new Set(eTokens);
    let s = 0;
    for (const t of qTokens) {
      if (eSet.has(t)) s += 1; // whole-word match
      else if (eTokens.some((w) => w.startsWith(t) || t.startsWith(w))) s += 0.6; // prefix
    }
    const score = s / qTokens.length;
    // higher score wins; ties go to the shorter (more specific) name
    if (score > bestScore || (score === bestScore && eTokens.length < bestLen)) {
      bestScore = score;
      best = e;
      bestLen = eTokens.length;
    }
  }
  return bestScore >= 0.6 ? best : undefined;
}

export type ExerciseFilter = {
  query?: string;
  muscle?: string;
  category?: string;
  equipment?: string;
  level?: Level;
};

export function searchExercises(f: ExerciseFilter = {}): Exercise[] {
  const q = f.query?.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q)) return false;
    if (f.muscle && !e.primaryMuscles.includes(f.muscle) && !e.secondaryMuscles.includes(f.muscle))
      return false;
    if (f.category && e.category !== f.category) return false;
    if (f.equipment && e.equipment !== f.equipment) return false;
    if (f.level && e.level !== f.level) return false;
    return true;
  });
}
