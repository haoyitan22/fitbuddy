"use client";

import { useEffect, useRef } from "react";

const TICK = 8; // px per step on the ruler

/**
 * Horizontal ruler: drag / swipe / scroll it, or use − and +. The value under the
 * centre line is the selected one. Ticks are drawn with gradients, so long ranges stay cheap.
 */
export function Ruler({ id, value, min, max, step, unit, label, onChange }: {
  id: string; value: number; min: number; max: number; step: number; unit: string; label: string;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const steps = Math.round((max - min) / step);
  const decimals = step < 1 ? 1 : 0;
  const fix = (v: number) => Math.round(Math.min(max, Math.max(min, v)) / step) * step;
  const settling = useRef(false);

  // keep the scroll position in sync with the value (initial value, −/+ buttons)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const want = Math.round((value - min) / step) * TICK;
    if (Math.abs(el.scrollLeft - want) > TICK / 2) { settling.current = true; el.scrollLeft = want; }
  }, [value, min, step]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A plain mouse wheel only scrolls vertically; move the ruler with it.
    function onWheel(e: WheelEvent) {
      if (!el || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    if (settling.current) { settling.current = false; return; }
    const v = fix(min + Math.round(el.scrollLeft / TICK) * step);
    if (v !== value) onChange(Number(v.toFixed(decimals)));
  }

  const labels: number[] = [];
  for (let i = 0; i <= steps; i += 10) labels.push(min + i * step);

  return (
    <div className="rg-ruler">
      <div className="rg-ruler-value">
        <button type="button" className="rg-step" aria-label={`${label}减少`} onClick={() => onChange(Number(fix(value - step).toFixed(decimals)))}>−</button>
        <output htmlFor={id} className="rg-num">{value.toFixed(decimals)}<small>{unit}</small></output>
        <button type="button" className="rg-step" aria-label={`${label}增加`} onClick={() => onChange(Number(fix(value + step).toFixed(decimals)))}>+</button>
      </div>
      <div className="rg-ruler-window">
        <div id={id} ref={ref} className="rg-ruler-track" onScroll={onScroll} tabIndex={0} role="slider"
          aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
          onKeyDown={e => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Number(fix(value + step).toFixed(decimals))); }
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Number(fix(value - step).toFixed(decimals))); }
          }}>
          <i aria-hidden="true" />
          <div className="rg-ruler-scale" style={{ width: steps * TICK + 2 }}>
            {labels.map(v => (
              <span key={v} style={{ left: ((v - min) / step) * TICK }}>{v.toFixed(0)}</span>
            ))}
          </div>
          <i aria-hidden="true" />
        </div>
        <i className="rg-ruler-needle" aria-hidden="true" />
      </div>
    </div>
  );
}

const ROW = 40;

/** One column of a scroll wheel (year / month / day). */
export function WheelColumn({ label, options, value, onChange, suffix }: {
  label: string; options: number[]; value: number; onChange: (v: number) => void; suffix: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, options.indexOf(value));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - idx * ROW) > ROW / 2) el.scrollTop = idx * ROW;
  }, [idx]);

  function onScroll() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (options[i] !== value) onChange(options[i]);
    }, 80);
  }

  return (
    <div ref={ref} className="rg-wheel-col" onScroll={onScroll} tabIndex={0} role="listbox" aria-label={label}
      onKeyDown={e => {
        if (e.key === "ArrowDown") { e.preventDefault(); onChange(options[Math.min(options.length - 1, idx + 1)]); }
        if (e.key === "ArrowUp") { e.preventDefault(); onChange(options[Math.max(0, idx - 1)]); }
      }}>
      {options.map((o, i) => {
        const dist = Math.abs(i - idx);
        return (
          <button type="button" key={o} role="option" aria-selected={i === idx} tabIndex={-1}
            className={dist === 0 ? "on" : dist === 1 ? "near" : ""}
            onClick={() => onChange(o)}>{o} {suffix}</button>
        );
      })}
    </div>
  );
}
