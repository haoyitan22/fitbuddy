"use client";

import { useEffect, useState } from "react";
import { COIN_EVENT, type CoinEvent } from "@/lib/coins";

/** Shows "+20 金币 · 运动打卡" for a moment whenever coins are earned. */
export default function CoinToast() {
  const [toasts, setToasts] = useState<(CoinEvent & { id: number })[]>([]);

  useEffect(() => {
    function onEarn(e: Event) {
      const { amount, reason } = (e as CustomEvent<CoinEvent>).detail;
      const id = Date.now() + Math.random();
      setToasts(t => [...t, { id, amount, reason }]);
      window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400);
    }
    window.addEventListener(COIN_EVENT, onEarn);
    return () => window.removeEventListener(COIN_EVENT, onEarn);
  }, []);

  if (!toasts.length) return null;
  return (
    <div aria-live="polite" style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 2000, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} className="coin-toast" style={{
          background: "#fff", borderRadius: 999, padding: "8px 16px",
          boxShadow: "0 4px 18px rgba(255,122,69,0.3)",
          fontSize: 14, fontWeight: 700, color: "#5B2E1E", whiteSpace: "nowrap",
        }}>
          🪙 <span style={{ color: "#FF7A45" }}>+{t.amount} 金币</span>
          <span style={{ color: "#A67760", fontWeight: 500 }}> · {t.reason}</span>
        </div>
      ))}
    </div>
  );
}
