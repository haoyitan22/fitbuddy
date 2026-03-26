"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTempData } from "@/lib/auth";
import type { Pet } from "@/lib/auth";

const pets: Pet[] = [
  { emoji: "🐼", species: "熊猫", name: "胖达", desc: "憨厚可爱，最懂减脂的辛苦" },
  { emoji: "🐱", species: "猫咪", name: "橘子", desc: "慵懒温柔，陪你每一顿饭" },
  { emoji: "🐹", species: "仓鼠", name: "豆豆", desc: "活力满满，每天都很期待你" },
  { emoji: "🦊", species: "狐狸", name: "小狐", desc: "机灵可爱，和你一起闪闪发光" },
  { emoji: "🐻", species: "棕熊", name: "肉桂", desc: "稳重暖心，默默支持你" },
];

export default function RegisterStep4() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);

  function handleNext() {
    saveTempData({ pet: pets[selected] });
    router.push("/register/step4/name");
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 60px" }}>
      <div style={{ maxWidth: "430px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🐾</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>选择你的健康小伙伴</h1>
          <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "6px" }}>它会一直陪着你 🐾</p>
          <p style={{ fontSize: "12px", color: "#C4B5D0", marginTop: "2px" }}>第 4 步，共 4 步</p>
          <div style={{ display: "flex", gap: "6px", marginTop: "12px", justifyContent: "center" }}>
            {[1,2,3,4].map(s => <div key={s} style={{ height: "4px", width: "36px", borderRadius: "4px", background: "#C084FC" }} />)}
          </div>
        </div>

        {/* 横向滑动宠物卡片 */}
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "12px", paddingLeft: "2px", paddingRight: "2px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          <style>{`div::-webkit-scrollbar{display:none}`}</style>
          {pets.map((pet, i) => (
            <button key={pet.name} onClick={() => setSelected(i)} style={{
              flexShrink: 0, width: "140px", padding: "20px 12px",
              borderRadius: "20px",
              border: `2px solid ${selected===i?"#C084FC":"#F3E8FF"}`,
              background: selected===i?"rgba(192,132,252,0.1)":"#fff",
              cursor: "pointer", textAlign: "center",
              transform: selected===i?"scale(1.05)":"scale(1)",
              transition: "all 0.2s",
              boxShadow: selected===i?"0 4px 20px rgba(192,132,252,0.25)":"0 2px 8px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>{pet.emoji}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: selected===i?"#C084FC":"#3B1F5E", marginBottom: "6px" }}>{pet.name}</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: "1.4" }}>{pet.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={handleNext} style={{ width: "100%", background: "#C084FC", color: "#fff", border: "none", borderRadius: "16px", padding: "16px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(192,132,252,0.35)" }}>
            领养 {pets[selected].name}！
          </button>
          <button onClick={() => router.back()} style={{ width: "100%", background: "transparent", color: "#9CA3AF", border: "none", fontSize: "14px", cursor: "pointer", padding: "8px" }}>
            ← 返回上一步
          </button>
        </div>
      </div>
    </div>
  );
}
