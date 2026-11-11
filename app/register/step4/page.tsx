"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTempData } from "@/lib/auth";
import type { Pet } from "@/lib/auth";
import PetAvatar from "@/components/PetAvatar";

const pets: Pet[] = [
  { emoji: "🐼", species: "熊猫", name: "胖达", desc: "憨厚可爱，最懂减脂的辛苦" },
  { emoji: "🐱", species: "猫咪", name: "橘子", desc: "慵懒温柔，陪你每一顿饭" },
  { emoji: "🐹", species: "仓鼠", name: "豆豆", desc: "活力满满，每天都很期待你" },
  { emoji: "🦊", species: "狐狸", name: "小狐", desc: "机灵可爱，和你一起闪闪发光" },
  { emoji: "🐻", species: "棕熊", name: "肉桂", desc: "稳重暖心，默默支持你" },
];

export default function RegisterStep4() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);

  /* ── carousel: touch swipe (native), mouse drag, wheel, and arrow buttons ── */
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });
  const [dragging, setDragging] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function updateEdges() {
    const t = trackRef.current;
    if (!t) return;
    setCanLeft(t.scrollLeft > 4);
    setCanRight(t.scrollLeft + t.clientWidth < t.scrollWidth - 4);
  }

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    updateEdges();
    // A plain mouse wheel only scrolls vertically; turn it into sideways scrolling here.
    // Registered by hand because React's wheel listener is passive and cannot preventDefault.
    function onWheel(e: WheelEvent) {
      if (!t || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const atStart = t.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = t.scrollLeft + t.clientWidth >= t.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return; // let the page scroll once the row is at its end
      e.preventDefault();
      t.scrollBy({ left: e.deltaY });
    }
    t.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", updateEdges);
    return () => { t.removeEventListener("wheel", onWheel); window.removeEventListener("resize", updateEdges); };
  }, []);

  function centerCard(i: number) {
    const card = trackRef.current?.querySelector<HTMLElement>(`[data-idx="${i}"]`);
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function nearestCard(): number {
    const t = trackRef.current;
    if (!t) return 0;
    const mid = t.scrollLeft + t.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    t.querySelectorAll<HTMLElement>("[data-idx]").forEach(el => {
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < bestDist) { bestDist = d; best = Number(el.dataset.idx); }
    });
    return best;
  }

  function step(dir: -1 | 1) {
    const next = Math.min(pets.length - 1, Math.max(0, nearestCard() + dir));
    centerCard(next);
  }

  // Mouse drag only; touch and pens keep the browser's native swipe.
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !trackRef.current) return;
    drag.current = { active: true, moved: false, startX: e.clientX, startScroll: trackRef.current.scrollLeft };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || !trackRef.current) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 5) { d.moved = true; setDragging(true); }
    if (d.moved) trackRef.current.scrollLeft = d.startScroll - dx;
  }
  function onPointerUp() {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (d.moved) { setDragging(false); centerCard(nearestCard()); }
  }

  function choose(i: number) {
    setSelected(i);
    centerCard(i);
  }

  function handleNext() {
    saveTempData({ pet: pets[selected] });
    router.push("/register/step4/name");
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #FDF4FF 0%, #FFF0F6 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 60px" }}>
      <div style={{ maxWidth: "430px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🐾</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#3B1F5E", margin: 0 }}>选择你的健康小伙伴</h1>
          <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "6px" }}>它会一直陪着你 🐾</p>
          <p style={{ fontSize: "12px", color: "#C4B5D0", marginTop: "2px" }}>第 4 步，共 4 步</p>
          <div style={{ display: "flex", gap: "6px", marginTop: "12px", justifyContent: "center" }}>
            {[1,2,3,4].map(s => <div key={s} style={{ height: "4px", width: "36px", borderRadius: "4px", background: "#C084FC" }} />)}
          </div>
        </div>

        {/* 横向滑动宠物卡片：手指滑动、鼠标拖动、滚轮、左右箭头都可以切换 */}
        <div style={{ position: "relative" }}>
          <div
            ref={trackRef}
            className="pet-track"
            onScroll={updateEdges}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onClickCapture={e => {
              // A drag that ends over a card must not also select it.
              if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; }
            }}
            style={{
              display: "flex", gap: "12px", overflowX: "auto",
              padding: "8px 2px 12px",
              scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
              scrollSnapType: dragging ? "none" : "x mandatory",
              cursor: dragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            <style>{`.pet-track::-webkit-scrollbar{display:none}`}</style>
            {pets.map((pet, i) => (
              <button key={pet.name} data-idx={i} onClick={() => choose(i)} draggable={false} style={{
                flexShrink: 0, width: "140px", padding: "20px 12px",
                borderRadius: "20px",
                border: `2px solid ${selected===i?"#C084FC":"#F3E8FF"}`,
                background: selected===i?"rgba(192,132,252,0.1)":"#fff",
                cursor: dragging ? "grabbing" : "pointer", textAlign: "center",
                transform: selected===i?"scale(1.05)":"scale(1)",
                transition: "transform 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s",
                boxShadow: selected===i?"0 4px 20px rgba(192,132,252,0.25)":"0 2px 8px rgba(0,0,0,0.05)",
                scrollSnapAlign: "center",
              }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px", pointerEvents: "none" }}><PetAvatar pet={pet} size={96} breathe={selected===i} /></div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: selected===i?"#C084FC":"#3B1F5E", marginBottom: "6px" }}>{pet.name}</div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: "1.4" }}>{pet.desc}</div>
              </button>
            ))}
          </div>

          {/* 左右箭头：滑到头时隐藏 */}
          {([["left", canLeft, -1], ["right", canRight, 1]] as const).map(([side, show, dir]) => show && (
            <button key={side} aria-label={side === "left" ? "上一个宠物" : "下一个宠物"} onClick={() => step(dir)} style={{
              position: "absolute", top: "50%", [side]: "-14px", transform: "translateY(-50%)",
              width: "36px", height: "36px", borderRadius: "50%", border: "none",
              background: "#fff", color: "#C084FC", fontSize: "22px", fontWeight: 700, lineHeight: 1,
              boxShadow: "0 2px 12px rgba(192,132,252,0.3)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
            }}>{side === "left" ? "‹" : "›"}</button>
          ))}
        </div>

        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={handleNext} style={{ width: "100%", background: "#C084FC", color: "#fff", border: "none", borderRadius: "16px", padding: "16px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(192,132,252,0.35)" }}>
            领养 {pets[selected].name}！
          </button>
          <button onClick={() => router.back()} style={{ width: "100%", background: "transparent", color: "#9CA3AF", border: "none", fontSize: "14px", cursor: "pointer", padding: "8px" }}>
            ← 返回上一步
          </button>
        </div>
      </div>
    </div>
  );
}
