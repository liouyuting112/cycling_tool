// src/index.js
var index_default = {
  async fetch(request, env) {
    const allowedOrigins = [
      "https://liouyuting112.github.io",
      "http://localhost",
      "http://127.0.0.1"
    ];
    const origin = request.headers.get("Origin") || "";
    const isAllowed = allowedOrigins.some((o) => origin.startsWith(o));
    const corsOrigin = isAllowed ? origin : allowedOrigins[0];
    const commonHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: commonHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: commonHeaders });
    }
    const apiKey = env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_KEY not configured" }), {
        status: 500,
        headers: { ...commonHeaders, "Content-Type": "application/json" }
      });
    }
    try {
      const bodyText = await request.text();
      let body = {};
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
      }
      let usageCount = 0;
      if (env.CYCLING_KV) {
        const countStr = await env.CYCLING_KV.get("usage_count_v2") || "0";
        usageCount = parseInt(countStr);
        if (!body.ping) {
          usageCount += 1;
          await env.CYCLING_KV.put("usage_count_v2", usageCount.toString());
        }
      }
      if (body.ping) {
        return new Response(JSON.stringify({ usage_stats: { total_uses: usageCount } }), {
          headers: { ...commonHeaders, "Content-Type": "application/json" }
        });
      }
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const modelsData = await modelsRes.json();
      let modelName = "models/gemini-pro";
      if (modelsData.models) {
        const found = modelsData.models.find(
          (m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
        );
        if (found) modelName = found.name;
      }
      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyText
      });
      const responseData = await response.json();
      if (responseData.candidates || responseData.error) {
        responseData.usage_stats = { total_uses: usageCount };
      }
      return new Response(JSON.stringify(responseData), {
        status: response.status,
        headers: { ...commonHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Proxy error: " + e.message }), {
        status: 500,
        headers: { ...commonHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
