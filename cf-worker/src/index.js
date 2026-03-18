// Cloudflare Worker Proxy for Road Master v7.0
// API Key 儲存在 Cloudflare Secrets 中，前端完全看不到

export default {
    async fetch(request, env) {
        // 安全網域限制
        const allowedOrigins = [
            "https://liouyuting112.github.io",
            "http://localhost",
            "http://127.0.0.1"
        ];
        const origin = request.headers.get("Origin") || "";
        const isAllowed = allowedOrigins.some(o => origin.startsWith(o));
        const corsOrigin = (origin === "null" || !origin) ? "*" : (isAllowed ? origin : allowedOrigins[0]);

        const commonHeaders = {
            "Access-Control-Allow-Origin": corsOrigin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
        };

        // CORS 預檢
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: commonHeaders });
        }

        // 只接受 POST
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405, headers: commonHeaders });
        }

        // 從環境變數取得 API Key
        const apiKey = env.API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API_KEY not configured" }), {
                status: 500,
                headers: { ...commonHeaders, "Content-Type": "application/json" },
            });
        }

        try {
            const bodyText = await request.text();
            let body = {};
            try { body = JSON.parse(bodyText); } catch (e) { }

            // 流量計數器 (KV)
            let usageCount = 0;
            if (env.CYCLING_KV) {
                const countStr = await env.CYCLING_KV.get("usage_count_v2") || "0";
                usageCount = parseInt(countStr);

                // 只有非 Ping 且非 Share/Load 請求才增加 AI 計數
                if (!body.ping && !body.share_state && !body.load_id) {
                    usageCount += 1;
                    await env.CYCLING_KV.put("usage_count_v2", usageCount.toString());
                }
            }

            // 新增：分享行程
            if (body.share_state) {
                const id = Math.random().toString(36).substring(2, 8);
                await env.CYCLING_KV.put("itinerary_" + id, JSON.stringify(body.share_state));
                return new Response(JSON.stringify({ id }), {
                    headers: { ...commonHeaders, "Content-Type": "application/json" }
                });
            }

            // 新增：讀取行程
            if (body.load_id) {
                const state = await env.CYCLING_KV.get("itinerary_" + body.load_id);
                return new Response(JSON.stringify({ share_state: state ? JSON.parse(state) : null }), {
                    headers: { ...commonHeaders, "Content-Type": "application/json" }
                });
            }

            // 新增：AI Google 級別精選推薦
            if (body.ai_poi) {
                if (!apiKey) return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500, headers: commonHeaders });
                const prompt = `您是一位台灣單車環島專家。請根據從「${body.s}」到「${body.e}」的騎行路線，提供沿途最知名、Google評價最高且絕對真實存在的精選店家：3間美食(food)、3間在地特色或單車友善住宿(stay)、以及2間單車行/緊急補給(sos)。請嚴格只回傳 JSON 陣列格式，且不要包含任何 markdown 標記（如 \`\`\`json 等），格式範例：[{"name":"店家名稱","type":"food","desc":"一句推薦理由與特色","lat":23.5,"lon":121.3}] (經緯度請盡量準確估算)。`;
                
                try {
                    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=" + apiKey, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });
                    const aiData = await aiRes.json();
                    let text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
                    text = text.replace(/```json|```/g, '').trim();
                    return new Response(JSON.stringify({ poi: JSON.parse(text) }), {
                        headers: { ...commonHeaders, "Content-Type": "application/json" }
                    });
                } catch (e) {
                    return new Response(JSON.stringify({ error: "AI POI Generation Failed", details: e.message }), { status: 500, headers: commonHeaders });
                }
            }

            // 如果只是 Ping (初始化計數器用)，直接回傳
            if (body.ping) {
                return new Response(JSON.stringify({ usage_stats: { total_uses: usageCount } }), {
                    headers: { ...commonHeaders, "Content-Type": "application/json" }
                });
            }

            // 先偵測可用模型
            const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const modelsData = await modelsRes.json();

            let modelName = "models/gemini-pro"; // 預設
            if (modelsData.models) {
                const found = modelsData.models.find(m =>
                    m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
                );
                if (found) modelName = found.name;
            }

            // 轉發請求到 Google
            const targetUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

            const response = await fetch(targetUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: bodyText,
            });

            const responseData = await response.json();

            // 將計數器注入回傳結果
            if (responseData.candidates || responseData.error) {
                responseData.usage_stats = { total_uses: usageCount };
            }

            return new Response(JSON.stringify(responseData), {
                status: response.status,
                headers: { ...commonHeaders, "Content-Type": "application/json" },
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: "Proxy error: " + e.message }), {
                status: 500,
                headers: { ...commonHeaders, "Content-Type": "application/json" },
            });
        }
    },
};
