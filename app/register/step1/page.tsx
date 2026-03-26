"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveTempData } from "@/lib/auth";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "14px 16px", borderRadius: "12px",
  border: "1.5px solid #F3E8FF", background: "#fff",
  fontSize: "15px", color: "#3B1F5E", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "13px", color: "#9CA3AF", display: "block", marginBottom: "6px",
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 60 }, (_, i) => currentYear - 18 - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

export default function RegisterStep1() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleNext() {
    setError("");
    if (!nickname.trim()) { setError("请输入昵称"); return; }
    if (!gender) { setError("请选择性别"); return; }
    if (!birthYear || !birthMonth || !birthDay) { setError("请选择生日"); return; }
    if (!email.trim()) { setError("请输入邮箱"); return; }
    if (!password || password.length < 6) { setError("密码至少6位"); return; }
    saveTempData({
      nickname: nickname.trim(), gender,
      birthday: `${birthYear}-${String(birthMonth).padStart(2,"0")}-${String(birthDay).padStart(2,"0")}`,
      email: email.trim(), password,
    });
    router.push("/register/step2");
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 60px" }}>
      <div style={{ maxWidth: "430px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>✨</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>创建你的账号</h1>
          <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "6px" }}>第 1 步，共 4 步</p>
          <div style={{ display: "flex", gap: "6px", marginTop: "14px", justifyContent: "center" }}>
            {[1,2,3,4].map(s => <div key={s} style={{ height: "4px", width: "36px", borderRadius: "4px", background: s === 1 ? "#C084FC" : "#F3E8FF", transition: "background 0.3s" }} />)}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "20px", padding: "28px 24px", boxShadow: "0 4px 24px rgba(192,132,252,0.1)", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>昵称</label>
            <input type="text" placeholder="给自己起个名字吧" value={nickname} onChange={e => setNickname(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>性别</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {(["female","male"] as const).map(g => (
                <button key={g} onClick={() => setGender(g)} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `1.5px solid ${gender===g?"#C084FC":"#F3E8FF"}`, background: gender===g?"rgba(192,132,252,0.08)":"#fff", color: gender===g?"#C084FC":"#9CA3AF", fontSize: "15px", fontWeight: gender===g?600:400, cursor: "pointer" }}>
                  {g==="female"?"👧 女":"👦 男"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>生日</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { value: birthYear, setter: setBirthYear, options: years.map(String), placeholder: "年", flex: 2 },
                { value: birthMonth, setter: setBirthMonth, options: months.map(String), placeholder: "月", flex: 1 },
                { value: birthDay, setter: setBirthDay, options: days.map(String), placeholder: "日", flex: 1 },
              ].map(({ value, setter, options, placeholder, flex }) => (
                <select key={placeholder} value={value} onChange={e => setter(e.target.value)}
                  style={{ ...inputStyle, flex, padding: "14px 8px", appearance: "none", textAlign: "center" }}>
                  <option value="">{placeholder}</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>邮箱</label>
            <input type="email" placeholder="用于登录" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>密码</label>
            <input type="password" placeholder="至少 6 位" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          </div>

          {error && <p style={{ fontSize: "13px", color: "#F87171", margin: 0, textAlign: "center" }}>{error}</p>}

          <button onClick={handleNext} style={{ background: "#C084FC", color: "#fff", border: "none", borderRadius: "16px", padding: "16px", fontSize: "16px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(192,132,252,0.35)" }}>
            下一步 →
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "#9CA3AF" }}>
          已有账号？{" "}
          <Link href="/login" style={{ color: "#C084FC", fontWeight: 600, textDecoration: "none" }}>去登录</Link>
        </p>
      </div>
    </div>
  );
}
