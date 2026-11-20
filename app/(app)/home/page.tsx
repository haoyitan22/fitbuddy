"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getMeals, getTodayTotals } from "@/lib/meals";
import type { UserProfile } from "@/lib/auth";
import type { MealRecord, MealType } from "@/lib/meals";
import PetHero, { Sheet, H2, CoinBadge, INK, SUB, ACC, CTA, TILE } from "@/components/PetHero";
import { CALORIE_GOAL, getPetMood, type PetMood } from "@/lib/pets";
import { getDailyTargets } from "@/lib/goals";
import { earnOnce, COIN_RULES, loadStore, COIN_EVENT } from "@/lib/coins";
import { dayKey } from "@/lib/date";

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "早上好";
  if (h >= 12 && h < 18) return "下午好";
  return "晚上好";
}

function todayKey() { return "fitbuddy_water_" + dayKey(); }
function loadWater() { return typeof window === "undefined" ? 0 : Number(localStorage.getItem(todayKey()) ?? 0); }
function saveWater(ml: number) { localStorage.setItem(todayKey(), String(ml)); }

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
  const [goal, setGoal] = useState(CALORIE_GOAL);
  const [water, setWater] = useState(0);
  const [customInput, setCustomInput] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [mood, setMood] = useState<PetMood>("idle");
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    setUser(getUser());
    setMeals(getMeals());
    setTotals(getTodayTotals());
    setGoal(getDailyTargets().calories);
    setWater(loadWater());
    setMood(getPetMood());
    setCoins(loadStore().coins);
    const sync = () => setCoins(loadStore().coins);
    window.addEventListener(COIN_EVENT, sync);
    return () => window.removeEventListener(COIN_EVENT, sync);
  }, []);

  function addWater(ml: number) {
    const next = water + ml;
    setWater(next); saveWater(next);
    if (next >= WATER_GOAL) earnOnce("water", COIN_RULES.water, "今日喝水达标");
  }

  function handleCustom() {
    const v = parseInt(customVal);
    if (v > 0) { addWater(v); setCustomVal(""); setCustomInput(false); }
  }

  const WATER_GOAL = 1800;
  const remaining = Math.max(goal - totals.calories, 0);
  const unrecorded = MEAL_CONFIG.filter(m => !meals.find(r => r.mealType === m.type));

  const pct = Math.min(totals.calories / goal, 1);
  const R = 46, CIRC = 2 * Math.PI * R;
  const cups = 8, full = Math.min(cups, Math.floor(water / (WATER_GOAL / cups)));
  const say = mood === "full"
    ? "今天吃得有点多，我撑得犯困啦，明天一起动起来～"
    : unrecorded.length > 0
      ? `${unrecorded[0].label}还没记录哦～今天还能吃 ${remaining} kcal`
      : `三餐都记录啦！还剩 ${remaining} kcal，继续保持`;

  return (
    <div>
      <PetHero
        title={`${getGreeting()}，${user?.nickname ?? "朋友"}`}
        right={<CoinBadge coins={coins} />}
        pet={user?.pet} petName={user?.petName} pose={7} say={say} side="right"
      />

      <Sheet>
        {/* 今日热量 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 14, borderRadius: 20, background: "linear-gradient(90deg,#FFF3EA,#FFE7D8)" }}>
          <svg width="108" height="108" viewBox="0 0 108 108" style={{ flexShrink: 0 }} role="img" aria-label={`还能吃 ${remaining} kcal`}>
            <circle cx="54" cy="54" r={R} fill="none" stroke="#FFFFFF" strokeWidth="11" />
            <circle cx="54" cy="54" r={R} fill="none" stroke={ACC} strokeWidth="11" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)} transform="rotate(-90 54 54)"
              style={{ transition: "stroke-dashoffset .6s ease" }} />
            <text x="54" y="42" textAnchor="middle" fontSize="11" fill={SUB}>还能吃</text>
            <text x="54" y="64" textAnchor="middle" fontSize="24" fontWeight="800" fill={INK}>{remaining}</text>
            <text x="54" y="78" textAnchor="middle" fontSize="11" fill={SUB}>kcal</text>
          </svg>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            {[["已吃", `${totals.calories} kcal`], ["目标", `${goal} kcal`]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: SUB }}>{a}</span><span style={{ fontWeight: 700, fontSize: 13 }}>{b}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6 }}>
              {[["蛋白", totals.protein, "#A78BFA"], ["碳水", totals.carbs, "#FFB86B"], ["脂肪", totals.fat, "#7CC9F0"]].map(([n, v, c]) => (
                <div key={n as string} style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "6px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: SUB }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: c as string }} />{n}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{v}g</div>
                </div>
              ))}
            </div>
            <a href="/profile#goal" style={{ fontSize: 11, color: ACC, textDecoration: "none", alignSelf: "flex-end" }}>我的目标 ›</a>
          </div>
        </div>

        {/* 今日三餐 */}
        <H2 action="拍照识别热量">今日三餐</H2>
        <div style={{ display: "flex", gap: 10 }}>
          {MEAL_CONFIG.map(({ type, label }) => {
            const record = meals.find(m => m.mealType === type);
            return (
              <button key={type} type="button" onClick={() => router.push(`/record?meal=${type}`)}
                style={{
                  flex: 1, minWidth: 0, textAlign: "left", border: "none", cursor: "pointer", borderRadius: 20, padding: 12,
                  display: "flex", flexDirection: "column", gap: 6,
                  background: record ? TILE : CTA, color: record ? INK : "#fff",
                  boxShadow: record ? "none" : "0 8px 16px rgba(255,122,69,0.25)",
                }}>
                {record?.imageBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={record.imageBase64} alt="" style={{ width: 30, height: 30, borderRadius: 10, objectFit: "cover" }} />
                ) : (
                  <span style={{ width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", background: record ? "#fff" : "rgba(255,255,255,0.25)" }}>
                    {record
                      ? <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      : <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /></svg>}
                  </span>
                )}
                <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: record ? ACC : "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {record ? `${record.calories} kcal` : "+ 拍一拍"}
                </span>
              </button>
            );
          })}
        </div>

        {/* 喝水 */}
        <H2 action={`${water} / ${WATER_GOAL} ml`}>喝水</H2>
        <div style={{ background: TILE, borderRadius: 20, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }} aria-label={`已喝 ${water} 毫升`}>
            {Array.from({ length: cups }).map((_, i) => (
              <span key={i} aria-hidden="true" style={{
                width: 22, height: 30, borderRadius: "8px 8px 10px 10px",
                background: i < full ? "linear-gradient(180deg,#BFE6F8,#7CC9F0)" : "#fff",
                border: i < full ? "none" : "1.5px solid #CFE9F6",
              }} />
            ))}
            <span style={{ flex: 1 }} />
            {!customInput && (
              <button type="button" onClick={() => addWater(225)} style={{ border: "none", cursor: "pointer", background: INK, color: "#fff", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 700 }}>+ 一杯</button>
            )}
          </div>
          {!customInput ? (
            <div style={{ display: "flex", gap: 8 }}>
              {[100, 200, 350].map(ml => (
                <button key={ml} type="button" onClick={() => addWater(ml)} style={{ flex: 1, padding: "7px 0", borderRadius: 999, border: "none", background: "#fff", fontSize: 12.5, fontWeight: 600, color: INK, cursor: "pointer" }}>+{ml}</button>
              ))}
              <button type="button" onClick={() => setCustomInput(true)} style={{ flex: 1, padding: "7px 0", borderRadius: 999, border: "none", background: "#fff", fontSize: 12.5, color: SUB, cursor: "pointer" }}>自定义</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" inputMode="numeric" placeholder="毫升" aria-label="喝了多少毫升" value={customVal} onChange={e => setCustomVal(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 999, border: "1.5px solid #FFD2BA", fontSize: 14, color: INK, outline: "none" }}
                autoFocus onKeyDown={e => e.key === "Enter" && handleCustom()} />
              <button type="button" onClick={handleCustom} style={{ padding: "8px 16px", borderRadius: 999, background: ACC, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>确认</button>
              <button type="button" onClick={() => { setCustomInput(false); setCustomVal(""); }} style={{ padding: "8px 12px", borderRadius: 999, background: "#fff", color: SUB, border: "none", fontSize: 13, cursor: "pointer" }}>取消</button>
            </div>
          )}
        </div>

        {user?.pet && (
          <Link href="/pet" style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 18, background: "#FFF1C2", color: INK, fontSize: 13 }}>
            <span>去看看 <b>{user.petName}</b> 的小家，做健康小事赚金币</span>
            <span style={{ color: ACC, fontWeight: 700 }}>›</span>
          </Link>
        )}
      </Sheet>
    </div>
  );
}
