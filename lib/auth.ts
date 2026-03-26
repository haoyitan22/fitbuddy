const USER_KEY = "fitbuddy_user";

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

export function saveUser(profile: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
}

export function getUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserProfile;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}

export function logout(): void {
  localStorage.removeItem(USER_KEY);
}
