"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTempData } from "@/lib/auth";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1.5px solid #F3E8FF",
  background: "#fff",
  fontSize: "15px",
  color: "#3B1F5E",
  outline: "none",
  boxSizing: "border-box",
};

const activityOptions = [
  { value: "sedentary", label: "久坐", desc: "几乎不运动" },
  { value: "light", label: "轻度运动", desc: "每周 1-3 次" },
  { value: "moderate", label: "中度运动", desc: "每周 3-5 次" },
  { value: "intense", label: "高强度运动", desc: "每天运动" },
];

export default function RegisterStep2() {
  const router = useRouter();
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [error, setError] = useState("");

  function handleNext() {
    setError("");
    if (!height || !weight) { setError("请填写身高和体重"); return; }
    if (!activityLevel) { setError("请选择活动水平"); return; }
    saveTempData({ height: Number(height), weight: Number(weight), activityLevel });
    router.push("/register/step3");
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 60px" }}>
      <div style={{ maxWidth: "430px", width: "100%" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>💪</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>填写身体数据</h1>
          <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "6px" }}>第 2 步，共 4 步</p>
          <div style={{ display: "flex", gap: "6px", marginTop: "16px", justifyContent: "center" }}>
            {[1,2,3,4].map(s => (
              <div key={s} style={{ height: "4px", width: "36px", borderRadius: "4px", background: s <= 2 ? "#C084FC" : "#F3E8FF" }} />
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "20px", padding: "28px 24px", boxShadow: "0 4px 24px rgba(192,132,252,0.1)", display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { label: "身高（cm）", value: height, setter: setHeight, placeholder: "例如：168" },
            { label: "当前体重（kg）", value: weight, setter: setWeight, placeholder: "例如：65" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={{ fontSize: "13px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>{label}</label>
              <input type="number" placeholder={placeholder} value={value} onChange={e => setter(e.target.value)} style={inputStyle} />
            </div>
          ))}

          <div>
            <label style={{ fontSize: "13px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>活动水平</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activityOptions.map(opt => (
                <button key={opt.value} onClick={() => setActivityLevel(opt.value)}
                  style={{ padding: "12px 16px", borderRadius: "12px", border: `1.5px solid ${activityLevel === opt.value ? "#C084FC" : "#F3E8FF"}`, background: activityLevel === opt.value ? "rgba(192,132,252,0.08)" : "#fff", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 500, color: activityLevel === opt.value ? "#C084FC" : "#3B1F5E", fontSize: "14px" }}>{opt.label}</span>
                  <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

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
