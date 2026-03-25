import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "轻食伴侣 FitBuddy",
  description: "健康饮食管理应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {/* Mobile-first container, max 430px centered */}
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
          <main style={{ flex: 1, paddingBottom: "72px" }}>
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
