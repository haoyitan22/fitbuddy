const USER_DATA_KEY = "fitbuddy_user_data";
const SESSION_KEY = "fitbuddy_session";
const TEMP_KEY = "fitbuddy_register_temp";

export interface Pet {
  emoji: string;
  species: string; // 熊猫、猫咪等
  name: string;    // 种类昵称：胖达、橘子等
  desc: string;
}

export interface UserProfile {
  nickname: string;
  gender: string;
  birthday: string;
  weight: number;
  height: number;
  targetWeight: number;
  goalMonths: number;
  activityLevel: string;
  email: string;
  password: string;
  pet: Pet;
  petName: string;      // 用户给宠物起的名字
  petJoinDate: string;  // ISO 日期字符串
}

export type TempRegisterData = Partial<UserProfile>;

export function saveUserData(profile: UserProfile): void {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(profile));
}

export function getUserData(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(USER_DATA_KEY);
  if (!data) return null;
  try { return JSON.parse(data) as UserProfile; } catch { return null; }
}

export function saveTempData(data: TempRegisterData): void {
  const existing = getTempData();
  sessionStorage.setItem(TEMP_KEY, JSON.stringify({ ...existing, ...data }));
}

export function getTempData(): TempRegisterData {
  if (typeof window === "undefined") return {};
  const raw = sessionStorage.getItem(TEMP_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/** Set by the invite page when someone joins a team before they have an account. */
export const PENDING_INVITE_KEY = "fitbuddy_pending_invite";

/** Kept when a new account is created: not personal, or meant for the new account. */
const KEEP_ON_NEW_ACCOUNT = new Set(["fitbuddy_food_cache"]);

/**
 * Everything the app records lives in this browser (meals, coins and shop items, check-ins,
 * water, weight, team, …), not under an account. A new account registered here must not
 * inherit the previous account's records, so they are cleared first. A team invite accepted
 * just before signing up (this browser session) is kept.
 */
export function clearPreviousAccountData(): void {
  try {
    const keepInvite = sessionStorage.getItem(PENDING_INVITE_KEY) === "1";
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("fitbuddy_")) keys.push(k);
    }
    for (const k of keys) {
      if (KEEP_ON_NEW_ACCOUNT.has(k)) continue;
      if (keepInvite && k === "fitbuddy_team") continue;
      localStorage.removeItem(k);
    }
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch { /* storage unavailable: nothing to clear */ }
}

export function clearTempData(): void {
  sessionStorage.removeItem(TEMP_KEY);
}

export function createSession(email: string): void {
  sessionStorage.setItem(SESSION_KEY, email);
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) !== null;
}

export function getUser(): UserProfile | null {
  if (!isLoggedIn()) return null;
  return getUserData();
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
