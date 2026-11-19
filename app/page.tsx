import Link from "next/link";
// Self-hosted (no Google Fonts request), so it also loads in mainland China.
// Split by unicode range, so the browser only downloads the characters used.
import "@fontsource/zcool-kuaile/400.css";

const cream = "#FDF5EC";
const ink = "#2B1D3F";
const sub = "#6E6380";
const FEATHER = "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 7%, #000 100%)";

const chips = [
  {
    label: "拍照识热量", bg: "#FFF1E3", stroke: "#C2410C",
    icon: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  },
  {
    label: "打卡养宠物", bg: "#F3E8FF", stroke: "#6D3FD1",
    icon: <><circle cx="6" cy="10" r="2" /><circle cx="10" cy="6" r="2" /><circle cx="14" cy="6" r="2" /><circle cx="18" cy="10" r="2" /><path d="M12 12c-3 0-5 3-5 5.5 0 1.5 1.2 2 2.5 2 1 0 1.6-.6 2.5-.6s1.5.6 2.5.6c1.3 0 2.5-.5 2.5-2C17 15 15 12 12 12z" /></>,
  },
  {
    label: "好友组队", bg: "#E6F6EC", stroke: "#15803D",
    icon: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14c2.8 0 5 2.2 5 5" /></>,
  },
];

export default function WelcomePage() {
  return (
    <div style={{ minHeight: "100dvh", background: cream, display: "flex", justifyContent: "center" }}>
      <main
        style={{
          width: "100%", maxWidth: 430, minHeight: "100dvh",
          display: "flex", flexDirection: "column",
          fontFamily: "system-ui, -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif", color: ink,
        }}
      >
        {/* brand */}
        <div style={{ padding: "max(20px, env(safe-area-inset-top)) 24px 0" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 6px", borderRadius: 999, background: "#fff", boxShadow: "0 2px 10px rgba(91,52,140,0.06)" }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFC98F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" /><path d="M5 19l7-7" /></svg>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>轻食伴侣</span>
            <span style={{ fontSize: 12, color: sub }}>FitBuddy</span>
          </span>
        </div>

        {/* hero: the picture's own background is the page colour, and its edges are feathered, so there are no seams */}
        <div style={{ position: "relative", flex: "1 1 auto", minHeight: 260 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/welcome/hero.webp"
            alt="熊猫、橘猫、仓鼠、狐狸和棕熊抱在一起，带着健康餐、体重秤、水杯和打卡手机"
            width={1080} height={1080}
            fetchPriority="high"
            style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%",
              // feather the picture's edges so its slightly uneven cream never shows a square edge
              maskImage: FEATHER, maskComposite: "intersect" }}
          />
        </div>

        {/* bottom sheet */}
        <div
          style={{
            position: "relative", marginTop: -20, background: "#fff", borderRadius: "36px 36px 0 0",
            padding: "28px 28px max(28px, env(safe-area-inset-bottom))",
            display: "flex", flexDirection: "column", gap: 14,
            boxShadow: "0 -8px 30px rgba(91,52,140,0.08)",
          }}
        >
          <h1 style={{ margin: 0, fontFamily: "'ZCOOL KuaiLe', system-ui, sans-serif", fontWeight: 400, fontSize: 30, lineHeight: 1.28 }}>
            吃好一点，动一动<br />有毛孩子陪你变健康
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: sub }}>
            拍照算热量、打卡养宠物、和好友组队，减脂这件事，不用一个人扛。
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chips.map(c => (
              <span key={c.label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px 7px 10px", borderRadius: 999, background: c.bg, fontSize: 12, fontWeight: 500, color: "#4A3B5E" }}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
                {c.label}
              </span>
            ))}
          </div>
          <Link
            href="/register/step1"
            style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 58, borderRadius: 999, background: ink, color: "#FFD3A1", fontSize: 17, fontWeight: 700, textDecoration: "none" }}
          >
            开始我的旅程
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD3A1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
          </Link>
          <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: sub }}>
            已有账号？<Link href="/login" style={{ color: "#6D3FD1", fontWeight: 700, textDecoration: "none", padding: "8px 2px" }}>去登录</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
