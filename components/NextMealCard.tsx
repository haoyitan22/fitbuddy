"use client";

import { useEffect, useState } from "react";
import type { MealType } from "@/lib/meals";
import { getUser } from "@/lib/auth";
import { ageOf, getDietPrefs } from "@/lib/goals";
import { fallbackIdeas, planNextMeal, type MealIdea, type Totals } from "@/lib/nutrition";

const ink = "#3B1F5E", grey = "#9CA3AF", purple = "#C084FC";
const CACHE_KEY = "fitbuddy_next_meal";

type Cached = { sig: string; ideas: MealIdea[]; budget: number | null; analysis: string; tip: string; ai: boolean; seen?: string[] };

/**
 * Next-meal suggestion written by the model from the user's own targets
 * (calories, protein, fat), everything eaten today, and diet preferences.
 * Answers are cached per day + meal + intake, so revisiting costs nothing;
 * after edits the old ideas stay with a button to refresh them.
 */
export default function NextMealCard({ mealType, totals, lastMeal }: { mealType: MealType; totals: Totals; lastMeal: string }) {
  const plan = planNextMeal(mealType, totals);
  const { targets, eaten } = plan;
  const sig = [new Date().toISOString().slice(0, 10), mealType, targets.calories, targets.protein, eaten.calories, eaten.protein, eaten.fat].join("|");
  const [data, setData] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(false);

  /** force: skip the cache. another: "换一批" — ask for dishes different from everything shown so far. */
  async function load(force = false, another = false) {
    if (!force) {
      try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null") as Cached | null;
        if (c && c.sig === sig) { setData(c); return; }
      } catch { /* ignore */ }
    }
    setLoading(true);
    // Everything shown for this intake so far, so a new batch doesn't repeat it.
    const seen = another && data && data.sig === sig ? [...(data.seen ?? []), ...data.ideas.map(i => i.name)].slice(-12) : [];
    let next: Cached;
    try {
      const u = getUser();
      const res = await fetch("/api/analyze-food", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "suggest",
          profile: { gender: u?.gender, age: ageOf(u?.birthday), weight: u?.weight, targetWeight: u?.targetWeight },
          prefs: getDietPrefs(),
          targets, eaten,
          meals: plan.meals.map(m => (m.foods ? m : { ...m, foods: lastMeal })),
          nextMeal: plan.nextMeal, budget: plan.budget,
          exclude: seen,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ideas?.length) throw new Error();
      next = { sig, ideas: json.ideas, budget: json.budget ?? null, analysis: json.analysis || "", tip: json.tip || "", ai: true, seen };
    } catch {
      next = { sig, ideas: fallbackIdeas(plan, seen), budget: null, analysis: "", tip: "", ai: false, seen };
    }
    setData(next);
    setLoading(false);
    // Only AI answers are cached, so a failed call is retried next time.
    if (next.ai) try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // First time: load (from cache if it matches). Later edits only mark the ideas as stale.
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const stale = !!data && data.sig !== sig;
  const budget = (!stale && data?.budget) || plan.budget;

  const bars = [
    { label: "热量", now: eaten.calories, goal: targets.calories, unit: "kcal", color: purple },
    { label: "蛋白质", now: eaten.protein, goal: targets.protein, unit: "g", color: "#A78BFA", okOver: true },
    { label: "脂肪", now: eaten.fat, goal: targets.fat, unit: "g", color: "#FCD34D" },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 2px 16px rgba(192,132,252,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ink }}>🥗 {plan.nextMeal}吃什么</p>
        <p style={{ margin: 0, fontSize: 13, color: purple, fontWeight: 700, whiteSpace: "nowrap" }}>建议 ≈ {budget} kcal</p>
      </div>

      {/* today vs. personal targets */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
        {bars.map(b => {
          // Going over the protein target is fine, so it isn't shown as a warning.
          const over = b.now > b.goal && !("okOver" in b);
          return (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 40, fontSize: 12, color: grey, flexShrink: 0 }}>{b.label}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#F5F3FF", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (b.now / Math.max(1, b.goal)) * 100)}%`, height: "100%", borderRadius: 3, background: over ? "#F59E0B" : b.color }} />
              </div>
              <span style={{ fontSize: 11, color: over ? "#B45309" : grey, whiteSpace: "nowrap", minWidth: 92, textAlign: "right" }}>
                {Math.round(b.now)} / {b.goal} {b.unit}
              </span>
            </div>
          );
        })}
      </div>
      {!targets.personal && (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#C4B5D0" }}>完善身高、体重、生日后，会按你的身体情况计算目标</p>
      )}

      {plan.flags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {plan.flags.map(f => (
            <span key={f} style={{ fontSize: 11, fontWeight: 600, color: "#B45309", background: "#FEF3C7", borderRadius: 999, padding: "3px 9px" }}>{f}</span>
          ))}
        </div>
      )}

      {data?.analysis && !stale && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: ink, lineHeight: 1.5 }}>{data.analysis}</p>
      )}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: ink }}>推荐吃这些</p>
        {data && !stale && (
          <button onClick={() => load(true, true)} disabled={loading} aria-label="换一批推荐"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 999, border: "1.5px solid #E9D5FF", background: "#fff", color: purple, fontSize: 12, fontWeight: 600, cursor: loading ? "default" : "pointer" }}>
            <span style={{ display: "inline-block", animation: loading ? "nm-spin 0.8s linear infinite" : undefined }}>↻</span>
            {loading ? "换菜中..." : "换一批"}
          </button>
        )}
      </div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8, opacity: stale || loading ? 0.55 : 1, transition: "opacity .2s" }}>
        {loading && !data && [0, 1, 2].map(i => (
          <div key={i} style={{ height: 56, borderRadius: 12, background: "linear-gradient(90deg,#F5F3FF,#FCE7F3,#F5F3FF)", backgroundSize: "200% 100%", animation: "nm-shimmer 1.2s linear infinite" }} />
        ))}
        {data?.ideas.map(idea => (
          <div key={idea.name} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FCFAFF", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: ink }}>{idea.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: grey }}>{idea.why}</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: purple, whiteSpace: "nowrap" }}>{idea.kcal} kcal</p>
              {!!idea.protein && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#A78BFA", whiteSpace: "nowrap" }}>蛋白 {idea.protein}g</p>}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes nm-shimmer{from{background-position:200% 0}to{background-position:0 0}}@keyframes nm-spin{to{transform:rotate(360deg)}}`}</style>

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
