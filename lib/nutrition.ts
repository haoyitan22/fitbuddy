import type { FoodItem, MealRecord, MealType } from "@/lib/meals";
import { getMeals } from "@/lib/meals";
import { getDailyTargets, type DailyTargets } from "@/lib/goals";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];
export const MEAL_LABELS: Record<MealType, string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐" };

export interface Totals { calories: number; protein: number; carbs: number; fat: number }

export function sumItems(items: FoodItem[]): Totals {
  const t = items.reduce(
    (s, i) => ({ calories: s.calories + i.calories, protein: s.protein + i.protein, carbs: s.carbs + i.carbs, fat: s.fat + i.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return { calories: Math.round(t.calories), protein: Math.round(t.protein), carbs: Math.round(t.carbs), fat: Math.round(t.fat) };
}

/** Change an item's portion; nutrition scales with it. */
export function scaleItem(item: FoodItem, grams: number): FoodItem {
  const g = Math.max(1, Math.round(grams));
  if (item.grams <= 0) return { ...item, grams: g };
  const f = g / item.grams;
  const r = (n: number) => Math.round(n * f * 10) / 10;
  return { ...item, grams: g, calories: r(item.calories), protein: r(item.protein), carbs: r(item.carbs), fat: r(item.fat) };
}

/* ── everyday units ─────────────────────────────────────────── */

/** Units offered when adding a food by hand. */
export const UNITS = ["份", "碗", "个", "串", "只", "块", "片", "杯"];
/** Units that go up and down in halves (things you don't count one by one). */
const HALF_UNITS = new Set(["份", "碗", "盘", "杯", "勺", "根"]);

export function unitOf(item: FoodItem): { unit: string; count: number } {
  const unit = item.unit?.trim() || "份";
  const count = item.count && item.count > 0 ? item.count : 1;
  return { unit, count };
}

export function stepOf(unit: string): number {
  return HALF_UNITS.has(unit) ? 0.5 : 1;
}

/** "半碗", "1.5 碗", "6 串" */
export function formatCount(count: number, unit: string): string {
  if (count === 0.5) return `半${unit}`;
  return `${Number.isInteger(count) ? count : count.toFixed(1)} ${unit}`;
}

/** Change how many units were eaten; grams and nutrition scale with it. */
export function setCount(item: FoodItem, count: number): FoodItem {
  const { unit, count: old } = unitOf(item);
  const step = stepOf(unit);
  const c = Math.min(99, Math.max(step, Math.round(count / step) * step));
  if (c === old) return item;
  const perUnit = item.grams / old;
  return { ...scaleItem(item, perUnit * c), unit, count: c };
}

/** Records saved before per-food items existed become one editable "whole portion" item. */
export function itemsOf(record: Pick<MealRecord, "items" | "foods" | "calories" | "protein" | "carbs" | "fat">): FoodItem[] {
  if (record.items?.length) return record.items;
  return [{ name: record.foods || "这一餐", grams: 100, unit: "份", count: 1, calories: record.calories, protein: record.protein, carbs: record.carbs, fat: record.fat }];
}

/* ── next meal ─────────────────────────────────────────────── */

export interface NextMealPlan {
  nextMeal: string;        // e.g. "午餐" or "明天早餐"
  budget: number;          // kcal suggested for it
  eaten: Totals;           // today including the current meal
  remaining: number;       // kcal left today (can be negative)
  targets: DailyTargets;   // the user's personal daily targets
  meals: { label: string; foods: string; calories: number; protein: number }[]; // today so far
  flags: string[];         // e.g. ["蛋白质偏低", "脂肪偏高"]
}

/** Plan the next meal from everything eaten today, with `current` replacing today's record of `mealType`. */
export function planNextMeal(mealType: MealType, current: Totals): NextMealPlan {
  const today = getMeals();
  const others = today.filter(m => m.mealType !== mealType);
  const eaten = {
    calories: current.calories + others.reduce((s, m) => s + m.calories, 0),
    protein: current.protein + others.reduce((s, m) => s + m.protein, 0),
    carbs: current.carbs + others.reduce((s, m) => s + m.carbs, 0),
    fat: current.fat + others.reduce((s, m) => s + m.fat, 0),
  };
  const targets = getDailyTargets();
  const remaining = targets.calories - eaten.calories;

  // Meals after this one that are still unrecorded share what is left of today's budget.
  const idx = MEAL_ORDER.indexOf(mealType);
  const left = MEAL_ORDER.slice(idx + 1).filter(t => !today.some(m => m.mealType === t));
  let nextMeal: string, budget: number;
  if (left.length) {
    nextMeal = MEAL_LABELS[left[0]];
    budget = remaining > 0 ? remaining / left.length : 300;
  } else {
    nextMeal = "明天早餐";
    budget = targets.calories * 0.3;
  }
  budget = Math.max(250, Math.min(700, Math.round(budget / 10) * 10));

  const flags: string[] = [];
  if (remaining < 0) flags.push(`今天已超出 ${-remaining} kcal`);
  const proteinGap = targets.protein - eaten.protein;
  if (proteinGap > 10) flags.push(`蛋白质还差 ${Math.round(proteinGap)}g`);
  if (eaten.fat > targets.fat) flags.push(`脂肪超出 ${Math.round(eaten.fat - targets.fat)}g`);
  else if (eaten.calories > 0 && (eaten.fat * 9) / eaten.calories > 0.35) flags.push("脂肪占比偏高");

  const meals = MEAL_ORDER.flatMap(t => {
    if (t === mealType) return [{ label: MEAL_LABELS[t], foods: "", calories: current.calories, protein: current.protein }];
    const m = today.find(r => r.mealType === t);
    return m ? [{ label: MEAL_LABELS[t], foods: m.foods, calories: m.calories, protein: m.protein }] : [];
  });
  return { nextMeal, budget, eaten, remaining, flags, targets, meals };
}

export interface MealIdea { name: string; kcal: number; why: string; protein?: number }

/** Offline suggestions, used when the AI is unavailable. */
const MENU: (MealIdea & { tags: string[] })[] = [
  { name: "鸡胸肉藜麦沙拉", kcal: 380, why: "高蛋白、低脂，饱腹感强", tags: ["protein", "lowfat"] },
  { name: "清蒸鱼 + 半碗糙米 + 青菜", kcal: 460, why: "优质蛋白，油少好消化", tags: ["protein", "lowfat"] },
  { name: "虾仁西兰花 + 杂粮饭", kcal: 420, why: "补蛋白又有膳食纤维", tags: ["protein", "lowfat"] },
  { name: "番茄鸡蛋荞麦面", kcal: 450, why: "碳水适中，暖胃易做", tags: ["protein"] },
  { name: "豆腐蔬菜汤 + 杂粮馒头", kcal: 360, why: "清淡低卡，植物蛋白", tags: ["lowfat"] },
  { name: "无糖酸奶 + 燕麦 + 蓝莓", kcal: 300, why: "轻食搭配，适合晚一点吃", tags: ["light", "protein"] },
  { name: "全麦鸡肉三明治 + 牛奶", kcal: 480, why: "方便带走，营养均衡", tags: ["protein"] },
  { name: "凉拌鸡丝 + 黄瓜 + 玉米", kcal: 340, why: "清爽少油，蛋白充足", tags: ["protein", "lowfat", "light"] },
  { name: "牛肉蔬菜粥", kcal: 400, why: "温和饱腹，铁和蛋白都有", tags: ["protein"] },
];

export function fallbackIdeas(plan: NextMealPlan): MealIdea[] {
  const want = new Set<string>();
  if (plan.flags.some(f => f.startsWith("蛋白质"))) want.add("protein");
  if (plan.flags.some(f => f.startsWith("脂肪"))) want.add("lowfat");
  if (plan.budget < 350) want.add("light");
  return MENU
    .map(m => ({ m, score: -Math.abs(m.kcal - plan.budget) / 50 + m.tags.filter(t => want.has(t)).length * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ m }) => ({ name: m.name, kcal: m.kcal, why: m.why }));
}
