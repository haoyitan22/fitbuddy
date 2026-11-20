"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Pet } from "@/lib/auth";
import { petKindOf } from "@/lib/pets";

export const INK = "#5B2E1E";
export const SUB = "#A67760";
export const ACC = "#FF7A45";
export const CTA = "linear-gradient(90deg, #FFA071, #FF7A45)";
export const TILE = "#FFF7F1";

/**
 * Version B ("宠物小家") page top: the pet stands on a little stage and talks to you,
 * with the page title above it. Content goes into <Sheet> below.
 */
export default function PetHero({
  title, sub, right, pet, petName, pose, say, side = "right", height = 236, size = 160, children,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  pet?: Partial<Pet> | string | null;
  petName?: string;
  /** Pose from the 九宫格 set (1–9): 4 headband, 7 food bowl, 8 star card, 9 notebook… */
  pose?: number;
  /** What the pet says. */
  say?: ReactNode;
  /** Which side the pet stands on (the bubble takes the other side). */
  side?: "left" | "right" | "center";
  height?: number;
  size?: number;
  /** Replaces the single pet (e.g. the team line-up). */
  children?: ReactNode;
}) {
  const kind = petKindOf(pet);
  const petX = side === "center" ? 0 : side === "right" ? 60 : -60;

  return (
    <header style={{ position: "relative", height, padding: "max(16px, env(safe-area-inset-top)) 20px 0" }}>
      <div style={{ position: "relative", zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "'ZCOOL KuaiLe', system-ui, sans-serif", fontWeight: 400, fontSize: 24, lineHeight: 1.3, color: INK }}>{title}</h1>
          {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: SUB }}>{sub}</p>}
        </div>
        {right}
      </div>

      {children ?? (
        <>
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: -6, width: 230, height: 32, marginLeft: -115 + petX, borderRadius: "50%", background: "rgba(255,255,255,0.55)" }} />
          {kind && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pose ? `/register/poses/${kind}-${pose}.webp` : `/register/pets/${kind}.webp`}
              alt={petName ?? "宠物"}
              width={size} height={size}
              className="pet-breathe"
              style={{ position: "absolute", left: "50%", bottom: pose ? -26 : 6, width: size, height: size, marginLeft: -size / 2 + petX, objectFit: "contain", zIndex: 1 }}
            />
          )}
          {say && (
            <div
              role="status"
              style={{
                position: "absolute", zIndex: 2, top: 92, maxWidth: 168,
                ...(side === "right" ? { left: 20 } : { right: 20 }),
                background: "#FFFFFF", borderRadius: 18, padding: "9px 13px",
                ...(side === "right" ? { borderBottomLeftRadius: 4 } : { borderBottomRightRadius: 4 }),
                boxShadow: "0 6px 16px rgba(255,122,69,0.14)",
              }}
            >
              {petName && <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: ACC }}>{petName}</p>}
              <p style={{ margin: "1px 0 0", fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: INK }}>{say}</p>
            </div>
          )}
        </>
      )}
    </header>
  );
}

/** The white sheet under the stage. */
export function Sheet({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <section
      style={{
        position: "relative", zIndex: 4, background: "#FFFFFF", borderRadius: "32px 32px 0 0",
        padding: "22px 18px 120px", minHeight: "calc(100dvh - 236px)",
        display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "0 -8px 24px rgba(194,112,63,0.08)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

/** Section heading with the orange bar. */
export function H2({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: INK }}>
        <span aria-hidden="true" style={{ width: 6, height: 18, borderRadius: 3, background: "linear-gradient(180deg,#FFB088,#FF7A45)" }} />
        {children}
      </h2>
      {action && <span style={{ fontSize: 12, fontWeight: 500, color: ACC }}>{action}</span>}
    </div>
  );
}

export function CoinBadge({ coins }: { coins: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, background: "#fff", boxShadow: "0 3px 8px rgba(255,122,69,0.12)", fontWeight: 700, fontSize: 14, color: INK, flexShrink: 0 }}>
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="#FFC94A"><path d="M12 2l2.6 6.6L21.5 9l-5.3 4.6L17.9 21 12 17.2 6.1 21l1.7-7.4L2.5 9l6.9-.4z" /></svg>
      {coins}
    </span>
  );
}
