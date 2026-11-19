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
  teamFromInvite, checkinsThisWeek, fetchTeam, teamAction, myMemberId, type TeamData, type RemoteTeam,
} from "@/lib/team";

/** "今天 09:30", "昨天 21:10", "11月16日" */
function when(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = (x: Date) => x.toDateString();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const hm = d.toTimeString().slice(0, 5);
  if (day(d) === day(new Date())) return `今天 ${hm}`;
  if (day(d) === day(y)) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

interface FeedItem {
  id: string;
  pet: string;
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setTeam(loadTeam());
  }, []);

  // Shared team from the server. "local" = no database / offline: show this browser's data only.
  const [remote, setRemote] = useState<RemoteTeam | null>(null);
  const [mode, setMode] = useState<"loading" | "shared" | "local" | "gone">("loading");
  const myId = typeof window === "undefined" ? "" : myMemberId().id;

  /** Mirror the server's name / goal / leader into the local copy. */
  function adopt(data: RemoteTeam) {
    setRemote(data);
    setMode("shared");
    const cur = loadTeam();
    if (!cur || cur.code !== data.team.code) return;
    const leader = data.members.find(m => m.id === data.team.leaderId);
    const next: TeamData = {
      ...cur, name: data.team.name, goal: data.team.goal,
      role: data.team.leaderId === myId ? "leader" : "member",
      leader: leader && leader.id !== myId ? { name: leader.name, pet: leader.pet } : cur.leader,
    };
    saveTeam(next);
    setTeam(next);
  }

  /**
   * Load the team, and make sure this user is on it with fresh check-ins.
   * A team created before teams were shared is uploaded by its leader; someone
   * who joined from a link before registering is added now.
   */
  async function connect(t: TeamData) {
    if (!user) return;
    const checkins = getCheckinDates().slice(-14);
    let r = await fetchTeam(t.code);
    if (!r.ok && r.status === 404) {
      if (t.role === "member") { setMode("gone"); return; }
      r = await teamAction("create", t.code, user, { name: t.name, goal: t.goal });
    }
    if (!r.ok) { setMode("local"); return; }
    if (!r.data.members.some(m => m.id === myId)) {
      const j = await teamAction("join", t.code, user);
      if (!j.ok) { setMode(j.status === 404 ? "gone" : "local"); if (j.status === 409) setToast(j.error); return; }
      r = j;
    }
    await teamAction("sync", t.code, user, { checkins });
    const fresh = await fetchTeam(t.code);
    adopt(fresh.ok ? fresh.data : r.data);
  }

  useEffect(() => {
    if (!user || !team) return;
    connect(team);
    // Keep teammates' check-ins fresh while the page is open.
    const refresh = () => { const t = loadTeam(); if (t) fetchTeam(t.code).then(r => { if (r.ok) adopt(r.data); }); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [user, team?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Feed: the team's shared events, or this browser's own activity today when offline.
  useEffect(() => {
    if (!user || !team) return;
    if (mode === "shared" && remote) {
      const petOf = new Map(remote.members.map(m => [m.id, m.pet]));
      setFeed(remote.feed.map((e, i) => ({ id: `${e.at}-${i}`, pet: petOf.get(e.by) ?? "🐾", desc: e.text, detail: e.detail, time: when(e.at) })));
      return;
    }
    const pet = user.petName ?? "宠物";
    const mine = user.pet?.emoji ?? "🐾";
    const items: (FeedItem & { at: string })[] = getMeals().map(m => ({
      id: m.id, pet: mine, at: m.createdAt,
      desc: `${pet}的主人记录了${MEAL_LABELS[m.mealType]} 🍱`,
      detail: `${m.foods} · ${Math.round(m.calories)} kcal`, time: when(m.createdAt) || "今天",
    }));
    if (getCheckinDates().includes(todayStr())) {
      items.push({ id: "checkin", pet: mine, at: "", desc: `${pet}的主人完成了运动打卡 💪`, detail: "今日运动已打卡", time: "今天" });
    }
    setFeed(items.sort((x, y) => y.at.localeCompare(x.at)));
  }, [user, team, mode, remote]);

  async function copyLink(t: TeamData) {
    await navigator.clipboard.writeText(inviteLink(t, user)).catch(() => {});
    setCopied(true);
    setToast("邀请链接已复制 📋 打开微信，粘贴给想一起减肥的朋友吧！");
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCreate() {
    if (!teamName.trim() || busy) return;
    setBusy(true);
    let t: TeamData = { id: "", name: teamName.trim(), goal, code: randCode(), createdAt: new Date().toISOString(), role: "leader" };
    let r = await teamAction("create", t.code, user, { name: t.name, goal });
    if (!r.ok && r.status === 409) { t = { ...t, code: randCode() }; r = await teamAction("create", t.code, user, { name: t.name, goal }); }
    setBusy(false);
    if (!r.ok && r.status !== 503 && r.status !== 0) { setToast(r.error); return; }
    t.id = t.code;
    saveTeam(t);
    setTeam(t);
    if (r.ok) adopt(r.data); else setMode("local");
    setDrawer(null);
    setToast("队伍创建成功！🎉");
    copyLink(t);
  }

  async function handleJoin() {
    const inv = parseInvite(joinCode);
    if (!inv) { setToast("没认出邀请码，请粘贴完整的邀请链接"); return; }
    if (busy) return;
    setBusy(true);
    const r = await teamAction("join", inv.code, user);
    setBusy(false);
    // No database yet (or offline): join on this phone only, as before.
    if (!r.ok && r.status !== 503 && r.status !== 0) { setToast(r.error); return; }
    const t = teamFromInvite(inv);
    saveTeam(t);
    setTeam(t);
    if (r.ok) adopt(r.data); else setMode("local");
    setDrawer(null);
    setToast(`成功加入「${r.ok ? r.data.team.name : t.name}」！🎉`);
  }

  function handleLeave() {
    if (team && mode !== "local") void teamAction("leave", team.code, user);
    saveTeam(null);
    setTeam(null);
    setRemote(null);
    setMode("loading");
    setShowConfirm(false);
  }

  const goalLabel = labelOf(team?.goal ?? goal);
  const isLeader = team?.role !== "member";
  const today = todayStr();
  type Row = { key: string; pet: string; name: string; sub: string; leader: boolean; me: boolean; checked?: boolean; week: number };
  const members: Row[] = mode === "shared" && remote
    ? remote.members.map(m => ({
        key: m.id, pet: m.pet, name: m.name, sub: m.petName,
        leader: m.id === remote.team.leaderId, me: m.id === myId,
        checked: m.checkins.includes(today), week: checkinsThisWeek(m.checkins),
      }))
    : [
        ...(!isLeader && team?.leader ? [{ key: "leader", pet: team.leader.pet, name: team.leader.name, sub: "队长", leader: true, me: false, week: 0 }] : []),
        ...(user ? [{ key: "me", pet: user.pet?.emoji ?? "🐾", name: user.nickname, sub: user.petName ?? "宠物", leader: isLeader, me: true, checked: getCheckinDates().includes(today), week: checkinsThisWeek(getCheckinDates()) }] : []),
      ];
  const openSlots = Math.max(0, TEAM_SIZE - members.length);
  const ranking = (mode === "shared" ? members : members.filter(m => m.me)).slice().sort((a, b) => b.week - a.week);

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
          <button onClick={handleCreate} disabled={busy} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>{busy ? "创建中…" : "创建并邀请好友"}</button>
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
              {m.checked !== undefined && <span style={{ fontSize:12, fontWeight:600, color: m.checked ? "#10B981" : "#9CA3AF" }}>{m.checked ? "✅ 已打卡" : "⏰ 未打卡"}</span>}
            </div>
          ))}

          {mode === "gone" && (
            <div style={{ marginTop:12, background:"#FEF3C7", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#92400E", lineHeight:1.6 }}>
              这支队伍已经解散了。可以退出后，重新创建或加入一支队伍。
            </div>
          )}
          {mode === "local" && (
            <p style={{ margin:"10px 0 0", fontSize:11, color:"#C4B5D0", textAlign:"center" }}>暂时连不上组队服务，队友的打卡稍后同步</p>
          )}

          {/* Empty seats: invite */}
          {openSlots > 0 && mode !== "gone" && <div style={{ marginTop:12, border:"1.5px dashed #E9D5FF", borderRadius:14, padding:"16px 14px", textAlign:"center", background:"#FCFAFF" }}>
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
          </div>}
        </div>

        {/* 3. Leaderboard: check-in days this week, real members only */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 12px" }}>本周打卡排行 🏆</p>
          {ranking.map((r, i) => (
            <div key={r.key} style={{ display:"flex", alignItems:"center", padding:"10px 12px", borderRadius:10, background: i === 0 && r.week > 0 ? "#FFFBEB" : r.me ? "#FCFAFF" : "#fff", marginBottom:6 }}>
              <span style={{ fontSize: i < 3 ? 22 : 14, width:28, marginRight:6, textAlign:"center", color:"#9CA3AF", fontWeight:700 }}>{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
              <span style={{ marginRight:8, display:"inline-flex" }}><PetAvatar pet={r.pet} size={32} crop="head" /></span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:"#3B1F5E", margin:0 }}>{r.name}{r.me ? <span style={{ fontSize:11, color:"#C084FC", marginLeft:6 }}>我</span> : null}</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{r.sub}</p>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:"#C084FC" }}>{r.week}天</span>
            </div>
          ))}
          {ranking.length <= 1 && (
            <p style={{ fontSize:12, color:"#9CA3AF", margin:"8px 0 0", textAlign:"center" }}>队友加入后，会在这里一起比拼本周打卡天数</p>
          )}
        </div>

        {/* 4. Feed */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 10px rgba(192,132,252,.08)" }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#3B1F5E", margin:"0 0 12px" }}>最新动态</p>
          {feed.length === 0 && (
            <p style={{ fontSize:13, color:"#9CA3AF", textAlign:"center", margin:"8px 0", lineHeight:1.6 }}>还没有动态<br />记录一餐或完成运动打卡，队友就能看到</p>
          )}
          {feed.map(f => (
            <div key={f.id} style={{ background:"#FAFAFA", borderRadius:12, padding:"12px", marginBottom:10 }}>
              <div style={{ display:"flex", gap:10 }}>
                <PetAvatar pet={f.pet} size={46} crop="head" />
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
