"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import PetAvatar from "@/components/PetAvatar";
import { getMeals } from "@/lib/meals";
import { getCheckinDates, todayStr } from "@/lib/pets";
import { MEAL_LABELS } from "@/lib/nutrition";
import {
  GOALS, TEAM_SIZE, goalLabel as labelOf, loadTeam, saveTeam, randCode, inviteLink, parseInvite,
  teamFromInvite, checkinsThisWeek, type TeamData,
} from "@/lib/team";

interface FeedItem {
  id: string;
  type: "meal" | "workout";
  desc: string;
  detail: string;
  time: string;
}

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

  // Only real activity: today's meals and check-in from this browser.
  useEffect(() => {
    if (!user || !team) return;
    const pet = user.petName ?? "宠物";
    const hhmm = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "今天" : `今天 ${d.toTimeString().slice(0, 5)}`; };
    const items: (FeedItem & { at: string })[] = getMeals().map(m => ({
      id: m.id, type: "meal" as const, at: m.createdAt,
      desc: `${pet}的主人记录了${MEAL_LABELS[m.mealType]} 🍱`,
      detail: `${m.foods} · ${Math.round(m.calories)} kcal`, time: hhmm(m.createdAt),
    }));
    if (getCheckinDates().includes(todayStr())) {
      items.push({ id: "checkin", type: "workout", at: "", desc: `${pet}的主人完成了运动打卡 💪`, detail: "今日运动已打卡", time: "今天" });
    }
    setFeed(items.sort((x, y) => y.at.localeCompare(x.at)));
  }, [user, team]);

  async function copyLink(t: TeamData) {
    await navigator.clipboard.writeText(inviteLink(t, user)).catch(() => {});
    setCopied(true);
    setToast("邀请链接已复制 📋 打开微信，粘贴给想一起减肥的朋友吧！");
    setTimeout(() => setCopied(false), 1500);
  }

  function handleCreate() {
    if (!teamName.trim()) return;
    const t: TeamData = { id: randCode(), name: teamName.trim(), goal, code: randCode(), createdAt: new Date().toISOString(), role: "leader" };
    saveTeam(t);
    setTeam(t);
    setDrawer(null);
    setToast("队伍创建成功！🎉");
    copyLink(t);
  }

  function handleJoin() {
    const inv = parseInvite(joinCode);
    if (!inv) { setToast("没认出邀请码，请粘贴完整的邀请链接"); return; }
    const t = teamFromInvite(inv);
    saveTeam(t);
    setTeam(t);
    setDrawer(null);
    setToast(`成功加入「${t.name}」！🎉`);
  }

  function handleLeave() {
    saveTeam(null);
    setTeam(null);
    setShowConfirm(false);
  }

  const goalLabel = labelOf(team?.goal ?? goal);
  const isLeader = team?.role !== "member";
  const checkedToday = getCheckinDates().includes(todayStr());
  const members = [
    ...(!isLeader && team?.leader ? [{ key: "leader", pet: team.leader.pet, name: team.leader.name, sub: "队长", leader: true, me: false }] : []),
    ...(user ? [{ key: "me", pet: user.pet?.emoji ?? "🐾", name: user.nickname, sub: user.petName ?? "宠物", leader: isLeader, me: true }] : []),
  ];
  const openSlots = TEAM_SIZE - members.length;
  const myWeek = checkinsThisWeek(getCheckinDates());

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
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="粘贴好友发来的邀请链接" style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:14, color:"#3B1F5E", outline:"none", boxSizing:"border-box", marginBottom:16 }} />
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
              <p style={{ fontSize:12, color:"#9CA3AF", margin:"8px 0 0" }}>{members.length}/{TEAM_SIZE}人</p>
            </div>
            <button onClick={() => copyLink(team)} style={{ padding:"8px 14px", borderRadius:20, border:"none", background: copied ? "#D1FAE5" : "linear-gradient(135deg,#C084FC,#F9A8D4)", color: copied ? "#059669" : "#fff", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
              {copied ? "✅ 已复制" : "邀请好友 🔗"}
            </button>
          </div>
        </div>

        {/* 2. Members */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 12px" }}>队员</p>
          {members.map(m => (
            <div key={m.key} style={{ display:"flex", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #F9FAFB" }}>
              <div style={{ marginRight:12 }}><PetAvatar pet={m.pet} size={40} crop="head" /></div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:600, color:"#3B1F5E", margin:0 }}>{m.name}{m.leader ? " 👑" : ""}{m.me ? <span style={{ fontSize:11, color:"#C084FC", fontWeight:600, marginLeft:6 }}>我</span> : null}</p>
                <p style={{ fontSize:12, color:"#9CA3AF", margin:0 }}>{m.sub}</p>
              </div>
              {m.me && <span style={{ fontSize:12, fontWeight:600, color: checkedToday ? "#10B981" : "#9CA3AF" }}>{checkedToday ? "✅ 已打卡" : "⏰ 未打卡"}</span>}
            </div>
          ))}

          {/* Empty seats: invite */}
          <div style={{ marginTop:12, border:"1.5px dashed #E9D5FF", borderRadius:14, padding:"16px 14px", textAlign:"center", background:"#FCFAFF" }}>
            <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:10 }}>
              {Array.from({ length: openSlots }).map((_, i) => (
                <span key={i} style={{ width:30, height:30, borderRadius:"50%", border:"1.5px dashed #D8B4FE", display:"inline-flex", alignItems:"center", justifyContent:"center", color:"#D8B4FE", fontSize:16 }}>+</span>
              ))}
            </div>
            <p style={{ fontSize:14, fontWeight:600, color:"#3B1F5E", margin:"0 0 4px" }}>{members.length <= 1 ? "还没有队友" : `还能再邀请 ${openSlots} 位好友`}</p>
            <p style={{ fontSize:12, color:"#9CA3AF", margin:"0 0 12px", lineHeight:1.5 }}>把链接发给朋友，一起打卡、互相监督</p>
            <button onClick={() => copyLink(team)} style={{ padding:"9px 20px", borderRadius:20, border:"none", background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              {copied ? "✅ 链接已复制" : "复制邀请链接 🔗"}
            </button>
          </div>
        </div>

        {/* 3. Leaderboard: only real data, so just this user for now */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 12px" }}>本周打卡排行 🏆</p>
          {user && (
            <div style={{ display:"flex", alignItems:"center", padding:"10px 12px", borderRadius:10, background:"#FFFBEB", marginBottom:6 }}>
              <span style={{ fontSize:22, marginRight:10 }}>🥇</span>
              <span style={{ marginRight:8, display:"inline-flex" }}><PetAvatar pet={user.pet?.emoji ?? "🐾"} size={32} crop="head" /></span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:"#3B1F5E", margin:0 }}>{user.nickname}</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{user.petName ?? "宠物"}</p>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:"#C084FC" }}>{myWeek}天</span>
            </div>
          )}
          <p style={{ fontSize:12, color:"#9CA3AF", margin:"8px 0 0", textAlign:"center" }}>队友加入后，会在这里一起比拼本周打卡天数</p>
        </div>

        {/* 4. Feed */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 12px" }}>最新动态</p>
          {feed.length === 0 && (
            <p style={{ fontSize:13, color:"#9CA3AF", textAlign:"center", margin:"8px 0", lineHeight:1.6 }}>今天还没有动态<br />记录一餐或完成运动打卡，就会出现在这里</p>
          )}
          {feed.map(f => (
            <div key={f.id} style={{ background:"#FAFAFA", borderRadius:12, padding:"12px", marginBottom:10 }}>
              <div style={{ display:"flex", gap:10 }}>
                <PetAvatar pet={user?.pet?.emoji ?? "🐾"} size={46} crop="head" />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#3B1F5E", margin:"0 0 3px" }}>{f.desc}</p>
                  <p style={{ fontSize:12, color:"#9CA3AF", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.detail}</p>
                </div>
                <span style={{ fontSize:11, color:"#9CA3AF", whiteSpace:"nowrap" }}>{f.time}</span>
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
