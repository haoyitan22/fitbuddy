"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { Sheet, H2, CoinBadge, INK, SUB, ACC, TILE } from "@/components/PetHero";
import PetStage, { type PetClip } from "@/components/PetStage";
import { getTodayTotals, getMeals } from "@/lib/meals";
import { getDailyTargets } from "@/lib/goals";
import { getPetMood, getStreak, STREAK_CELEBRATE, petKindOf, petWear, type PetMood } from "@/lib/pets";
import { loadStore, saveStore, COIN_RULES, COIN_EVENT, START_COINS, type PetStore } from "@/lib/coins";
import { dayKey } from "@/lib/date";

function getDaysSince(isoDate: string): number {
  const join = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getWeekCheckinCount(): number {
  try {
    const dates: string[] = JSON.parse(localStorage.getItem("fitbuddy_workout_checkins") || "[]");
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7));
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return dayKey(d);
    });
    return weekDates.filter(d => dates.includes(d)).length;
  } catch { return 0; }
}

type ShopKind = "prop" | "hat" | "neck" | "background" | "trophy";

interface ShopItem {
  id: string;
  img: string;
  name: string;
  desc: string;
  price: number;
  kind: ShopKind;
  tag?: { label: string; color: string };
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "dumbbells",   img: "/shop/dumbbells.webp",   name: "元气小哑铃",   desc: "健身第一步，从举起它开始", price: 0,   kind: "prop", tag: { label: "新手礼", color: "#10B981" } },
  { id: "tumbler",     img: "/shop/tumbler.webp",     name: "星星喝水杯",   desc: "每天喝够水，星星会发光",   price: 80,  kind: "prop" },
  { id: "headband",    img: "/shop/headband.webp",    name: "汗水小发带",   desc: "认真运动的小家伙专属",     price: 120, kind: "hat" },
  { id: "bandana",     img: "/shop/bandana.webp",     name: "波点小领巾",   desc: "戴上它，散步都变精神",     price: 160, kind: "neck" },
  { id: "beanie",      img: "/shop/beanie.webp",      name: "软糯毛线帽",   desc: "冬天也要暖暖地坚持",       price: 200, kind: "hat", tag: { label: "冬季限定", color: "#F472B6" } },
  { id: "starry-camp", img: "/shop/starry-camp.webp", name: "星空露营地",   desc: "和小伙伴在星空下扎营",     price: 500, kind: "background", tag: { label: "稀有背景", color: "#8B5CF6" } },
  { id: "trophy",      img: "/shop/trophy.webp",      name: "心愿达成奖杯", desc: "达到目标体重才能获得",     price: 0,   kind: "trophy", tag: { label: "成就专属", color: "#F59E0B" } },
];

const WATER_GOAL = 1800;
function waterToday(): number {
  try { return Number(localStorage.getItem("fitbuddy_water_" + dayKey()) ?? 0); }
  catch { return 0; }
}
/** Which coin rewards were already paid out today (see lib/coins earnOnce). */
function earnedToday(): string[] {
  try {
    const l = JSON.parse(localStorage.getItem("fitbuddy_coin_log") || "null");
    return l && l.date === dayKey() ? l.keys : [];
  } catch { return []; }
}

