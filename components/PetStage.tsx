"use client";

import { useEffect, useRef, useState } from "react";
import type { Pet } from "@/lib/auth";
import {
  petKindOf, petStill, petClips, petWear, PET_BG,
  hasPlayedToday, markPlayedToday, type PetMood,
} from "@/lib/pets";

export type PetClip = "sport" | "full" | "tap" | "celebrate" | "wear";

/** Clips that start on the base still and end in a pose the pet then rests in. */
const TRANSFORMS: PetClip[] = ["sport", "full", "wear"];

/**
 * Animated pet.
 *
 * What the pet rests in, and what plays on arrival:
 *   full                → plays "full", rests stuffed (a nudge; the outfit waits beside it)
 *   sport + outfit clip → plays "sport", then flows into "wear", rests dressed
 *   sport, no outfit    → plays "sport", rests in the sport pose
 *   idle  + outfit clip → plays "wear", rests dressed
 *   idle                → rests in the base still
 * `autoTransform`: "always" plays the arrival sequence on every mount (pet page),
 * true / "daily" only the first time today (small cards).
 *
 * `trigger` plays a clip now (bump `id`), used by the check-in overlay and demo buttons.
 * Tapping replays what the pet is resting in (outfit or mood), plays the tap reaction in
 * the plain base pose, or squishes if there is nothing to play.
 *
 * Clips are muted and inline so browsers allow autoplay. With reduced motion,
 * no clip plays and the pet shows its resting still.
 */
export default function PetStage({
  pet, size = 220, mood = "idle", autoTransform = true, trigger, interactive = true, onClipEnd, round = false, wear,
}: {
  pet?: Partial<Pet> | string | null;
  size?: number;
  mood?: PetMood;
  autoTransform?: boolean | "daily" | "always";
  trigger?: { clip: PetClip; id: number } | null;
  interactive?: boolean;
  onClipEnd?: (clip: PetClip) => void;
  round?: boolean;
  /** The equipped shop item id. */
  wear?: string | null;
}) {
  const kind = petKindOf(pet);
  const clips = petClips(kind);
  const base = kind ? petStill(kind) : null;
  const outfit = petWear(kind, wear);
  // Stuffed wins over the outfit; otherwise a pet with an outfit clip rests dressed.
  const dressed = mood !== "full" && !!outfit;
  const clipSrc = (c: PetClip) => (c === "wear" ? outfit?.clip : clips[c]);

  const restStill =
    (mood === "full" && clips.fullEnd) ||
    (dressed && outfit!.end) ||
    (mood === "sport" && clips.sportEnd) ||
    base;

  const [playing, setPlaying] = useState<PetClip | null>(null);
  const [queue, setQueue] = useState<PetClip[]>([]);
  // A still kept underneath while the next clip fades in (tap replays, chained clips),
  // so the picture never snaps back to the base pose in between.
  const [holdStill, setHoldStill] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [squish, setSquish] = useState(0);
  const [reduced, setReduced] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { /* ignore */ }
  }, []);

  function playSequence(seq: PetClip[], hold: string | null = null) {
    const ok = seq.filter(c => clipSrc(c));
    if (!ok.length) return false;
    setHoldStill(hold);
    setQueue(ok.slice(1));
    setPlaying(ok[0]);
    return true;
  }

  // Arrival sequence for today's mood and outfit.
  useEffect(() => {
    if (!autoTransform || reduced) return;
    const seq: PetClip[] =
      mood === "full" ? ["full"] :
      mood === "sport" ? (dressed ? ["sport", "wear"] : ["sport"]) :
      dressed ? ["wear"] : [];
    const key = seq.map(c => (c === "wear" ? `wear:${wear}` : c)).join("+");
    if (!seq.length || (autoTransform !== "always" && hasPlayedToday(key))) return;
    if (playSequence(seq)) markPlayedToday(key);
  }, [mood, autoTransform, reduced, kind, wear]); // eslint-disable-line react-hooks/exhaustive-deps

  // External trigger.
  useEffect(() => {
    if (!trigger) return;
    if (reduced || !clipSrc(trigger.clip)) { setSquish(n => n + 1); return; }
    if (trigger.clip !== "tap" && trigger.clip !== "wear") markPlayedToday(trigger.clip);
    playSequence([trigger.clip]);
  }, [trigger?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start playback whenever a clip is chosen. Every clip fades in over the still once
  // it is actually playing, which also hides small first-frame differences.
  useEffect(() => {
    const v = videoRef.current;
    if (!playing || !v) return;
    setVisible(false);
    v.currentTime = 0;
    v.play().catch(() => { setPlaying(null); setQueue([]); setVisible(false); setHoldStill(null); });
  }, [playing]);

  function endStillOf(c: PetClip) {
    return c === "sport" ? clips.sportEnd : c === "full" ? clips.fullEnd : c === "wear" ? outfit?.end : null;
  }

  function handleEnded() {
    const done = playing;
    if (done && queue.length) {
      // Chain: keep this clip's last pose underneath while the next one fades in.
      setHoldStill(endStillOf(done) ?? restStill);
      setQueue(q => q.slice(1));
      setPlaying(queue[0]);
    } else if (done && TRANSFORMS.includes(done) && endStillOf(done) === restStill) {
      // The resting still is this clip's last frame, so swap without a fade.
      setPlaying(null);
      setVisible(false);
      setHoldStill(null);
    } else {
      // One-shots end near the base pose: fade back onto the resting still.
      setVisible(false);
      setHoldStill(null);
      window.setTimeout(() => setPlaying(null), 220);
    }
    if (done) onClipEnd?.(done);
  }

  function handleTap() {
    if (!interactive || playing) return;
    if (!reduced) {
      if (mood === "full" && clips.full) { playSequence(["full"], restStill); return; }
      if (dressed) { playSequence(["wear"], restStill); return; }
      if (mood === "sport" && clips.sport) { playSequence(["sport"], restStill); return; }
      if (clips.tap) { playSequence(["tap"]); return; }
    }
    setSquish(n => n + 1);
  }

  if (!kind || !base) {
    const emoji = typeof pet === "string" ? pet : pet?.emoji ?? "🐾";
    return <div style={{ fontSize: size * 0.55, lineHeight: 1 }}>{emoji}</div>;
  }

  // Underneath a playing transform sits its starting pose (the base still),
  // unless a held still was set for a replay or a chained clip.
  const underStill =
    holdStill ?? (playing && TRANSFORMS.includes(playing) ? base : restStill!);
  const src = playing ? clipSrc(playing) : undefined;

  return (
    <div
      onClick={handleTap}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? "点一点宠物" : undefined}
      style={{
        width: size, height: size, position: "relative", flexShrink: 0, overflow: "hidden",
        borderRadius: round ? "50%" : Math.round(size * 0.18),
        background: PET_BG,
        cursor: interactive ? "pointer" : "default",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div key={squish} className={squish ? "pet-squish" : undefined} style={{ width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={underStill}
          alt={typeof pet === "object" && pet?.name ? pet.name : "宠物"}
          draggable={false}
          className={!playing && !reduced ? "pet-breathe" : undefined}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
      {playing && src && (
        <video
          ref={videoRef}
          key={playing + src}
          src={src}
          muted
          playsInline
          preload="auto"
          onPlaying={() => setVisible(true)}
          onEnded={handleEnded}
          onError={() => { setPlaying(null); setQueue([]); setVisible(false); setHoldStill(null); }}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: visible ? 1 : 0, transition: "opacity 200ms ease",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
