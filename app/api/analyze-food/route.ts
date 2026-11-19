import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { findFood, nutritionOf, foodListForPrompt } from "@/lib/foods";
import { redis } from "@/lib/redis";

// Opus answers take longer than the small models.
export const maxDuration = 60;

/**
 * Photos and meal ideas: Opus (best recognition and advice), falling back to Sonnet if a call fails.
 * Simple estimates for hand-added foods: the fast model.
 */
const MODEL_VISION = "claude-opus-5-5";
const MODEL_IDEAS = "claude-opus-5-5";
const MODEL_FALLBACK = "claude-sonnet-5-5";
const MODEL_FAST = "claude-haiku-4-5-20251001";
/** Bump to drop cached photo results after changing the prompt or the food table. */
const CACHE_VERSION = "v2"; // v2: Opus
const CACHE_DAYS = 30;

interface Item {
  name: string; grams: number; unit: string; count: number;
  calories: number; protein: number; carbs: number; fat: number;
  /** true when the food is not in the reference table and the AI guessed its nutrition */
  estimated: boolean;
}

const UNIT_RULES = `unit 用普通人数得清的生活单位：能一个个数的用 串/只/个/块/片/根，米饭面条粥用 碗，饮料用 杯，炒菜、拼盘等数不清的用 份。count 是数量，可以是 0.5 的倍数。`;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
}

/** First field present among `keys` (the compact names the AI now uses, or the long ones). */
function pick(a: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (a[k] !== undefined && a[k] !== null) return a[k];
  return undefined;
}

/**
 * Turn the AI's compact answer into full items.
 *   table food:    { "ref": "米饭", "count": 1 }  (+ "name" when the photo calls it something else)
 *   other food:    { "name": "孜然烤羊排", "unit": "块", "count": 2, "grams": 200, "kcal": 520, "p": 34, "c": 2, "f": 42 }
 * A table food takes its unit, grams (count × standard portion) and nutrition from the
 * table; anything else keeps the AI's estimate and is marked estimated. The result has
 * the same shape as before, so the app and saved records are unaffected.
 */
function toItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(i => i && typeof i === "object")
    .map(i => {
      const a = i as Record<string, unknown>;
      const refName = typeof a.ref === "string" ? a.ref : "";
      const ref = (refName && findFood(refName)) || (typeof a.name === "string" && findFood(a.name)) || null;
      const name = String((typeof a.name === "string" && a.name.trim()) || refName || "").trim().slice(0, 30);
      const count = num(a.count) > 0 ? Math.min(99, Math.round(num(a.count) * 2) / 2) : 1;
      const aiUnit = typeof a.unit === "string" && a.unit.trim() ? a.unit.trim().slice(0, 2) : "";
      const aiGrams = num(a.grams);
      if (ref) {
        // Counted in the table's unit → standard portion. If the AI used another unit and gave grams, trust those grams.
        const sameUnit = !aiUnit || aiUnit === ref.unit;
        const grams = sameUnit || !aiGrams ? count * ref.unitGrams : aiGrams;
        return { name, unit: sameUnit ? ref.unit : aiUnit, count, grams: Math.round(grams), ...nutritionOf(ref, grams), estimated: false };
      }
      return {
        name, unit: aiUnit || "份", count, grams: Math.round(aiGrams || 100),
        calories: Math.round(num(pick(a, "kcal", "calories"))),
        protein: num(pick(a, "p", "protein")), carbs: num(pick(a, "c", "carbs")), fat: num(pick(a, "f", "fat")),
        estimated: true,
      };
    })
    .filter(i => i.name);
}

