"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTempData, saveUserData, createSession, clearTempData } from "@/lib/auth";
import type { UserProfile, Pet } from "@/lib/auth";

const confettiColors = ["#C084FC","#F9A8D4","#FCD34D","#86EFAC","#93C5FD","#FB923C"];

function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    left: `${(i / 36) * 100 + (Math.random() - 0.5) * 8}%`,
    size: 6 + (i % 5) * 2,
    color: confettiColors[i % confettiColors.length],
    duration: 1.4 + (i % 7) * 0.3,
    delay: (i % 9) * 0.1,
    round: i % 3 !== 0,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: p.left, top: "-20px",
          width: p.size, height: p.size,
          borderRadius: p.round ? "50%" : "3px",
          background: p.color,
          animation: `fall ${p.duration}s ease-in ${p.delay}s forwards`,
          opacity: 0,
        }} />
      ))}
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(0) rotate(0deg);    opacity: 1; }
          100% { transform: translateY(105vh) rotate(600deg); opacity: 0; }
        }
        @keyframes floatPet {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes popIn {
          0%   { transform: scale(0.6); opacity: 0; }
          70%  { transform: scale(1.08); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function NamingPage() {
  const router = useRouter();
  const [petName, setPetName] = useState("");
  const [pet, setPet] = useState<Pet | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const temp = getTempData();
    if (temp.pet) setPet(temp.pet);
  }, []);

  useEffect(() => {
    if (celebrating) {
      const t = setTimeout(() => router.push("/home"), 3000);
      return () => clearTimeout(t);
    }
  }, [celebrating, router]);

  function handleConfirm() {
    if (!petName.trim() || !pet) return;
    const temp = getTempData();
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
      petName: petName.trim(),
      petJoinDate: new Date().toISOString(),
    };
    saveUserData(profile);
    createSession(profile.email);
    clearTempData();
    setCelebrating(true);
  }

  const trimmed = petName.trim();

  if (celebrating && pet) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <Confetti />
        <div style={{ textAlign: "center", animation: "popIn 0.6s ease forwards", maxWidth: "380px" }}>
          <div style={{ fontSize: "88px", marginBottom: "24px", animation: "floatPet 2s ease-in-out infinite" }}>{pet.emoji}</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#3B1F5E", margin: 0 }}>
            {trimmed} 来啦！🎉
          </h1>
          <p style={{ fontSize: "16px", color: "#9CA3AF", marginTop: "12px" }}>从今天起，它会陪着你 ✨</p>
          <p style={{ fontSize: "13px", color: "#C4B5D0", marginTop: "8px" }}>记录每一餐，一起慢慢变健康</p>
          <p style={{ fontSize: "12px", color: "#D8B4FE", marginTop: "40px" }}>3 秒后自动进入首页...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "430px", width: "100%", textAlign: "center" }}>

        {/* 浮动宠物 emoji */}
        <div style={{ fontSize: "88px", marginBottom: "24px", display: "inline-block", animation: "floatPet 2.5s ease-in-out infinite" }}>
          {pet?.emoji ?? "🐾"}
        </div>
        <style>{`
          @keyframes floatPet {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-12px); }
          }
        `}</style>

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#3B1F5E", margin: "0 0 8px" }}>
          给你的小伙伴起个名字吧 💕
        </h1>

        <div style={{ background: "#fff", borderRadius: "20px", padding: "28px 24px", boxShadow: "0 4px 24px rgba(192,132,252,0.1)", marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="text"
            placeholder="叫它什么好呢..."
            value={petName}
            onChange={e => setPetName(e.target.value)}
            maxLength={10}
            style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1.5px solid #F3E8FF", background: "#F9F5FF", fontSize: "16px", color: "#3B1F5E", outline: "none", boxSizing: "border-box", textAlign: "center" }}
          />
          <p style={{ margin: 0, fontSize: "12px", color: "#C4B5D0" }}>可以是任意名字，之后也能修改</p>

          <button
            onClick={handleConfirm}
            disabled={!trimmed}
            style={{
              background: trimmed ? "#C084FC" : "#E9D5FF",
              color: "#fff", border: "none", borderRadius: "16px",
              padding: "16px", fontSize: "16px", fontWeight: 600,
              cursor: trimmed ? "pointer" : "not-allowed",
              boxShadow: trimmed ? "0 4px 16px rgba(192,132,252,0.35)" : "none",
              transition: "all 0.2s",
            }}
          >
            {trimmed ? `就叫 ${trimmed} 了！` : "给它起个名字吧"}
          </button>
        </div>

        <button onClick={() => router.back()} style={{ marginTop: "20px", background: "transparent", color: "#9CA3AF", border: "none", fontSize: "14px", cursor: "pointer", padding: "8px" }}>
          ← 返回上一步
        </button>
      </div>
    </div>
  );
}
