import posthog from "posthog-js";
import { getUser } from "@/lib/auth";
import { myMemberId, loadTeam } from "@/lib/team";
import { petKindOf } from "@/lib/pets";
import { ageOf } from "@/lib/goals";

/* ──────────────────────────────────────────────────────────────
   Event tracking. Only that something happened, plus coarse context
   (meal type, pet, counts). Never food names, weights, calories,
   email or password.
   ────────────────────────────────────────────────────────────── */

export type AnalyticsEvent =
  | "signup_completed" | "login"
  | "meal_photo_analyzed" | "meal_photo_failed" | "meal_saved" | "meal_updated"
  | "meal_item_added" | "meal_item_removed" | "next_meal_refreshed"
  | "workout_checkin" | "water_logged" | "weight_logged"
  | "pet_tapped" | "shop_item_bought" | "shop_item_equipped"
  | "team_created" | "team_joined" | "team_left" | "invite_link_copied";

let identifiedAs = "";

function ready() {
  return typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_POSTHOG_KEY && posthog.__loaded;
}

/** Link events to one person (a random id, not their email), with coarse traits for segmenting. */
export function identifyUser() {
  if (!ready()) return;
  const u = getUser();
  if (!u) return;
  const id = myMemberId().id;
  if (identifiedAs === id) return;
  const age = ageOf(u.birthday);
  posthog.identify(id, {
    pet: petKindOf(u.pet) ?? "other",
    gender: u.gender || "unknown",
    age_group: age ? (age < 25 ? "<25" : age < 35 ? "25-34" : age < 45 ? "35-44" : "45+") : "unknown",
    activity_level: u.activityLevel || "unknown",
    signed_up: u.petJoinDate?.slice(0, 10),
    in_team: !!loadTeam(),
  });
  identifiedAs = id;
}

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean | null | undefined>) {
  try {
    if (!ready()) return;
    identifyUser();
    posthog.capture(event, props);
  } catch { /* never break the app */ }
}

/** On logout, so the next person on this phone is not merged with this one. */
export function resetAnalytics() {
  try { if (ready()) { posthog.reset(); identifiedAs = ""; } } catch { /* ignore */ }
}
