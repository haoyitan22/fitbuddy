import type { UserProfile } from "@/lib/auth";

/* ──────────────────────────────────────────────────────────────
   Teams. There is no server yet: a team lives in this browser only.
   The invite link carries the team's name, goal and the inviter's
   nickname + pet, so the person who opens it sees the real team.
   Teammates who join elsewhere cannot appear here until teams are
   stored on a server.
   ────────────────────────────────────────────────────────────── */

export const TEAM_KEY = "fitbuddy_team";
export const TEAM_SIZE = 6;

export const GOALS = [
  { id: "fat", label: "🔥 一起减脂" },
  { id: "checkin", label: "💪 健康打卡" },
  { id: "diet", label: "🥗 均衡饮食" },
];

export function goalLabel(id?: string) {
  return GOALS.find(g => g.id === id)?.label ?? GOALS[0].label;
}

export interface TeamData {
  id: string;
  name: string;
  goal: string;
  code: string;
  createdAt: string;
  /** "leader" if this user created the team; teams saved before this field are treated as leader. */
  role?: "leader" | "member";
  /** Who invited this user (members only). */
  leader?: { name: string; pet: string };
}

export function randCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function loadTeam(): TeamData | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(TEAM_KEY) || "null"); } catch { return null; }
}

export function saveTeam(t: TeamData | null) {
  if (t) localStorage.setItem(TEAM_KEY, JSON.stringify(t));
  else localStorage.removeItem(TEAM_KEY);
}

export interface Invite {
  code: string;
  name?: string;
  goal?: string;
  by?: string;
  pet?: string;
}

/** Link to /join on whichever site the user is on (live site or a preview). */
export function inviteLink(team: TeamData, user: UserProfile | null): string {
  const leader = team.role === "member" ? team.leader : undefined;
  const p = new URLSearchParams({ code: team.code, t: team.name, g: team.goal });
  const by = leader?.name ?? user?.nickname;
  const pet = leader?.pet ?? user?.pet?.emoji;
  if (by) p.set("by", by);
  if (pet) p.set("p", pet);
  return `${window.location.origin}/join?${p.toString()}`;
}

/** Reads an invite from a pasted link, its query string, or a bare 6-letter code. */
export function parseInvite(input: string | URLSearchParams): Invite | null {
  let params: URLSearchParams;
  if (typeof input === "string") {
    const s = input.trim();
    const q = s.indexOf("?");
    if (q < 0) {
      const code = s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-6);
      return code.length === 6 ? { code } : null;
    }
    params = new URLSearchParams(s.slice(q + 1));
  } else params = input;
  const code = (params.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (code.length !== 6) return null;
  const clean = (v: string | null, n: number) => (v ?? "").trim().slice(0, n) || undefined;
  return { code, name: clean(params.get("t"), 20), goal: clean(params.get("g"), 10), by: clean(params.get("by"), 20), pet: clean(params.get("p"), 4) };
}

/** The team this browser joins from an invite. */
export function teamFromInvite(inv: Invite): TeamData {
  return {
    id: inv.code, code: inv.code, createdAt: new Date().toISOString(),
    name: inv.name ?? "好友的队伍",
    goal: GOALS.some(g => g.id === inv.goal) ? inv.goal! : "fat",
    role: "member",
    leader: inv.by ? { name: inv.by, pet: inv.pet ?? "🐾" } : undefined,
  };
}

/** Days with a check-in this week (Monday to today). */
export function checkinsThisWeek(dates: string[]): number {
  const set = new Set(dates);
  const d = new Date();
  const back = (d.getUTCDay() + 6) % 7; // days since Monday
  let n = 0;
  for (let i = 0; i <= back; i++) {
    if (set.has(d.toISOString().slice(0, 10))) n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}
