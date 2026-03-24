import { NextResponse } from "next/server";

type GeminiRequest = {
  days: number;
  startStation: string;
};

function extractCities(text: string): string[] {
  const match = text.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : text;
  try {
    const parsed = JSON.parse(jsonText) as { cities?: string[] };
    if (Array.isArray(parsed.cities)) {
      return parsed.cities.filter(Boolean).map((x) => x.trim());
    }
  } catch {
    // ignore and fallback
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "缺少 NEXT_PUBLIC_GEMINI_API_KEY" }, { status: 500 });
    }

    const body = (await req.json()) as GeminiRequest;
    const days = Math.max(3, Math.min(14, Number(body.days) || 7));
    const startStation = body.startStation || "台北車站";

    const prompt = `
你是台灣旅遊規劃助理。
請依照「${startStation}」出發，規劃 ${days} 天台灣環島停靠城市順序。
只回傳 JSON，格式必須是：
{
  "cities": ["城市1","城市2","城市3"]
}
規則：
1) 城市數量大約等於天數（可略少 1-2）。
2) 順序要符合環島方向，不要跳躍。
3) 城市名稱使用台灣常見城市名稱（例如 台北、桃園、新竹、台中、嘉義、台南、高雄、屏東、台東、花蓮、宜蘭）。
`;

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null = null;
    let lastError = "";
    let firstStatus = 0;
    for (const model of models) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );
      if (resp.ok) {
        data = (await resp.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        break;
      }
      if (!firstStatus) firstStatus = resp.status;
      const errText = await resp.text();
      lastError = `[${model}] ${resp.status} ${errText}`;
      // 若已命中配額/速率限制，直接回傳較準確訊息，避免被後續 404 模糊掉
      if (resp.status === 429) break;
    }
    if (!data) {
      const status = firstStatus || 500;
      return NextResponse.json({ error: `Gemini API 失敗: ${lastError}` }, { status });
    }

    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
    let cities = extractCities(text);

    if (cities.length === 0) {
      cities = ["台北", "台中", "高雄", "台東", "花蓮", "宜蘭"];
    }

    return NextResponse.json({ cities });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

