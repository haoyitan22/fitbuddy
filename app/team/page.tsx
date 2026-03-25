export default function TeamPage() {
  return (
    <div
      style={{
        padding: "32px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div style={{ textAlign: "center", marginTop: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>
          我的队伍
        </h1>
      </div>

      <div
        style={{
          width: "100%",
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "32px 24px",
          boxShadow: "0 2px 12px rgba(192, 132, 252, 0.12)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "56px", marginBottom: "12px" }}>👥</div>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#3B1F5E", margin: 0 }}>
          队伍
        </h2>
        <p style={{ fontSize: "14px", color: "#9CA3AF", marginTop: "8px" }}>
          和朋友一起健康打卡
        </p>
      </div>
    </div>
  );
}
