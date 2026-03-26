import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image" }, { status: 400 });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: imageBase64 },
            },
            {
              type: "text",
              text: `请分析这张食物图片，识别所有食物，并估算营养成分。
只返回如下 JSON 格式，不要任何额外文字：
{
  "foods": "食物1、食物2（简短列举）",
  "calories": 数字,
  "protein": 数字,
  "carbs": 数字,
  "fat": 数字
}
单位：calories=kcal，protein/carbs/fat=g，全部为整数。
如果看不清或不是食物，返回 { "error": "无法识别食物" }`,
            },
          ],
        },
      ],
    });

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "解析失败" }, { status: 500 });
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "分析失败，请重试" }, { status: 500 });
  }
}
