"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getUser, isLoggedIn } from "@/lib/auth";

const TEAM_KEY = "fitbuddy_team";

function JoinContent() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") ?? "";
  const [joined, setJoined] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  const teamName = "健康生活队";
  const goal = "🔥 一起减脂";
  const leaderName = "小美";
  const leaderPet = "🐼";

  useEffect(() => {
    setUser(getUser());
    try {
      const existing = JSON.parse(localStorage.getItem(TEAM_KEY) || "null");
      if (existing) router.replace("/team");
    } catch { /* empty */ }
  }, [router]);

  function handleJoin() {
    const team = { id: code, name: teamName, goal: "fat", code, createdAt: new Date().toISOString() };
    localStorage.setItem(TEAM_KEY, JSON.stringify(team));
    setJoined(true);
    setTimeout(() => router.push(isLoggedIn() ? "/team" : "/register/step1"), 1200);
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#FDF4FF,#FFF0F6)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ maxWidth:380, width:"100%", textAlign:"center" }}>
        <p style={{ fontSize:13, color:"#9CA3AF", marginBottom:24, letterSpacing:1 }}>轻食伴侣 FitBuddy</p>
        <div style={{ fontSize:80, marginBottom:8 }}>{leaderPet}</div>
        <p style={{ fontSize:16, color:"#7C3AED", fontWeight:600, margin:"0 0 16px" }}>👑 {leaderName} 邀请你一起减肥！</p>

        <div style={{ background:"#fff", borderRadius:20, padding:"24px", marginBottom:24, boxShadow:"0 4px 20px rgba(192,132,252,.15)" }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:"#3B1F5E", margin:"0 0 10px" }}>{teamName}</h2>
          <span style={{ background:"#F3E8FF", color:"#7C3AED", borderRadius:20, padding:"4px 16px", fontSize:13, fontWeight:600 }}>{goal}</span>
          {code && <p style={{ fontSize:13, color:"#9CA3AF", margin:"12px 0 0" }}>邀请码：{code}</p>}
        </div>

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
