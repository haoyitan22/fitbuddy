"use client";

import type { CSSProperties } from "react";
import type { Pet } from "@/lib/auth";
import { petKindOf, petStill, PET_BG } from "@/lib/pets";

/**
 * Static pet portrait (the 3D clay base still).
 * crop="head" zooms in on the face for small round avatars.
 */
export default function PetAvatar({
  pet, size = 96, crop = "full", round, breathe = false, style, alt,
}: {
  /** A saved Pet object, or an emoji / species name like "🐼" or "熊猫". */
  pet?: Partial<Pet> | string | null;
  size?: number;
  crop?: "full" | "head";
  /** Defaults to a circle for head crops and a soft rounded square otherwise. */
  round?: boolean;
  /** Gentle idle breathing, for the bigger, featured placements. */
  breathe?: boolean;
  style?: CSSProperties;
  alt?: string;
}) {
  const kind = petKindOf(pet);
  const isRound = round ?? crop === "head";

  if (!kind) {
    const emoji = typeof pet === "string" ? pet : pet?.emoji ?? "🐾";
    return <span style={{ fontSize: size * 0.6, lineHeight: 1, display: "inline-block", ...style }}>{emoji}</span>;
  }

  return (
    <div
      style={{
        width: size, height: size, flexShrink: 0, overflow: "hidden", position: "relative",
        borderRadius: isRound ? "50%" : Math.round(size * 0.22),
        background: PET_BG,
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={petStill(kind)}
        alt={alt ?? (typeof pet === "object" && pet?.name ? pet.name : "宠物")}
        width={size}
        height={size}
        draggable={false}
        className={breathe ? "pet-breathe" : undefined}
        style={{
          width: "100%", height: "100%", objectFit: "cover", display: "block",
          ...(crop === "head" ? { transform: "scale(1.75)", transformOrigin: "50% 26%" } : null),
        }}
      />
    </div>
  );
}
