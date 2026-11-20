"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, saveUserData, logout } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import PetAvatar from "@/components/PetAvatar";
import { Sheet, H2, INK, SUB, ACC, CTA, TILE } from "@/components/PetHero";
import { targetsFor } from "@/lib/goals";
import { getWeightLog, logWeight, recentWeighIns, weekScores, dayScore, type WeighIn } from "@/lib/weight";
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { dayKey } from "@/lib/date";

/* ── helpers ── */
function daysSince(iso?: string) {
  if (!iso) return 1;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) + 1;
}
function getWeekCheckins() {
  try {
    const all: string[] = JSON.parse(localStorage.getItem("fitbuddy_workout_checkins") || "[]");
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      return dayKey(d);
    }).filter(d => all.includes(d)).length;
  } catch { return 0; }
}
function getCoins() {
  try { return JSON.parse(localStorage.getItem("fitbuddy_pet_store") || "{}").coins ?? 128; } catch { return 128; }
}
function getAvatarColor() {
  try { return localStorage.getItem("fitbuddy_avatar_color") || "#FF7A45"; } catch { return "#FF7A45"; }
}
function getAvatarPhoto() {
  try { return localStorage.getItem("fitbuddy_avatar_photo") || ""; } catch { return ""; }
}
const AVATAR_COLORS = ["#FF7A45", "#FFB088", "#6EE7B7", "#93C5FD", "#FCD34D", "#F87171"];

const ACTIVITY_LABELS: Record<string, string> = { sedentary: "久坐", light: "轻度运动", moderate: "中度运动", intense: "高强度运动" };
const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/** Consecutive days (ending today, or yesterday if today has no score yet) with a diet score ≥ 80. */
function goodDietStreak() {
  let n = 0;
  const d = new Date();
  if (dayScore(dayKey(d)) === null) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 60; i++) {
    const s = dayScore(dayKey(d));
    if (s === null || s < 80) break;
    n++; d.setDate(d.getDate() - 1);
  }
  return n;
}

/* ── badge definitions ── */
function getBadges(checkins: number, lostKg: number, dietStreak: number) {
  return [
    { emoji:"🌱", name:"健康新芽",   cond:"开启健康之旅",       unlocked:true,  progress:null },
    { emoji:"🔥", name:"打卡达人",   cond:`还差${Math.max(0,7-checkins)}天`, unlocked:checkins>=7, progress:checkins<7 },
    { emoji:"💧", name:"水分充足",   cond:"连续7天饮水达标",     unlocked:false, progress:true },
    { emoji:"🥗", name:"均衡饮食",   cond: dietStreak>=5 ? "连续5天评分≥80" : `连续5天评分≥80（已${dietStreak}天）`, unlocked:dietStreak>=5, progress:dietStreak<5 },
    { emoji:"💪", name:"运动达人",   cond:`还差${Math.max(0,10-checkins)}次`, unlocked:checkins>=10, progress:checkins<10 },
    { emoji:"⭐", name:"减重里程碑", cond: lostKg>=1 ? "减重达到1kg" : lostKg>0 ? `已减${lostKg.toFixed(1)}kg，目标1kg` : "减重达到1kg", unlocked:lostKg>=1, progress:lostKg<1 },
  ];
}

