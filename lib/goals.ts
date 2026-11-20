import { getUser, type UserProfile } from "@/lib/auth";

/* ──────────────────────────────────────────────────────────────
   Personal daily targets from the profile (sex, age, height, weight,
   activity, target weight and how many months to get there).

   1. BMR  — Mifflin-St Jeor:  10·kg + 6.25·cm − 5·age + 5 (men) / −161 (women)
   2. TDEE — BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725)
   3. Goal — the deficit that reaches the target weight on time
            (7700 kcal ≈ 1 kg of body fat), capped at 25% of TDEE so it
            scales with body size; gaining weight gets a ≤10% surplus.
   4. Floor — never below 1200 (women) / 1500 (men) kcal, the usual
            minimum for dieting without medical supervision.
   Protein 1.4 g/kg (higher BMI: per kg of an adjusted weight at BMI 25),
   fat ≈ 27% of calories.
   ────────────────────────────────────────────────────────────── */

export interface TargetPlan {
  bmr: number;
  activityFactor: number;
  tdee: number;
  goal: "lose" | "maintain" | "gain";
  /** kcal/day below (negative) or above (positive) TDEE that was applied. */
  adjust: number;
  /** kg per week the plan works out to. */
  weeklyKg: number;
  /** The target pace was too fast and was slowed to a safe one. */
  capped: boolean;
  /** The 1200 / 1500 minimum decided the number. */
  floored: boolean;
  /** Months the plan needs at the applied pace (lose / gain only). */
  monthsNeeded: number | null;
}

export interface DailyTargets {
  calories: number;
  protein: number; // g
  fat: number;     // g, ~27% of calories
  personal: boolean; // false when the profile is incomplete and defaults are used
  plan?: TargetPlan;
}

const DEFAULT: DailyTargets = { calories: 1500, protein: 80, fat: 45, personal: false };

const ACTIVITY: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, intense: 1.725 };

export function ageOf(birthday?: string): number | null {
  if (!birthday) return null;
  // "YYYY-MM-DD" read as a local date (new Date("YYYY-MM-DD") would be UTC midnight).
  const [y, mo, d] = birthday.slice(0, 10).split("-").map(Number);
  const b = new Date(y, (mo || 1) - 1, d || 1);
  if (!y || isNaN(b.getTime())) return null;
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
  const activityFactor = ACTIVITY[u.activityLevel ?? ""] ?? 1.375;
  const tdee = bmr * activityFactor;

  const target = Number(u.targetWeight);
  const months = Math.max(1, Number(u.goalMonths) || 3);
  const diffKg = target > 0 ? w - target : 0;          // > 0: to lose
  const goal: TargetPlan["goal"] = diffKg > 0.5 ? "lose" : diffKg < -0.5 ? "gain" : "maintain";

  // The daily change that would hit the target on time.
  const wanted = (Math.abs(diffKg) * 7700) / (months * 30.4);
  let adjust = 0, capped = false;
  if (goal === "lose") {
    const cap = Math.min(tdee * 0.25, 1000);
    capped = wanted > cap;
    adjust = -Math.min(wanted, cap);
  } else if (goal === "gain") {
    const cap = Math.min(tdee * 0.1, 400);
    capped = wanted > cap;
    adjust = Math.min(wanted, cap);
  }

  const floor = male ? 1500 : 1200;
  const raw = tdee + adjust;
  const floored = raw < floor;
  const calories = Math.round(Math.max(floor, raw) / 10) * 10;
  const applied = Math.round(calories - tdee) || 0;     // what the plan really does per day
  const weeklyKg = Math.round(((applied * 7) / 7700) * 100) / 100 || 0;
  const monthsNeeded = goal === "maintain" || Math.abs(applied) < 50
    ? null
    : Math.round((Math.abs(diffKg) * 7700) / (Math.abs(applied) * 30.4) * 10) / 10;

  // Protein per kg; with a high BMI, per kg of the weight at BMI 25 (adjusted body weight).
  const bmi = w / (h / 100) ** 2;
  const proteinKg = bmi > 27 ? 25 * (h / 100) ** 2 + 0.25 * (w - 25 * (h / 100) ** 2) : w;
  const protein = Math.round(Math.min(180, Math.max(50, proteinKg * (goal === "lose" ? 1.4 : 1.2))));
  const fat = Math.round((calories * 0.27) / 9);

  return {
    calories, protein, fat, personal: true,
    plan: { bmr: Math.round(bmr), activityFactor, tdee: Math.round(tdee), goal, adjust: Math.round(applied), weeklyKg, capped, floored, monthsNeeded },
  };
}

export function getDailyTargets(): DailyTargets {
  if (typeof window === "undefined") return DEFAULT;
  return targetsFor(getUser());
}

const DIET_LABELS: Record<string, string> = {
  veg: "素食", nospicy: "不吃辣", lowcarb: "低碳水", hiprotein: "高蛋白",
  light: "口味清淡", heavy: "口味偏重", fasting: "轻断食",
  noseafood: "不吃海鲜", nomeat: "不吃牛羊肉", nodairy: "不吃乳制品", nocilantro: "不吃香菜",
};

/** Diet preferences picked on the profile page, as readable labels. */
export function getDietPrefs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const ids = JSON.parse(localStorage.getItem("fitbuddy_diet_prefs") || "[]") as string[];
    return ids.filter(id => DIET_LABELS[id]).map(id => DIET_LABELS[id]);
  } catch { return []; }
}
