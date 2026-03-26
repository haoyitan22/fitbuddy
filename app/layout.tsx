import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
