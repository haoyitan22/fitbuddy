"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import PetAvatar from "@/components/PetAvatar";
import PetHero, { Sheet, H2, INK, SUB, ACC, TILE } from "@/components/PetHero";
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
    <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#fff", borderRadius:12, padding:"12px 20px", boxShadow:"0 4px 20px rgba(0,0,0,.15)", fontSize:13, color:"#5B2E1E", zIndex:2000, maxWidth:340, textAlign:"center", lineHeight:1.5 }}>
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
        <h3 style={{ fontSize:18, fontWeight:700, color:"#5B2E1E", margin:"0 0 20px", textAlign:"center" }}>{title}</h3>
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
        <p style={{ fontSize:17, fontWeight:700, color:"#5B2E1E", margin:"0 0 8px" }}>{msg}</p>
        <p style={{ fontSize:13, color:"#A67760", margin:"0 0 24px" }}>{sub}</p>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"1px solid #E5E7EB", background:"#fff", color:"#6B7280", fontSize:14, cursor:"pointer" }}>取消</button>
          <button onClick={onConfirm} style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg,#FF7A45,#FFB088)", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>确定退出</button>
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
    <div>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      <PetHero title="队伍" pet={user?.pet} petName={user?.petName} pose={1} side="right" say="找几个朋友一起打卡，互相监督更容易坚持哦！" />
      <Sheet style={{ textAlign:"center" }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:"#5B2E1E", margin:"8px 0 0" }}>还没有队伍</h2>
        <p style={{ fontSize:14, color:"#A67760", margin:"0 0 8px", lineHeight:1.6 }}>邀请好友一起减肥<br />互相监督更有动力！</p>
        <button onClick={() => setDrawer("create")} style={{ width:"100%", padding:"14px 0", borderRadius:999, border:"none", background:INK, color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer" }}>✨ 创建队伍</button>
        <button onClick={() => setDrawer("join")} style={{ width:"100%", padding:"14px 0", borderRadius:999, border:"2px solid #FF7A45", background:"transparent", color:"#FF7A45", fontSize:16, fontWeight:700, cursor:"pointer" }}>🔗 加入队伍</button>
      </Sheet>

      {drawer === "create" && (
        <Drawer title="创建你的队伍" onClose={() => setDrawer(null)}>
          <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="给队伍起个名字吧" style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:15, color:"#5B2E1E", outline:"none", boxSizing:"border-box", marginBottom:16 }} />
          <p style={{ fontSize:13, fontWeight:600, color:"#5B2E1E", margin:"0 0 10px" }}>队伍目标</p>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {GOALS.map(g => (
              <button key={g.id} onClick={() => setGoal(g.id)} style={{ flex:1, padding:"10px 4px", borderRadius:12, border:"none", background: goal===g.id ? "#FFE7D8" : "#F9FAFB", outline: goal===g.id ? "2px solid #FF7A45" : "2px solid transparent", fontSize:12, fontWeight: goal===g.id ? 700 : 400, color: goal===g.id ? "#E8622E" : "#6B7280", cursor:"pointer" }}>{g.label}</button>
            ))}
          </div>
          <button onClick={handleCreate} disabled={busy} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#FF7A45,#FFB088)", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>{busy ? "创建中…" : "创建并邀请好友"}</button>
        </Drawer>
      )}

      {drawer === "join" && (
        <Drawer title="加入队伍" onClose={() => setDrawer(null)}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="粘贴好友发来的邀请链接" style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:14, color:"#5B2E1E", outline:"none", boxSizing:"border-box", marginBottom:16 }} />
          <button onClick={handleJoin} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#FF7A45,#FFB088)", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>加入</button>
        </Drawer>
      )}
    </div>
  );

  /* ── Has team ── */
  return (
    <div>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      {showConfirm && <Confirm msg="确定要退出队伍吗？" sub="退出后需要重新加入" onCancel={() => setShowConfirm(false)} onConfirm={handleLeave} />}

      <PetHero
        title={team.name}
        sub={`${goalLabel} · ${members.length}/${TEAM_SIZE} 人${members.some(m => m.checked !== undefined) ? ` · 今天 ${members.filter(m => m.checked).length} 人已打卡` : ""}`}
        right={<button onClick={() => copyLink(team)} style={{ padding:"6px 12px", borderRadius:999, border:"none", background: copied ? "#D1FAE5" : INK, color: copied ? "#059669" : "#fff", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>{copied ? "✅ 已复制" : "🔗 邀请"}</button>}
      >
        <div style={{ position:"absolute", left:0, right:0, bottom:4, display:"flex", justifyContent:"center", alignItems:"flex-end", gap:10 }}>
          {members.map((m, i) => {
            const size = members.length > 3 ? 62 : m.me ? 100 : 80;
            return (
              <div key={m.key} style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", order: m.me ? 1 : i === 0 ? 0 : i + 1 }}>
                <div style={{ borderRadius:"50%", border:`3px solid ${m.checked === false ? "#E9DED6" : "#FF7A45"}`, background:"#fff", padding:2 }}>
                  <PetAvatar pet={m.pet} size={size} crop="head" />
                </div>
                <span style={{ marginTop:-10, padding:"2px 9px", borderRadius:999, fontSize:11, fontWeight:700, whiteSpace:"nowrap", background: m.checked ? ACC : "#fff", color: m.checked ? "#fff" : SUB }}>
                  {m.name}{m.checked === undefined ? "" : m.checked ? " ✓" : " · 未打卡"}
                </span>
              </div>
            );
          })}
        </div>
      </PetHero>
      <Sheet>
        {/* 2. Today's progress */}
        {(() => {
          const known = members.filter(m => m.checked !== undefined);
          const done = known.filter(m => m.checked).length;
          return (
            <div style={{ borderRadius:20, padding:14, background:"linear-gradient(90deg,#FFF3EA,#FFE7D8)", display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <span style={{ fontSize:14, fontWeight:700, color:INK }}>今天打卡进度</span>
                <span style={{ fontSize:12, fontWeight:700, color:ACC }}>{done} / {known.length || members.length} 人</span>
              </div>
              <span style={{ height:12, borderRadius:999, background:"#fff", overflow:"hidden" }} role="progressbar" aria-label="今天打卡进度" aria-valuenow={done} aria-valuemin={0} aria-valuemax={known.length || members.length}>
                <span style={{ display:"block", height:"100%", width:`${Math.max(4, (done / Math.max(1, known.length || members.length)) * 100)}%`, borderRadius:999, background:"linear-gradient(90deg,#FFB088,#FF7A45)" }} />
              </span>
              {mode === "local" && <span style={{ fontSize:11, color:"#C9B5A8" }}>暂时连不上组队服务，队友的打卡稍后同步</span>}
            </div>
          );
        })()}

        {mode === "gone" && (
          <div style={{ background:"#FEF3C7", borderRadius:16, padding:"12px 14px", fontSize:13, color:"#92400E", lineHeight:1.6 }}>
            这支队伍已经解散了。可以退出后，重新创建或加入一支队伍。
          </div>
        )}

        {/* Empty seats: invite */}
        {openSlots > 0 && mode !== "gone" && (
          <button type="button" onClick={() => copyLink(team)} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:18, border:"1.5px dashed #FFD2BA", background:"#FFFBF8", cursor:"pointer", textAlign:"left" }}>
            <span style={{ display:"flex" }}>
              {Array.from({ length: Math.min(openSlots, 3) }).map((_, i) => (
                <span key={i} aria-hidden="true" style={{ width:30, height:30, marginLeft: i ? -8 : 0, borderRadius:"50%", border:"1.5px dashed #FFC4A3", background:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", color:ACC, fontSize:16 }}>+</span>
              ))}
            </span>
            <span style={{ flex:1, minWidth:0 }}>
              <span style={{ display:"block", fontSize:13.5, fontWeight:700, color:INK }}>{members.length <= 1 ? "还没有队友" : `还能再邀请 ${openSlots} 位好友`}</span>
              <span style={{ display:"block", fontSize:11.5, color:SUB }}>把链接发给朋友，一起打卡、互相监督</span>
            </span>
            <span style={{ fontSize:12, fontWeight:700, color:"#fff", background:INK, borderRadius:999, padding:"6px 12px", whiteSpace:"nowrap" }}>{copied ? "已复制" : "复制链接"}</span>
          </button>
        )}

        {/* 3. Leaderboard: check-in days this week, real members only */}
        <H2 action="🏆">本周排行</H2>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ranking.map((r, i) => (
            <div key={r.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:16, background: i === 0 && r.week > 0 ? "#FFF1C2" : TILE }}>
              <span style={{ width:16, textAlign:"center", fontSize:16, fontWeight:800, color: i === 0 && r.week > 0 ? "#E0A100" : "#C9B5A8" }}>{i + 1}</span>
              <PetAvatar pet={r.pet} size={32} crop="head" />
              <span style={{ flex:1, minWidth:0, fontSize:14, fontWeight:500, color:INK }}>{r.name}{r.me ? <span style={{ fontSize:11, color:ACC, marginLeft:6 }}>我</span> : null}</span>
              <span style={{ display:"flex", gap:3 }} aria-label={`本周打卡 ${r.week} 天`}>
                {Array.from({ length: 7 }).map((_, k) => <span key={k} style={{ width:7, height:7, borderRadius:4, background: k < r.week ? ACC : "#fff" }} />)}
              </span>
            </div>
          ))}
          {ranking.length <= 1 && (
            <p style={{ fontSize:12, color:SUB, margin:"2px 0 0", textAlign:"center" }}>队友加入后，会在这里一起比拼本周打卡天数</p>
          )}
        </div>

        {/* 4. Feed */}
        <H2>最新动态</H2>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {feed.length === 0 && (
            <p style={{ fontSize:13, color:SUB, textAlign:"center", margin:"4px 0", lineHeight:1.6 }}>还没有动态<br />记录一餐或完成运动打卡，队友就能看到</p>
          )}
          {feed.map(f => (
            <div key={f.id} style={{ display:"flex", gap:10, alignItems:"center", background:TILE, borderRadius:16, padding:"10px 12px" }}>
              <PetAvatar pet={f.pet} size={34} crop="head" />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12.5, fontWeight:500, color:INK, margin:0 }}>{f.desc}</p>
                <p style={{ fontSize:11, color:SUB, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.time} · {f.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Leave */}
        <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
          <button onClick={() => setShowConfirm(true)} style={{ background:"transparent", border:"none", color:"#A67760", fontSize:13, cursor:"pointer" }}>退出队伍</button>
        </div>
      </Sheet>
    </div>
  );
}