/* ── simple modal ── */
type ModalContent = { title: string; body: React.ReactNode };

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkins, setCheckins] = useState(0);
  const [coins, setCoins] = useState(128);
  const [avatarColor, setAvatarColor] = useState("#FF7A45");
  const [avatarPhoto, setAvatarPhoto] = useState("");
  type ModalKey = "nick" | "avatar" | "target" | "bodyStats" | "diet" | "password" | "about";
  const [modal, setModal] = useState<ModalKey | null>(null);

  // form states
  const [nickInput, setNickInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [monthsInput, setMonthsInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [dietPrefs, setDietPrefs] = useState<string[]>([]);
  const [pwCur, setPwCur] = useState(""); const [pwNew, setPwNew] = useState(""); const [pwConf, setPwConf] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  // Real records only.
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);   // last 14 days
  const [allWeighIns, setAllWeighIns] = useState<WeighIn[]>([]);
  const [todayKg, setTodayKg] = useState("");
  const [editingToday, setEditingToday] = useState(false);
  const [scores, setScores] = useState<ReturnType<typeof weekScores>>([]);
  const [dietStreak, setDietStreak] = useState(0);

  useEffect(() => {
    const u = getUser(); setUser(u);
    if (u) { setNickInput(u.nickname); setTargetInput(String(u.targetWeight)); setHeightInput(String(u.height)); setWeightInput(String(u.weight)); }
    setCheckins(getWeekCheckins());
    setCoins(getCoins());
    setAvatarColor(getAvatarColor());
    setAvatarPhoto(getAvatarPhoto());
    try { setDietPrefs(JSON.parse(localStorage.getItem("fitbuddy_diet_prefs")||"[]")); } catch { /**/ }
    setWeighIns(recentWeighIns()); setAllWeighIns(getWeightLog());
    setScores(weekScores()); setDietStreak(goodDietStreak());
  }, []);

  function saveWeighIn(kg: number) {
    if (!(kg >= 25 && kg <= 300)) return;
    const all = logWeight(kg);
    setAllWeighIns(all); setWeighIns(recentWeighIns());
    setUser(getUser()); setWeightInput(String(Math.round(kg * 10) / 10));
    setTodayKg(""); setEditingToday(false);
  }

  function updateUser(patch: Partial<UserProfile>) {
    if (!user) return;
    const next = { ...user, ...patch };
    saveUserData(next); setUser(next);
  }

  function saveAvatarColor(c: string) {
    localStorage.setItem("fitbuddy_avatar_color", c); setAvatarColor(c);
  }
  function saveAvatarPhoto(dataUrl: string) {
    localStorage.setItem("fitbuddy_avatar_photo", dataUrl); setAvatarPhoto(dataUrl);
  }
  function removeAvatarPhoto() {
    localStorage.removeItem("fitbuddy_avatar_photo"); setAvatarPhoto("");
  }

  function closeModal() { setModal(null); setPwMsg(""); }

  /* ── modal openers ── */
  function nickModal(): ModalContent {
    return {
      title:"修改昵称",
      body:(
        <div>
          <input value={nickInput} onChange={e=>setNickInput(e.target.value)} style={inputStyle} placeholder="新昵称" />
          <Btn onClick={()=>{ const n = nickInput.trim().slice(0, 20); if (n) updateUser({nickname:n}); closeModal(); }}>确认</Btn>
        </div>
      )
    };
  }

  function avatarModal(): ModalContent {
    return {
      title:"修改头像",
      body:(
        <AvatarEditor
          currentPhoto={avatarPhoto}
          currentColor={avatarColor}
          onPhoto={(url)=>{ saveAvatarPhoto(url); closeModal(); }}
          onRemovePhoto={()=>{ removeAvatarPhoto(); closeModal(); }}
          onColor={(c)=>{ saveAvatarColor(c); closeModal(); }}
        />
      )
    };
  }

  function targetModal(): ModalContent {
    return {
      title:"修改目标体重",
      body:(
        <div>
          <p style={{fontSize:12,color:"#A67760",margin:"0 0 6px"}}>目标体重（kg）</p>
          <input value={targetInput} onChange={e=>setTargetInput(e.target.value)} style={{...inputStyle,marginBottom:12}} placeholder="目标体重 kg" type="number" />
          <p style={{fontSize:12,color:"#A67760",margin:"0 0 6px"}}>计划用几个月达成</p>
          <input value={monthsInput} onChange={e=>setMonthsInput(e.target.value.replace(/\D/g,"").slice(0,2))} style={inputStyle} placeholder="例如 3" inputMode="numeric" />
          <p style={{fontSize:11,color:"#C9B5A8",margin:"8px 0 0",lineHeight:1.5}}>每日热量目标会按新的目标和时间重新计算</p>
          <Btn onClick={()=>{ const m=parseInt(monthsInput); updateUser({targetWeight:parseFloat(targetInput)||user!.targetWeight, ...(m>=1&&m<=24?{goalMonths:m}:{})}); closeModal(); }}>确认</Btn>
        </div>
      )
    };
  }

  function bodyStatsModal(): ModalContent {
    return {
      title:"修改身高体重",
      body:(
        <div>
          <input value={heightInput} onChange={e=>setHeightInput(e.target.value)} style={{...inputStyle,marginBottom:10}} placeholder="身高 cm" type="number" />
          <input value={weightInput} onChange={e=>setWeightInput(e.target.value)} style={inputStyle} placeholder="体重 kg" type="number" />
          <Btn onClick={()=>{ const h=parseFloat(heightInput)||user!.height, w=parseFloat(weightInput); updateUser({height:h}); if (w && w!==user!.weight) saveWeighIn(w); closeModal(); }}>确认</Btn>
        </div>
      )
    };
  }

  const DIET_OPTIONS = [
    {id:"none",label:"🥩 无特殊限制"},{id:"veg",label:"🥬 素食"},
    {id:"nospicy",label:"🚫 不吃辣"},{id:"lowcarb",label:"🌾 低碳水"},{id:"hiprotein",label:"💪 高蛋白"},
    {id:"light",label:"🍵 清淡"},{id:"heavy",label:"🌶️ 重口味"},{id:"fasting",label:"⏱️ 轻断食"},
    {id:"noseafood",label:"🦐 不吃海鲜"},{id:"nomeat",label:"🐑 不吃牛羊肉"},{id:"nodairy",label:"🥛 不吃乳制品"},{id:"nocilantro",label:"🌿 不吃香菜"},
  ];
  function dietModal(): ModalContent {
    let tmp = [...dietPrefs];
    return {
      title:"饮食偏好",
      body:(
        <DietSelector options={DIET_OPTIONS} initial={tmp} onSave={sel=>{ setDietPrefs(sel); localStorage.setItem("fitbuddy_diet_prefs",JSON.stringify(sel)); closeModal(); }} />
      )
    };
  }

  function passwordModal(): ModalContent {
    return {
      title:"修改密码",
      body:(
        <PwForm user={user} onDone={(msg)=>{ setPwMsg(msg); if(!msg.includes("失败")) { updateUser({}); setTimeout(closeModal,1200); } }} />
      )
    };
  }

  function aboutModal(): ModalContent {
    return {
      title:"关于轻食伴侣",
      body:<div style={{textAlign:"center",color:"#A67760",fontSize:14,padding:"8px 0"}}>
        <div style={{fontSize:40,marginBottom:8}}>🌿</div>
        <p style={{fontWeight:700,color:"#5B2E1E",fontSize:16,margin:"0 0 6px"}}>轻食伴侣 FitBuddy</p>
        <p style={{margin:"0 0 4px"}}>版本 v1.0.0</p>
        <p style={{margin:0}}>陪你记录饮食、运动打卡<br/>和可爱宠物一起走向健康 🐾</p>
      </div>
    };
  }

  // Dialog content is rebuilt on every render from the current form state.
  // (Storing ready-made JSX when a dialog opened froze its inputs: typing did nothing.)
  const MODALS = { nick: nickModal, avatar: avatarModal, target: targetModal, bodyStats: bodyStatsModal, diet: dietModal, password: passwordModal, about: aboutModal };
  const activeModal = modal ? MODALS[modal]() : null;
  const openNick = () => { setNickInput(user?.nickname ?? ""); setModal("nick"); };
  const openAvatar = () => setModal("avatar");
  const openTarget = () => { setTargetInput(user?.targetWeight ? String(user.targetWeight) : ""); setMonthsInput(user?.goalMonths ? String(user.goalMonths) : "3"); setModal("target"); };
  const openBodyStats = () => { setHeightInput(user?.height ? String(user.height) : ""); setWeightInput(user?.weight ? String(user.weight) : ""); setModal("bodyStats"); };
  const openDiet = () => setModal("diet");
  const openPassword = () => { setPwCur(""); setPwNew(""); setPwConf(""); setPwMsg(""); setModal("password"); };
  const openAbout = () => setModal("about");

  const currentW = user?.weight ?? 0;
  const targetW  = user?.targetWeight ?? 0;
  const diff     = (currentW - targetW).toFixed(1);
  const journeyDays = daysSince(user?.petJoinDate);
  const scored   = scores.filter(d => d.score !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((a,b)=>a+(b.score ?? 0),0)/scored.length) : 0;
  const todayStr = dayKey();
  const loggedToday = weighIns.find(w => w.date === todayStr);
  const first = weighIns[0], last = weighIns[weighIns.length - 1];
  const change = weighIns.length >= 2 ? Math.round((last.kg - first.kg) * 10) / 10 : 0;
  const lostKg = allWeighIns.length >= 2 ? Math.max(0, allWeighIns[0].kg - allWeighIns[allWeighIns.length - 1].kg) : 0;
  const badges   = getBadges(checkins, lostKg, dietStreak);

  return (
    <div>

      {/* Modal */}
      {activeModal && (
        <div style={{position:"fixed",inset:0,zIndex:1000}}>
          <div onClick={closeModal} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)"}} />
          <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px"}}>
            <div style={{width:40,height:4,background:"#E5E7EB",borderRadius:4,margin:"0 auto 20px"}} />
            <h3 style={{fontSize:17,fontWeight:700,color:"#5B2E1E",margin:"0 0 18px",textAlign:"center"}}>{activeModal.title}</h3>
            {pwMsg && <p style={{textAlign:"center",fontSize:13,color:pwMsg.includes("成功")?"#10B981":"#EF4444",margin:"0 0 10px"}}>{pwMsg}</p>}
            {activeModal.body}
          </div>
        </div>
      )}

      {/* Confirm logout */}
      {showConfirmLogout && (
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setShowConfirmLogout(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)"}} />
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"28px 24px",width:300,textAlign:"center"}}>
            <p style={{fontSize:17,fontWeight:700,color:"#5B2E1E",margin:"0 0 8px"}}>确定退出登录？</p>
            <p style={{fontSize:13,color:"#A67760",margin:"0 0 24px"}}>退出后需要重新登录</p>
            <div style={{display:"flex",gap:12}}>
              <button onClick={()=>setShowConfirmLogout(false)} style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #E5E7EB",background:"#fff",color:"#6B7280",fontSize:14,cursor:"pointer"}}>取消</button>
              <button onClick={()=>{ logout(); router.replace("/"); }} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",background:"#EF4444",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>退出</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header: me + my pet ── */}
      <header style={{ position:"relative", padding:"max(16px, env(safe-area-inset-top)) 20px 26px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h1 style={{ margin:0, fontFamily:"'ZCOOL KuaiLe', system-ui, sans-serif", fontWeight:400, fontSize:24, color:INK }}>我的</h1>
          <a href="#settings" aria-label="设置" style={{ display:"flex", padding:4, color:INK }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
          </a>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:18 }}>
          <button type="button" onClick={openAvatar} aria-label="修改头像" style={{ position:"relative", width:92, height:92, flexShrink:0, padding:0, border:"none", background:"none", cursor:"pointer" }}>
            <span style={{ display:"flex", alignItems:"center", justifyContent:"center", width:92, height:92, borderRadius:"50%", overflow:"hidden", border:"4px solid #fff", background: avatarPhoto || user?.gender ? "#fff" : avatarColor, fontSize:34, fontWeight:800, color:"#fff", boxShadow:"0 6px 16px rgba(255,122,69,0.18)" }}>
              {avatarPhoto
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatarPhoto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : user?.gender
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`/register/gender/${user.gender === "male" ? "male" : "female"}.webp`} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : (user?.nickname?.[0]?.toUpperCase() ?? "U")}
            </span>
            {user?.pet && (
              <span style={{ position:"absolute", right:-14, bottom:-4, borderRadius:"50%", border:"3px solid #fff", display:"flex", boxShadow:"0 4px 10px rgba(255,122,69,0.2)" }}>
                <PetAvatar pet={user.pet} size={46} crop="head" />
              </span>
            )}
          </button>
          <div style={{ minWidth:0 }}>
            <button type="button" onClick={openNick} style={{ padding:0, border:"none", background:"none", cursor:"pointer", fontFamily:"'ZCOOL KuaiLe', system-ui, sans-serif", fontSize:26, color:INK }}>{user?.nickname ?? "--"}</button>
            <p style={{ margin:"2px 0 8px", fontSize:12.5, color:SUB }}>和{user?.petName ?? "宠物"}一起坚持了 {journeyDays} 天 · 🪙 {coins}</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {[user?.height ? `${user.height} cm` : null, user?.weight ? `${user.weight} kg` : null, user?.targetWeight ? `目标 ${user.targetWeight} kg` : null].filter(Boolean).map(t => (
                <span key={t} style={{ padding:"3px 9px", borderRadius:999, background:"#fff", fontSize:11, fontWeight:500, color:INK }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <Sheet>
        {/* ── Key numbers ── */}
        {(() => {
          const t = targetsFor(user), p = t.plan;
          const tiles: { label: string; value: string; unit: string; hot?: boolean; onClick: () => void }[] = [
            { label:"每日目标", value: t.calories.toLocaleString(), unit:"kcal", hot:true, onClick: openTarget },
            { label: lostKg > 0 ? "已减" : "还差", value: lostKg > 0 ? lostKg.toFixed(1) : (currentW && targetW ? diff : "--"), unit:"kg", onClick: openBodyStats },
            { label:"饮食评分", value: scored.length ? String(avgScore) : "--", unit: scored.length ? "分" : "", onClick: () => {} },
          ];
          return (
            <div id="goal" className="ph-no-capture" style={{ display:"flex", flexDirection:"column", gap:8, scrollMarginTop:16 }}>
              <div style={{ display:"flex", gap:10 }}>
                {tiles.map(c => (
                  <button key={c.label} type="button" onClick={c.onClick} style={{
                    flex:1, minWidth:0, textAlign:"left", border:"none", cursor:"pointer", borderRadius:18, padding:12,
                    background: c.hot ? CTA : TILE, color: c.hot ? "#fff" : INK, boxShadow: c.hot ? "0 8px 16px rgba(255,122,69,0.25)" : "none",
                  }}>
                    <span style={{ display:"block", fontSize:11, color: c.hot ? "#fff" : SUB }}>{c.label}</span>
                    <span style={{ fontSize:20, fontWeight:800 }}>{c.value}</span>
                    <span style={{ fontSize:11, marginLeft:2, color: c.hot ? "#fff" : SUB }}>{c.unit}</span>
                  </button>
                ))}
              </div>
              {!p ? (
                <p style={{ fontSize:12, color:SUB, margin:0, lineHeight:1.6 }}>资料不完整，暂时用默认值。点「还差」补全身高、体重，就会按你的身体情况计算。</p>
              ) : (
                <p style={{ fontSize:12, color:SUB, margin:0, lineHeight:1.6 }}>
                  蛋白质 {t.protein}g · 脂肪不超过 {t.fat}g
                  {p.goal !== "maintain" && p.monthsNeeded ? ` · 约每周${p.goal === "lose" ? "减" : "增"} ${Math.abs(p.weeklyKg)}kg，预计 ${p.monthsNeeded} 个月到 ${user?.targetWeight}kg` : ""}
                </p>
              )}
              {p && (p.floored || (p.capped && p.goal === "lose")) && (
                <p style={{ fontSize:12, color:"#B45309", background:"#FEF3C7", borderRadius:12, padding:"8px 10px", margin:0, lineHeight:1.5 }}>
                  {p.floored ? "已经是安全的最低摄入量，不建议再少吃。想快一点，可以多运动。" : `原计划 ${user?.goalMonths} 个月有点快，已按健康的速度安排。`}
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Weight ── */}
        <H2 action={loggedToday && !editingToday
          ? <button type="button" onClick={()=>{ setTodayKg(String(loggedToday.kg)); setEditingToday(true); }} style={{ background:"none", border:"none", color:ACC, fontSize:12, fontWeight:600, cursor:"pointer", padding:0 }}>今天 {loggedToday.kg}kg ✓ 修改</button>
          : "近 14 天"}>体重曲线</H2>
        <div style={{ background:TILE, borderRadius:20, padding:12 }}>
          {(!loggedToday || editingToday) && (
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:13, color:INK, fontWeight:600, flexShrink:0 }}>⚖️ 今天体重</span>
              <input value={todayKg} onChange={e=>setTodayKg(e.target.value.replace(/[^\d.]/g,"").slice(0,5))} onKeyDown={e=>{ if(e.key==="Enter") saveWeighIn(parseFloat(todayKg)); }}
                inputMode="decimal" placeholder={user?.weight ? String(user.weight) : "kg"} aria-label="今天体重"
                style={{ flex:1, minWidth:0, padding:"8px 12px", borderRadius:999, border:"1.5px solid #FFE7D8", background:"#fff", fontSize:14, color:INK, outline:"none" }} />
              <span style={{ fontSize:13, color:SUB }}>kg</span>
              <button onClick={()=>saveWeighIn(parseFloat(todayKg))} disabled={!(parseFloat(todayKg)>=25)}
                style={{ padding:"8px 14px", borderRadius:999, border:"none", background:parseFloat(todayKg)>=25?INK:"#FFD2BA", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0 }}>记录</button>
            </div>
          )}
          {weighIns.length >= 2 ? (
            <>
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={weighIns.map(w => ({ d: md(w.date), v: w.kg }))} margin={{top:8,right:10,bottom:0,left:-20}}>
                  <XAxis dataKey="d" tick={{fontSize:10,fill:SUB}} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:SUB}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize:12,borderRadius:8}} formatter={(v) => [`${v} kg`, "体重"]} />
                  <Line type="monotone" dataKey="v" stroke={ACC} strokeWidth={3} dot={{r:3,fill:"#fff",stroke:ACC,strokeWidth:2}} />
                </LineChart>
              </ResponsiveContainer>
              <p style={{ fontSize:12, fontWeight:600, textAlign:"center", margin:"4px 0 0", color: change < 0 ? "#10B981" : change > 0 ? "#F59E0B" : SUB }}>
                {change < 0 ? `比 ${md(first.date)} 轻了 ${Math.abs(change)}kg 🎉` : change > 0 ? `比 ${md(first.date)} 重了 ${change}kg，慢慢来 💪` : `和 ${md(first.date)} 持平`}
              </p>
            </>
          ) : (
            <p style={{ textAlign:"center", margin:"6px 0", color:SUB, fontSize:12, lineHeight:1.7 }}>
              {weighIns.length === 1
                ? <>已记录 {md(weighIns[0].date)}：<b style={{color:INK}}>{weighIns[0].kg}kg</b><br />再记一天，就能看到你的体重曲线</>
                : <>还没有体重记录<br />每天称一次记下来，这里会画出你的变化曲线</>}
            </p>
          )}
        </div>

        {/* ── Badges ── */}
        <H2 action={`${badges.filter(b => b.unlocked).length} / ${badges.length}`}>勋章墙</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:4 }}>
          {badges.map(b => (
            <div key={b.name} title={b.cond} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, opacity: b.unlocked ? 1 : .45 }}>
              <span style={{ width:46, height:46, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, background: b.unlocked ? "#FFF1C2" : "#F3EEEA", filter: b.unlocked ? "none" : "grayscale(1)" }}>{b.emoji}</span>
              <span style={{ fontSize:10, fontWeight:500, color:INK, textAlign:"center", lineHeight:1.2 }}>{b.name}</span>
            </div>
          ))}
        </div>
        {(() => { const next = badges.find(b => !b.unlocked); return next ? <p style={{ margin:0, fontSize:11.5, color:SUB, textAlign:"center" }}>下一枚「{next.name}」：{next.cond}</p> : null; })()}

        {/* ── Settings ── */}
        <div id="settings" style={{ background:TILE, borderRadius:20, padding:"4px 16px", scrollMarginTop:16 }}>
          {[
            { label:"个人信息", sub:`${user?.nickname ?? ""}`, onClick:openNick },
            { label:"身高体重", sub: user?.height ? `${user.height} cm · ${user.weight} kg` : "", onClick:openBodyStats },
            { label:"目标体重", sub: user?.targetWeight ? `${user.targetWeight} kg · ${user.goalMonths} 个月` : "", onClick:openTarget },
            { label:"饮食偏好", sub:`${dietPrefs.length ? `已选 ${dietPrefs.length} 项` : "未设置"}`, onClick:openDiet },
            { label:"修改密码", sub:"", onClick:openPassword },
            { label:"关于轻食伴侣", sub:"", onClick:openAbout },
            { label:"退出登录", sub:"", onClick:()=>setShowConfirmLogout(true), red:true },
          ].map((item, i, arr) => (
            <button key={item.label} type="button" onClick={item.onClick} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"13px 0", background:"none", border:"none", borderBottom: i < arr.length - 1 ? "1px solid #FFE7D8" : "none", cursor:"pointer", color: item.red ? "#EF4444" : INK, fontSize:14, fontWeight:500, textAlign:"left" }}>
              <span style={{ flex:1 }}>{item.label}</span>
              {item.sub && <span style={{ fontSize:12, color:SUB }}>{item.sub}</span>}
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9B5A8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

/* ── sub-components ── */
const inputStyle: React.CSSProperties = {width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #E5E7EB",fontSize:14,color:"#5B2E1E",outline:"none",boxSizing:"border-box",marginBottom:14};

function Btn({onClick,children}:{onClick:()=>void;children:React.ReactNode}) {
  return <button onClick={onClick} style={{width:"100%",padding:"13px 0",borderRadius:14,border:"none",background:"linear-gradient(135deg,#FF7A45,#FFB088)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>{children}</button>;
}

function DietSelector({options,initial,onSave}:{options:{id:string;label:string}[];initial:string[];onSave:(s:string[])=>void}) {
  const [sel,setSel]=useState(initial);
  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {options.map(o=>(
          <button key={o.id} onClick={()=>setSel(sel.includes(o.id)?sel.filter(x=>x!==o.id):[...sel,o.id])} style={{padding:"11px 14px",borderRadius:12,border:"none",background:sel.includes(o.id)?"#FFE7D8":"#F9FAFB",outline:sel.includes(o.id)?"2px solid #FF7A45":"2px solid transparent",fontSize:14,color:sel.includes(o.id)?"#E8622E":"#6B7280",fontWeight:sel.includes(o.id)?600:400,cursor:"pointer",textAlign:"left"}}>
            {o.label}
          </button>
        ))}
      </div>
      <Btn onClick={()=>onSave(sel)}>保存</Btn>
    </div>
  );
}

function AvatarEditor({currentPhoto,currentColor,onPhoto,onRemovePhoto,onColor}:{
  currentPhoto:string; currentColor:string;
  onPhoto:(url:string)=>void; onRemovePhoto:()=>void; onColor:(c:string)=>void;
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        onPhoto(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      {/* Current avatar preview */}
      <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:currentColor,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:800,color:"#fff"}}>
          {currentPhoto ? <img src={currentPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : "👤"}
        </div>
      </div>

      {/* Upload button */}
      <label style={{display:"block",width:"100%",marginBottom:10}}>
        <div style={{width:"100%",padding:"13px 0",borderRadius:14,background:"linear-gradient(135deg,#FF7A45,#FFB088)",color:"#fff",fontSize:15,fontWeight:700,textAlign:"center",cursor:"pointer",boxSizing:"border-box"}}>
          📷 上传照片
        </div>
        <input type="file" accept="image/*" onChange={handleFile} style={{display:"none"}} />
      </label>

      {/* Remove photo if present */}
      {currentPhoto && (
        <button onClick={onRemovePhoto} style={{width:"100%",padding:"11px 0",borderRadius:14,border:"1.5px solid #E5E7EB",background:"#fff",color:"#EF4444",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:10}}>
          删除照片
        </button>
      )}

      {/* Color picker fallback */}
      <p style={{fontSize:12,color:"#A67760",margin:"10px 0 8px",textAlign:"center"}}>或选择颜色头像</p>
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
        {AVATAR_COLORS.map(c=>(
          <div key={c} onClick={()=>onColor(c)} style={{width:40,height:40,borderRadius:"50%",background:c,cursor:"pointer",border:currentColor===c&&!currentPhoto?"3px solid #5B2E1E":"3px solid transparent"}} />
        ))}
      </div>
    </div>
  );
}

function PwForm({user,onDone}:{user:UserProfile|null;onDone:(msg:string)=>void}) {
  const [cur,setCur]=useState(""); const [nw,setNw]=useState(""); const [conf,setConf]=useState("");
  return (
    <div>
      <input type="password" value={cur} onChange={e=>setCur(e.target.value)} style={{...inputStyle,marginBottom:10}} placeholder="当前密码" />
      <input type="password" value={nw} onChange={e=>setNw(e.target.value)} style={{...inputStyle,marginBottom:10}} placeholder="新密码" />
      <input type="password" value={conf} onChange={e=>setConf(e.target.value)} style={inputStyle} placeholder="确认新密码" />
      <Btn onClick={()=>{
        if (!user) return;
        if (cur !== user.password) { onDone("当前密码错误"); return; }
        if (nw.length < 6) { onDone("新密码至少6位"); return; }
        if (nw !== conf) { onDone("两次密码不一致"); return; }
        saveUserData({...user, password:nw});
        onDone("密码修改成功 ✅");
      }}>确认修改</Btn>
    </div>
  );
}
