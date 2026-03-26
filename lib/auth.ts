const USER_DATA_KEY = "fitbuddy_user_data";
const SESSION_KEY = "fitbuddy_session";
const TEMP_KEY = "fitbuddy_register_temp";

export interface Pet {
  emoji: string;
  name: string;
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
}

export type TempRegisterData = Partial<UserProfile>;

/** 注册时保存用户资料到 localStorage */
export function saveUserData(profile: UserProfile): void {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(profile));
}

/** 读取注册资料（用于登录验证） */
export function getUserData(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(USER_DATA_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserProfile;
  } catch {
    return null;
  }
}

/** 注册流程中的临时数据（跨步骤） */
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

/** 登录时创建会话 */
export function createSession(email: string): void {
  sessionStorage.setItem(SESSION_KEY, email);
}

/** 是否已登录 */
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) !== null;
}

/** 获取当前登录用户资料 */
export function getUser(): UserProfile | null {
  if (!isLoggedIn()) return null;
  return getUserData();
}

/** 登出 */
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
