import posthog from "posthog-js";

/* Product analytics (PostHog). Does nothing until NEXT_PUBLIC_POSTHOG_KEY is set.
   Events go to /ingest on our own domain (proxied in next.config.ts), so
   blockers and networks that can't reach PostHog directly lose fewer of them.
   Health details are not sent: inputs are masked in recordings, and areas
   marked with the class "ph-no-capture" (meal items, weights, scores) are
   neither autocaptured nor recorded. */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (key) {
  try {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2026-08-30",
      person_profiles: "identified_only",
      session_recording: { maskAllInputs: true },
    });
  } catch { /* analytics must never break the app */ }
}
