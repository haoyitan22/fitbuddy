"use client";

import { useState } from "react";
import type { FoodItem } from "@/lib/meals";
import { scaleItem, sumItems } from "@/lib/nutrition";

const ink = "#3B1F5E", grey = "#9CA3AF", purple = "#C084FC";

/**
 * Totals plus an editable per-food list: change grams (nutrition scales), remove a food,
 * or add one (AI estimate, with manual kcal as a fallback).
 */
export default function MealEditor({ items, onChange }: { items: FoodItem[]; onChange: (items: FoodItem[]) => void }) {
  const totals = sumItems(items);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("100");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [kcal, setKcal] = useState("");
  const [err, setErr] = useState("");

  // Never scale down to 0 g: nutrition is scaled from the current portion, so 0 would lose it.
  function setGramsAt(i: number, g: number) {
    const grams = Math.min(3000, Math.max(5, Math.round(g)));
    if (grams === items[i].grams) return;
    onChange(items.map((it, j) => (j === i ? scaleItem(it, grams) : it)));
  }

  function resetAdd() {
    setAdding(false); setName(""); setGrams("100"); setManual(false); setKcal(""); setErr("");
  }

  async function addItem() {
    const n = name.trim();
    const g = Math.max(1, Math.round(Number(grams) || 100));
    if (!n) { setErr("先写上食材名称"); return; }
    if (manual) {
      const k = Math.max(0, Math.round(Number(kcal) || 0));
      onChange([...items, { name: n, grams: g, calories: k, protein: 0, carbs: 0, fat: 0 }]);
      resetAdd();
      return;
    }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "estimate", items: [{ name: n, grams: g }] }),
      });
      const data = await res.json();
      const it: FoodItem | undefined = data.items?.[0];
      if (!res.ok || !it) throw new Error();
      onChange([...items, { ...it, name: n, grams: g }]);
      resetAdd();
    } catch {
      setManual(true);
      setErr("AI 估算失败，可以手动填写热量");
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = {
    padding: "8px 10px", borderRadius: 10, border: "1.5px solid #F3E8FF", fontSize: 14, color: ink, outline: "none", minWidth: 0,
  };
  const stepBtn: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 8, border: "none", background: "#F5F3FF", color: "#7C3AED",
    fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1, flexShrink: 0,
  };

  return (
    <div>
      {/* totals */}
      <div style={{ textAlign: "center", padding: "6px 0 16px", borderBottom: "1px solid #F9F5FF" }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: purple }}>{totals.calories}</span>
        <span style={{ fontSize: 16, color: grey, marginLeft: 4 }}>kcal</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", padding: "16px 0" }}>
        {[
          { label: "蛋白质", value: totals.protein, color: purple },
          { label: "碳水", value: totals.carbs, color: "#F9A8D4" },
          { label: "脂肪", value: totals.fat, color: "#FCD34D" },
        ].map(n => (
          <div key={n.label} style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: n.color }}>{n.value}g</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: grey }}>{n.label}</p>
          </div>
        ))}
      </div>

      {/* per-food list */}
      <div style={{ background: "#FCFAFF", borderRadius: 14, padding: "12px 12px 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ink }}>食材明细</p>
          <p style={{ margin: 0, fontSize: 11, color: grey }}>AI 估算仅供参考，可按实际份量修改</p>
        </div>

        {items.map((it, i) => (
          <div key={i + it.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", borderBottom: "1px solid #F3E8FF" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, color: ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: purple, fontWeight: 600 }}>{Math.round(it.calories)} kcal</p>
            </div>
            <button aria-label={`${it.name} 减少 10 克`} style={stepBtn} onClick={() => setGramsAt(i, it.grams - 10)}>−</button>
            <GramsInput label={`${it.name} 克数`} value={it.grams} onCommit={g => setGramsAt(i, g)} style={{ ...input, width: 52, textAlign: "center", padding: "5px 4px" }} />
            <span style={{ fontSize: 12, color: grey }}>g</span>
            <button aria-label={`${it.name} 增加 10 克`} style={stepBtn} onClick={() => setGramsAt(i, it.grams + 10)}>+</button>
            <button aria-label={`删除 ${it.name}`} onClick={() => onChange(items.filter((_, j) => j !== i))}
              style={{ ...stepBtn, background: "transparent", color: "#D1D5DB", fontSize: 18 }}>×</button>
          </div>
        ))}

        {adding ? (
          <div style={{ padding: "10px 0 4px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input placeholder="食材名称，如：米饭" value={name} onChange={e => setName(e.target.value)} style={{ ...input, flex: 1 }} autoFocus />
              <input aria-label="新食材克数" inputMode="numeric" value={grams} onChange={e => setGrams(e.target.value.replace(/\D/g, ""))} style={{ ...input, width: 64, textAlign: "center" }} />
              <span style={{ alignSelf: "center", fontSize: 12, color: grey }}>g</span>
            </div>
            {manual && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input placeholder="热量" inputMode="numeric" value={kcal} onChange={e => setKcal(e.target.value.replace(/\D/g, ""))} style={{ ...input, width: 90 }} />
                <span style={{ fontSize: 12, color: grey }}>kcal（营养素按 0 计）</span>
              </div>
            )}
            {err && <p style={{ margin: 0, fontSize: 12, color: "#EF4444" }}>{err}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={resetAdd} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: "#F3F4F6", color: grey, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>取消</button>
              <button onClick={addItem} disabled={busy} style={{ flex: 2, padding: "9px", borderRadius: 10, border: "none", background: busy ? "#E9D5FF" : purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer" }}>
                {busy ? "AI 估算中..." : manual ? "按填写的热量添加" : "添加并估算营养"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "10px 0 6px", border: "none", background: "transparent", color: purple, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + 添加漏掉的食材
          </button>
        )}
      </div>
    </div>
  );
}

/** Grams field that only applies the number on blur / Enter, so clearing it while typing changes nothing. */
function GramsInput({ label, value, onCommit, style }: { label: string; value: number; onCommit: (g: number) => void; style: React.CSSProperties }) {
  const [draft, setDraft] = useState<string | null>(null);
  function commit() {
    if (draft !== null && Number(draft) > 0) onCommit(Number(draft));
    setDraft(null);
  }
  return (
    <input
      aria-label={label} inputMode="numeric" value={draft ?? String(Math.round(value))}
      onChange={e => setDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      style={style}
    />
  );
}
