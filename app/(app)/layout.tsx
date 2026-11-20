import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";
import CoinToast from "@/components/CoinToast";
import "@fontsource/zcool-kuaile/400.css";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div
        style={{
          maxWidth: "430px",
          margin: "0 auto",
          minHeight: "100vh",
          background: "linear-gradient(180deg, #FFD9C2 0px, #FFF4EA 260px, #FFFFFF 520px)",
          fontFamily: "system-ui, -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif",
          color: "#5B2E1E",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <main style={{ flex: 1 }}>{children}</main>
        <BottomNav />
        <CoinToast />
      </div>
    </AuthGuard>
  );
}
