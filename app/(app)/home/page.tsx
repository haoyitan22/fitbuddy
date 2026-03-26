"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "早上好";
  if (hour >= 12 && hour < 18) return "下午好";
  return "晚上好";
}

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Greeting header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
        <div>
          <p style={{ margin: 0, fontSize: "13px", color: "#9CA3AF" }}>{getGreeting()}</p>
          <h1 style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 700, color: "#3B1F5E" }}>
            {user?.nickname ?? "朋友"} 👋
          </h1>
        </div>
        {user?.pet && (
          <Link href="/pet" style={{ textDecoration: "none" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(192,132,252,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", cursor: "pointer", border: "2px solid rgba(192,132,252,0.2)" }}>
              {user.pet.emoji}
            </div>
          </Link>
        )}
      </div>

      {/* Placeholder card */}
      <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "32px 24px", boxShadow: "0 2px 12px rgba(192,132,252,0.12)", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🍱</div>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#3B1F5E", margin: 0 }}>今日饮食概览</h2>
        <p style={{ fontSize: "14px", color: "#9CA3AF", marginTop: "8px" }}>饮食记录功能即将上线</p>
      </div>

    </div>
  );
}
