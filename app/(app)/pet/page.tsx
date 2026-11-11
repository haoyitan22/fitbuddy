"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import PetStage, { type PetClip } from "@/components/PetStage";
import PetAvatar from "@/components/PetAvatar";
import { getPetMood, getStreak, STREAK_CELEBRATE, petKindOf, petWear, type PetMood } from "@/lib/pets";
import { loadStore, saveStore, COIN_RULES, COIN_EVENT, START_COINS, type PetStore } from "@/lib/coins";

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
      return d.toISOString().slice(0, 10);
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
function waterReachedToday(): boolean {
  try { return Number(localStorage.getItem("fitbuddy_water_" + new Date().toISOString().slice(0, 10)) ?? 0) >= WATER_GOAL; }
  catch { return false; }
}

export default function PetPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkinCount, setCheckinCount] = useState(0);
  const [store, setStore] = useState<PetStore>({ coins: START_COINS, owned: [], equipped: null, background: null });
  const [waterDone, setWaterDone] = useState(false);
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
    setWaterDone(waterReachedToday());
    // Keep the balance in sync when coins are earned while this page is open.
    const sync = () => setStore(loadStore());
    window.addEventListener(COIN_EVENT, sync);
    return () => window.removeEventListener(COIN_EVENT, sync);
  }, []);

  // Demo panel: preview each effect without real meals or check-ins.
  function preview(clip: PetClip) {
    if (clip === "sport" || clip === "full") setMood(clip);
    if (clip === "celebrate" || clip === "tap") setMood("idle");
    setTrigger({ clip, id: Date.now() });
  }

  const pet = user?.pet;
  const days = user?.petJoinDate ? getDaysSince(user.petJoinDate) : 1;

  const streaking = streak >= STREAK_CELEBRATE;

  const equippedItem = SHOP_ITEMS.find(i => i.id === store.equipped && i.kind !== "background");
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#9CA3AF" }}>
      <div style={{ fontSize: 48 }}>🐾</div>
      <p>还没有宠物，快去注册领养吧！</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#FDF4FF 0%,#FFF0F6 100%)", paddingBottom: 88 }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes starFloat { 0%{transform:translateY(0) scale(1);opacity:.8} 100%{transform:translateY(-30px) scale(.6);opacity:0} }
        @keyframes heartFloat { 0%{transform:translateY(0) scale(1);opacity:.9} 100%{transform:translateY(-36px) scale(.5);opacity:0} }
      `}</style>

      <div style={{ maxWidth: 430, margin: "0 auto", padding: "20px 16px 0" }}>

        {/* ── 1. Pet card ── */}
        <div style={{ background: "linear-gradient(135deg,#F3E8FF,#FCE7F3)", borderRadius: 20, padding: "28px 20px 20px", marginBottom: 14, boxShadow: "0 4px 20px rgba(192,132,252,.15)", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* Pet scene: a background theme fills this area when one is equipped */}
          <div style={{
            minHeight: 250, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, position: "relative", marginBottom: 12,
            ...(bgItem ? { backgroundImage: `url(${bgItem.img})`, backgroundSize: "cover", backgroundPosition: "center 60%", borderRadius: 16, padding: "24px 0 16px", margin: "-8px -6px 12px" } : null),
          }}>
            {/* Floating particles */}
            {mood === "idle" && Array.from({length:5}).map((_,i) => (
              <span key={i} style={{ position:"absolute", fontSize:16, animation:`starFloat ${1.5+i*.4}s ease-in infinite ${i*.3}s`, left:`${15+i*14}%`, top:`${30+i*8}%`, opacity:.8 }}>✨</span>
            ))}
            {mood === "sport" && Array.from({length:6}).map((_,i) => (
              <span key={i} style={{ position:"absolute", fontSize:18, animation:`heartFloat ${1.4+i*.3}s ease-in infinite ${i*.25}s`, left:`${10+i*13}%`, top:`${20+i*10}%`, opacity:.9 }}>💕</span>
            ))}

            {/* Animated pet: tap it. The equipped accessory sits beside it. */}
            <div style={{ position: "relative", ...(bgItem ? { borderRadius: 38, boxShadow: "0 0 0 4px rgba(255,255,255,.85), 0 8px 24px rgba(0,0,0,.25)" } : null) }}>
              <PetStage pet={pet} size={200} mood={mood} trigger={trigger} autoTransform="always" wear={store.equipped} />
              {equippedItem && !(mood === "idle" && petWear(petKindOf(pet), equippedItem.id)) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={equippedItem.img} alt={equippedItem.name} title={equippedItem.name}
                  className={equippedItem.id === "tumbler" && waterDone ? "shop-glow" : undefined}
                  style={{ position: "absolute", right: -34, bottom: -6, width: 78, height: 78, borderRadius: 20, objectFit: "cover",
                    boxShadow: "0 4px 14px rgba(192,132,252,.35)", border: "3px solid #fff", background: "#FDF4FF", pointerEvents: "none" }} />
              )}
            </div>

            {/* State message */}
            {mood === "full" && (
              <p style={{ fontSize:13, color:"#EF4444", fontWeight:600, marginTop:8, background:"rgba(255,255,255,.7)", borderRadius:20, padding:"4px 14px" }}>
                今天吃得有点多，{user?.petName}撑得犯困啦～
              </p>
            )}
            {mood === "sport" && (
              <p style={{ fontSize:13, color:"#10B981", fontWeight:600, marginTop:8, background:"rgba(255,255,255,.7)", borderRadius:20, padding:"4px 14px" }}>
                {streaking ? `连续打卡 ${streak} 天，元气满满！` : "今天运动打卡啦，元气满满！"}
              </p>
            )}
          </div>

          {/* Pet info */}
          <h2 style={{ fontSize:24, fontWeight:800, color:"#3B1F5E", margin:"0 0 4px" }}>{user?.petName}</h2>
          <p style={{ fontSize:13, color:"#9CA3AF", margin:"0 0 12px" }}>{pet.species} · {pet.desc}</p>
          <span style={{ background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", borderRadius:20, padding:"4px 16px", fontSize:13, fontWeight:600 }}>
            加入第 {days} 天
          </span>
        </div>

        {/* Demo panel: open /pet?demo=1 to preview each effect */}
        {demo && (
          <div style={{ background:"#fff", borderRadius:16, padding:"12px 14px", marginBottom:14, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
            <p style={{ fontSize:13, fontWeight:600, color:"#3B1F5E", margin:"0 0 8px" }}>动画预览（仅 demo 模式可见）</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {([["sport","打卡运动"],["full","吃撑"],["celebrate","连续打卡庆祝"],["tap","被点击"]] as [PetClip,string][]).map(([clip,label]) => (
                <button key={clip} onClick={() => preview(clip)} style={{ padding:"8px 4px", borderRadius:10, border:"none", background:"#F3E8FF", color:"#7C3AED", fontSize:12, fontWeight:600, cursor:"pointer" }}>{label}</button>
              ))}
            </div>
            <button onClick={() => setMood("idle")} style={{ marginTop:8, width:"100%", padding:"6px", borderRadius:10, border:"1px solid #EDE9FE", background:"transparent", color:"#9CA3AF", fontSize:12, cursor:"pointer" }}>恢复默认状态</button>
          </div>
        )}

        {/* ── 2. Stats bar ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
          {[
            { icon:"🪙", value: store.coins.toString(), label:"做健康小事赚金币" },
            { icon:"📅", value: `${checkinCount}/7`, label:"本周运动打卡" },
            { icon:"⭐", value:"82分", label:"本周饮食评分" },
          ].map(card => (
            <div key={card.label} style={{ background:"#fff", borderRadius:14, padding:"14px 8px", textAlign:"center", boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
              <div style={{ fontSize:22 }}>{card.icon}</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#3B1F5E", margin:"4px 0 2px" }}>{card.value}</div>
              <div style={{ fontSize:10, color:"#9CA3AF", lineHeight:1.3 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── 3. Current outfit ── */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:14, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 10px" }}>当前装扮</p>
          {equippedItem || bgItem ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, flexWrap:"wrap" }}>
              <PetAvatar pet={pet} size={56} />
              {[equippedItem, bgItem].filter(Boolean).map(it => (
                <span key={it!.id} style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:20, color:"#9CA3AF" }}>+</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it!.img} alt="" style={{ width:48, height:48, borderRadius:12, objectFit:"cover" }} />
                  <span style={{ fontSize:13, color:"#C084FC", fontWeight:600 }}>{it!.name}</span>
                </span>
              ))}
            </div>
          ) : (
            <p style={{ textAlign:"center", fontSize:13, color:"#9CA3AF", margin:0 }}>还没有装饰，快去商店看看吧 👇</p>
          )}
        </div>

        {/* ── 4. Shop ── */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:8, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 2px" }}>装饰商店 🛍️</p>
          <p style={{ fontSize:12, color:"#9CA3AF", margin:"0 0 10px" }}>用金币给 {user?.petName} 买好看的装饰</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
            {[["记录一餐", COIN_RULES.meal], ["运动打卡", COIN_RULES.checkin], ["喝水达标", COIN_RULES.water], ["连续打卡 7 天", COIN_RULES.streak7]].map(([label, n]) => (
              <span key={label} style={{ fontSize:11, color:"#7C3AED", background:"#F5F3FF", borderRadius:999, padding:"3px 9px" }}>{label} <b>+{n}</b></span>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {SHOP_ITEMS.map(item => {
              const owned = store.owned.includes(item.id);
              const equipped = item.kind === "background" ? store.background === item.id : store.equipped === item.id;
              const canAfford = store.coins >= item.price;
              const isFree = item.price === 0;
              const locked = item.kind === "trophy" && !goalReached && !owned;

              let btnText = item.kind === "trophy" ? "领取奖杯" : isFree ? "免费领取" : "购买装扮";
              let btnBg = "linear-gradient(135deg,#C084FC,#F9A8D4)";
              let btnColor = "#fff";
              let btnDisabled = false;

              if (equipped) { btnText = "已装扮 ✓"; btnBg = "#D1FAE5"; btnColor = "#059669"; btnDisabled = false; }
              else if (owned) { btnText = "点击装扮"; btnBg = "#EDE9FE"; btnColor = "#7C3AED"; }
              else if (locked) { btnText = "达成目标体重解锁"; btnBg = "#F3F4F6"; btnColor = "#9CA3AF"; btnDisabled = true; }
              else if (!canAfford && !isFree) { btnText = `还差 ${item.price - store.coins} 金币`; btnBg = "#F3F4F6"; btnColor = "#9CA3AF"; btnDisabled = true; }

              return (
                <div key={item.id} style={{
                  background:"#FAFAFA", borderRadius:12, padding:"14px 10px", textAlign:"center",
                  boxShadow:"0 1px 6px rgba(0,0,0,.06)",
                  border: item.tag ? `2px solid ${item.tag.color}` : "2px solid transparent",
                  position:"relative",
                }}>
                  {item.tag && (
                    <span style={{ position:"absolute", top:-1, right:-1, background:item.tag.color, color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:"0 10px 0 8px" }}>
                      {item.tag.label}
                    </span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.img} alt={item.name} loading="lazy"
                    style={{ width:"100%", aspectRatio:"1", objectFit:"cover", borderRadius:10, marginBottom:8, display:"block",
                      filter: locked ? "grayscale(.6) opacity(.7)" : "none" }} />
                  <p style={{ fontSize:13, fontWeight:700, color:"#3B1F5E", margin:"0 0 2px" }}>{item.name}</p>
                  <p style={{ fontSize:11, color:"#9CA3AF", margin:"0 0 8px" }}>{item.desc}</p>
                  <p style={{ fontSize:12, color:"#C084FC", fontWeight:600, margin:"0 0 8px" }}>
                    {item.kind === "trophy" ? "成就奖励" : isFree ? "免费" : `🪙 ${item.price}`}
                  </p>
                  <button
                    disabled={btnDisabled}
                    onClick={() => handleBuy(item)}
                    style={{ width:"100%", padding:"8px 0", borderRadius:8, border:"none", cursor: btnDisabled ? "default":"pointer", background:btnBg, color:btnColor, fontSize:12, fontWeight:600, transition:"opacity .2s" }}
                  >
                    {btnText}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
