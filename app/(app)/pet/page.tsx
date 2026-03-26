"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

function getDaysSince(isoDate: string): number {
  const join = new Date(isoDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1; // 第1天从1开始
}

export default function PetPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => { setUser(getUser()); }, []);

  const pet = user?.pet;
  const days = user?.petJoinDate ? getDaysSince(user.petJoinDate) : 1;

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
      <div style={{ textAlign: "center", marginTop: "8px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>我的宠物</h1>
      </div>

      {pet ? (
        <div style={{ width: "100%", background: "#fff", borderRadius: "20px", padding: "36px 24px", boxShadow: "0 4px 24px rgba(192,132,252,0.12)", textAlign: "center" }}>
          {/* 大号 emoji */}
          <div style={{ fontSize: "80px", marginBottom: "16px" }}>{pet.emoji}</div>

          {/* 用户起的名字 */}
          <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#3B1F5E", margin: 0 }}>{user?.petName}</h2>

          {/* 种类 · 性格描述 */}
          <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "8px" }}>
            {pet.species} · {pet.desc}
          </p>

          {/* 加入天数 */}
          <div style={{ marginTop: "24px", background: "rgba(192,132,252,0.08)", borderRadius: "14px", padding: "16px 20px", display: "inline-block" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#9CA3AF" }}>加入天数</p>
            <p style={{ margin: "4px 0 0", fontSize: "28px", fontWeight: 800, color: "#C084FC" }}>
              第 {days} 天
            </p>
          </div>

          <p style={{ fontSize: "13px", color: "#C084FC", marginTop: "20px", fontWeight: 500 }}>
            {pet.name} 正在陪伴 {user?.nickname} 的健康之旅 🌿
          </p>
        </div>
      ) : (
        <div style={{ textAlign: "center", color: "#9CA3AF", marginTop: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🐾</div>
          <p>还没有宠物，快去注册领养吧！</p>
        </div>
      )}

      <button onClick={() => router.back()} style={{ background: "transparent", color: "#9CA3AF", border: "none", fontSize: "14px", cursor: "pointer", padding: "8px" }}>
        ← 返回首页
      </button>
    </div>
  );
}
