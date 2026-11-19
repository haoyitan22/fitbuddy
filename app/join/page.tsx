"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getUser, isLoggedIn } from "@/lib/auth";
import PetAvatar from "@/components/PetAvatar";
import { goalLabel, loadTeam, parseInvite, saveTeam, teamFromInvite, type TeamData } from "@/lib/team";

function JoinContent() {
  const params = useSearchParams();
  const router = useRouter();
  const invite = parseInvite(params);
  const [joined, setJoined] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [current, setCurrent] = useState<TeamData | null>(null);

  const teamName = invite?.name ?? "好友的队伍";
  const goal = goalLabel(invite?.goal);
  const leaderName = invite?.by ?? "你的好友";
  const leaderPet = invite?.pet ?? "🐾";

  useEffect(() => {
    setUser(getUser());
    const existing = loadTeam();
    // Already in this very team: nothing to do here.
    if (existing && invite && existing.code === invite.code) router.replace("/team");
    else setCurrent(existing);
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleJoin() {
    if (!invite) return;
    saveTeam(teamFromInvite(invite));
    setJoined(true);
    setTimeout(() => router.push(isLoggedIn() ? "/team" : "/register/step1"), 1200);
  }

  if (!invite) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#FDF4FF,#FFF0F6)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:380, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:12 }}>🔗</div>
        <h2 style={{ fontSize:20, fontWeight:800, color:"#3B1F5E", margin:"0 0 8px" }}>邀请链接不完整</h2>
        <p style={{ fontSize:14, color:"#9CA3AF", margin:"0 0 28px", lineHeight:1.6 }}>请让好友重新复制一次邀请链接发给你</p>
        <button onClick={() => router.push("/")} style={{ width:"100%", padding:"14px 0", borderRadius:16, border:"none", background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer" }}>去 FitBuddy 看看</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#FDF4FF,#FFF0F6)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ maxWidth:380, width:"100%", textAlign:"center" }}>
        <p style={{ fontSize:13, color:"#9CA3AF", marginBottom:24, letterSpacing:1 }}>轻食伴侣 FitBuddy</p>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><PetAvatar pet={leaderPet} size={120} round breathe /></div>
        <p style={{ fontSize:16, color:"#7C3AED", fontWeight:600, margin:"0 0 16px" }}>👑 {leaderName} 邀请你一起减肥！</p>

        <div style={{ background:"#fff", borderRadius:20, padding:"24px", marginBottom:24, boxShadow:"0 4px 20px rgba(192,132,252,.15)" }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:"#3B1F5E", margin:"0 0 10px" }}>{teamName}</h2>
          <span style={{ background:"#F3E8FF", color:"#7C3AED", borderRadius:20, padding:"4px 16px", fontSize:13, fontWeight:600 }}>{goal}</span>
          <p style={{ fontSize:13, color:"#9CA3AF", margin:"12px 0 0" }}>邀请码：{invite.code}</p>
        </div>

        {current && !joined && (
          <p style={{ fontSize:12, color:"#B45309", background:"#FEF3C7", borderRadius:10, padding:"8px 12px", margin:"0 0 12px" }}>你现在在「{current.name}」队，加入后会离开那支队伍</p>
        )}
        {joined ? (
          <div style={{ fontSize:18, fontWeight:700, color:"#10B981" }}>✅ 加入成功！正在跳转…</div>
        ) : (
          <button onClick={handleJoin} style={{ width:"100%", padding:"16px 0", borderRadius:16, border:"none", background:"linear-gradient(135deg,#C084FC,#F9A8D4)", color:"#fff", fontSize:17, fontWeight:700, cursor:"pointer" }}>
            {user ? "立即加入队伍" : "注册后加入队伍"}
          </button>
        )}

        {!user && !joined && (
          <p style={{ fontSize:12, color:"#9CA3AF", marginTop:12 }}>还没有账号？注册只需1分钟 ✨</p>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#9CA3AF" }}>加载中…</div>}>
      <JoinContent />
    </Suspense>
  );
}
