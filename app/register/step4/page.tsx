"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getTempData, saveUserData, createSession, clearTempData } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

const pets = [
  { emoji: "🐼", name: "胖达", desc: "憨厚可爱，最懂减脂的辛苦" },
  { emoji: "🐱", name: "橘子", desc: "慵懒温柔，陪你每一顿饭" },
  { emoji: "🐹", name: "豆豆", desc: "活力满满，每天都很期待你" },
  { emoji: "🦊", name: "狐狸精", desc: "灵动时尚，和你一起变美" },
  { emoji: "🐻", name: "肉桂", desc: "稳重暖心，默默支持你" },
];

const confettiColors = ["#C084FC", "#F9A8D4", "#FCD34D", "#86EFAC", "#93C5FD"];

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => i);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10 }}>
      {pieces.map(i => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${Math.random() * 100}%`,
            top: `-20px`,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            background: confettiColors[i % confettiColors.length],
            animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.8}s forwards`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function RegisterStep4() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (celebrating) {
      const timer = setTimeout(() => router.push("/home"), 3000);
      return () => clearTimeout(timer);
    }
  }, [celebrating, router]);

  function handleAdopt() {
    const temp = getTempData();
    const pet = pets[selected];
    const profile: UserProfile = {
      nickname: temp.nickname ?? "",
      gender: temp.gender ?? "",
      birthday: temp.birthday ?? "",
      weight: temp.weight ?? 0,
      height: temp.height ?? 0,
      targetWeight: temp.targetWeight ?? 0,
      goalMonths: temp.goalMonths ?? 3,
      activityLevel: temp.activityLevel ?? "",
      email: temp.email ?? "",
      password: temp.password ?? "",
      pet,
    };
    saveUserData(profile);
    createSession(profile.email);
    clearTempData();
    setCelebrating(true);
  }

  if (celebrating) {
    const pet = pets[selected];
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <Confetti />
        <div style={{ textAlign: "center", animation: "popIn 0.6s ease forwards", maxWidth: "430px" }}>
          <div style={{ fontSize: "80px", marginBottom: "20px" }}>{pet.emoji}</div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#3B1F5E", margin: 0 }}>
            {pet.name} 加入了你的队伍！🎉
          </h1>
          <p style={{ fontSize: "15px", color: "#9CA3AF", marginTop: "12px" }}>
            你们的健康之旅从今天开始 ✨
          </p>
          <p style={{ fontSize: "12px", color: "#C4B5D0", marginTop: "32px" }}>3秒后自动进入首页...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 60px" }}>
      <div style={{ maxWidth: "430px", width: "100%" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🐾</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>选择你的健康小伙伴</h1>
          <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "6px" }}>它会陪你一起完成目标 🐾</p>
          <p style={{ fontSize: "12px", color: "#C4B5D0", marginTop: "4px" }}>第 4 步，共 4 步</p>
          <div style={{ display: "flex", gap: "6px", marginTop: "12px", justifyContent: "center" }}>
            {[1,2,3,4].map(s => (
              <div key={s} style={{ height: "4px", width: "36px", borderRadius: "4px", background: "#C084FC" }} />
            ))}
          </div>
        </div>

        {/* Scrollable pet cards */}
        <div
          ref={scrollRef}
          style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "12px", paddingLeft: "4px", paddingRight: "4px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {pets.map((pet, i) => (
            <button
              key={pet.name}
              onClick={() => setSelected(i)}
              style={{
                flexShrink: 0,
                width: "140px",
                padding: "20px 12px",
                borderRadius: "20px",
                border: `2px solid ${selected === i ? "#C084FC" : "#F3E8FF"}`,
                background: selected === i ? "rgba(192,132,252,0.1)" : "#fff",
                cursor: "pointer",
                textAlign: "center",
                transform: selected === i ? "scale(1.05)" : "scale(1)",
                transition: "all 0.2s",
                boxShadow: selected === i ? "0 4px 20px rgba(192,132,252,0.25)" : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>{pet.emoji}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: selected === i ? "#C084FC" : "#3B1F5E", marginBottom: "6px" }}>{pet.name}</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: "1.4" }}>{pet.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: "24px" }}>
          <button
            onClick={handleAdopt}
            style={{ width: "100%", background: "#C084FC", color: "#fff", border: "none", borderRadius: "16px", padding: "16px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(192,132,252,0.35)" }}
          >
            领养 {pets[selected].name}！
          </button>
          <button onClick={() => router.back()} style={{ width: "100%", background: "transparent", color: "#9CA3AF", border: "none", fontSize: "14px", cursor: "pointer", padding: "12px 4px" }}>
            ← 返回上一步
          </button>
        </div>
      </div>
    </div>
  );
}
