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
        const corsOrigin = isAllowed ? origin : allowedOrigins[0];

        // CORS 預檢
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": corsOrigin,
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        // 只接受 POST
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        // 從環境變數取得 API Key（不在前端）
        const apiKey = env.API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API_KEY not configured" }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin },
            });
        }

        try {
            const bodyText = await request.text();
            let body = {};
            try { body = JSON.parse(bodyText); } catch (e) { }

            // 流量計數器 (KV)
            let usageCount = 0;
            if (env.CYCLING_KV) {
                const countStr = await env.CYCLING_KV.get("usage_count") || "0";
                usageCount = parseInt(countStr) + 1;
                await env.CYCLING_KV.put("usage_count", usageCount.toString());
            }

            // 如果只是 Ping (初始化計數器用)，直接回傳
            if (body.ping) {
                return new Response(JSON.stringify({ usage_stats: { total_uses: usageCount } }), {
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
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

            // 將計數器注入回傳結果（或放在 Header）
            if (responseData.candidates) {
                responseData.usage_stats = { total_uses: usageCount };
            }

            return new Response(JSON.stringify(responseData), {
                status: response.status,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": corsOrigin,
                },
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: "Proxy error: " + e.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin },
            });
        }
    },
};
