"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const P = (d: string, w = 2) => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const navItems = [
  { href: "/home", label: "记录", icon: P("M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2zM9 9h6M9 13h6M9 17h3") },
  { href: "/workout", label: "运动", icon: P("M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10", 2.4) },
  {
    href: "/pet", label: "宠物",
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="10" r="2.2" /><circle cx="10" cy="5.8" r="2.2" /><circle cx="14" cy="5.8" r="2.2" /><circle cx="18" cy="10" r="2.2" /><path d="M12 11.5c-3 0-5.2 3-5.2 5.6 0 1.6 1.2 2.2 2.6 2.2 1 0 1.6-.6 2.6-.6s1.6.6 2.6.6c1.4 0 2.6-.6 2.6-2.2 0-2.6-2.2-5.6-5.2-5.6z" /></svg>
    ),
  },
  { href: "/team", label: "队伍", icon: P("M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 1 0 0-5M16 14c2.8 0 5 2.2 5 5") },
  { href: "/profile", label: "我的", icon: P("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8") },
];

/** Floating dark-brown pill; the active tab expands into an orange pill with its label. */
export default function BottomNav() {
  const pathname = usePathname();
  const activeHref = pathname === "/record" ? "/home" : pathname;

  return (
    <nav
      aria-label="主导航"
      style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)",
        bottom: "max(18px, env(safe-area-inset-bottom))",
        display: "flex", alignItems: "center", gap: 2, padding: 7,
        background: "#5B2E1E", borderRadius: 999, zIndex: 100,
        boxShadow: "0 10px 24px rgba(91,46,30,0.35)",
      }}
    >
      {navItems.map(item => {
        const on = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={on ? "page" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 6, height: 42,
              padding: on ? "0 16px" : "0 13px", borderRadius: 999, textDecoration: "none",
              color: on ? "#FFFFFF" : "#E8CBBB",
              background: on ? "linear-gradient(90deg, #FFA071, #FF7A45)" : "transparent",
              fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
              transition: "background .2s, padding .2s",
            }}
          >
            {item.icon}
            {on && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
