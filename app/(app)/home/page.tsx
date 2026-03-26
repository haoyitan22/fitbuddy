"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getMeals, getTodayTotals } from "@/lib/meals";
import type { UserProfile } from "@/lib/auth";
import type { MealRecord, MealType } from "@/lib/meals";

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "早上好";
  if (h >= 12 && h < 18) return "下午好";
  return "晚上好";
}

function todayKey() { return "fitbuddy_water_" + new Date().toISOString().slice(0, 10); }
function loadWater() { return typeof window === "undefined" ? 0 : Number(localStorage.getItem(todayKey()) ?? 0); }
function saveWater(ml: number) { localStorage.setItem(todayKey(), String(ml)); }

function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
  const r = 46, circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(eaten / goal, 1));
  return (
    <svg width="120" height="120" style={{ flexShrink: 0 }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#F3E8FF" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#C084FC" strokeWidth="10"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="60" y="54" textAnchor="middle" fontSize="20" fontWeight="800" fill="#3B1F5E">{eaten}</text>
      <text x="60" y="70" textAnchor="middle" fontSize="11" fill="#9CA3AF">/ {goal} kcal</text>
    </svg>
  );
}

const card: React.CSSProperties = {
  background: "#fff", borderRadius: "16px", padding: "18px 16px",
  boxShadow: "0 2px 12px rgba(192,132,252,0.10)",
};

