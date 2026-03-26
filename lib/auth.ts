const USER_DATA_KEY = "fitbuddy_user_data"; // 永久保存注册信息
const SESSION_KEY = "fitbuddy_session";      // 会话，关闭浏览器自动清除

export interface UserProfile {
  nickname: string;
  gender: string;
  birthday: string;
  weight: number;
  height: number;
  targetWeight: number;
  activityLevel: string;
  email: string;
  password: string;
}

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

/** 登录时创建会话 */
export function createSession(email: string): void {
  sessionStorage.setItem(SESSION_KEY, email);
}

/** 是否已登录（会话是否存在） */
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) !== null;
}

/** 获取当前登录用户资料 */
export function getUser(): UserProfile | null {
  if (!isLoggedIn()) return null;
  return getUserData();
}

/** 登出（清除会话） */
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
