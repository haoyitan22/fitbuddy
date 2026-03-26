"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/home", label: "首页", emoji: "🏠" },
  { href: "/record", label: "记录", emoji: "📷" },
  { href: "/team", label: "队伍", emoji: "👥" },
  { href: "/profile", label: "我的", emoji: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "430px",
        background: "#FFFFFF",
        borderTop: "1px solid #F3E8FF",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        height: "64px",
        zIndex: 100,
        boxShadow: "0 -2px 12px rgba(192, 132, 252, 0.1)",
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "8px 16px",
              textDecoration: "none",
              color: isActive ? "#C084FC" : "#9CA3AF",
              transition: "color 0.2s",
            }}
          >
            <span style={{ fontSize: "22px" }}>{item.emoji}</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