export default function PetPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkinCount, setCheckinCount] = useState(0);
  const [store, setStore] = useState<PetStore>({ coins: START_COINS, owned: [], equipped: null, background: null });
  const [water, setWater] = useState(0);
  const [eaten, setEaten] = useState({ kcal: 0, goal: 1500, meals: 0 });
  const [earned, setEarned] = useState<string[]>([]);
  const [mood, setMood] = useState<PetMood>("idle");
  const [streak, setStreak] = useState(0);
  const [trigger, setTrigger] = useState<{ clip: PetClip; id: number } | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setCheckinCount(getWeekCheckinCount());
    setStore(loadStore());
    setMood(getPetMood());
    setStreak(getStreak());
    setDemo(new URLSearchParams(window.location.search).has("demo"));
    setWater(waterToday());
    setEaten({ kcal: getTodayTotals().calories, goal: getDailyTargets().calories, meals: getMeals().length });
    setEarned(earnedToday());
    // Keep the balance in sync when coins are earned while this page is open.
    const sync = () => { setStore(loadStore()); setEarned(earnedToday()); };
    window.addEventListener(COIN_EVENT, sync);
    return () => window.removeEventListener(COIN_EVENT, sync);
  }, []);

  // Demo panel: preview each effect without real meals or check-ins.
  function preview(clip: PetClip) {
    // A mood change plays the full arrival sequence (e.g. sport, then putting the outfit back on).
    if ((clip === "sport" || clip === "full") && mood !== clip) { setMood(clip); return; }
    if (clip === "celebrate" || clip === "tap") setMood("idle");
    setTrigger({ clip, id: Date.now() });
  }

  const pet = user?.pet;
  const days = user?.petJoinDate ? getDaysSince(user.petJoinDate) : 1;

  const streaking = streak >= STREAK_CELEBRATE;
  const waterDone = water >= WATER_GOAL;

  const equippedItem = SHOP_ITEMS.find(i => i.id === store.equipped && i.kind !== "background");
  // The pet itself wears the equipped item unless it is stuffed (that nudge stays on show).
  const dressed = mood !== "full" && !!equippedItem && !!petWear(petKindOf(pet), equippedItem.id);
  const bgItem = SHOP_ITEMS.find(i => i.id === store.background && i.kind === "background");
  const goalReached = !!user && user.weight > 0 && user.targetWeight > 0 && user.weight <= user.targetWeight;

  // Equip / unequip. A background has its own slot, so it can be worn together with one accessory.
  function toggleEquip(item: ShopItem, base: PetStore): PetStore {
    if (item.kind === "background") return { ...base, background: base.background === item.id ? null : item.id };
    return { ...base, equipped: base.equipped === item.id ? null : item.id };
  }

  function handleBuy(item: ShopItem) {
    let next: PetStore;
    if (store.owned.includes(item.id)) {
      next = toggleEquip(item, store);
    } else {
      if (item.kind === "trophy" && !goalReached) return;
      if (item.price > store.coins) return;
      next = toggleEquip(item, { ...store, coins: store.coins - item.price, owned: [...store.owned, item.id] });
      // A newly bought item is put on straight away.
      if (item.kind === "background") next.background = item.id; else next.equipped = item.id;
    }
    setStore(next); saveStore(next);
  }

  if (!pet) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: SUB }}>
      <div style={{ fontSize: 48 }}>🐾</div>
      <p>还没有宠物，快去注册领养吧！</p>
    </div>
  );

  const say =
    mood === "full" ? `今天吃得有点多，我撑得犯困啦～明天一起动起来` :
    mood === "sport" ? `${streaking ? `连续打卡 ${streak} 天，` : "今天运动打卡啦，"}我精神满满！${dressed && equippedItem ? `还戴上了${equippedItem.name}～` : ""}` :
    eaten.meals === 0 ? "今天还没吃饭吗？记一餐，我就能吃饱啦" :
    "点点我～我会跟你打招呼！";

  const bars: [string, number, string][] = [
    ["饱腹", Math.min(1, eaten.kcal / eaten.goal), "linear-gradient(90deg,#FFD58A,#FFB86B)"],
    ["喝水", Math.min(1, water / WATER_GOAL), "linear-gradient(90deg,#A8DDF5,#7CC9F0)"],
    ["运动", Math.min(1, checkinCount / 5), "linear-gradient(90deg,#FFB088,#FF7A45)"],
  ];
  const mealsPaid = earned.filter(k => k.startsWith("meal")).length;
  const tasks: { label: string; coins: string; done: boolean }[] = [
    { label: `记三餐 ${Math.min(mealsPaid, 3)}/3`, coins: `每餐 +${COIN_RULES.meal}`, done: mealsPaid >= 3 },
    { label: "喝满 1800ml", coins: `+${COIN_RULES.water}`, done: earned.includes("water") },
    { label: "运动打卡", coins: `+${COIN_RULES.checkin}`, done: earned.includes("checkin") },
  ];

  return (
    <div>
      {/* Keys the clips' lavender studio background out, so the pet stands on the stage. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="pet-key" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  20 20 -40 1 0" />
        </filter>
      </svg>

      {/* ── Stage ── */}
      <header style={{
        position: "relative", height: 340, padding: "max(16px, env(safe-area-inset-top)) 20px 0",
        ...(bgItem ? { backgroundImage: `url(${bgItem.img})`, backgroundSize: "cover", backgroundPosition: "center 60%" } : null),
      }}>
        <div style={{ position: "relative", zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'ZCOOL KuaiLe', system-ui, sans-serif", fontWeight: 400, fontSize: 24, color: INK }}>{user?.petName}的小家</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: SUB }}>{pet.species} · 陪你第 {days} 天</p>
          </div>
          <CoinBadge coins={store.coins} />
        </div>
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: 6, width: 250, height: 36, marginLeft: -125, borderRadius: "50%", background: "rgba(255,255,255,0.55)" }} />
        <div style={{ position: "absolute", left: "50%", bottom: 10, marginLeft: -115, filter: "url(#pet-key)", zIndex: 1 }}>
          <PetStage pet={pet} size={230} mood={mood} trigger={trigger} autoTransform="always" wear={store.equipped} />
        </div>
        {equippedItem && !dressed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={equippedItem.img} alt={equippedItem.name} title={equippedItem.name}
            className={equippedItem.id === "tumbler" && waterDone ? "shop-glow" : undefined}
            style={{ position: "absolute", right: 34, bottom: 24, width: 64, height: 64, borderRadius: 18, objectFit: "cover", zIndex: 2,
              boxShadow: "0 4px 14px rgba(255,122,69,.35)", border: "3px solid #fff", background: TILE, pointerEvents: "none" }} />
        )}
        <div role="status" style={{
          position: "absolute", zIndex: 2, top: 92, right: 18, maxWidth: 150, background: "#fff", borderRadius: 18, borderBottomRightRadius: 4,
          padding: "9px 13px", boxShadow: "0 6px 16px rgba(255,122,69,0.14)",
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: ACC }}>{user?.petName}</p>
          <p style={{ margin: "1px 0 0", fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: INK }}>{say}</p>
        </div>
      </header>

      <Sheet style={{ minHeight: "calc(100dvh - 340px)" }}>
        {/* Demo panel: open /pet?demo=1 to preview each effect */}
        {demo && (
          <div style={{ background: TILE, borderRadius: 20, padding: "12px 14px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: INK, margin: "0 0 8px" }}>动画预览（仅 demo 模式可见）</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {([["sport", "打卡运动"], ["full", "吃撑"], ["celebrate", "连续打卡庆祝"], ["tap", "被点击"]] as [PetClip, string][]).map(([clip, label]) => (
                <button key={clip} onClick={() => preview(clip)} style={{ padding: "8px 4px", borderRadius: 10, border: "none", background: "#FFE7D8", color: "#E8622E", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
              ))}
            </div>
            <button onClick={() => setMood("idle")} style={{ marginTop: 8, width: "100%", padding: 6, borderRadius: 10, border: "1px solid #FFE7D8", background: "transparent", color: SUB, fontSize: 12, cursor: "pointer" }}>恢复默认状态</button>
          </div>
        )}

        {/* ── Status bars (from today's real records) ── */}
        <div style={{ background: TILE, borderRadius: 20, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {bars.map(([label, v, fill]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: INK, width: 28 }}>{label}</span>
              <span style={{ flex: 1, height: 10, borderRadius: 999, background: "#fff", overflow: "hidden" }} role="progressbar" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ display: "block", height: "100%", width: `${Math.max(4, v * 100)}%`, borderRadius: 999, background: fill, transition: "width .5s" }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: SUB, width: 26, textAlign: "right" }}>{Math.round(v * 100)}</span>
            </div>
          ))}
        </div>

        {/* ── Tasks ── */}
        <H2 action={`本周打卡 ${checkinCount} 天`}>做健康小事赚金币</H2>
        <div style={{ display: "flex", gap: 8 }}>
          {tasks.map(t => (
            <div key={t.label} style={{ flex: 1, minWidth: 0, borderRadius: 16, padding: "10px 6px", textAlign: "center", background: t.done ? TILE : "#FFF1C2" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>{t.label}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11.5, fontWeight: 700, color: t.done ? "#C9B5A8" : "#B26A00" }}>{t.done ? "已领取 ✓" : `${t.coins} 金币`}</p>
            </div>
          ))}
        </div>

        {/* ── Shop ── */}
        <H2 action={`连续打卡 7 天 +${COIN_RULES.streak7}`}>装扮商城</H2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {SHOP_ITEMS.map(item => {
            const owned = store.owned.includes(item.id);
            const equipped = item.kind === "background" ? store.background === item.id : store.equipped === item.id;
            const isFree = item.price === 0;
            const locked = item.kind === "trophy" && !goalReached && !owned;
            const short = !owned && !isFree && store.coins < item.price;
            const disabled = locked || short;
            const label = equipped ? "穿戴中" : owned ? "去装扮" : locked ? "达成目标解锁" : item.kind === "trophy" ? "领取" : isFree ? "免费领" : String(item.price);
            return (
              <button key={item.id} type="button" disabled={disabled} onClick={() => handleBuy(item)}
                aria-label={`${item.name}，${short ? `还差 ${item.price - store.coins} 金币` : label}`}
                style={{
                  position: "relative", border: equipped ? `2px solid ${ACC}` : "2px solid transparent", borderRadius: 18, background: TILE,
                  padding: "8px 6px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: disabled ? "default" : "pointer",
                }}>
                {item.tag && <span style={{ position: "absolute", top: 4, left: 4, background: item.tag.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999 }}>{item.tag.label}</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.img} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 14, background: "#fff", filter: disabled ? "grayscale(.6) opacity(.7)" : "none" }} />
                <span style={{ fontSize: 11.5, fontWeight: 500, color: INK }}>{item.name}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: equipped ? ACC : owned ? "#FFE7D8" : "#fff", color: equipped ? "#fff" : owned ? "#E8622E" : disabled ? "#C9B5A8" : INK }}>
                  {!owned && !isFree && item.kind !== "trophy" && <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="#F5A623"><path d="M12 2l2.6 6.6L21.5 9l-5.3 4.6L17.9 21 12 17.2 6.1 21l1.7-7.4L2.5 9l6.9-.4z" /></svg>}
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
}
