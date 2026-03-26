"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, saveUserData, logout } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

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
      return d.toISOString().slice(0, 10);
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

const DAYS = ["一","二","三","四","五","六","日"];
const weightData = [65,64.8,64.5,64.6,64.3,64.1,63.9].map((v,i) => ({ d:`周${DAYS[i]}`, v }));
const scoreData  = [75,82,68,85,79,88,72].map((v,i)  => ({ d:`周${DAYS[i]}`, v }));

/* ── badge definitions ── */
function getBadges(checkins: number) {
  return [
    { emoji:"🌱", name:"健康新芽",   cond:"开启健康之旅",       unlocked:true,  progress:null },
    { emoji:"🔥", name:"打卡达人",   cond:`还差${Math.max(0,7-checkins)}天`, unlocked:checkins>=7, progress:checkins<7 },
    { emoji:"💧", name:"水分充足",   cond:"连续7天饮水达标",     unlocked:false, progress:true },
    { emoji:"🥗", name:"均衡饮食",   cond:"连续5天评分≥80",     unlocked:false, progress:true },
    { emoji:"💪", name:"运动达人",   cond:`还差${Math.max(0,10-checkins)}次`, unlocked:checkins>=10, progress:checkins<10 },
    { emoji:"⭐", name:"减重里程碑", cond:"减重达到1kg",         unlocked:false, progress:true },
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
  const [modal, setModal] = useState<ModalContent | null>(null);

  // form states
  const [nickInput, setNickInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [dietPrefs, setDietPrefs] = useState<string[]>([]);
  const [pwCur, setPwCur] = useState(""); const [pwNew, setPwNew] = useState(""); const [pwConf, setPwConf] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  useEffect(() => {
    const u = getUser(); setUser(u);
    if (u) { setNickInput(u.nickname); setTargetInput(String(u.targetWeight)); setHeightInput(String(u.height)); setWeightInput(String(u.weight)); }
    setCheckins(getWeekCheckins());
    setCoins(getCoins());
    setAvatarColor(getAvatarColor());
    setAvatarPhoto(getAvatarPhoto());
    try { setDietPrefs(JSON.parse(localStorage.getItem("fitbuddy_diet_prefs")||"[]")); } catch { /**/ }
  }, []);

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
  function openNick() {
    setModal({
      title:"修改昵称",
      body:(
        <div>
          <input value={nickInput} onChange={e=>setNickInput(e.target.value)} style={inputStyle} placeholder="新昵称" />
          <Btn onClick={()=>{ updateUser({nickname:nickInput}); closeModal(); }}>确认</Btn>
        </div>
      )
    });
  }

  function openAvatar() {
    setModal({
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
    });
  }

  function openTarget() {
    setModal({
      title:"修改目标体重",
      body:(
        <div>
          <input value={targetInput} onChange={e=>setTargetInput(e.target.value)} style={inputStyle} placeholder="目标体重 kg" type="number" />
          <Btn onClick={()=>{ updateUser({targetWeight:parseFloat(targetInput)||user!.targetWeight}); closeModal(); }}>确认</Btn>
        </div>
      )
    });
  }

  function openBodyStats() {
    setModal({
      title:"修改身高体重",
      body:(
        <div>
          <input value={heightInput} onChange={e=>setHeightInput(e.target.value)} style={{...inputStyle,marginBottom:10}} placeholder="身高 cm" type="number" />
          <input value={weightInput} onChange={e=>setWeightInput(e.target.value)} style={inputStyle} placeholder="体重 kg" type="number" />
          <Btn onClick={()=>{ updateUser({height:parseFloat(heightInput)||user!.height, weight:parseFloat(weightInput)||user!.weight}); closeModal(); }}>确认</Btn>
        </div>
      )
    });
  }

  const DIET_OPTIONS = [
    {id:"none",label:"🥩 无特殊限制"},{id:"veg",label:"🥬 素食"},
    {id:"nospicy",label:"🚫 不吃辣"},{id:"lowcarb",label:"🌾 低碳水"},{id:"hiprotein",label:"💪 高蛋白"},
  ];
  function openDiet() {
    let tmp = [...dietPrefs];
    setModal({
      title:"饮食偏好",
      body:(
        <DietSelector options={DIET_OPTIONS} initial={tmp} onSave={sel=>{ setDietPrefs(sel); localStorage.setItem("fitbuddy_diet_prefs",JSON.stringify(sel)); closeModal(); }} />
      )
    });
  }

  function openPassword() {
    setPwCur(""); setPwNew(""); setPwConf(""); setPwMsg("");
    setModal({
      title:"修改密码",
      body:(
        <PwForm user={user} onDone={(msg)=>{ setPwMsg(msg); if(!msg.includes("失败")) { updateUser({}); setTimeout(closeModal,1200); } }} />
      )
    });
  }

  function openAbout() {
    setModal({
      title:"关于轻食伴侣",
      body:<div style={{textAlign:"center",color:"#9CA3AF",fontSize:14,padding:"8px 0"}}>
        <div style={{fontSize:40,marginBottom:8}}>🌿</div>
        <p style={{fontWeight:700,color:"#3B1F5E",fontSize:16,margin:"0 0 6px"}}>轻食伴侣 FitBuddy</p>
        <p style={{margin:"0 0 4px"}}>版本 v1.0.0</p>
        <p style={{margin:0}}>陪你记录饮食、运动打卡<br/>和可爱宠物一起走向健康 🐾</p>
      </div>
    });
  }

  const currentW = user?.weight ?? 0;
  const targetW  = user?.targetWeight ?? 0;
  const diff     = (currentW - targetW).toFixed(1);
  const journeyDays = daysSince(user?.petJoinDate);
  const avgScore = Math.round(scoreData.reduce((a,b)=>a+b.v,0)/7);
  const badges   = getBadges(checkins);

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#FDF4FF,#FFF0F6)",paddingBottom:88}}>

      {/* Modal */}
      {modal && (
        <div style={{position:"fixed",inset:0,zIndex:1000}}>
          <div onClick={closeModal} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)"}} />
          <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px"}}>
            <div style={{width:40,height:4,background:"#E5E7EB",borderRadius:4,margin:"0 auto 20px"}} />
            <h3 style={{fontSize:17,fontWeight:700,color:"#3B1F5E",margin:"0 0 18px",textAlign:"center"}}>{modal.title}</h3>
            {pwMsg && <p style={{textAlign:"center",fontSize:13,color:pwMsg.includes("成功")?"#10B981":"#EF4444",margin:"0 0 10px"}}>{pwMsg}</p>}
            {modal.body}
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
              <div style={{fontSize:28}}>{user?.pet?.emoji??"🐾"}</div>
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

        {/* ── 2. Charts ── */}
        <div style={{background:"#fff",borderRadius:16,padding:"16px",marginBottom:14,boxShadow:"0 2px 10px rgba(192,132,252,.08)"}}>
          <p style={{fontSize:15,fontWeight:600,color:"#3B1F5E",margin:"0 0 14px"}}>本周概览 📊</p>

          {/* Weight chart */}
          <p style={{fontSize:13,color:"#6B7280",margin:"0 0 6px",fontWeight:600}}>体重变化</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={weightData} margin={{top:5,right:10,bottom:0,left:-20}}>
              <XAxis dataKey="d" tick={{fontSize:10,fill:"#9CA3AF"}} axisLine={false} tickLine={false} />
              <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:"#9CA3AF"}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
              <Line type="monotone" dataKey="v" stroke="#C084FC" strokeWidth={2.5} dot={{r:3,fill:"#C084FC"}} />
            </LineChart>
          </ResponsiveContainer>
          <p style={{fontSize:12,color:"#10B981",fontWeight:600,textAlign:"center",margin:"4px 0 16px"}}>本周减重 1.1kg 🎉</p>

          {/* Score chart */}
          <p style={{fontSize:13,color:"#6B7280",margin:"0 0 6px",fontWeight:600}}>饮食健康评分</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={scoreData} margin={{top:5,right:10,bottom:0,left:-20}}>
              <XAxis dataKey="d" tick={{fontSize:10,fill:"#9CA3AF"}} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#9CA3AF"}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
              <Bar dataKey="v" radius={[4,4,0,0]}>
                {scoreData.map((entry,i)=>(
                  <Cell key={i} fill={entry.v>=80?"#6EE7B7":entry.v>=60?"#C084FC":"#F9A8D4"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{fontSize:12,color:"#9CA3AF",fontWeight:600,textAlign:"center",margin:"4px 0 0"}}>本周平均 {avgScore}分</p>
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
