"use client";

import { useEffect, useRef } from "react";

/**
 * Plays a pet clip on a canvas with its studio background (light lavender, or the deeper
 * purple of one clip) keyed out, so the pet sits directly on the page — and can step
 * over the dashed frame on the "welcome home" screen.
 *
 * `intro` plays once (if given), then `loop` repeats; with `loop` = false the clip plays
 * once and holds its last frame, and `onDone` fires.
 */
export default function KeyedVideo({ intro, src, loop = true, size = 560, label, onDone }: {
  intro?: string; src: string; loop?: boolean; size?: number; label: string; onDone?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const make = (url: string, repeat: boolean) => {
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.loop = repeat;
      v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
      v.src = url;
      return v;
    };
    const main = make(src, loop);
    const first = intro ? make(intro, false) : null;
    let active: HTMLVideoElement = first ?? main;
    let raf = 0, stopped = false;

    const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
    function draw() {
      if (!ctx || active.readyState < 2) return;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(active, 0, 0, size, size);
      const img = ctx.getImageData(0, 0, size, size), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        // background = blue clearly above green and not below red; white fur, cream and pink stay
        const k = Math.min(clamp((b - g - 4) / 6), clamp((b - r + 8) / 6), clamp((b - 150) / 30));
        if (k > 0) {
          d[i + 3] = 255 * (1 - k);
          const cap = (r + g) / 2 + 6;
          if (b > cap) d[i + 2] = cap; // remove the lavender tint from soft edges
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    function frame() {
      if (stopped) return;
      draw();
      raf = requestAnimationFrame(frame);
    }
    const start = (v: HTMLVideoElement) => { v.play().catch(() => { /* autoplay blocked: first frame stays */ }); };

    if (first) {
      first.addEventListener("ended", () => { active = main; main.currentTime = 0; start(main); }, { once: true });
      first.addEventListener("loadeddata", () => start(first), { once: true });
      main.load();
    } else {
      main.addEventListener("loadeddata", () => start(main), { once: true });
    }
    if (!loop) main.addEventListener("ended", () => { draw(); doneRef.current?.(); });
    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true; cancelAnimationFrame(raf);
      [main, first].forEach(v => { if (v) { v.pause(); v.removeAttribute("src"); v.load(); } });
    };
  }, [intro, src, loop, size]);

  return <canvas ref={canvasRef} width={size} height={size} role="img" aria-label={label} style={{ width: "100%", height: "100%", display: "block" }} />;
}
