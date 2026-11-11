import { getUser, type UserProfile } from "@/lib/auth";

/* ──────────────────────────────────────────────────────────────
   Personal daily targets from the registration profile.
   Calories: Mifflin-St Jeor BMR × activity, minus a deficit sized to
   reach the target weight in the chosen months (300–750 kcal/day),
   never below a safe floor. Protein: 1.4 g per kg (fat-loss range).
   ────────────────────────────────────────────────────────────── */

export interface DailyTargets {
  calories: number;
  protein: number; // g
  fat: number;     // g, ~27% of calories
  personal: boolean; // false when the profile is incomplete and defaults are used
}

const DEFAULT: DailyTargets = { calories: 1500, protein: 80, fat: 45, personal: false };

const ACTIVITY: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, intense: 1.725 };

export function ageOf(birthday?: string): number | null {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a > 0 && a < 120 ? a : null;
}

export function targetsFor(u: Partial<UserProfile> | null): DailyTargets {
  const w = Number(u?.weight), h = Number(u?.height), age = ageOf(u?.birthday);
  if (!u || !(w > 25 && w < 300) || !(h > 100 && h < 250) || !age) return DEFAULT;
  const male = u.gender === "male";
  const bmr = 10 * w + 6.25 * h - 5 * age + (male ? 5 : -161);
  const tdee = bmr * (ACTIVITY[u.activityLevel ?? ""] ?? 1.375);

  const target = Number(u.targetWeight), months = Number(u.goalMonths) || 3;
  let deficit = 0;
  if (target > 0 && target < w) deficit = Math.min(750, Math.max(300, ((w - target) * 7700) / (months * 30)));

  const floor = male ? 1500 : 1200;
  const calories = Math.round(Math.max(floor, tdee - deficit) / 10) * 10;
  const protein = Math.round(Math.min(160, Math.max(50, w * 1.4)));
  const fat = Math.round((calories * 0.27) / 9);
  return { calories, protein, fat, personal: true };
}

export function getDailyTargets(): DailyTargets {
  if (typeof window === "undefined") return DEFAULT;
  return targetsFor(getUser());
}

const DIET_LABELS: Record<string, string> = {
  veg: "素食", nospicy: "不吃辣", lowcarb: "低碳水", hiprotein: "高蛋白",
};

/** Diet preferences picked on the profile page, as readable labels. */
export function getDietPrefs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const ids = JSON.parse(localStorage.getItem("fitbuddy_diet_prefs") || "[]") as string[];
    return ids.filter(id => DIET_LABELS[id]).map(id => DIET_LABELS[id]);
  } catch { return []; }
}
