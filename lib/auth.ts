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
