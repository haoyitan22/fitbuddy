"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveTempData, getTempData } from "@/lib/auth";

const goalOptions = [
  { value: 1, label: "1 个月", days: 30 },
  { value: 3, label: "3 个月", days: 90 },
  { value: 6, label: "6 个月", days: 180 },
];

export default function RegisterStep3() {
  const router = useRouter();
  const [targetWeight, setTargetWeight] = useState("");
  const [goalMonths, setGoalMonths] = useState<number | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const temp = getTempData();
    if (temp.weight) setCurrentWeight(temp.weight);
  }, []);

  const weightDiff = currentWeight && targetWeight ? currentWeight - Number(targetWeight) : null;
  const selectedOption = goalOptions.find(o => o.value === goalMonths);
  const dailyDeficit = weightDiff && weightDiff > 0 && selectedOption
    ? Math.round((weightDiff * 7700) / selectedOption.days)
    : null;

  function handleNext() {
    setError("");
    if (!targetWeight) { setError("请输入目标体重"); return; }
    if (!goalMonths) { setError("请选择期望达成时间"); return; }
    saveTempData({ targetWeight: Number(targetWeight), goalMonths });
    router.push("/register/step4");
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 60px" }}>
      <div style={{ maxWidth: "430px", width: "100%" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎯</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>设定你的目标</h1>
          <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "6px" }}>第 3 步，共 4 步</p>
          <div style={{ display: "flex", gap: "6px", marginTop: "16px", justifyContent: "center" }}>
            {[1,2,3,4].map(s => (
              <div key={s} style={{ height: "4px", width: "36px", borderRadius: "4px", background: s <= 3 ? "#C084FC" : "#F3E8FF" }} />
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "20px", padding: "28px 24px", boxShadow: "0 4px 24px rgba(192,132,252,0.1)", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ fontSize: "13px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>目标体重（kg）</label>
            <input
              type="number"
              placeholder="例如：55"
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1.5px solid #F3E8FF", background: "#fff", fontSize: "15px", color: "#3B1F5E", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "13px", color: "#9CA3AF", display: "block", marginBottom: "10px" }}>期望达成时间</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {goalOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGoalMonths(opt.value)}
                  style={{
                    flex: 1,
                    padding: "16px 8px",
                    borderRadius: "14px",
                    border: `2px solid ${goalMonths === opt.value ? "#C084FC" : "#F3E8FF"}`,
                    background: goalMonths === opt.value ? "rgba(192,132,252,0.1)" : "#fff",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>
                    {opt.value === 1 ? "🌱" : opt.value === 3 ? "🌿" : "🌳"}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: goalMonths === opt.value ? 700 : 500, color: goalMonths === opt.value ? "#C084FC" : "#3B1F5E" }}>
                    {opt.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic calorie hint */}
          {dailyDeficit && (
            <div style={{ background: "rgba(192,132,252,0.08)", borderRadius: "12px", padding: "14px 16px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#3B1F5E", lineHeight: "1.6" }}>
                你每天大约需要减少{" "}
                <span style={{ color: "#C084FC", fontWeight: 700, fontSize: "18px" }}>{dailyDeficit}</span>
                {" "}kcal，我们一起加油！💪
              </p>
            </div>
          )}
          {weightDiff !== null && weightDiff <= 0 && targetWeight && (
            <div style={{ background: "rgba(249,168,212,0.15)", borderRadius: "12px", padding: "14px 16px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#3B1F5E" }}>
                保持健康体重也是很棒的目标 🌸
              </p>
            </div>
          )}

          {error && <p style={{ fontSize: "13px", color: "#F87171", margin: 0, textAlign: "center" }}>{error}</p>}

          <button onClick={handleNext} style={{ background: "#C084FC", color: "#fff", border: "none", borderRadius: "16px", padding: "16px", fontSize: "16px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(192,132,252,0.35)" }}>
            下一步 →
          </button>
          <button onClick={() => router.back()} style={{ background: "transparent", color: "#9CA3AF", border: "none", fontSize: "14px", cursor: "pointer", padding: "4px" }}>
            ← 返回上一步
          </button>
        </div>
      </div>
    </div>
  );
}
