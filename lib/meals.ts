export type MealType = "breakfast" | "lunch" | "dinner";

export interface MealRecord {
  id: string;
  mealType: MealType;
  date: string;        // YYYY-MM-DD
  imageBase64?: string;
  foods: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function key(date: string) {
  return `fitbuddy_meals_${date}`;
}

export function getMeals(date?: string): MealRecord[] {
  if (typeof window === "undefined") return [];
  const d = date ?? todayStr();
  const raw = localStorage.getItem(key(d));
  if (!raw) return [];
  try { return JSON.parse(raw) as MealRecord[]; } catch { return []; }
}

export function saveMeal(meal: Omit<MealRecord, "id" | "date" | "createdAt">): MealRecord {
  const date = todayStr();
  const existing = getMeals(date);
  // replace if same mealType already exists for today
  const filtered = existing.filter(m => m.mealType !== meal.mealType);
  const record: MealRecord = {
    ...meal,
    id: Date.now().toString(),
    date,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(key(date), JSON.stringify([...filtered, record]));
  return record;
}

export function deleteMeal(mealType: MealType, date?: string) {
  const d = date ?? todayStr();
  const existing = getMeals(d);
  localStorage.setItem(key(d), JSON.stringify(existing.filter(m => m.mealType !== mealType)));
}

export function getTodayTotals() {
  const meals = getMeals();
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein:  acc.protein  + m.protein,
      carbs:    acc.carbs    + m.carbs,
      fat:      acc.fat      + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
