import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const MODEL = "claude-haiku-4-5-20251001";

interface Item { name: string; grams: number; calories: number; protein: number; carbs: number; fat: number }

const ITEM_SCHEMA = `{"name": "食材名", "grams": 估算克数, "calories": kcal, "protein": 克, "carbs": 克, "fat": 克}`;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
}

function cleanItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(i => i && typeof i === "object" && typeof (i as Item).name === "string")
    .map(i => {
      const it = i as Item;
      return { name: it.name.trim().slice(0, 30), grams: num(it.grams), calories: num(it.calories), protein: num(it.protein), carbs: num(it.carbs), fat: num(it.fat) };
    })
    .filter(i => i.name);
}

function parseJson(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function ask(client: Anthropic, content: Anthropic.MessageParam["content"], maxTokens = 1024) {
  const response = await client.messages.create({ model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content }] });
  const block = response.content.find(b => b.type === "text");
  return parseJson(block && block.type === "text" ? block.text : "");
}

/**
 * POST /api/analyze-food
 *   { imageBase64, mimeType }                    → { items, foods, calories, protein, carbs, fat }
 *   { mode: "estimate", items: [{name, grams}] } → { items }   (nutrition for hand-added foods)
 *   { mode: "suggest", ...context }              → { ideas: [{name, kcal, why}], tip }
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key 未配置，请联系管理员" }, { status: 500 });
    const client = new Anthropic({ apiKey });
    const body = await req.json();

    /* ── nutrition for foods the user typed in ── */
    if (body.mode === "estimate") {
      const wanted = (Array.isArray(body.items) ? body.items : [])
        .slice(0, 10)
        .map((i: { name?: unknown; grams?: unknown }) => `${String(i.name ?? "").slice(0, 30)}：${num(i.grams) || 100} 克`)
        .join("\n");
      if (!wanted) return NextResponse.json({ error: "No items" }, { status: 400 });
      const data = await ask(client, `请估算下面每种食物在给定重量下的营养成分（按常见中式做法估算）：
${wanted}
只返回如下 JSON，不要任何额外文字，grams 保持给定的重量：
{ "items": [ ${ITEM_SCHEMA} ] }`);
      const items = cleanItems(data?.items);
      if (!items.length) return NextResponse.json({ error: "估算失败" }, { status: 500 });
      return NextResponse.json({ items });
    }

    /* ── what to eat next ── */
    if (body.mode === "suggest") {
      const c = body;
      const data = await ask(client, `你是一位亲切的营养师，用户正在减脂，每日热量目标 ${num(c.goal)} kcal。
今天已摄入：${num(c.eaten?.calories)} kcal，蛋白质 ${num(c.eaten?.protein)}g，碳水 ${num(c.eaten?.carbs)}g，脂肪 ${num(c.eaten?.fat)}g。
刚吃的这一餐是：${String(c.lastMeal ?? "").slice(0, 120)}。
${c.flags?.length ? `营养提醒：${(c.flags as string[]).join("、")}。` : ""}
下一餐是「${String(c.nextMeal ?? "下一餐")}」，建议热量约 ${num(c.budget)} kcal。
请推荐 3 个具体、常见、容易买到或做到的中式餐食搭配，每个都要接近这个热量，并针对营养提醒做调整（例如补蛋白、少油）。
只返回如下 JSON，不要任何额外文字：
{ "ideas": [ { "name": "餐食搭配（15字以内）", "kcal": 整数, "why": "一句话理由（20字以内）" } ], "tip": "一句温柔的小提醒（25字以内）" }`, 600);
      const ideas = Array.isArray(data?.ideas)
        ? (data!.ideas as { name?: unknown; kcal?: unknown; why?: unknown }[])
            .filter(i => typeof i?.name === "string")
            .slice(0, 3)
            .map(i => ({ name: String(i.name).slice(0, 24), kcal: Math.round(num(i.kcal)), why: String(i.why ?? "").slice(0, 40) }))
        : [];
      if (!ideas.length) return NextResponse.json({ error: "建议生成失败" }, { status: 500 });
      return NextResponse.json({ ideas, tip: typeof data?.tip === "string" ? data.tip.slice(0, 50) : "" });
    }

    /* ── recognise a photo, food by food ── */
    const { imageBase64, mimeType } = body;
    if (!imageBase64) return NextResponse.json({ error: "No image" }, { status: 400 });
    const data = await ask(client, [
      { type: "image", source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: imageBase64 } },
      { type: "text", text: `请分析这张食物图片，逐一识别每种食物，估算每种食物的可食用重量和营养成分。
同类小份可以合并（例如“烤肉串”）。最多 8 项。
只返回如下 JSON，不要任何额外文字：
{ "items": [ ${ITEM_SCHEMA} ] }
单位：grams=克，calories=kcal，protein/carbs/fat=克，全部为数字。
如果看不清或不是食物，返回 { "error": "无法识别食物" }` },
    ]);
    if (data?.error) return NextResponse.json({ error: String(data.error) }, { status: 422 });
    const items = cleanItems(data?.items);
    if (!items.length) return NextResponse.json({ error: "解析失败" }, { status: 500 });
    const sum = (k: keyof Omit<Item, "name">) => Math.round(items.reduce((s, i) => s + i[k], 0));
    return NextResponse.json({
      items,
      foods: items.map(i => i.name).join("、"),
      calories: sum("calories"), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat"),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("analyze-food error:", msg);
    return NextResponse.json({ error: `分析失败: ${msg.slice(0, 100)}` }, { status: 500 });
  }
}
