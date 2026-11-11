/* ──────────────────────────────────────────────────────────────
   Coins: earned by healthy actions, spent in the pet shop.
   Stored with the shop state under fitbuddy_pet_store so the pet
   page and the profile page keep reading the same balance.
   ────────────────────────────────────────────────────────────── */

export const STORE_KEY = "fitbuddy_pet_store";
const LOG_KEY = "fitbuddy_coin_log";
export const START_COINS = 128;

/** How many coins each healthy action earns. */
export const COIN_RULES = {
  meal: 10,        // per meal recorded, at most 3 a day (one per breakfast / lunch / dinner)
  checkin: 20,     // workout check-in, once a day
  water: 10,       // daily water goal reached, once a day
  streak7: 50,     // bonus on every 7th consecutive check-in day
} as const;

export interface PetStore {
  coins: number;
  owned: string[];
  /** Equipped accessory (anything that is not a background). */
  equipped: string | null;
  /** Equipped background theme. */
  background: string | null;
}

export function loadStore(): PetStore {
  const fresh: PetStore = { coins: START_COINS, owned: [], equipped: null, background: null };
  if (typeof window === "undefined") return fresh;
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!raw) return fresh;
    return {
      coins: typeof raw.coins === "number" ? raw.coins : START_COINS,
      owned: Array.isArray(raw.owned) ? raw.owned : [],
      equipped: raw.equipped ?? null,
      background: raw.background ?? null,
    };
  } catch { return fresh; }
}

export function saveStore(s: PetStore) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type Log = { date: string; keys: string[] };

function readLog(): Log {
  try {
    const l = JSON.parse(localStorage.getItem(LOG_KEY) || "null") as Log | null;
    if (l && l.date === todayStr()) return l;
  } catch { /* ignore */ }
  return { date: todayStr(), keys: [] };
}

export interface CoinEvent { amount: number; reason: string }
export const COIN_EVENT = "fitbuddy:coins";

/**
 * Award coins once per day per `key` (e.g. "meal:lunch", "checkin", "water", "streak7").
 * Returns the amount awarded (0 if already awarded today) and shows a toast.
 */
export function earnOnce(key: string, amount: number, reason: string): number {
  if (typeof window === "undefined") return 0;
  const log = readLog();
  if (log.keys.includes(key)) return 0;
  log.keys.push(key);
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch { /* ignore */ }
  const s = loadStore();
  saveStore({ ...s, coins: s.coins + amount });
  window.dispatchEvent(new CustomEvent<CoinEvent>(COIN_EVENT, { detail: { amount, reason } }));
  return amount;
}
