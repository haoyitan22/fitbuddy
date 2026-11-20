"use client";

import { useState, useEffect } from "react";
import { getUserData } from "@/lib/auth";
import { shareActivity } from "@/lib/team";
import type { Pet } from "@/lib/auth";
import PetStage from "@/components/PetStage";
import { getStreak, STREAK_CELEBRATE } from "@/lib/pets";
import { earnOnce, COIN_RULES } from "@/lib/coins";
import PetHero, { Sheet, H2, INK, SUB, ACC, CTA, TILE } from "@/components/PetHero";
import { dayKey } from "@/lib/date";

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
    return dayKey(d);
  });
}

function todayKey() {
  return dayKey();
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

const CONFETTI_COLORS = ["#FF7A45", "#FFB088", "#FCD34D", "#6EE7B7", "#93C5FD"];

export default function WorkoutPage() {
  const [selected, setSelected] = useState<BodyPart>("full");
  const [checkedIn, setCheckedIn] = useState(false);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [checkedDates, setCheckedDates] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [pet, setPet] = useState<Pet | null>(null);
  const [overlayClip, setOverlayClip] = useState<"sport" | "celebrate">("sport");
  const [streakDays, setStreakDays] = useState(0);
  const [petName, setPetName] = useState("宠物");
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dates = getCheckedInDates();
    setCheckedDates(dates);
    setCheckedIn(dates.includes(todayKey()));
    setWeekDates(getWeekDates());
    const user = getUserData();
    if (user?.pet) setPet(user.pet);
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
      // A streak gets the bigger celebration; a normal check-in gets the sport transform.
      const s = getStreak();
      setStreakDays(s);
      earnOnce("checkin", COIN_RULES.checkin, "运动打卡");
      const u = getUserData();
      shareActivity(u, "checkin", `${u?.petName ?? "宠物"}的主人完成了运动打卡 💪`, s > 1 ? `已连续打卡 ${s} 天` : "今日运动已打卡", getCheckedInDates());
      if (s > 0 && s % 7 === 0) earnOnce("streak7", COIN_RULES.streak7, `连续打卡 ${s} 天奖励`);
      setOverlayClip(s >= STREAK_CELEBRATE ? "celebrate" : "sport");
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 5000);
    }
  }

  return (
    <div>
      {/* Celebration overlay */}
      {celebrating && (
        <div onClick={() => setCelebrating(false)} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(255,247,241,0.95)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ marginBottom: "16px", position: "relative", zIndex: 1 }}>
            <PetStage pet={pet} size={220} autoTransform={false} interactive={false}
              mood={overlayClip === "sport" ? "sport" : "idle"}
              trigger={{ clip: overlayClip, id: 1 }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#5B2E1E", marginBottom: "8px" }}>
            {overlayClip === "celebrate" ? `连续打卡 ${streakDays} 天！🎉` : `${petName} 为你骄傲！🎉`}
          </div>
          <div style={{ fontSize: "16px", color: "#A67760" }}>
            {overlayClip === "celebrate" ? `${petName}开心得跳起来啦，继续保持！` : "今天又完成运动打卡，棒棒的！"}
          </div>
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

      <PetHero
        title="今日运动"
        right={<span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 999, background: "#fff", fontSize: 12, fontWeight: 700, color: ACC, flexShrink: 0 }}>本周打卡 {weekCheckins} 天</span>}
        pet={pet} petName={petName} side="left"
        say={checkedIn ? "今天已经打卡啦，你真棒！明天继续～" : `今天练${BODY_PARTS.find(b => b.key === selected)?.label ?? "一下"}好不好？练完打卡我会换上运动装！`}
      />
      <Sheet>
        {/* This week */}
        <div style={{ display: "flex", justifyContent: "space-between" }} aria-label={`本周已打卡 ${weekCheckins} 天`}>
          {weekDates.map((date, i) => {
            const done = checkedDates.includes(date);
            const isToday = date === todayKey();
            return (
              <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 7px", borderRadius: 14, background: isToday ? INK : TILE }}>
                <span style={{ fontSize: 11, color: isToday ? "#E8CBBB" : SUB }}>{weekLabels[i]}</span>
                <span style={{ width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: done ? ACC : isToday ? "#fff" : "#FFE7D8" }}>
                  {done && <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                </span>
              </div>
            );
          })}
        </div>

        <H2>今天练哪里</H2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {BODY_PARTS.map(bp => {
            const on = selected === bp.key;
            return (
              <button key={bp.key} type="button" onClick={() => setSelected(bp.key)} aria-pressed={on} style={{
                padding: "14px 12px", borderRadius: 18, border: "none", cursor: "pointer", textAlign: "left",
                background: on ? CTA : TILE, color: on ? "#fff" : INK,
                boxShadow: on ? "0 8px 16px rgba(255,122,69,0.25)" : "none",
                display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700,
              }}>
                <span style={{ fontSize: 20 }} aria-hidden="true">{bp.emoji}</span>
                {bp.label}
              </button>
            );
          })}
        </div>

        {/* Video list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {VIDEOS[selected].map(video => {
            const done = completedVideos.has(video.id);
            return (
              <div key={video.id} style={{
                background: TILE, borderRadius: "20px", overflow: "hidden",
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
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#5B2E1E", margin: "0 0 8px" }}>{video.title}</p>
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
                    width: "100%", padding: "10px", borderRadius: "999px", border: "none", cursor: done ? "default" : "pointer",
                    background: done ? "#FFE7D8" : INK,
                    color: done ? "#A67760" : "#fff",
                    fontSize: "14px", fontWeight: 600,
                    transition: "all 0.2s",
                  }}>
                    {done ? "已完成 🎉" : "练完了，打卡 +20 金币"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </Sheet>
    </div>
  );
}
