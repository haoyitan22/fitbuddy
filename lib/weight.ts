import { getUser, saveUserData } from "@/lib/auth";
import { getMeals } from "@/lib/meals";
import { getDailyTargets } from "@/lib/goals";
import { dayKey } from "@/lib/date";

/* ──────────────────────────────────────────────────────────────
   Daily weigh-ins and daily diet scores, from what the user
   actually recorded. Nothing here is invented: days without a
   record are simply missing.
   ────────────────────────────────────────────────────────────── */

const WEIGHT_KEY = "fitbuddy_weight_log";

export interface WeighIn { date: string; kg: number }

function today() {
  return dayKey();
}

/** Oldest first. */
export function getWeightLog(): WeighIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(WEIGHT_KEY) || "{}") as Record<string, number>;
    return Object.entries(raw)
      .filter(([d, kg]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && kg > 0)
      .map(([date, kg]) => ({ date, kg }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch { return []; }
}

/**
 * Record today's weight (a second entry today replaces the first) and make it
 * the profile's current weight, so calorie targets follow it.
 */
export function logWeight(kg: number, date = today()): WeighIn[] {
  const v = Math.round(kg * 10) / 10;
  if (!(v >= 25 && v <= 300)) return getWeightLog();
  try {
    const raw = JSON.parse(localStorage.getItem(WEIGHT_KEY) || "{}") as Record<string, number>;
    raw[date] = v;
    localStorage.setItem(WEIGHT_KEY, JSON.stringify(raw));
    const u = getUser();
    if (u && date === today()) saveUserData({ ...u, weight: v });
  } catch { /* ignore */ }
  return getWeightLog();
}

/** Entries from the last `days` days (including today). */
export function recentWeighIns(days = 14): WeighIn[] {
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const start = dayKey(from);
  return getWeightLog().filter(w => w.date >= start);
}

/* ── diet score ─────────────────────────────────────────────── */

/**
 * 0–100 for one day, against the user's own targets: calories near the goal,
 * enough protein, fat under its cap. Only days with at least two meals are
 * scored, since one meal says little about the whole day.
 */
export function dayScore(date: string): number | null {
  const meals = getMeals(date);
  if (meals.length < 2) return null;
  const t = getDailyTargets();
  const cal = meals.reduce((s, m) => s + m.calories, 0);
  const protein = meals.reduce((s, m) => s + m.protein, 0);
  const fat = meals.reduce((s, m) => s + m.fat, 0);

  const calOff = Math.abs(cal - t.calories) / t.calories;          // 0 = on target
  const calPenalty = Math.min(40, Math.max(0, calOff - 0.1) * 100); // ±10% is free
  const proteinPenalty = Math.min(30, Math.max(0, 1 - protein / t.protein) * 40);
  const fatPenalty = Math.min(30, Math.max(0, fat / t.fat - 1) * 50);
  return Math.max(0, Math.round(100 - calPenalty - proteinPenalty - fatPenalty));
}

/** Monday..Sunday of this week, with a score for each day that has one. */
export function weekScores(): { date: string; label: string; score: number | null }[] {
  const DAYS = ["一", "二", "三", "四", "五", "六", "日"];
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const t = today();
  return DAYS.map((d, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    const date = dayKey(day);
    return { date, label: `周${d}`, score: date <= t ? dayScore(date) : null };
  });
}
