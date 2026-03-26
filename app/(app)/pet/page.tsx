"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

export default function PetPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  const pet = user?.pet;

  return (
    <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
      <div style={{ textAlign: "center", marginTop: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>我的宠物</h1>
      </div>

      {pet ? (
        <div style={{ width: "100%", background: "#fff", borderRadius: "20px", padding: "40px 24px", boxShadow: "0 4px 24px rgba(192,132,252,0.12)", textAlign: "center" }}>
          <div style={{ fontSize: "80px", marginBottom: "16px" }}>{pet.emoji}</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#3B1F5E", margin: 0 }}>{pet.name}</h2>
          <p style={{ fontSize: "15px", color: "#9CA3AF", marginTop: "10px", lineHeight: "1.6" }}>{pet.desc}</p>

          <div style={{ marginTop: "24px", background: "rgba(192,132,252,0.08)", borderRadius: "12px", padding: "14px 16px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#C084FC", fontWeight: 500 }}>
              {pet.name} 正在陪伴 {user?.nickname} 的健康之旅 🌿
            </p>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", color: "#9CA3AF", marginTop: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🐾</div>
          <p>还没有宠物，快去注册领养吧！</p>
        </div>
      )}

      <button
        onClick={() => router.back()}
        style={{ background: "transparent", color: "#9CA3AF", border: "none", fontSize: "14px", cursor: "pointer", padding: "8px" }}
      >
        ← 返回首页
      </button>
    </div>
  );
}
