"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveMeal, getMeals } from "@/lib/meals";
import { earnOnce, COIN_RULES } from "@/lib/coins";
import type { MealType, MealRecord, FoodItem } from "@/lib/meals";
import { MEAL_LABELS, itemsOf, sumItems } from "@/lib/nutrition";
import MealEditor from "@/components/MealEditor";
import NextMealCard from "@/components/NextMealCard";

export default function RecordPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  // The meal's foods, editable (fresh analysis or a saved record).
  const [items, setItems] = useState<FoodItem[] | null>(null);
  // JSON of the saved items, to tell whether the user changed a saved record.
  const [savedSig, setSavedSig] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  // Today's saved record for the selected meal, shown (and editable) until the user retakes it.
  const [viewing, setViewing] = useState<MealRecord | null>(null);

  function savedRecord(t: MealType) {
    return getMeals().find(m => m.mealType === t) ?? null;
  }

  // Opened from the home page with ?meal=lunch etc.: select that meal and show its record.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("meal");
    const t: MealType = m === "lunch" || m === "dinner" || m === "breakfast" ? m : "breakfast";
    setMealType(t);
    openRecord(savedRecord(t));
  }, []);

  function openRecord(r: MealRecord | null) {
    setViewing(r);
    const its = r ? itemsOf(r) : null;
    setItems(its);
    setSavedSig(its ? JSON.stringify(its) : null);
  }

  function selectMeal(t: MealType) {
    setMealType(t);
    reset();
    setSaved(false);
    openRecord(savedRecord(t));
  }

  function retake() {
    setViewing(null);
    setSavedSig(null);
    reset();
    fileRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setItems(null); setError(""); setSaved(false);
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        setImagePreview(compressed);
        setImageBase64(compressed.split(",")[1]);
        setMimeType("image/jpeg");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageBase64) return;
    setAnalyzing(true); setError(""); setItems(null);
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || `服务器错误 (${res.status})`); return; }
      setItems(itemsOf(data));
    } catch {
      setError("请求失败，请检查网络后重试");
    } finally {
      setAnalyzing(false);
    }
  }

  function persist(its: FoodItem[], image?: string) {
    const t = sumItems(its);
    const record = saveMeal({
      mealType, imageBase64: image, items: its,
      foods: its.map(i => i.name).join("、"),
      calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat,
    });
    setViewing(record);
    setSavedSig(JSON.stringify(its));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  // A fresh analysis: save it, earn coins, then stay on the record so the
  // next-meal suggestion stays on screen.
  function handleSave() {
    if (!items?.length) return;
    persist(items, imagePreview ?? undefined);
    earnOnce(`meal:${mealType}`, COIN_RULES.meal, `记录${MEAL_LABELS[mealType]}`);
    setImagePreview(null); setImageBase64(null);
  }

  // Edits to a saved record.
  function handleUpdate() {
    if (!items?.length || !viewing) return;
    persist(items, viewing.imageBase64);
  }

  function reset() {
    setItems(null); setImagePreview(null); setImageBase64(null); setError("");
  }

  const dirty = !!viewing && !!items && savedSig !== null && JSON.stringify(items) !== savedSig;

  const btn: React.CSSProperties = {
    width: "100%", padding: "15px", borderRadius: "14px",
    border: "none", fontSize: "15px", fontWeight: 600, cursor: "pointer",
  };

  return (
    <div style={{ padding: "20px 16px 80px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* 标题 */}
      <div style={{ marginTop: "4px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>记录饮食</h1>
        <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "4px" }}>拍照上传，AI 自动分析营养成分</p>
      </div>

      {/* 选餐次 */}
      <div style={{ background: "#fff", borderRadius: "16px", padding: "16px", boxShadow: "0 2px 12px rgba(192,132,252,0.08)" }}>
        <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#9CA3AF", fontWeight: 600 }}>选择餐次</p>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["breakfast","lunch","dinner"] as MealType[]).map(t => (
            <button key={t} onClick={() => selectMeal(t)} style={{
              flex: 1, padding: "10px 0", borderRadius: "12px",
              border: `1.5px solid ${mealType===t?"#C084FC":"#F3E8FF"}`,
              background: mealType===t?"rgba(192,132,252,0.1)":"#fff",
              color: mealType===t?"#C084FC":"#9CA3AF",
              fontSize: "14px", fontWeight: mealType===t?700:400, cursor: "pointer",
            }}>
              {MEAL_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 已记录：查看 / 修改这餐 */}
      {viewing && items && (
        <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 16px rgba(192,132,252,0.12)" }}>
          {viewing.imageBase64 && (
            <img src={viewing.imageBase64} alt="food" style={{ width: "100%", maxHeight: "280px", objectFit: "cover", display: "block" }} />
          )}
          <div style={{ padding: "20px" }}>
            <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#9CA3AF", fontWeight: 600 }}>
              今天的{MEAL_LABELS[mealType]} {saved ? <span style={{ color: "#10B981" }}>· 已保存 ✓</span> : "· 已记录"}
            </p>
            <MealEditor items={items} onChange={setItems} />
            {dirty && (
              <button onClick={handleUpdate} disabled={!items.length} style={{ ...btn, marginTop: "16px", background: "#C084FC", color: "#fff", boxShadow: "0 4px 16px rgba(192,132,252,0.35)" }}>
                保存修改 ✓
              </button>
            )}
            <button onClick={retake} style={{ ...btn, marginTop: "12px", background: "#F9F5FF", color: "#9CA3AF" }}>
              重新拍照，替换这条记录
            </button>
            <button onClick={() => router.push("/home")} style={{ ...btn, marginTop: "8px", background: dirty ? "#F3F4F6" : "#C084FC", color: dirty ? "#9CA3AF" : "#fff" }}>
              {dirty ? "不保存，返回首页" : "返回首页"}
            </button>
          </div>
        </div>
      )}

      {/* 拍照区域 */}
      {!viewing && <div onClick={() => fileRef.current?.click()} style={{
        background: imagePreview ? "transparent" : "#fff",
        borderRadius: "16px",
        border: imagePreview ? "none" : "2px dashed #F3E8FF",
        minHeight: "200px", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", overflow: "hidden",
        boxShadow: "0 2px 12px rgba(192,132,252,0.08)",
      }}>
        {imagePreview ? (
          <img src={imagePreview} alt="food" style={{ width: "100%", borderRadius: "16px", maxHeight: "280px", objectFit: "cover" }} />
        ) : (
          <>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📷</div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#C084FC", margin: 0 }}>点击拍照 / 上传图片</p>
            <p style={{ fontSize: "12px", color: "#C4B5D0", marginTop: "4px" }}>支持 JPG、PNG、HEIC</p>
          </>
        )}
      </div>}
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        onChange={handleFileChange} style={{ display: "none" }} />

      {/* 重新选择 */}
      {imagePreview && !items && (
        <button onClick={reset} style={{ ...btn, background: "#F9F5FF", color: "#9CA3AF" }}>重新选择图片</button>
      )}

      {/* 分析按钮 */}
      {imagePreview && !items && (
        <button onClick={handleAnalyze} disabled={analyzing} style={{
          ...btn,
          background: analyzing ? "#E9D5FF" : "#C084FC", color: "#fff",
          boxShadow: analyzing ? "none" : "0 4px 16px rgba(192,132,252,0.35)",
        }}>
          {analyzing ? "✨ AI 分析中..." : "✨ 开始分析"}
        </button>
      )}

      {analyzing && (
        <p style={{ textAlign: "center", fontSize: "13px", color: "#9CA3AF", animation: "pulse 1.5s infinite" }}>
          正在识别食物，估算卡路里...
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </p>
      )}

      {error && (
        <div style={{ background: "#FEF2F2", borderRadius: "12px", padding: "14px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#EF4444" }}>{error}</p>
          <button onClick={handleAnalyze} style={{ marginTop: "8px", background: "none", border: "none", color: "#C084FC", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>重试</button>
        </div>
      )}

      {/* 分析结果：可修正 */}
      {items && !viewing && (
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 16px rgba(192,132,252,0.12)" }}>
          <MealEditor items={items} onChange={setItems} />
          <button onClick={handleSave} disabled={!items.length} style={{ ...btn, marginTop: "20px", background: items.length ? "#C084FC" : "#E9D5FF", color: "#fff", boxShadow: "0 4px 16px rgba(192,132,252,0.35)" }}>
            保存到{MEAL_LABELS[mealType]}记录 ✓
          </button>
          <button onClick={reset} style={{ ...btn, marginTop: "8px", background: "#F9F5FF", color: "#9CA3AF" }}>
            重新拍照
          </button>
        </div>
      )}

      {/* 下一餐建议 */}
      {items && items.length > 0 && (
        <NextMealCard key={mealType} mealType={mealType} totals={sumItems(items)} lastMeal={items.map(i => `${i.name}${Math.round(i.grams)}g`).join("、")} />
      )}
    </div>
  );
}
