"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

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

interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  price: number;
  tag?: { label: string; color: string };
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "scarf",   emoji: "🧣", name: "小围巾",    desc: "温柔百搭",     price: 0 },
  { id: "ribbon",  emoji: "🎀", name: "蝴蝶结",    desc: "甜美可爱",     price: 50 },
  { id: "hat",     emoji: "👒", name: "草帽",      desc: "清新夏日",     price: 100 },
  { id: "tophat",  emoji: "🎩", name: "礼帽",      desc: "优雅绅士",     price: 200 },
  { id: "crown",   emoji: "👑", name: "小皇冠",    desc: "减脂达人专属", price: 500, tag: { label: "成就专属", color: "#F59E0B" } },
  { id: "helmet",  emoji: "🚀", name: "宇航服头盔", desc: "星际探险家",   price: 800, tag: { label: "稀有",   color: "#8B5CF6" } },
];

const PET_STORE_KEY = "fitbuddy_pet_store";

interface PetStore {
  coins: number;
  owned: string[];
  equipped: string | null;
}

function loadStore(): PetStore {
  try {
    return JSON.parse(localStorage.getItem(PET_STORE_KEY) || "null") ?? { coins: 128, owned: [], equipped: null };
  } catch { return { coins: 128, owned: [], equipped: null }; }
}

function saveStore(s: PetStore) {
  localStorage.setItem(PET_STORE_KEY, JSON.stringify(s));
}

export default function PetPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkinCount, setCheckinCount] = useState(0);
  const [store, setStore] = useState<PetStore>({ coins: 128, owned: [], equipped: null });

  useEffect(() => {
    setUser(getUser());
    setCheckinCount(getWeekCheckinCount());
    setStore(loadStore());
  }, []);

  const pet = user?.pet;
  const days = user?.petJoinDate ? getDaysSince(user.petJoinDate) : 1;

  // State: healthy ≥5, overeaten ≤2, normal otherwise
  const petState: "healthy" | "overeaten" | "normal" =
    checkinCount >= 5 ? "healthy" : checkinCount <= 2 ? "overeaten" : "normal";

  const equippedItem = SHOP_ITEMS.find(i => i.id === store.equipped);

  function handleBuy(item: ShopItem) {
    if (store.owned.includes(item.id)) {
      // Already owned — toggle equip
      const next = { ...store, equipped: store.equipped === item.id ? null : item.id };
      setStore(next); saveStore(next);
      return;
    }
    if (item.price > store.coins) return;
    const next = { ...store, coins: store.coins - item.price, owned: [...store.owned, item.id], equipped: item.id };
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
          {/* Animated emoji area */}
          <div style={{ height: 250, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {/* Floating particles */}
            {petState === "normal" && Array.from({length:5}).map((_,i) => (
              <span key={i} style={{ position:"absolute", fontSize:16, animation:`starFloat ${1.5+i*.4}s ease-in infinite ${i*.3}s`, left:`${15+i*14}%`, top:`${30+i*8}%`, opacity:.8 }}>✨</span>
            ))}
            {petState === "healthy" && Array.from({length:6}).map((_,i) => (
              <span key={i} style={{ position:"absolute", fontSize:18, animation:`heartFloat ${1.4+i*.3}s ease-in infinite ${i*.25}s`, left:`${10+i*13}%`, top:`${20+i*10}%`, opacity:.9 }}>💕</span>
            ))}

            {/* Main emoji */}
            <div style={{ fontSize: 120, animation:"float 3s ease-in-out infinite", lineHeight:1, position:"relative" }}>
              {pet.emoji}
              {petState === "overeaten" && <span style={{ position:"absolute", bottom:0, right:-20, fontSize:36 }}>🍔</span>}
            </div>

            {/* Equipped decoration */}
            {equippedItem && (
              <div style={{ fontSize: 40, marginTop: -10 }}>{equippedItem.emoji}</div>
            )}

            {/* State message */}
            {petState === "overeaten" && (
              <p style={{ fontSize:13, color:"#EF4444", fontWeight:600, marginTop:8, background:"rgba(255,255,255,.7)", borderRadius:20, padding:"4px 14px" }}>
                本周吃多了，一起动起来吧～
              </p>
            )}
            {petState === "healthy" && (
              <p style={{ fontSize:13, color:"#10B981", fontWeight:600, marginTop:8, background:"rgba(255,255,255,.7)", borderRadius:20, padding:"4px 14px" }}>
                状态超棒！继续保持～
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

        {/* ── 2. Stats bar ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
          {[
            { icon:"🪙", value: store.coins.toString(), label:"可用于购买装饰" },
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
          {equippedItem ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:44 }}>
              <span>{pet.emoji}</span>
              <span style={{ fontSize:20, color:"#9CA3AF" }}>+</span>
              <span>{equippedItem.emoji}</span>
              <span style={{ fontSize:13, color:"#C084FC", fontWeight:600 }}>{equippedItem.name}</span>
            </div>
          ) : (
            <p style={{ textAlign:"center", fontSize:13, color:"#9CA3AF", margin:0 }}>还没有装饰，快去商店看看吧 👇</p>
          )}
        </div>

        {/* ── 4. Shop ── */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:8, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 2px" }}>装饰商店 🛍️</p>
          <p style={{ fontSize:12, color:"#9CA3AF", margin:"0 0 14px" }}>用金币给 {user?.petName} 买好看的装饰</p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {SHOP_ITEMS.map(item => {
              const owned = store.owned.includes(item.id);
              const equipped = store.equipped === item.id;
              const canAfford = store.coins >= item.price;
              const isFree = item.price === 0;

              let btnText = isFree ? "免费领取" : "购买装扮";
              let btnBg = "linear-gradient(135deg,#C084FC,#F9A8D4)";
              let btnColor = "#fff";
              let btnDisabled = false;

              if (equipped) { btnText = "已装扮 ✓"; btnBg = "#D1FAE5"; btnColor = "#059669"; btnDisabled = false; }
              else if (owned) { btnText = "点击装扮"; btnBg = "#EDE9FE"; btnColor = "#7C3AED"; }
              else if (!canAfford && !isFree) { btnText = "金币不足"; btnBg = "#F3F4F6"; btnColor = "#9CA3AF"; btnDisabled = true; }

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
                  <div style={{ fontSize:52, marginBottom:6 }}>{item.emoji}</div>
                  <p style={{ fontSize:13, fontWeight:700, color:"#3B1F5E", margin:"0 0 2px" }}>{item.name}</p>
                  <p style={{ fontSize:11, color:"#9CA3AF", margin:"0 0 8px" }}>{item.desc}</p>
                  <p style={{ fontSize:12, color:"#C084FC", fontWeight:600, margin:"0 0 8px" }}>
                    {isFree ? "免费" : `🪙 ${item.price}`}
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
