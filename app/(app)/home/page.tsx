"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "早上好";
  if (h >= 12 && h < 18) return "下午好";
  return "晚上好";
}

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => { setUser(getUser()); }, []);

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* 问候区 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
        <div>
          <p style={{ margin: 0, fontSize: "13px", color: "#9CA3AF" }}>{getGreeting()}</p>
          <h1 style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 700, color: "#3B1F5E" }}>
            {user?.nickname ?? "朋友"} 👋
          </h1>
        </div>
        {user?.pet && (
          <Link href="/pet" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(192,132,252,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", border: "2px solid rgba(192,132,252,0.25)" }}>
              {user.pet.emoji}
            </div>
            <span style={{ fontSize: "11px", color: "#C084FC", fontWeight: 500 }}>{user.petName}</span>
          </Link>
        )}
      </div>

      {/* 占位卡片 */}
      <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "32px 24px", boxShadow: "0 2px 12px rgba(192,132,252,0.12)", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🍱</div>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#3B1F5E", margin: 0 }}>今日饮食概览</h2>
        <p style={{ fontSize: "14px", color: "#9CA3AF", marginTop: "8px" }}>饮食记录功能即将上线</p>
      </div>

    </div>
  );
}