function parseJson(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

/**
 * Claude Opus 5.5 / Sonnet 5.5 reject sampling parameters (temperature, top_p, top_k)
 * with a 400 error, so they are only sent to the older fast model. Repeatable photo
 * results come from the fingerprint cache instead.
 */
const acceptsTemperature = (m: string) => m === MODEL_FAST;

/** Try the model, then each fallback in turn (e.g. Opus → Sonnet → Haiku) until one answers. */
async function ask(client: Anthropic, content: Anthropic.MessageParam["content"], maxTokens = 1024, model = MODEL_FAST, temperature = 0) {
  const chain = [model, MODEL_FALLBACK, MODEL_FAST].filter((m, i, all) => all.indexOf(m) === i && (i === 0 || m !== model));
  let lastError: unknown;
  for (const m of chain.slice(chain.indexOf(model))) {
    try {
      const response = await client.messages.create({
        model: m, max_tokens: maxTokens, messages: [{ role: "user", content }],
        ...(acceptsTemperature(m) ? { temperature } : {}),
      });
      const block = response.content.find(b => b.type === "text");
      return parseJson(block && block.type === "text" ? block.text : "");
    } catch (e) {
      lastError = e;
      console.error(`analyze-food: ${m} failed:`, e instanceof Error ? e.message : e);
    }
  }
  throw lastError;
}

/** What the AI writes back: as little as possible (output length is most of the wait). */
const ITEM_SCHEMA = `表里有的：{"ref": "表里的名字", "count": 数量}（照片里叫法不同时再加 "name"）；表里没有的：{"name": "食物名", "unit": "单位", "count": 数量, "grams": 总克数, "kcal": 热量, "p": 蛋白质克, "c": 碳水克, "f": 脂肪克}`;
const TABLE_RULES = `参考表（名字(单位)）：${foodListForPrompt()}
规则：
1. 表里有的食物：ref 写表里的名字，按表里括号中的单位数 count，不要写其他字段，系统会按标准份量计算。
2. 表里没有的食物：写 name、unit、count，并按常见做法估算 grams 和营养（营养对应总克数）。
3. ${UNIT_RULES}
4. 输出紧凑 JSON，不要换行和多余空格。`;

const sumOf = (items: Item[], k: "calories" | "protein" | "carbs" | "fat") => Math.round(items.reduce((s, i) => s + i[k], 0));

/**
 * POST /api/analyze-food
 *   { imageBase64, mimeType }                    → { items, foods, calories, protein, carbs, fat, cached? }
 *   { mode: "estimate", items: [{name, count, unit}] } → { items }   (nutrition for hand-added foods)
 *   { mode: "suggest", targets, eaten, meals, exclude?, recent?, … } → { budget, analysis, ideas: [{name, kcal, protein, why, estimated}], tip }
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key 未配置，请联系管理员" }, { status: 500 });
    const client = new Anthropic({ apiKey });
    const body = await req.json();

    /* ── nutrition for foods the user typed in ── */
    if (body.mode === "estimate") {
      const wanted = (Array.isArray(body.items) ? body.items : []).slice(0, 10)
        .map((i: { name?: unknown; count?: unknown; unit?: unknown }) => ({
          name: String(i.name ?? "").trim().slice(0, 30), count: num(i.count) || 1, unit: String(i.unit ?? "份").slice(0, 2),
        }))
        .filter((i: { name: string }) => i.name);
      if (!wanted.length) return NextResponse.json({ error: "No items" }, { status: 400 });
      // Foods in the table need no AI call at all.
      const known = wanted.every((i: { name: string; unit: string }) => findFood(i.name)?.unit === i.unit);
      if (known) return NextResponse.json({ items: toItems(wanted) });
      const data = await ask(client, `请估算下面每种食物在给定数量下的重量和营养成分（按常见中式做法和常见分量估算）：
${wanted.map((i: { name: string; count: number; unit: string }) => `${i.name}：${i.count} ${i.unit}`).join("\n")}
unit 和 count 保持给定的值。只返回如下 JSON，不要任何额外文字：
{"items":[…]}，每一项的写法——${ITEM_SCHEMA}
${TABLE_RULES}`);
      const items = toItems(data?.items);
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
      // Dishes already shown that the user skipped ("换一批").
      const exclude = (Array.isArray(c.exclude) ? c.exclude : []).map((x: unknown) => String(x).slice(0, 30)).slice(-12);
      // Ideas shown for earlier meals in the last few days, so suggestions don't repeat day to day.
      const recent = (Array.isArray(c.recent) ? c.recent : []).map((x: unknown) => String(x).slice(0, 30)).slice(-20);
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
2. 给 3 个不同的中国菜搭配（家常菜、食堂或外卖都能买到）。每个搭配由 2–4 样组成，每样必须从下面的参考表里选（ref 填表里的名字），count 用表里的单位计数（可以是 0.5 的倍数）；系统会按参考表算热量和蛋白质，所以你不用自己算。name 里写清分量，只用“一碗、一份、一个、半碗”这样的生活单位，不要出现克数。
   3 个搭配的主食和做法要互不相同（比如一个米饭、一个面、一个粥或杂粮），蛋白质来源也要不同（比如一个鱼虾、一个鸡肉或牛肉、一个蛋或豆制品）。
${exclude.length ? `   用户刚看过并且不想吃这些：${exclude.join("；")}。这次换成完全不同的菜（换主要食材和做法，不要只换配菜）。\n` : ""}${recent.length ? `   最近几天已经推荐过：${recent.join("；")}。尽量不要重复这些菜。\n` : ""}   蛋白质吃到或超过目标是好事，不要当成问题；需要控制的是热量和脂肪。
3. 根据今天吃过的东西避开重复，按偏好调整，结合已摄入的脂肪和蛋白质情况说明理由。
4. analysis：一句话点评今天到目前的摄入（具体到数字，20 字以内，语气友好，不要用“严重”这类吓人的词）。

只返回如下 JSON，不要任何额外文字：
{"budget":整数,"analysis":"…","ideas":[{"name":"菜名+分量（18字以内）","parts":[["参考表里的名字",数量]],"why":"理由（15字以内）"}],"tip":"一句鼓励（15字以内）"}
输出紧凑 JSON，不要换行和多余空格；不用写热量和蛋白质，系统会算。

参考表（名字(单位)）：${foodListForPrompt()}`, 1200, MODEL_IDEAS, 0.8);
      const ideas = Array.isArray(data?.ideas)
        ? (data!.ideas as { name?: unknown; parts?: unknown; kcal?: unknown; protein?: unknown; why?: unknown }[])
            .filter(i => typeof i?.name === "string")
            .slice(0, 3)
            .map(i => {
              // Calories and protein come from the reference table, not from the model.
              // parts: [["清蒸鱼", 1], ["米饭", 0.5]] (compact) or [{ ref, count }]
              const parts = (Array.isArray(i.parts) ? i.parts : []) as unknown[];
              const refs = parts.map(pt => {
                const [r, n] = Array.isArray(pt) ? pt : [(pt as { ref?: unknown })?.ref, (pt as { count?: unknown })?.count];
                return { f: typeof r === "string" ? findFood(r) : null, count: num(n) || 1 };
              });
              const allKnown = refs.length > 0 && refs.every(r => r.f);
              const n = allKnown
                ? refs.reduce((acc, r) => { const v = nutritionOf(r.f!, r.count * r.f!.unitGrams); return { kcal: acc.kcal + v.calories, protein: acc.protein + v.protein }; }, { kcal: 0, protein: 0 })
                : { kcal: num(i.kcal), protein: num(i.protein) };
              return { name: String(i.name).slice(0, 28), kcal: Math.round(n.kcal), protein: Math.round(n.protein), why: String(i.why ?? "").slice(0, 40), estimated: !allKnown };
            })
            .filter(i => i.kcal > 0)
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

    // The same photo always gets the same answer (and costs one AI call).
    const db = redis();
    const cacheKey = `food:${CACHE_VERSION}:${createHash("sha256").update(String(imageBase64)).digest("hex")}`;
    if (db) {
      try {
        const hit = await db.get(cacheKey);
        if (hit) return NextResponse.json({ ...(typeof hit === "string" ? JSON.parse(hit) : hit), cached: true });
      } catch (e) { console.error("analyze-food cache read", e); }
    }

    const data = await ask(client, [
      { type: "image", source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: imageBase64 } },
      { type: "text", text: `请识别这张照片里的每一种食物，并数清分量。同类小份可以合并（例如“烤肉串 6 串”）。最多 8 项。
${TABLE_RULES}
只返回如下 JSON，不要任何额外文字：
{"items":[…]}，每一项的写法——${ITEM_SCHEMA}
如果看不清或不是食物，返回 { "error": "无法识别食物" }` },
    ], 1500, MODEL_VISION);
    if (data?.error) return NextResponse.json({ error: String(data.error) }, { status: 422 });
    const items = toItems(data?.items);
    if (!items.length) return NextResponse.json({ error: "解析失败" }, { status: 500 });
    const result = {
      items,
      foods: items.map(i => i.name).join("、"),
      calories: sumOf(items, "calories"), protein: sumOf(items, "protein"), carbs: sumOf(items, "carbs"), fat: sumOf(items, "fat"),
    };
    if (db) {
      try { await db.set(cacheKey, JSON.stringify(result), { ex: CACHE_DAYS * 86400 }); } catch (e) { console.error("analyze-food cache write", e); }
    }
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("analyze-food error:", msg);
    return NextResponse.json({ error: `分析失败: ${msg.slice(0, 100)}` }, { status: 500 });
  }
}
