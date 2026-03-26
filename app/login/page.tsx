"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1.5px solid #F3E8FF",
  background: "#fff",
  fontSize: "15px",
  color: "#3B1F5E",
  outline: "none",
  boxSizing: "border-box",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    setError("");
    if (!email || !password) {
      setError("请填写邮箱和密码");
      return;
    }
    const user = getUser();
    if (!user) {
      setError("账号不存在，请先注册");
      return;
    }
    if (user.email !== email || user.password !== password) {
      setError("邮箱或密码错误");
      return;
    }
    router.push("/home");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: "430px", width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>👋</div>
          <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>
            欢迎回来
          </h1>
          <p style={{ fontSize: "14px", color: "#9CA3AF", marginTop: "8px" }}>
            登录继续你的健康之旅
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "28px 24px",
            boxShadow: "0 4px 24px rgba(192, 132, 252, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <label style={{ fontSize: "13px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>
              邮箱
            </label>
            <input
              type="email"
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: "13px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>
              密码
            </label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: "13px", color: "#F87171", margin: 0, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            style={{
              background: "#C084FC",
              color: "#fff",
              border: "none",
              borderRadius: "16px",
              padding: "16px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              marginTop: "4px",
              boxShadow: "0 4px 16px rgba(192, 132, 252, 0.35)",
            }}
          >
            登录
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "#9CA3AF" }}>
          还没有账号？{" "}
          <Link href="/register" style={{ color: "#C084FC", fontWeight: 600, textDecoration: "none" }}>
            去注册
          </Link>
        </p>
      </div>
    </div>
  );
}
