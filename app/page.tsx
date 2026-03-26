import Link from "next/link";

export default function WelcomePage() {

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
      <div style={{ maxWidth: "430px", width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: "48px" }}>
          <div style={{ fontSize: "72px", marginBottom: "16px" }}>🌿</div>
          <h1
            style={{
              fontSize: "40px",
              fontWeight: 800,
              color: "#3B1F5E",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            轻食伴侣
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#9CA3AF",
              marginTop: "12px",
              lineHeight: "1.5",
            }}
          >
            你的专属健康小伙伴 🐾
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link
            href="/register"
            style={{
              display: "block",
              background: "#C084FC",
              color: "#fff",
              textDecoration: "none",
              textAlign: "center",
              padding: "16px",
              borderRadius: "16px",
              fontSize: "16px",
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(192, 132, 252, 0.35)",
            }}
          >
            开始我的旅程
          </Link>

          <Link
            href="/login"
            style={{
              display: "block",
              background: "rgba(192, 132, 252, 0.08)",
              color: "#C084FC",
              textDecoration: "none",
              textAlign: "center",
              padding: "16px",
              borderRadius: "16px",
              fontSize: "16px",
              fontWeight: 500,
              border: "1.5px solid rgba(192, 132, 252, 0.3)",
            }}
          >
            已有账号，去登录
          </Link>
        </div>

        <p style={{ fontSize: "12px", color: "#C4B5D0", marginTop: "40px" }}>
          健康饮食，从今天开始 ✨
        </p>
      </div>
    </div>
  );
}
