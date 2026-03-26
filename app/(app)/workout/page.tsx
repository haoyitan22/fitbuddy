"use client";

import { useState, useEffect } from "react";
import { getUserData } from "@/lib/auth";

type BodyPart = "full" | "abs" | "legs" | "arms";

interface VideoItem {
  id: string;
  title: string;
  duration: string;
  level: "入门" | "进阶";
}

const BODY_PARTS: { key: BodyPart; label: string; emoji: string }[] = [
  { key: "full", label: "全身燃脂", emoji: "🔥" },
  { key: "abs", label: "腹部马甲线", emoji: "🦋" },
  { key: "legs", label: "腿部臀部", emoji: "🦵" },
  { key: "arms", label: "手臂背部", emoji: "💪" },
];

const VIDEOS: Record<BodyPart, VideoItem[]> = {
  full: [
    { id: "cbKkB3POqaY", title: "Full Body Workout", duration: "10分钟", level: "入门" },
    { id: "9mAk2JQuXSA", title: "Full Body HIIT", duration: "20分钟", level: "进阶" },
    { id: "W4eKVKwf3rQ", title: "Fat Burn Cardio", duration: "30分钟", level: "入门" },
  ],
  abs: [
    { id: "2pLT-olgUJs", title: "Ab Workout", duration: "10分钟", level: "入门" },
    { id: "AnYl6Nk9GOA", title: "Core Workout", duration: "15分钟", level: "进阶" },
    { id: "8AAmaSOSyIA", title: "Sixpack Abs Workout", duration: "20分钟", level: "进阶" },
  ],
  legs: [
    { id: "ZZI__bqlBkQ", title: "Leg Workout", duration: "10分钟", level: "入门" },
    { id: "uVt1hnAP1sI", title: "Booty Workout", duration: "20分钟", level: "进阶" },
    { id: "90a-Tf2jrVQ", title: "Leg Day Workout", duration: "25分钟", level: "进阶" },
  ],
  arms: [
    { id: "XYp7GQicd0c", title: "Arm Workout", duration: "10分钟", level: "入门" },
    { id: "Y346900i9qE", title: "Back Workout", duration: "15分钟", level: "进阶" },
    { id: "O_KGF_TSKZk", title: "Slim Arms Workout", duration: "10分钟", level: "入门" },
  ],
};

function getWeekDates() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getCheckedInDates(): string[] {
  try {
    return JSON.parse(localStorage.getItem("fitbuddy_workout_checkins") || "[]");
  } catch { return []; }
}

function saveCheckin(date: string) {
  const dates = getCheckedInDates();
  if (!dates.includes(date)) {
    dates.push(date);
    localStorage.setItem("fitbuddy_workout_checkins", JSON.stringify(dates));
  }
}

const CONFETTI_COLORS = ["#C084FC", "#F9A8D4", "#FCD34D", "#6EE7B7", "#93C5FD"];

