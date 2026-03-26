"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

/* ── types ── */
interface TeamData {
  id: string;
  name: string;
  goal: string;
  code: string;
  createdAt: string;
}

interface FeedItem {
  id: number;
  petEmoji: string;
  petName: string;
  type: "meal" | "workout";
  desc: string;
  detail: string;
  time: string;
  liked: boolean;
}

const TEAM_KEY = "fitbuddy_team";
const GOALS = [
  { id: "fat", label: "🔥 一起减脂" },
  { id: "checkin", label: "💪 健康打卡" },
  { id: "diet", label: "🥗 均衡饮食" },
];

function randCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function loadTeam(): TeamData | null {
  try { return JSON.parse(localStorage.getItem(TEAM_KEY) || "null"); } catch { return null; }
}
function saveTeam(t: TeamData | null) {
  if (t) localStorage.setItem(TEAM_KEY, JSON.stringify(t));
  else localStorage.removeItem(TEAM_KEY);
}

/* ── Toast ── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#fff", borderRadius:12, padding:"12px 20px", boxShadow:"0 4px 20px rgba(0,0,0,.15)", fontSize:13, color:"#3B1F5E", zIndex:2000, maxWidth:340, textAlign:"center", lineHeight:1.5 }}>
      {msg}
    </div>
  );
}

/* ── Bottom drawer ── */
function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.4)" }} />
      <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"#fff", borderRadius:"20px 20px 0 0", padding:"24px 20px 40px" }}>
        <div style={{ width:40, height:4, background:"#E5E7EB", borderRadius:4, margin:"0 auto 20px" }} />
        <h3 style={{ fontSize:18, fontWeight:700, color:"#3B1F5E", margin:"0 0 20px", textAlign:"center" }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ── Confirm dialog ── */
function Confirm({ msg, sub, onCancel, onConfirm }: { msg: string; sub: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={onCancel} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.4)" }} />
      <div style={{ position:"relative", background:"#fff", borderRadius:20, padding:"28px 24px", width:300, textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,.2)" }}>
        <p style={{ fontSize:17, fontWeight:700, color:"#3B1F5E", margin:"0 0 8px" }}>{msg}</p>
        <p style={{ fontSize:13, color:"#9CA3AF", margin:"0 0 24px" }}>{sub}</p>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"1px solid #E5E7EB", background:"#fff", color:"#6B7280", fontSize:14, cursor:"pointer" }}>取消</button>
          <button onClick={onConfirm} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>确定退出</button>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [drawer, setDrawer] = useState<null | "create" | "join">(null);
  const [teamName, setTeamName] = useState("");
  const [goal, setGoal] = useState("fat");
  const [joinCode, setJoinCode] = useState("");
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setTeam(loadTeam());
  }, []);

  useEffect(() => {
    if (!user || !team) return;
    setFeed([
      { id:1, petEmoji:"🐼", petName:"胖达", type:"meal", desc:"胖达的主人记录了早餐 🍱", detail:"燕麦粥、鸡蛋 · 356 kcal", time:"今天 08:15", liked:false },
      { id:2, petEmoji:"🐱", petName:"橘子", type:"workout", desc:"橘子的主人完成了运动打卡 💪", detail:"全身燃脂 · 20分钟", time:"今天 09:30", liked:false },
      { id:3, petEmoji:"🐼", petName:"胖达", type:"meal", desc:"胖达的主人记录了午餐 🍱", detail:"番茄鸡蛋盖饭 · 520 kcal", time:"今天 12:30", liked:false },
      { id:4, petEmoji: user.pet?.emoji ?? "🐾", petName: user.petName ?? "宠物", type:"meal", desc:`${user.petName ?? "宠物"}的主人记录了早餐 🍱`, detail:"记录了今日早餐", time:"今天 07:45", liked:false },
    ]);
  }, [user, team]);

  function inviteLink(code: string) {
    return `https://fitbuddy-eta.vercel.app/join?code=${code}`;
  }

  async function copyLink(code: string) {
    await navigator.clipboard.writeText(inviteLink(code)).catch(() => {});
    setCopied(true);
    setToast("邀请链接已复制 📋 打开微信，粘贴给想一起减肥的朋友吧！");
    setTimeout(() => setCopied(false), 1500);
  }

  function handleCreate() {
    if (!teamName.trim()) return;
    const t: TeamData = { id: randCode(), name: teamName.trim(), goal, code: randCode(), createdAt: new Date().toISOString() };
    saveTeam(t);
    setTeam(t);
    setDrawer(null);
    setToast("队伍创建成功！🎉");
    copyLink(t.code);
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase().slice(-6);
    if (code.length < 6) return;
    const t: TeamData = { id: randCode(), name: "我的健身队", goal: "fat", code, createdAt: new Date().toISOString() };
    saveTeam(t);
    setTeam(t);
    setDrawer(null);
    setToast("成功加入队伍！🎉");
  }

  function handleLeave() {
    saveTeam(null);
    setTeam(null);
    setShowConfirm(false);
  }

  function toggleLike(id: number) {
    setFeed(prev => prev.map(f => f.id === id ? { ...f, liked: !f.liked } : f));
  }

  const goalLabel = GOALS.find(g => g.id === (team?.goal ?? goal))?.label ?? "";

  const rankData = user ? [
    { rank:"🥇", emoji:"🐼", pet:"胖达", name:"小美", days:5, bg:"#FFFBEB" },
    { rank:"🥈", emoji: user.pet?.emoji ?? "🐾", pet: user.petName ?? "宠物", name: user.nickname, days:3, bg:"#fff" },
    { rank:"🥉", emoji:"🐱", pet:"橘子", name:"阿杰", days:2, bg:"#fff" },
  ] : [];

  /* ── No team ── */
  if (!team) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#FDF4FF,#FFF0F6)", paddingBottom:88 }}>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      <div style={{ maxWidth:430, margin:"0 auto", padding:"80px 24px 0", textAlign:"center" }}>
        <div style={{ fontSize:72, marginBottom:16 }}>👥</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:"#3B1F5E", margin:"0 0 8px" }}>还没有队伍</h2>
        <p style={{ fontSize:14, color:"#9CA3AF", margin:"0 0 40px", lineHeight:1.6 }}>邀请好友一起减肥<br />互相监督更有动力！</p>
        <button onClick={() => setDrawer("create")} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", marginBottom:12 }}>✨ 创建队伍</button>
        <button onClick={() => setDrawer("join")} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"2px solid #C084FC", background:"transparent", color:"#C084FC", fontSize:16, fontWeight:700, cursor:"pointer" }}>🔗 加入队伍</button>
      </div>

      {drawer === "create" && (
        <Drawer title="创建你的队伍" onClose={() => setDrawer(null)}>
          <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="给队伍起个名字吧" style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:15, color:"#3B1F5E", outline:"none", boxSizing:"border-box", marginBottom:16 }} />
          <p style={{ fontSize:13, fontWeight:600, color:"#3B1F5E", margin:"0 0 10px" }}>队伍目标</p>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {GOALS.map(g => (
              <button key={g.id} onClick={() => setGoal(g.id)} style={{ flex:1, padding:"10px 4px", borderRadius:12, border:"none", background: goal===g.id ? "#F3E8FF" : "#F9FAFB", outline: goal===g.id ? "2px solid #C084FC" : "2px solid transparent", fontSize:12, fontWeight: goal===g.id ? 700 : 400, color: goal===g.id ? "#7C3AED" : "#6B7280", cursor:"pointer" }}>{g.label}</button>
            ))}
          </div>
          <button onClick={handleCreate} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>创建并邀请好友</button>
        </Drawer>
      )}

      {drawer === "join" && (
        <Drawer title="加入队伍" onClose={() => setDrawer(null)}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="粘贴邀请链接或输入6位邀请码" style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:14, color:"#3B1F5E", outline:"none", boxSizing:"border-box", marginBottom:16 }} />
          <button onClick={handleJoin} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>加入</button>
        </Drawer>
      )}
    </div>
  );

  /* ── Has team ── */
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#FDF4FF,#FFF0F6)", paddingBottom:88 }}>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      {showConfirm && <Confirm msg="确定要退出队伍吗？" sub="退出后需要重新加入" onCancel={() => setShowConfirm(false)} onConfirm={handleLeave} />}

      <div style={{ maxWidth:430, margin:"0 auto", padding:"20px 16px 0" }}>

        {/* 1. Team info */}
        <div style={{ background:"linear-gradient(135deg,#F3E8FF,#FCE7F3)", borderRadius:16, padding:"16px", marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#3B1F5E", margin:"0 0 6px" }}>{team.name}</h2>
              <span style={{ background:"rgba(192,132,252,.15)", color:"#7C3AED", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:600 }}>{goalLabel}</span>
              <p style={{ fontSize:12, color:"#9CA3AF", margin:"8px 0 0" }}>3/6人</p>
            </div>
            <button onClick={() => copyLink(team.code)} style={{ padding:"8px 14px", borderRadius:20, border:"none", background: copied ? "#D1FAE5" : "linear-gradient(135deg,#C084FC,#F9A8D4)", color: copied ? "#059669" : "#fff", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
              {copied ? "✅ 已复制" : "邀请好友 🔗"}
            </button>
          </div>
        </div>

        {/* 2. Members */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 12px" }}>队员</p>
          {[
            { emoji: user?.pet?.emoji ?? "🐾", pet: user?.petName ?? "宠物", name: (user?.nickname ?? "我") + " 👑", checked: true },
            { emoji:"🐼", pet:"胖达", name:"小美", checked:true },
            { emoji:"🐱", pet:"橘子", name:"阿杰", checked:false },
          ].map((m, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", padding:"10px 0", borderBottom: i<2 ? "1px solid #F9FAFB" : "none" }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:"#F3E8FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginRight:12 }}>{m.emoji}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:600, color:"#3B1F5E", margin:0 }}>{m.name}</p>
                <p style={{ fontSize:12, color:"#9CA3AF", margin:0 }}>{m.pet}</p>
              </div>
              <span style={{ fontSize:12, fontWeight:600, color: m.checked ? "#10B981" : "#9CA3AF" }}>{m.checked ? "✅ 已打卡" : "⏰ 未打卡"}</span>
            </div>
          ))}
        </div>

        {/* 3. Leaderboard */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 12px" }}>本周打卡排行 🏆</p>
          {rankData.map((r, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", padding:"10px 12px", borderRadius:10, background: r.bg, marginBottom:6 }}>
              <span style={{ fontSize:22, marginRight:10 }}>{r.rank}</span>
              <span style={{ fontSize:22, marginRight:8 }}>{r.emoji}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:"#3B1F5E", margin:0 }}>{r.name}</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{r.pet}</p>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:"#C084FC" }}>{r.days}天</span>
            </div>
          ))}
        </div>

        {/* 4. Feed */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 12px" }}>最新动态</p>
          {feed.map(f => (
            <div key={f.id} style={{ background:"#FAFAFA", borderRadius:12, padding:"12px", marginBottom:10 }}>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ width:46, height:46, borderRadius:"50%", background:"#F3E8FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>{f.petEmoji}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#3B1F5E", margin:"0 0 3px" }}>{f.desc}</p>
                  <p style={{ fontSize:12, color:"#9CA3AF", margin:0 }}>{f.detail}</p>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
                <button onClick={() => toggleLike(f.id)} style={{ padding:"5px 12px", borderRadius:20, border:"none", background: f.liked ? "#F3E8FF" : "#F3F4F6", color: f.liked ? "#C084FC" : "#9CA3AF", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  👊 {f.liked ? "1" : "加油"}
                </button>
                <span style={{ fontSize:11, color:"#9CA3AF" }}>{f.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Leave */}
        <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
          <button onClick={() => setShowConfirm(true)} style={{ background:"transparent", border:"none", color:"#9CA3AF", fontSize:13, cursor:"pointer" }}>退出队伍</button>
        </div>
      </div>
    </div>
  );
}
