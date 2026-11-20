"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, saveUserData, logout } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import PetAvatar from "@/components/PetAvatar";
import { targetsFor } from "@/lib/goals";
import { getWeightLog, logWeight, recentWeighIns, weekScores, dayScore, type WeighIn } from "@/lib/weight";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
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
  try { return localStorage.getItem("fitbuddy_avatar_color") || "#C084FC"; } catch { return "#C084FC"; }
}
function getAvatarPhoto() {
  try { return localStorage.getItem("fitbuddy_avatar_photo") || ""; } catch { return ""; }
}
const AVATAR_COLORS = ["#C084FC", "#F9A8D4", "#6EE7B7", "#93C5FD", "#FCD34D", "#F87171"];

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
  const [avatarColor, setAvatarColor] = useState("#C084FC");
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
          <p style={{fontSize:12,color:"#9CA3AF",margin:"0 0 6px"}}>目标体重（kg）</p>
          <input value={targetInput} onChange={e=>setTargetInput(e.target.value)} style={{...inputStyle,marginBottom:12}} placeholder="目标体重 kg" type="number" />
          <p style={{fontSize:12,color:"#9CA3AF",margin:"0 0 6px"}}>计划用几个月达成</p>
          <input value={monthsInput} onChange={e=>setMonthsInput(e.target.value.replace(/\D/g,"").slice(0,2))} style={inputStyle} placeholder="例如 3" inputMode="numeric" />
          <p style={{fontSize:11,color:"#C4B5D0",margin:"8px 0 0",lineHeight:1.5}}>每日热量目标会按新的目标和时间重新计算</p>
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
      body:<div style={{textAlign:"center",color:"#9CA3AF",fontSize:14,padding:"8px 0"}}>
        <div style={{fontSize:40,marginBottom:8}}>🌿</div>
        <p style={{fontWeight:700,color:"#3B1F5E",fontSize:16,margin:"0 0 6px"}}>轻食伴侣 FitBuddy</p>
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
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#FDF4FF,#FFF0F6)",paddingBottom:88}}>

      {/* Modal */}
      {activeModal && (
        <div style={{position:"fixed",inset:0,zIndex:1000}}>
          <div onClick={closeModal} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)"}} />
          <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px"}}>
            <div style={{width:40,height:4,background:"#E5E7EB",borderRadius:4,margin:"0 auto 20px"}} />
            <h3 style={{fontSize:17,fontWeight:700,color:"#3B1F5E",margin:"0 0 18px",textAlign:"center"}}>{activeModal.title}</h3>
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
            <p style={{fontSize:17,fontWeight:700,color:"#3B1F5E",margin:"0 0 8px"}}>确定退出登录？</p>
            <p style={{fontSize:13,color:"#9CA3AF",margin:"0 0 24px"}}>退出后需要重新登录</p>
            <div style={{display:"flex",gap:12}}>
              <button onClick={()=>setShowConfirmLogout(false)} style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid #E5E7EB",background:"#fff",color:"#6B7280",fontSize:14,cursor:"pointer"}}>取消</button>
              <button onClick={()=>{ logout(); router.replace("/"); }} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",background:"#EF4444",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>退出</button>
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:430,margin:"0 auto",padding:"20px 16px 0"}}>

        {/* ── 1. User card ── */}
        <div style={{background:"linear-gradient(135deg,#F3E8FF,#FCE7F3)",borderRadius:20,padding:"20px 16px",marginBottom:14,boxShadow:"0 4px 20px rgba(192,132,252,.15)"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <div style={{width:58,height:58,borderRadius:"50%",background:avatarColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"#fff",flexShrink:0,overflow:"hidden"}}>
              {avatarPhoto
                ? <img src={avatarPhoto} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                : (user?.nickname?.[0]?.toUpperCase()??"U")
              }
            </div>
            <div style={{flex:1}}>
              <h2 style={{fontSize:20,fontWeight:800,color:"#3B1F5E",margin:"0 0 3px"}}>{user?.nickname??"--"}</h2>
              <p style={{fontSize:12,color:"#9CA3AF",margin:0}}>第 {journeyDays} 天的健康之旅</p>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}><PetAvatar pet={user?.pet ?? "🐾"} size={44} crop="head" /></div>
              <div style={{fontSize:12,color:"#C084FC",fontWeight:600}}>🪙 {coins}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              {label:"当前体重",val: user?.weight ? `${user.weight}kg`:"--"},
              {label:"目标体重",val: user?.targetWeight ? `${user.targetWeight}kg`:"--"},
              {label:"还差",val: currentW&&targetW ? `${diff}kg`:"--"},
            ].map(c=>(
              <div key={c.label} style={{background:"rgba(255,255,255,.6)",borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
                <p style={{fontSize:16,fontWeight:800,color:"#3B1F5E",margin:"0 0 2px"}}>{c.val}</p>
                <p style={{fontSize:10,color:"#9CA3AF",margin:0}}>{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Daily calorie target (worked out in lib/goals; only the result is shown) ── */}
        {(() => {
          const t = targetsFor(user), p = t.plan;
          return (
            <div id="goal" className="ph-no-capture" style={{background:"#fff",borderRadius:16,padding:"16px",marginBottom:14,boxShadow:"0 2px 10px rgba(192,132,252,.08)",scrollMarginTop:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <p style={{fontSize:15,fontWeight:600,color:"#3B1F5E",margin:0}}>每日热量目标 🎯</p>
                <p style={{margin:0}}><span style={{fontSize:24,fontWeight:800,color:"#C084FC"}}>{t.calories}</span><span style={{fontSize:12,color:"#9CA3AF",marginLeft:3}}>kcal</span></p>
              </div>
              {!p ? (
                <p style={{fontSize:12,color:"#9CA3AF",margin:"8px 0 0",lineHeight:1.6}}>资料不完整，暂时用默认值。在下面「修改身高体重」里补全身高、体重，就会按你的身体情况计算。</p>
              ) : (
                <div style={{marginTop:6}}>
                  <p style={{fontSize:13,color:"#3B1F5E",margin:0}}>蛋白质 {t.protein}g · 脂肪不超过 {t.fat}g</p>
                  {p.goal !== "maintain" && p.monthsNeeded && (
                    <p style={{fontSize:12,color:"#9CA3AF",margin:"6px 0 0",lineHeight:1.5}}>
                      按这个目标，约每周{p.goal === "lose" ? "减" : "增"} {Math.abs(p.weeklyKg)}kg，预计 {p.monthsNeeded} 个月到 {user?.targetWeight}kg
                    </p>
                  )}
                  {(p.floored || (p.capped && p.goal === "lose")) && (
                    <p style={{fontSize:12,color:"#B45309",background:"#FEF3C7",borderRadius:10,padding:"8px 10px",margin:"10px 0 0",lineHeight:1.5}}>
                      {p.floored
                        ? "已经是安全的最低摄入量，不建议再少吃。想快一点，可以多运动。"
                        : `原计划 ${user?.goalMonths} 个月有点快，已按健康的速度安排。`}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 2. Charts ── */}
        <div style={{background:"#fff",borderRadius:16,padding:"16px",marginBottom:14,boxShadow:"0 2px 10px rgba(192,132,252,.08)"}}>
          <p style={{fontSize:15,fontWeight:600,color:"#3B1F5E",margin:"0 0 14px"}}>本周概览 📊</p>

          {/* Weight: only days the user weighed in */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"0 0 8px"}}>
            <p style={{fontSize:13,color:"#6B7280",margin:0,fontWeight:600}}>体重变化 <span style={{fontWeight:400,color:"#9CA3AF"}}>近 14 天</span></p>
            {loggedToday && !editingToday && (
              <button onClick={()=>{ setTodayKg(String(loggedToday.kg)); setEditingToday(true); }} style={{background:"none",border:"none",color:"#C084FC",fontSize:12,fontWeight:600,cursor:"pointer",padding:0}}>
                今天 {loggedToday.kg}kg ✓ 修改
              </button>
            )}
          </div>
          {(!loggedToday || editingToday) && (
            <div style={{display:"flex",gap:8,alignItems:"center",background:"#FCFAFF",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
              <span style={{fontSize:13,color:"#3B1F5E",fontWeight:600,flexShrink:0}}>⚖️ 今天体重</span>
              <input value={todayKg} onChange={e=>setTodayKg(e.target.value.replace(/[^\d.]/g,"").slice(0,5))} onKeyDown={e=>{ if(e.key==="Enter") saveWeighIn(parseFloat(todayKg)); }}
                inputMode="decimal" placeholder={user?.weight ? String(user.weight) : "kg"} aria-label="今天体重"
                style={{flex:1,minWidth:0,padding:"8px 10px",borderRadius:10,border:"1.5px solid #F3E8FF",fontSize:14,color:"#3B1F5E",outline:"none"}} />
              <span style={{fontSize:13,color:"#9CA3AF"}}>kg</span>
              <button onClick={()=>saveWeighIn(parseFloat(todayKg))} disabled={!(parseFloat(todayKg)>=25)}
                style={{padding:"8px 14px",borderRadius:10,border:"none",background:parseFloat(todayKg)>=25?"#C084FC":"#E9D5FF",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>记录</button>
            </div>
          )}

          {weighIns.length >= 2 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={weighIns.map(w => ({ d: md(w.date), v: w.kg }))} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <XAxis dataKey="d" tick={{fontSize:10,fill:"#9CA3AF"}} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:"#9CA3AF"}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize:12,borderRadius:8}} formatter={(v) => [`${v} kg`, "体重"]} />
                  <Line type="monotone" dataKey="v" stroke="#C084FC" strokeWidth={2.5} dot={{r:3,fill:"#C084FC"}} />
                </LineChart>
              </ResponsiveContainer>
              <p style={{fontSize:12,fontWeight:600,textAlign:"center",margin:"4px 0 16px",color: change < 0 ? "#10B981" : change > 0 ? "#F59E0B" : "#9CA3AF"}}>
                {change < 0 ? `比 ${md(first.date)} 轻了 ${Math.abs(change)}kg 🎉` : change > 0 ? `比 ${md(first.date)} 重了 ${change}kg，慢慢来 💪` : `和 ${md(first.date)} 持平`}
                {user?.targetWeight && last.kg > user.targetWeight ? <span style={{color:"#9CA3AF",fontWeight:400}}> · 离目标还有 {(last.kg - user.targetWeight).toFixed(1)}kg</span> : null}
              </p>
            </>
          ) : (
            <div style={{textAlign:"center",padding:"14px 8px 18px",color:"#9CA3AF",fontSize:12,lineHeight:1.7}}>
              {weighIns.length === 1
                ? <>已记录 {md(weighIns[0].date)}：<b style={{color:"#3B1F5E"}}>{weighIns[0].kg}kg</b><br />再记一天，就能看到你的体重曲线</>
                : <>还没有体重记录<br />每天称一次记下来，这里会画出你的变化曲线</>}
            </div>
          )}

          {/* Diet score: real days only (two or more meals recorded) */}
          <p style={{fontSize:13,color:"#6B7280",margin:"0 0 6px",fontWeight:600}}>饮食健康评分 <span style={{fontWeight:400,color:"#9CA3AF"}}>本周</span></p>
          {scored.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={scores.map(d => ({ d: d.label, v: d.score }))} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <XAxis dataKey="d" tick={{fontSize:10,fill:"#9CA3AF"}} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#9CA3AF"}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize:12,borderRadius:8}} formatter={(v) => [`${v} 分`, "评分"]} />
                  <Bar dataKey="v" radius={[4,4,0,0]}>
                    {scores.map((entry,i)=>(
                      <Cell key={i} fill={(entry.score ?? 0)>=80?"#6EE7B7":(entry.score ?? 0)>=60?"#C084FC":"#F9A8D4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p style={{fontSize:12,color:"#9CA3AF",fontWeight:600,textAlign:"center",margin:"4px 0 0"}}>本周 {scored.length} 天有评分，平均 {avgScore} 分</p>
            </>
          ) : (
            <div style={{textAlign:"center",padding:"14px 8px 6px",color:"#9CA3AF",fontSize:12,lineHeight:1.7}}>
              本周还没有评分<br />一天记录两餐以上，就会按你的热量和营养目标打分
            </div>
          )}
        </div>

        {/* ── 3. Badges ── */}
        <div style={{background:"#fff",borderRadius:16,padding:"16px",marginBottom:14,boxShadow:"0 2px 10px rgba(192,132,252,.08)"}}>
          <p style={{fontSize:15,fontWeight:600,color:"#3B1F5E",margin:"0 0 14px"}}>我的成就 🏅</p>
          <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
            {badges.map(b=>(
              <div key={b.name} style={{flexShrink:0,width:90,background:b.unlocked?"#FAFAFA":"#F3F4F6",borderRadius:14,padding:"14px 8px",textAlign:"center",border:b.unlocked?"2px solid #F3E8FF":"2px solid #E5E7EB"}}>
                <div style={{fontSize:34,marginBottom:4,filter:b.unlocked?"none":"grayscale(1) opacity(.4)"}}>{b.emoji}</div>
                {!b.unlocked && <div style={{fontSize:14,marginBottom:2}}>🔒</div>}
                <p style={{fontSize:11,fontWeight:700,color:b.unlocked?"#3B1F5E":"#9CA3AF",margin:"0 0 3px"}}>{b.name}</p>
                <p style={{fontSize:10,color:"#9CA3AF",margin:0,lineHeight:1.3}}>{b.cond}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. Settings ── */}
        <div style={{background:"#fff",borderRadius:16,padding:"16px",marginBottom:8,boxShadow:"0 2px 10px rgba(192,132,252,.08)"}}>
          <p style={{fontSize:15,fontWeight:600,color:"#3B1F5E",margin:"0 0 4px"}}>设置 ⚙️</p>

          {[
            {section:"个人信息", items:[
              {label:"修改昵称", onClick:openNick},
              {label:"修改头像", onClick:openAvatar},
            ]},
            {section:"目标设置", items:[
              {label:"修改目标体重", onClick:openTarget},
              {label:"修改身高体重", onClick:openBodyStats},
            ]},
            {section:"饮食偏好", items:[
              {label:"饮食偏好", onClick:openDiet},
            ]},
            {section:"账号安全", items:[
              {label:"修改密码", onClick:openPassword},
            ]},
            {section:"其他", items:[
              {label:"关于轻食伴侣", onClick:openAbout},
              {label:"退出登录", onClick:()=>setShowConfirmLogout(true), red:true},
            ]},
          ].map(group=>(
            <div key={group.section} style={{marginBottom:8}}>
              <p style={{fontSize:11,color:"#9CA3AF",margin:"10px 0 4px",textTransform:"uppercase",letterSpacing:.5}}>{group.section}</p>
              {group.items.map((item,i)=>(
                <button key={item.label} onClick={item.onClick} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",background:"none",border:"none",borderBottom:i<group.items.length-1?"1px solid #F9FAFB":"none",cursor:"pointer",color:("red" in item && item.red)?"#EF4444":"#3B1F5E",fontSize:14,fontWeight:500}}>
                  {item.label}
                  <span style={{color:"#D1D5DB",fontSize:16}}>→</span>
                </button>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ── sub-components ── */
const inputStyle: React.CSSProperties = {width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #E5E7EB",fontSize:14,color:"#3B1F5E",outline:"none",boxSizing:"border-box",marginBottom:14};

function Btn({onClick,children}:{onClick:()=>void;children:React.ReactNode}) {
  return <button onClick={onClick} style={{width:"100%",padding:"13px 0",borderRadius:14,border:"none",background:"linear-gradient(135deg,#C084FC,#F9A8D4)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>{children}</button>;
}

function DietSelector({options,initial,onSave}:{options:{id:string;label:string}[];initial:string[];onSave:(s:string[])=>void}) {
  const [sel,setSel]=useState(initial);
  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {options.map(o=>(
          <button key={o.id} onClick={()=>setSel(sel.includes(o.id)?sel.filter(x=>x!==o.id):[...sel,o.id])} style={{padding:"11px 14px",borderRadius:12,border:"none",background:sel.includes(o.id)?"#F3E8FF":"#F9FAFB",outline:sel.includes(o.id)?"2px solid #C084FC":"2px solid transparent",fontSize:14,color:sel.includes(o.id)?"#7C3AED":"#6B7280",fontWeight:sel.includes(o.id)?600:400,cursor:"pointer",textAlign:"left"}}>
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
        <div style={{width:"100%",padding:"13px 0",borderRadius:14,background:"linear-gradient(135deg,#C084FC,#F9A8D4)",color:"#fff",fontSize:15,fontWeight:700,textAlign:"center",cursor:"pointer",boxSizing:"border-box"}}>
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
      <p style={{fontSize:12,color:"#9CA3AF",margin:"10px 0 8px",textAlign:"center"}}>或选择颜色头像</p>
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
        {AVATAR_COLORS.map(c=>(
          <div key={c} onClick={()=>onColor(c)} style={{width:40,height:40,borderRadius:"50%",background:c,cursor:"pointer",border:currentColor===c&&!currentPhoto?"3px solid #3B1F5E":"3px solid transparent"}} />
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