const MEAL_CONFIG: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "早餐" },
  { type: "lunch",     label: "午餐" },
  { type: "dinner",    label: "晚餐" },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [water, setWater] = useState(0);
  const [customInput, setCustomInput] = useState(false);
  const [customVal, setCustomVal] = useState("");

  useEffect(() => {
    setUser(getUser());
    setMeals(getMeals());
    setTotals(getTodayTotals());
    setWater(loadWater());
  }, []);

  function addWater(ml: number) {
    const next = water + ml;
    setWater(next); saveWater(next);
  }

  function handleCustom() {
    const v = parseInt(customVal);
    if (v > 0) { addWater(v); setCustomVal(""); setCustomInput(false); }
  }

  const WATER_GOAL = 1800;
  const CALORIE_GOAL = 1500;
  const remaining = Math.max(CALORIE_GOAL - totals.calories, 0);
  const unrecorded = MEAL_CONFIG.filter(m => !meals.find(r => r.mealType === m.type));

  return (
    <div style={{ padding: "20px 16px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* 1. 问候区 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
        <div>
          <p style={{ margin: 0, fontSize: "13px", color: "#9CA3AF" }}>{getGreeting()}</p>
          <h1 style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 700, color: "#3B1F5E" }}>
            {user?.nickname ?? "朋友"} 👋
          </h1>
        </div>
        {user?.pet && (
          <Link href="/pet" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(192,132,252,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", border: "2px solid rgba(192,132,252,0.25)" }}>
              {user.pet.emoji}
            </div>
            <span style={{ fontSize: "11px", color: "#C084FC", fontWeight: 600 }}>{user.petName}</span>
          </Link>
        )}
      </div>

      {/* 2. 今日热量 */}
      <div style={card}>
        <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "#3B1F5E" }}>今日热量</p>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <CalorieRing eaten={totals.calories} goal={CALORIE_GOAL} />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
            {[
              { label: "蛋白质", value: `${totals.protein}g`, color: "#C084FC" },
              { label: "碳水",   value: `${totals.carbs}g`,   color: "#F9A8D4" },
              { label: "脂肪",   value: `${totals.fat}g`,     color: "#FCD34D" },
            ].map(m => (
              <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: m.color }} />
                  <span style={{ fontSize: "13px", color: "#9CA3AF" }}>{m.label}</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#3B1F5E" }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 三餐记录 */}
      <div style={card}>
        <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "#3B1F5E" }}>今日三餐</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {MEAL_CONFIG.map(({ type, label }) => {
            const record = meals.find(m => m.mealType === type);
            return (
              <div key={type}
                onClick={() => router.push("/record")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: "12px", cursor: "pointer",
                  background: record ? "rgba(192,132,252,0.07)" : "#FAFAFA",
                  border: record ? "1px solid rgba(192,132,252,0.15)" : "1px solid #F3F4F6",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {record?.imageBase64 && (
                    <img src={record.imageBase64} alt="" style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} />
                  )}
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#3B1F5E" }}>{label}</span>
                    {record && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#9CA3AF" }}>{record.foods}</p>}
                  </div>
                </div>
                {record ? (
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#C084FC", flexShrink: 0 }}>{record.calories} kcal</span>
                ) : (
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#C084FC", background: "rgba(192,132,252,0.1)", padding: "4px 10px", borderRadius: "8px", flexShrink: 0 }}>+ 记录</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 饮水 */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#3B1F5E" }}>💧 今日饮水</span>
          <span style={{ fontSize: "13px", color: "#9CA3AF" }}>{water} / {WATER_GOAL} ml</span>
        </div>
        <div style={{ height: "8px", background: "#FDE8F0", borderRadius: "8px", marginBottom: "14px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(water/WATER_GOAL,1)*100}%`, background: "#F9A8D4", borderRadius: "8px", transition: "width 0.4s ease" }} />
        </div>
        {!customInput ? (
          <div style={{ display: "flex", gap: "8px" }}>
            {[100,200,350].map(ml => (
              <button key={ml} onClick={() => addWater(ml)} style={{ flex: 1, padding: "8px 0", borderRadius: "10px", border: "1.5px solid #F9A8D4", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#C084FC", cursor: "pointer" }}>
                +{ml}ml
              </button>
            ))}
            <button onClick={() => setCustomInput(true)} style={{ flex: 1, padding: "8px 0", borderRadius: "10px", border: "1.5px solid #F3E8FF", background: "#fff", fontSize: "12px", color: "#9CA3AF", cursor: "pointer" }}>
              自定义
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="number" placeholder="ml" value={customVal} onChange={e => setCustomVal(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", borderRadius: "10px", border: "1.5px solid #F9A8D4", fontSize: "14px", color: "#3B1F5E", outline: "none" }}
              autoFocus onKeyDown={e => e.key==="Enter" && handleCustom()} />
            <button onClick={handleCustom} style={{ padding: "8px 16px", borderRadius: "10px", background: "#C084FC", color: "#fff", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>确认</button>
            <button onClick={() => { setCustomInput(false); setCustomVal(""); }} style={{ padding: "8px 12px", borderRadius: "10px", background: "#F3F4F6", color: "#9CA3AF", border: "none", fontSize: "13px", cursor: "pointer" }}>取消</button>
          </div>
        )}
      </div>

      {/* 5. AI 建议 */}
      <div style={{ ...card, background: "linear-gradient(135deg,rgba(192,132,252,0.12) 0%,rgba(249,168,212,0.12) 100%)", border: "1px solid rgba(192,132,252,0.15)" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "24px", flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 700, color: "#3B1F5E" }}>今日建议</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#6B4F8A", lineHeight: "1.6" }}>
              {unrecorded.length > 0
                ? `${unrecorded.map(m=>m.label).join("、")}还没记录，今天还剩 `
                : "三餐都记录啦！今天还剩 "}
              <strong style={{ color: "#C084FC" }}>{remaining} kcal</strong>
              {unrecorded.length > 0 ? "，记得按时吃饭 🥗" : "，继续保持 💪"}
            </p>
          </div>
        </div>
      </div>

      {/* 6. 宠物状态 */}
      {user?.pet && (
        <Link href="/pet" style={{ textDecoration: "none" }}>
          <div style={{ ...card, background: "linear-gradient(135deg,#FFF0F6 0%,#FDF4FF 100%)", border: "1px solid rgba(249,168,212,0.3)", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}>
            <span style={{ fontSize: "44px", flexShrink: 0 }}>{user.pet.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#3B1F5E" }}>{user.petName}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF", lineHeight: "1.5" }}>
                {unrecorded.length > 0
                  ? `${unrecorded[0].label}还没记录，快来喂我吃饭吧！`
                  : "今天所有餐食都记录啦，棒棒的！🎉"}
              </p>
            </div>
            <span style={{ fontSize: "16px", color: "#F9A8D4" }}>›</span>
          </div>
        </Link>
      )}
    </div>
  );
}
