import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────
   Shared teams, stored in Upstash Redis (Vercel Marketplace).

   Keys
     team:{code}               JSON  { code, name, goal, createdAt, leaderId }
     team:{code}:members       hash  memberId → JSON { id, name, pet, petName, joinedAt, checkins: [dates] }
     team:{code}:feed          list  JSON { by, type, text, detail, at }   (newest first, 30 kept)
     member:{id}:secret        string, proves a request comes from that member's browser

   Members have no server account: each browser makes a random id + secret.
   The id is shown to teammates; the secret never leaves the owner's browser
   and is required for every change made in that member's name.
   ────────────────────────────────────────────────────────────── */

const TEAM_SIZE = 6;
const FEED_KEEP = 30;
const GOALS = ["fat", "checkin", "diet"];

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

interface Team { code: string; name: string; goal: string; createdAt: string; leaderId: string }
interface Member { id: string; name: string; pet: string; petName: string; joinedAt: string; checkins: string[] }
interface FeedEvent { by: string; type: "meal" | "checkin" | "join"; text: string; detail: string; at: string }

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const isId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]{16,40}$/i.test(v);
const isCode = (v: unknown): v is string => typeof v === "string" && /^[A-Z0-9]{6}$/.test(v);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Upstash returns stored JSON already parsed; older values may still be strings. */
function parse<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === "string") { try { return JSON.parse(v) as T; } catch { return null; } }
  return v as T;
}

function fail(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

async function readTeam(db: Redis, code: string) {
  const [team, members, feed] = await Promise.all([
    db.get(`team:${code}`),
    db.hgetall(`team:${code}:members`),
    db.lrange(`team:${code}:feed`, 0, FEED_KEEP - 1),
  ]);
  const t = parse<Team>(team);
  if (!t) return null;
  const list = Object.values(members ?? {}).map(m => parse<Member>(m)).filter((m): m is Member => !!m)
    .sort((a, b) => (a.id === t.leaderId ? -1 : b.id === t.leaderId ? 1 : a.joinedAt.localeCompare(b.joinedAt)));
  return { team: t, members: list, feed: feed.map(e => parse<FeedEvent>(e)).filter(Boolean) as FeedEvent[] };
}

/** GET /api/team?code=ABC123 → { team, members, feed }  (503 when no database is connected) */
export async function GET(req: NextRequest) {
  const db = redis();
  if (!db) return fail("组队服务还没连上数据库", 503);
  const code = (req.nextUrl.searchParams.get("code") ?? "").toUpperCase();
  if (!isCode(code)) return fail("邀请码不对");
  try {
    const data = await readTeam(db, code);
    return data ? NextResponse.json(data) : fail("队伍不存在或已解散", 404);
  } catch (e) {
    console.error("team GET", e);
    return fail("组队服务暂时不可用", 502);
  }
}

/**
 * POST /api/team  { action, code?, member: { id, secret, name, pet, petName }, ... }
 *   create   { name, goal, code }   → team (code chosen by the browser so older local teams keep theirs)
 *   join                            → team
 *   leave                           → ok
 *   sync     { checkins: [dates] }  → ok    (the member's recent check-in dates)
 *   activity { type, text, detail } → ok    (adds to the team feed)
 */
export async function POST(req: NextRequest) {
  const db = redis();
  if (!db) return fail("组队服务还没连上数据库", 503);
  try {
    const body = await req.json();
    const m = body.member ?? {};
    if (!isId(m.id) || !isId(m.secret)) return fail("缺少身份信息");
    const code = String(body.code ?? "").toUpperCase();
    if (!isCode(code)) return fail("邀请码不对");

    // Claim the id on first use; afterwards the secret has to match.
    await db.set(`member:${m.id}:secret`, m.secret, { nx: true });
    if ((await db.get<string>(`member:${m.id}:secret`)) !== m.secret) return fail("身份校验失败", 403);

    const profile = { name: str(m.name, 20) || "队友", pet: str(m.pet, 4) || "🐾", petName: str(m.petName, 12) || "宠物" };
    const membersKey = `team:${code}:members`;
    const now = new Date().toISOString();
    const pushFeed = (e: FeedEvent) =>
      db.pipeline().lpush(`team:${code}:feed`, JSON.stringify(e)).ltrim(`team:${code}:feed`, 0, FEED_KEEP - 1).exec();

    switch (body.action) {
      case "create": {
        const team: Team = { code, name: str(body.name, 20) || "我的队伍", goal: GOALS.includes(body.goal) ? body.goal : "fat", createdAt: now, leaderId: m.id };
        const created = await db.set(`team:${code}`, JSON.stringify(team), { nx: true });
        if (!created) {
          // Same code already on the server: fine if it is this leader's own team (re-sync), otherwise a clash.
          const existing = parse<Team>(await db.get(`team:${code}`));
          if (existing?.leaderId !== m.id) return fail("邀请码重复，请重试", 409);
        }
        const old = parse<Member>(await db.hget(membersKey, m.id));
        await db.hset(membersKey, { [m.id]: JSON.stringify({ id: m.id, ...profile, joinedAt: old?.joinedAt ?? now, checkins: old?.checkins ?? [] }) });
        return NextResponse.json(await readTeam(db, code));
      }

      case "join": {
        const t = parse<Team>(await db.get(`team:${code}`));
        if (!t) return fail("队伍不存在或已解散", 404);
        const old = parse<Member>(await db.hget(membersKey, m.id));
        if (!old && (await db.hlen(membersKey)) >= TEAM_SIZE) return fail(`队伍已满（${TEAM_SIZE}人）`, 409);
        await db.hset(membersKey, { [m.id]: JSON.stringify({ id: m.id, ...profile, joinedAt: old?.joinedAt ?? now, checkins: old?.checkins ?? [] }) });
        if (!old) await pushFeed({ by: m.id, type: "join", text: `${profile.name} 加入了队伍 🎉`, detail: `带着${profile.petName}一起来啦`, at: now });
        return NextResponse.json(await readTeam(db, code));
      }

      case "leave": {
        await db.hdel(membersKey, m.id);
        const t = parse<Team>(await db.get(`team:${code}`));
        // The last one out closes the team; a leaving leader hands over to the earliest member.
        const rest = Object.values((await db.hgetall(membersKey)) ?? {}).map(x => parse<Member>(x)).filter((x): x is Member => !!x);
        if (!rest.length) await db.del(`team:${code}`, membersKey, `team:${code}:feed`);
        else if (t && t.leaderId === m.id) {
          rest.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
          await db.set(`team:${code}`, JSON.stringify({ ...t, leaderId: rest[0].id }));
        }
        return NextResponse.json({ ok: true });
      }

      case "sync":
      case "activity": {
        const cur = parse<Member>(await db.hget(membersKey, m.id));
        if (!cur) return fail("你不在这支队伍里", 403);
        const checkins = Array.isArray(body.checkins)
          ? [...new Set((body.checkins as unknown[]).filter(isDate))].sort().slice(-14)
          : cur.checkins;
        await db.hset(membersKey, { [m.id]: JSON.stringify({ ...cur, ...profile, checkins }) });
        if (body.action === "activity" && (body.type === "meal" || body.type === "checkin")) {
          await pushFeed({ by: m.id, type: body.type, text: str(body.text, 40), detail: str(body.detail, 80), at: now });
        }
        return NextResponse.json({ ok: true });
      }
    }
    return fail("未知操作");
  } catch (e) {
    console.error("team POST", e);
    return fail("组队服务暂时不可用", 502);
  }
}
