import type { Pet } from "@/lib/auth";
import { getTodayTotals } from "@/lib/meals";

/* ──────────────────────────────────────────────────────────────
   Pet art + pet state rules.
   Base stills live in /public/pets/<kind>.webp.
   Animated clips (muted, no audio track) live in /public/pets/<kind>/.
   ────────────────────────────────────────────────────────────── */

export type PetKind = "panda" | "cat" | "hamster" | "fox" | "bear";

/** Background colour baked into the stills and clips, so frames blend into their container. */
export const PET_BG = "#FAF0FC";

const KIND_BY_EMOJI: Record<string, PetKind> = {
  "🐼": "panda", "🐱": "cat", "🐹": "hamster", "🦊": "fox", "🐻": "bear",
};
const KIND_BY_SPECIES: Record<string, PetKind> = {
  "熊猫": "panda", "猫咪": "cat", "仓鼠": "hamster", "狐狸": "fox", "棕熊": "bear",
};

/** Works with the Pet objects already saved in users' localStorage (emoji + species), or a bare emoji. */
export function petKindOf(pet?: Partial<Pet> | string | null): PetKind | null {
  if (!pet) return null;
  if (typeof pet === "string") return KIND_BY_EMOJI[pet] ?? KIND_BY_SPECIES[pet] ?? null;
  return (pet.emoji && KIND_BY_EMOJI[pet.emoji]) || (pet.species && KIND_BY_SPECIES[pet.species]) || null;
}

export function petStill(kind: PetKind): string {
  return `/pets/${kind}.webp`;
}

/** Which pets have which clips. All five pets are animated. */
export interface PetClips {
  sport?: string;      // check-in transform: base → sport pose (held at the end)
  sportEnd?: string;   // last frame of `sport`, shown while the pet stays sporty
  full?: string;       // over-calorie transform: base → stuffed (held at the end)
  fullEnd?: string;    // last frame of `full`
  tap?: string;        // one-shot reaction, returns to base
  celebrate?: string;  // one-shot streak celebration, returns to base
}

const CLIPS: Partial<Record<PetKind, PetClips>> = {
  panda: {
    sport: "/pets/panda/sport.mp4",
    sportEnd: "/pets/panda/sport-end.webp",
    full: "/pets/panda/full.mp4",
    fullEnd: "/pets/panda/full-end.webp",
    tap: "/pets/panda/tap.mp4",
    celebrate: "/pets/panda/celebrate.mp4",
  },
  hamster: animated("hamster"),
  bear: animated("bear"),
  fox: animated("fox"),
  cat: animated("cat"),
};

/** Standard clip set for a pet folder that has all four clips. */
function animated(kind: PetKind): PetClips {
  const dir = `/pets/${kind}`;
  return {
    sport: `${dir}/sport.mp4`, sportEnd: `${dir}/sport-end.webp`,
    full: `${dir}/full.mp4`, fullEnd: `${dir}/full-end.webp`,
    tap: `${dir}/tap.mp4`, celebrate: `${dir}/celebrate.mp4`,
  };
}

export function petClips(kind: PetKind | null): PetClips {
  return (kind && CLIPS[kind]) || {};
}

/* ── state rules ─────────────────────────────────────────────── */

export const CALORIE_GOAL = 1500;
/** Consecutive check-in days that count as a streak worth celebrating. */
export const STREAK_CELEBRATE = 3;
const CHECKIN_KEY = "fitbuddy_workout_checkins";

/** Same date format the app already uses for check-ins and meals. */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCheckinDates(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHECKIN_KEY) || "[]"); } catch { return []; }
}

/** Consecutive days with a check-in, counting back from today (0 if today has none). */
export function getStreak(dates: string[] = getCheckinDates()): number {
  const set = new Set(dates);
  let n = 0;
  const d = new Date();
  while (set.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

/** The pose the pet rests in today. Over-eating wins, so the nudge is not hidden by a check-in. */
export type PetMood = "idle" | "sport" | "full";

export function getPetMood(): PetMood {
  if (typeof window === "undefined") return "idle";
  if (getTodayTotals().calories > CALORIE_GOAL) return "full";
  if (getCheckinDates().includes(todayStr())) return "sport";
  return "idle";
}

/* ── play-once-per-day bookkeeping ─────────────────────────────
   Transform clips (sport, full) and the streak celebration play once a
   day automatically; after that the pet just rests in the end pose. */

const PLAYED_KEY = "fitbuddy_pet_played";
type Played = { date: string; clips: string[] };

function readPlayed(): Played {
  try {
    const p = JSON.parse(localStorage.getItem(PLAYED_KEY) || "null") as Played | null;
    if (p && p.date === todayStr()) return p;
  } catch { /* ignore */ }
  return { date: todayStr(), clips: [] };
}

export function hasPlayedToday(clip: string): boolean {
  if (typeof window === "undefined") return true;
  return readPlayed().clips.includes(clip);
}

export function markPlayedToday(clip: string) {
  try {
    const p = readPlayed();
    if (!p.clips.includes(clip)) p.clips.push(clip);
    localStorage.setItem(PLAYED_KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}
