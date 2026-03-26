"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveMeal } from "@/lib/meals";
import type { MealType } from "@/lib/meals";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch:     "午餐",
  dinner:    "晚餐",
};

interface AnalysisResult {
  foods: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function RecordPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null); setError(""); setSaved(false);
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
    setAnalyzing(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || `服务器错误 (${res.status})`); return; }
      setResult(data as AnalysisResult);
    } catch {
      setError("请求失败，请检查网络后重试");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSave() {
    if (!result) return;
    saveMeal({
      mealType,
      imageBase64: imagePreview ?? undefined,
      foods: result.foods, calories: result.calories,
      protein: result.protein, carbs: result.carbs, fat: result.fat,
    });
    setSaved(true);
    setTimeout(() => router.push("/home"), 1200);
  }

  function reset() {
    setResult(null); setImagePreview(null); setImageBase64(null); setError("");
  }

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
            <button key={t} onClick={() => setMealType(t)} style={{
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

      {/* 拍照区域 */}
      <div onClick={() => !saved && fileRef.current?.click()} style={{
        background: imagePreview ? "transparent" : "#fff",
        borderRadius: "16px",
        border: imagePreview ? "none" : "2px dashed #F3E8FF",
        minHeight: "200px", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: saved ? "default" : "pointer", overflow: "hidden",
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
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        onChange={handleFileChange} style={{ display: "none" }} />

      {/* 重新选择 */}
      {imagePreview && !result && !saved && (
        <button onClick={reset} style={{ ...btn, background: "#F9F5FF", color: "#9CA3AF" }}>重新选择图片</button>
      )}

      {/* 分析按钮 */}
      {imagePreview && !result && !saved && (
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

      {/* 分析结果 */}
      {result && !saved && (
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 16px rgba(192,132,252,0.12)" }}>
          <p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 700, color: "#3B1F5E" }}>🍽 {result.foods}</p>

          <div style={{ textAlign: "center", padding: "16px 0", borderBottom: "1px solid #F9F5FF" }}>
            <span style={{ fontSize: "42px", fontWeight: 800, color: "#C084FC" }}>{result.calories}</span>
            <span style={{ fontSize: "16px", color: "#9CA3AF", marginLeft: "4px" }}>kcal</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-around", paddingTop: "16px" }}>
            {[
              { label: "蛋白质", value: result.protein, color: "#C084FC" },
              { label: "碳水",   value: result.carbs,   color: "#F9A8D4" },
              { label: "脂肪",   value: result.fat,     color: "#FCD34D" },
            ].map(n => (
              <div key={n.label} style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: n.color }}>{n.value}g</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#9CA3AF" }}>{n.label}</p>
              </div>
            ))}
          </div>

          <button onClick={handleSave} style={{ ...btn, marginTop: "20px", background: "#C084FC", color: "#fff", boxShadow: "0 4px 16px rgba(192,132,252,0.35)" }}>
            保存到{MEAL_LABELS[mealType]}记录 ✓
          </button>
          <button onClick={reset} style={{ ...btn, marginTop: "8px", background: "#F9F5FF", color: "#9CA3AF" }}>
            重新拍照
          </button>
        </div>
      )}

      {saved && (
        <div style={{ background: "rgba(192,132,252,0.1)", borderRadius: "16px", padding: "28px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>✅</div>
          <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#3B1F5E" }}>{MEAL_LABELS[mealType]}记录成功！</p>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#9CA3AF" }}>正在返回首页...</p>
        </div>
      )}
    </div>
  );
}
