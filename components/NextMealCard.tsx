"use client";

import { useEffect, useState } from "react";
import type { MealType } from "@/lib/meals";
import { fallbackIdeas, planNextMeal, type MealIdea, type Totals } from "@/lib/nutrition";
import { CALORIE_GOAL } from "@/lib/pets";

const ink = "#3B1F5E", grey = "#9CA3AF", purple = "#C084FC";
const CACHE_KEY = "fitbuddy_next_meal";

type Cached = { sig: string; ideas: MealIdea[]; tip: string; ai: boolean };

/**
 * Suggests the next meal from today's intake. AI ideas are fetched once per
 * meal + totals (cached), so revisiting does not cost another request; edits
 * leave the old ideas on screen with a button to refresh them.
 */
export default function NextMealCard({ mealType, totals, lastMeal }: { mealType: MealType; totals: Totals; lastMeal: string }) {
  const plan = planNextMeal(mealType, totals);
  const sig = `${new Date().toISOString().slice(0, 10)}|${mealType}|${plan.eaten.calories}|${plan.eaten.protein}|${plan.eaten.fat}`;
  const [data, setData] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(force = false) {
    if (!force) {
      try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null") as Cached | null;
        if (c && c.sig === sig) { setData(c); return; }
      } catch { /* ignore */ }
    }
    setLoading(true);
    let next: Cached;
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "suggest", goal: CALORIE_GOAL, eaten: plan.eaten, lastMeal, nextMeal: plan.nextMeal, budget: plan.budget, flags: plan.flags }),
      });
      const json = await res.json();
      if (!res.ok || !json.ideas?.length) throw new Error();
      next = { sig, ideas: json.ideas, tip: json.tip || "", ai: true };
    } catch {
      next = { sig, ideas: fallbackIdeas(plan), tip: "", ai: false };
    }
    setData(next);
    setLoading(false);
    // Only AI answers are cached, so a failed call is retried next time.
    if (next.ai) try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // First time: load (from cache if it matches). Later edits only mark the ideas as stale.
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const stale = !!data && data.sig !== sig;

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 2px 16px rgba(192,132,252,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ink }}>🥗 {plan.nextMeal}吃什么</p>
        <p style={{ margin: 0, fontSize: 13, color: purple, fontWeight: 700, whiteSpace: "nowrap" }}>建议 ≈ {plan.budget} kcal</p>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: grey, lineHeight: 1.5 }}>
        今天已吃 {plan.eaten.calories} / {CALORIE_GOAL} kcal
        {plan.remaining > 0 ? `，还剩 ${plan.remaining} kcal` : ""}
      </p>
      {plan.flags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {plan.flags.map(f => (
            <span key={f} style={{ fontSize: 11, fontWeight: 600, color: "#B45309", background: "#FEF3C7", borderRadius: 999, padding: "3px 9px" }}>{f}</span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, opacity: stale ? 0.55 : 1, transition: "opacity .2s" }}>
        {loading && !data && [0, 1, 2].map(i => (
          <div key={i} style={{ height: 52, borderRadius: 12, background: "linear-gradient(90deg,#F5F3FF,#FCE7F3,#F5F3FF)", backgroundSize: "200% 100%", animation: "nm-shimmer 1.2s linear infinite" }} />
        ))}
        {data?.ideas.map(idea => (
          <div key={idea.name} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FCFAFF", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: ink }}>{idea.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: grey }}>{idea.why}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: purple, whiteSpace: "nowrap" }}>{idea.kcal} kcal</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes nm-shimmer{from{background-position:200% 0}to{background-position:0 0}}`}</style>

      {data?.tip && !stale && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#7C3AED" }}>💜 {data.tip}</p>}
      {stale && (
        <button onClick={() => load(true)} disabled={loading} style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 10, border: "1.5px solid #E9D5FF", background: "#fff", color: purple, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "生成中..." : "按修改后的饮食更新建议"}
        </button>
      )}
      {data && !data.ai && !stale && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#C4B5D0" }}>AI 暂时不可用，以上为常见搭配推荐</p>}
    </div>
  );
}
