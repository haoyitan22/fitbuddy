"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveUser } from "@/lib/auth";

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

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#9CA3AF",
  display: "block",
  marginBottom: "6px",
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 60 }, (_, i) => currentYear - 18 - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const activityOptions = [
  { value: "sedentary", label: "久坐", desc: "几乎不运动" },
  { value: "light", label: "轻度运动", desc: "每周 1-3 次" },
  { value: "moderate", label: "中度运动", desc: "每周 3-5 次" },
  { value: "intense", label: "高强度运动", desc: "每天运动" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error1, setError1] = useState("");

  // Step 2
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [error2, setError2] = useState("");

  function handleStep1() {
    setError1("");
    if (!nickname.trim()) { setError1("请输入昵称"); return; }
    if (!gender) { setError1("请选择性别"); return; }
    if (!birthYear || !birthMonth || !birthDay) { setError1("请选择生日"); return; }
    if (!email.trim()) { setError1("请输入邮箱"); return; }
    if (!password || password.length < 6) { setError1("密码至少6位"); return; }
    setStep(2);
  }

  function handleFinish() {
    setError2("");
    if (!weight || !height || !targetWeight) { setError2("请填写完整身体数据"); return; }
    if (!activityLevel) { setError2("请选择活动水平"); return; }
    saveUser({
      nickname: nickname.trim(),
      gender,
      birthday: `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`,
      weight: Number(weight),
      height: Number(height),
      targetWeight: Number(targetWeight),
      activityLevel,
      email: email.trim(),
      password,
    });
    router.push("/");
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: "20px",
    padding: "28px 24px",
    boxShadow: "0 4px 24px rgba(192, 132, 252, 0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px 60px",
      }}
    >
      <div style={{ maxWidth: "430px", width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>
            {step === 1 ? "✨" : "💪"}
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>
            {step === 1 ? "创建你的账号" : "填写身体数据"}
          </h1>
          <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "6px" }}>
            {step === 1 ? "第 1 步，共 2 步" : "第 2 步，共 2 步"}
          </p>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
            {[1, 2].map((s) => (
              <div
                key={s}
                style={{
                  height: "4px",
                  width: "48px",
                  borderRadius: "4px",
                  background: s <= step ? "#C084FC" : "#F3E8FF",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div style={cardStyle}>
            <div>
              <label style={labelStyle}>昵称</label>
              <input
                type="text"
                placeholder="给自己起个名字吧"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>性别</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      border: `1.5px solid ${gender === g ? "#C084FC" : "#F3E8FF"}`,
                      background: gender === g ? "rgba(192,132,252,0.08)" : "#fff",
                      color: gender === g ? "#C084FC" : "#9CA3AF",
                      fontSize: "15px",
                      fontWeight: gender === g ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {g === "female" ? "👧 女" : "👦 男"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>生日</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: birthYear, setter: setBirthYear, options: years.map(String), placeholder: "年" },
                  { value: birthMonth, setter: setBirthMonth, options: months.map(String), placeholder: "月" },
                  { value: birthDay, setter: setBirthDay, options: days.map(String), placeholder: "日" },
                ].map(({ value, setter, options, placeholder }) => (
                  <select
                    key={placeholder}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    style={{
                      ...inputStyle,
                      flex: placeholder === "年" ? 2 : 1,
                      padding: "14px 8px",
                      appearance: "none",
                      textAlign: "center",
                    }}
                  >
                    <option value="">{placeholder}</option>
                    {options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>邮箱</label>
              <input
                type="email"
                placeholder="用于登录"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>密码</label>
              <input
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>

            {error1 && (
              <p style={{ fontSize: "13px", color: "#F87171", margin: 0, textAlign: "center" }}>
                {error1}
              </p>
            )}

            <button
              onClick={handleStep1}
              style={{
                background: "#C084FC",
                color: "#fff",
                border: "none",
                borderRadius: "16px",
                padding: "16px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(192, 132, 252, 0.35)",
              }}
            >
              下一步 →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={cardStyle}>
            {[
              { label: "当前体重（kg）", value: weight, setter: setWeight, placeholder: "例如：65" },
              { label: "身高（cm）", value: height, setter: setHeight, placeholder: "例如：168" },
              { label: "目标体重（kg）", value: targetWeight, setter: setTargetWeight, placeholder: "例如：55" },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label style={labelStyle}>{label}</label>
                <input
                  type="number"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}

            <div>
              <label style={labelStyle}>活动水平</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setActivityLevel(opt.value)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: `1.5px solid ${activityLevel === opt.value ? "#C084FC" : "#F3E8FF"}`,
                      background: activityLevel === opt.value ? "rgba(192,132,252,0.08)" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 500, color: activityLevel === opt.value ? "#C084FC" : "#3B1F5E", fontSize: "14px" }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error2 && (
              <p style={{ fontSize: "13px", color: "#F87171", margin: 0, textAlign: "center" }}>
                {error2}
              </p>
            )}

            <button
              onClick={handleFinish}
              style={{
                background: "#C084FC",
                color: "#fff",
                border: "none",
                borderRadius: "16px",
                padding: "16px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(192, 132, 252, 0.35)",
              }}
            >
              完成，开始使用！🎉
            </button>

            <button
              onClick={() => setStep(1)}
              style={{
                background: "transparent",
                color: "#9CA3AF",
                border: "none",
                fontSize: "14px",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ← 返回上一步
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "#9CA3AF" }}>
          已有账号？{" "}
          <Link href="/login" style={{ color: "#C084FC", fontWeight: 600, textDecoration: "none" }}>
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
}
