"use client";

import { useState } from "react";
import type { FoodItem } from "@/lib/meals";
import { scaleItem, sumItems, unitOf, stepOf, formatCount, setCount, UNITS } from "@/lib/nutrition";

const ink = "#3B1F5E", grey = "#9CA3AF", purple = "#C084FC";

/**
 * Totals plus an editable per-food list. People adjust portions in everyday units
 * (6 串, 半碗, 1 份); grams stay underneath for the maths and can be edited by
 * tapping "约 300g". Foods can be removed, or added by name + count (AI estimate,
 * with manual kcal as a fallback).
 */
export default function MealEditor({ items, onChange }: { items: FoodItem[]; onChange: (items: FoodItem[]) => void }) {
  const totals = sumItems(items);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("份");
  // Row whose grams field is open (advanced edit).
  const [gramsOpen, setGramsOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [kcal, setKcal] = useState("");
  const [err, setErr] = useState("");

  // Never scale down to 0 g: nutrition is scaled from the current portion, so 0 would lose it.
  function setGramsAt(i: number, g: number) {
    const grams = Math.min(3000, Math.max(5, Math.round(g)));
    if (grams === items[i].grams) return;
    // Keep the unit count; only the weight per unit changes.
    onChange(items.map((it, j) => (j === i ? { ...scaleItem(it, grams), ...unitOf(it) } : it)));
  }

  function stepAt(i: number, dir: 1 | -1) {
    const { unit, count } = unitOf(items[i]);
    onChange(items.map((it, j) => (j === i ? setCount(it, count + dir * stepOf(unit)) : it)));
  }

  function resetAdd() {
    setAdding(false); setName(""); setQty("1"); setUnit("份"); setManual(false); setKcal(""); setErr("");
  }

  async function addItem() {
    const n = name.trim();
    const step = stepOf(unit);
    const c = Math.max(step, Math.round((Number(qty) || 1) / step) * step);
    if (!n) { setErr("先写上食材名称"); return; }
    if (manual) {
      const k = Math.max(0, Math.round(Number(kcal) || 0));
      onChange([...items, { name: n, unit, count: c, grams: 100 * c, calories: k, protein: 0, carbs: 0, fat: 0 }]);
      resetAdd();
      return;
    }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "estimate", items: [{ name: n, count: c, unit }] }),
      });
      const data = await res.json();
      const it: FoodItem | undefined = data.items?.[0];
      if (!res.ok || !it) throw new Error();
      onChange([...items, { ...it, name: n, unit, count: c }]);
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
          <p style={{ margin: 0, fontSize: 11, color: grey }}>AI 估算仅供参考，按实际吃的数量改</p>
        </div>

        {items.map((it, i) => {
          const u = unitOf(it);
          return (
            <div key={i + it.name} style={{ padding: "9px 0", borderBottom: "1px solid #F3E8FF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, color: ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: grey }}>
                    <span style={{ color: purple, fontWeight: 600 }}>{Math.round(it.calories)} kcal</span>
                    <button onClick={() => setGramsOpen(gramsOpen === i ? null : i)} aria-label={`${it.name} 按克数修改`}
                      style={{ marginLeft: 6, padding: 0, border: "none", background: "none", color: "#C4B5D0", fontSize: 11, cursor: "pointer" }}>
                      · 约 {Math.round(it.grams)}g
                    </button>
                  </p>
                </div>
                <button aria-label={`${it.name} 减少`} style={stepBtn} onClick={() => stepAt(i, -1)}>−</button>
                <span aria-label={`${it.name} 数量`} style={{ minWidth: 54, textAlign: "center", fontSize: 14, fontWeight: 600, color: ink, whiteSpace: "nowrap" }}>
                  {formatCount(u.count, u.unit)}
                </span>
                <button aria-label={`${it.name} 增加`} style={stepBtn} onClick={() => stepAt(i, 1)}>+</button>
                <button aria-label={`删除 ${it.name}`} onClick={() => onChange(items.filter((_, j) => j !== i))}
                  style={{ ...stepBtn, background: "transparent", color: "#D1D5DB", fontSize: 18 }}>×</button>
              </div>
              {gramsOpen === i && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: grey }}>
                  <span>知道重量？按克数改：</span>
                  <GramsInput label={`${it.name} 克数`} value={it.grams} onCommit={g => setGramsAt(i, g)} style={{ ...input, width: 60, textAlign: "center", padding: "4px" }} />
                  <span>g</span>
                </div>
              )}
            </div>
          );
        })}

        {adding ? (
          <div style={{ padding: "10px 0 4px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input placeholder="吃了什么，如：烤鸡翅" value={name} onChange={e => setName(e.target.value)} style={{ ...input, flex: 1 }} autoFocus />
              <input aria-label="新食材数量" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value.replace(/[^\d.]/g, "").slice(0, 4))} style={{ ...input, width: 48, textAlign: "center" }} />
              <span style={{ alignSelf: "center", fontSize: 14, color: ink, fontWeight: 600, minWidth: 16 }}>{unit}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {UNITS.map(un => (
                <button key={un} onClick={() => setUnit(un)} style={{
                  padding: "4px 11px", borderRadius: 999, fontSize: 12, cursor: "pointer",
                  border: `1.5px solid ${unit === un ? purple : "#F3E8FF"}`,
                  background: unit === un ? "rgba(192,132,252,0.1)" : "#fff",
                  color: unit === un ? purple : grey, fontWeight: unit === un ? 700 : 400,
                }}>{un}</button>
              ))}
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