export default function WorkoutPage() {
  const [selected, setSelected] = useState<BodyPart>("full");
  const [checkedIn, setCheckedIn] = useState(false);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [checkedDates, setCheckedDates] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [petEmoji, setPetEmoji] = useState("🐾");
  const [petName, setPetName] = useState("宠物");
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dates = getCheckedInDates();
    setCheckedDates(dates);
    setCheckedIn(dates.includes(todayKey()));
    setWeekDates(getWeekDates());
    const user = getUserData();
    if (user?.pet) setPetEmoji(user.pet.emoji);
    if (user?.petName) setPetName(user.petName);
  }, []);

  const weekCheckins = weekDates.filter(d => checkedDates.includes(d)).length;
  const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];

  function handleCheckin(videoId: string) {
    if (completedVideos.has(videoId)) return;
    const newCompleted = new Set(completedVideos);
    newCompleted.add(videoId);
    setCompletedVideos(newCompleted);

    if (!checkedIn) {
      const today = todayKey();
      saveCheckin(today);
      setCheckedIn(true);
      setCheckedDates(prev => [...prev, today]);
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 3000);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #FDF4FF 0%, #FFF0F6 100%)", paddingBottom: "80px" }}>
      {/* Celebration overlay */}
      {celebrating && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(253,244,255,0.95)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontSize: "80px", marginBottom: "16px" }}>{petEmoji}</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#3B1F5E", marginBottom: "8px" }}>
            {petName} 为你骄傲！🎉
          </div>
          <div style={{ fontSize: "16px", color: "#9CA3AF" }}>今天又完成运动打卡，棒棒的！</div>
          {/* Confetti */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${Math.random() * 100}%`,
                top: "-10px",
                width: "10px", height: "10px",
                borderRadius: i % 2 === 0 ? "50%" : "2px",
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animation: `confettiFall ${1.5 + Math.random() * 2}s linear ${Math.random() * 1}s forwards`,
              }} />
            ))}
          </div>
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      <div style={{ maxWidth: "430px", margin: "0 auto", padding: "20px 16px 0" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>今日运动 💪</h1>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #C084FC, #F9A8D4)",
            borderRadius: "20px", padding: "6px 14px",
            fontSize: "13px", fontWeight: 600, color: "#fff",
          }}>
            本周已打卡 {weekCheckins} 天
          </div>
        </div>

        {/* Body part selector */}
        <div style={{
          background: "#fff", borderRadius: "16px",
          padding: "16px", marginBottom: "16px",
          boxShadow: "0 2px 12px rgba(192,132,252,0.08)",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#3B1F5E", margin: "0 0 12px" }}>今天练哪里？</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {BODY_PARTS.map(bp => (
              <button key={bp.key} onClick={() => setSelected(bp.key)} style={{
                padding: "14px 10px", borderRadius: "12px", border: "none", cursor: "pointer",
                background: selected === bp.key ? "#F3E8FF" : "#F9FAFB",
                outline: selected === bp.key ? "2px solid #C084FC" : "2px solid transparent",
                display: "flex", alignItems: "center", gap: "8px",
                fontSize: "14px", fontWeight: selected === bp.key ? 600 : 400,
                color: selected === bp.key ? "#7C3AED" : "#6B7280",
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: "20px" }}>{bp.emoji}</span>
                {bp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Video list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
          {VIDEOS[selected].map(video => {
            const done = completedVideos.has(video.id);
            return (
              <div key={video.id} style={{
                background: "#fff", borderRadius: "16px", overflow: "hidden",
                boxShadow: "0 2px 12px rgba(192,132,252,0.08)",
              }}>
                {/* YouTube embed */}
                <div style={{ position: "relative", paddingTop: "56.25%" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}`}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {/* Info */}
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#3B1F5E", margin: "0 0 8px" }}>{video.title}</p>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <span style={{
                      background: "#F3F4F6", borderRadius: "20px", padding: "2px 10px",
                      fontSize: "12px", color: "#6B7280",
                    }}>⏱ {video.duration}</span>
                    <span style={{
                      background: video.level === "入门" ? "#DCFCE7" : "#FEF3C7",
                      borderRadius: "20px", padding: "2px 10px",
                      fontSize: "12px", color: video.level === "入门" ? "#16A34A" : "#D97706",
                      fontWeight: 600,
                    }}>{video.level}</span>
                  </div>
                  <button onClick={() => handleCheckin(video.id)} disabled={done} style={{
                    width: "100%", padding: "10px", borderRadius: "10px", border: "none", cursor: done ? "default" : "pointer",
                    background: done ? "#F3F4F6" : "linear-gradient(135deg, #C084FC, #F9A8D4)",
                    color: done ? "#9CA3AF" : "#fff",
                    fontSize: "14px", fontWeight: 600,
                    transition: "all 0.2s",
                  }}>
                    {done ? "已完成 🎉" : "✅ 完成打卡"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly record */}
        <div style={{
          background: "#fff", borderRadius: "16px", padding: "16px",
          boxShadow: "0 2px 12px rgba(192,132,252,0.08)", marginBottom: "8px",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#3B1F5E", margin: "0 0 12px" }}>本周打卡记录</p>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {weekDates.map((date, i) => {
              const done = checkedDates.includes(date);
              return (
                <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: done ? "linear-gradient(135deg, #C084FC, #F9A8D4)" : "#F3F4F6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "16px",
                  }}>
                    {done ? "✓" : ""}
                  </div>
                  <span style={{ fontSize: "11px", color: "#9CA3AF" }}>周{weekLabels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
