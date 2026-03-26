import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";

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
          background: "linear-gradient(180deg, #FDF4FF 0%, #FFF0F6 100%)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <main style={{ flex: 1, paddingBottom: "72px" }}>{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
