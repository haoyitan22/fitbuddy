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
 * - Rests in a still that matches `mood`: the base still, or the last frame of the
 *   sport / full transform clip, so a finished transform never jumps.
 * - `autoTransform`: when the mood is sport or full, its transform plays on mount and
 *   then holds its last frame. "daily" = only the first time today (small cards);
 *   "always" = every time the component mounts (the pet page).
 * - `trigger`: play a clip now (bump `id` to replay). Used for the check-in overlay
 *   and the demo buttons.
 * - `wear`: the equipped shop item. If this pet has a clip for it, the pet "puts it on"
 *   (a transform like sport/full) and then rests dressed. Mood transforms take priority.
 * - Tapping plays the tap clip when the pet is in its base pose; otherwise (or for
 *   pets without clips yet) it gives a small squish so a tap always gets a reaction.
 *
 * Clips are muted and inline so browsers allow autoplay. With reduced motion,
 * no clip plays and the pet shows the still for its mood.
 */
export default function PetStage({
  pet, size = 220, mood = "idle", autoTransform = true, trigger, interactive = true, onClipEnd, round = false, wear,
}: {
  wear?: string | null;
  pet?: Partial<Pet> | string | null;
  size?: number;
  mood?: PetMood;
  autoTransform?: boolean | "daily" | "always";
  trigger?: { clip: PetClip; id: number } | null;
  interactive?: boolean;
  onClipEnd?: (clip: PetClip) => void;
  round?: boolean;
}) {
  const kind = petKindOf(pet);
  const clips = petClips(kind);
  const base = kind ? petStill(kind) : null;
  const worn = mood === "idle" ? petWear(kind, wear) : null;
  const clipSrc = (c: PetClip) => (c === "wear" ? worn?.clip : clips[c]);

  const restStill =
    (mood === "sport" && clips.sportEnd) || (mood === "full" && clips.fullEnd) || worn?.end || base;

  const [playing, setPlaying] = useState<PetClip | null>(null);
  const [visible, setVisible] = useState(false);
  // A transform replayed from its held end pose fades in instead of cutting to the start pose.
  const [fromHeld, setFromHeld] = useState(false);
  const [squish, setSquish] = useState(0);
  const [reduced, setReduced] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { /* ignore */ }
  }, []);

  // Transform for today's mood (or putting on the equipped item), on mount or once a day.
  useEffect(() => {
    if (!autoTransform || reduced) return;
    const target: PetClip | null = mood !== "idle" ? mood : worn ? "wear" : null;
    if (!target || !clipSrc(target)) return;
    const key = target === "wear" ? `wear:${wear}` : target;
    if (autoTransform !== "always" && hasPlayedToday(key)) return;
    markPlayedToday(key);
    setFromHeld(false);
    setPlaying(target);
  }, [mood, autoTransform, reduced, kind, wear]); // eslint-disable-line react-hooks/exhaustive-deps

  // External trigger.
  useEffect(() => {
    if (!trigger) return;
    if (reduced || !clipSrc(trigger.clip)) { setSquish(n => n + 1); return; }
    if (trigger.clip === "sport" || trigger.clip === "full" || trigger.clip === "celebrate") markPlayedToday(trigger.clip);
    setPlaying(trigger.clip);
  }, [trigger?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start playback whenever a clip is chosen.
  useEffect(() => {
    const v = videoRef.current;
    if (!playing || !v) return;
    // Every clip fades in over the still once it is actually playing, which also hides
    // clips whose first frame differs a little from the still (e.g. a prop already in shot).
    setVisible(false);
    v.currentTime = 0;
    v.play().catch(() => { setPlaying(null); setVisible(false); setFromHeld(false); });
  }, [playing]);

  function handleEnded() {
    const done = playing;
    setFromHeld(false);
    if (done && TRANSFORMS.includes(done)) {
      // The resting still is this clip's last frame, so swap without a fade.
      setPlaying(null);
      setVisible(false);
    } else {
      // One-shots end near the base pose: fade back onto the still.
      setVisible(false);
      window.setTimeout(() => setPlaying(null), 220);
    }
    if (done) onClipEnd?.(done);
  }

  function handleTap() {
    if (!interactive || playing) return;
    if (!reduced && worn) { setFromHeld(true); setPlaying("wear"); }
    else if (!reduced && clips.tap && mood === "idle") setPlaying("tap");
    else if (!reduced && mood !== "idle" && clips[mood]) { setFromHeld(true); setPlaying(mood); }
    else setSquish(n => n + 1);
  }

  if (!kind || !base) {
    const emoji = typeof pet === "string" ? pet : pet?.emoji ?? "🐾";
    return <div style={{ fontSize: size * 0.55, lineHeight: 1 }}>{emoji}</div>;
  }

  // While a transform plays, the layer underneath is its starting pose,
  // except on a tap-replay, where the held end pose stays put until the clip fades in.
  const underStill = playing && TRANSFORMS.includes(playing) && !fromHeld ? base : restStill!;
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
          poster={underStill}
          muted
          playsInline
          preload="auto"
          onPlaying={() => setVisible(true)}
          onEnded={handleEnded}
          onError={() => { setPlaying(null); setVisible(false); }}
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
