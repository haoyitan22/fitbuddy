import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const MODEL = "claude-haiku-4-5-20251001";

interface Item { name: string; grams: number; unit: string; count: number; calories: number; protein: number; carbs: number; fat: number }

const ITEM_SCHEMA = `{"name": "食材名", "unit": "生活单位", "count": 数量, "grams": 总克数, "calories": kcal, "protein": 克, "carbs": 克, "fat": 克}`;

/** How to pick unit/count, shared by the photo and estimate prompts. */
const UNIT_RULES = `unit 用普通人数得清的生活单位：能一个个数的用 串/只/个/块/片/根（如烤肉串 6 串、鸡翅 4 只、虾 8 只、鸡蛋 1 个），米饭面条粥用 碗（可以是 0.5），饮料用 杯，炒菜、沙拉、拼盘等数不清的用 份（可以是 0.5）。
count 是数量，grams 是这些数量加起来的总克数，营养成分对应总克数。`;

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
      const unit = typeof it.unit === "string" && it.unit.trim() ? it.unit.trim().slice(0, 2) : "份";
      const count = num(it.count) > 0 ? Math.min(99, Math.round(num(it.count) * 2) / 2) : 1;
      return { name: it.name.trim().slice(0, 30), unit, count, grams: num(it.grams) || 100, calories: num(it.calories), protein: num(it.protein), carbs: num(it.carbs), fat: num(it.fat) };
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
 *   { mode: "estimate", items: [{name, count, unit}] } → { items }   (nutrition for hand-added foods)
 *   { mode: "suggest", targets, eaten, meals, … } → { budget, analysis, ideas: [{name, kcal, protein, why}], tip }
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
        .map((i: { name?: unknown; count?: unknown; unit?: unknown }) =>
          `${String(i.name ?? "").slice(0, 30)}：${num(i.count) || 1} ${String(i.unit ?? "份").slice(0, 2)}`)
        .join("\n");
      if (!wanted) return NextResponse.json({ error: "No items" }, { status: 400 });
      const data = await ask(client, `请估算下面每种食物在给定数量下的重量和营养成分（按常见中式做法和常见分量估算）：
${wanted}
${UNIT_RULES}
unit 和 count 保持给定的值。只返回如下 JSON，不要任何额外文字：
{ "items": [ ${ITEM_SCHEMA} ] }`);
      const items = cleanItems(data?.items);
      if (!items.length) return NextResponse.json({ error: "估算失败" }, { status: 500 });
      return NextResponse.json({ items });
    }

    /* ── what to eat next ── */
    if (body.mode === "suggest") {
      const c = body;
      const t = c.targets ?? {}, e = c.eaten ?? {}, p = c.profile ?? {};
      const goalKcal = num(t.calories) || 1500, goalP = num(t.protein) || 80, goalF = num(t.fat) || 45;
      const meals = (Array.isArray(c.meals) ? c.meals : []).slice(0, 4)
        .map((m: { label?: unknown; foods?: unknown; calories?: unknown; protein?: unknown }) =>
          `- ${String(m.label ?? "").slice(0, 6)}：${String(m.foods ?? "").slice(0, 120)}（${num(m.calories)} kcal，蛋白质 ${num(m.protein)}g）`)
        .join("\n");
      const prefs = (Array.isArray(c.prefs) ? c.prefs : []).map(String).slice(0, 5).join("、");
      const who = [
        p.gender === "male" ? "男" : p.gender === "female" ? "女" : "",
        num(p.age) ? `${num(p.age)}岁` : "",
        num(p.weight) ? `体重 ${num(p.weight)}kg` : "",
        num(p.targetWeight) ? `目标体重 ${num(p.targetWeight)}kg` : "",
      ].filter(Boolean).join("，");
      const data = await ask(client, `你是一位懂中国家常菜的注册营养师，正在给减脂用户安排下一餐。

用户：${who || "信息不全"}${prefs ? `；饮食偏好：${prefs}` : ""}
每日目标：热量 ${goalKcal} kcal，蛋白质 ${goalP}g，脂肪不超过 ${goalF}g。
今天已吃（含刚记录的这一餐）：
${meals || "- 暂无"}
合计：${num(e.calories)} kcal，蛋白质 ${num(e.protein)}g，碳水 ${num(e.carbs)}g，脂肪 ${num(e.fat)}g。
还剩：热量 ${goalKcal - num(e.calories)} kcal，蛋白质 ${Math.round(goalP - num(e.protein))}g，脂肪 ${Math.round(goalF - num(e.fat))}g（负数表示已超出）。
下一餐是「${String(c.nextMeal ?? "下一餐").slice(0, 8)}」，按剩余量粗算约 ${num(c.budget)} kcal，你可以根据实际情况调整。

要求：
1. 先定下一餐的热量预算 budget：优先补足蛋白质缺口；如果今天已经超标，不要让用户不吃，给一份低热量但能吃饱的方案（不低于 250 kcal）；如果下一餐是明天，按正常一餐安排。
2. 给 3 个不同的中国菜搭配（家常菜、食堂或外卖都能买到），每个写清分量，用“一碗、一份、一个、半碗”这样的生活单位，不要用克。每个搭配的热量接近 budget。
3. 根据今天吃过的东西避开重复，按偏好调整，结合已摄入的脂肪和蛋白质情况说明理由。
4. analysis：一句话点评今天到目前的摄入（具体到数字，25 字以内）。

只返回如下 JSON，不要任何额外文字：
{ "budget": 整数, "analysis": "…", "ideas": [ { "name": "菜名 + 分量（20字以内）", "kcal": 整数, "protein": 整数克, "why": "一句话理由（20字以内）" } ], "tip": "一句温柔的鼓励（20字以内）" }`, 800);
      const ideas = Array.isArray(data?.ideas)
        ? (data!.ideas as { name?: unknown; kcal?: unknown; protein?: unknown; why?: unknown }[])
            .filter(i => typeof i?.name === "string")
            .slice(0, 3)
            .map(i => ({ name: String(i.name).slice(0, 28), kcal: Math.round(num(i.kcal)), protein: Math.round(num(i.protein)), why: String(i.why ?? "").slice(0, 40) }))
        : [];
      if (!ideas.length) return NextResponse.json({ error: "建议生成失败" }, { status: 500 });
      const budget = Math.round(num(data?.budget));
      return NextResponse.json({
        ideas,
        budget: budget >= 150 && budget <= 1200 ? budget : null,
        analysis: typeof data?.analysis === "string" ? data.analysis.slice(0, 60) : "",
        tip: typeof data?.tip === "string" ? data.tip.slice(0, 50) : "",
      });
    }

    /* ── recognise a photo, food by food ── */
    const { imageBase64, mimeType } = body;
    if (!imageBase64) return NextResponse.json({ error: "No image" }, { status: 400 });
    const data = await ask(client, [
      { type: "image", source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: imageBase64 } },
      { type: "text", text: `请分析这张食物图片，逐一识别每种食物，估算每种食物的可食用重量和营养成分。
同类小份可以合并（例如“烤肉串”）。最多 8 项。
${UNIT_RULES}
只返回如下 JSON，不要任何额外文字：
{ "items": [ ${ITEM_SCHEMA} ] }
单位：grams=克，calories=kcal，protein/carbs/fat=克，全部为数字。
如果看不清或不是食物，返回 { "error": "无法识别食物" }` },
    ]);
    if (data?.error) return NextResponse.json({ error: String(data.error) }, { status: 422 });
    const items = cleanItems(data?.items);
    if (!items.length) return NextResponse.json({ error: "解析失败" }, { status: 500 });
    const sum = (k: "calories" | "protein" | "carbs" | "fat") => Math.round(items.reduce((s, i) => s + i[k], 0));
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
