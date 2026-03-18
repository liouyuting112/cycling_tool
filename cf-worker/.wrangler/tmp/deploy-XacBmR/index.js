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
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const apiKey = env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
      });
    }
    try {
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const modelsData = await modelsRes.json();
      let modelName = "models/gemini-pro";
      if (modelsData.models) {
        const found = modelsData.models.find(
          (m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
        );
        if (found) modelName = found.name;
      }
      const body = await request.text();
      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const responseBody = await response.text();
      return new Response(responseBody, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": corsOrigin
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Proxy error: " + e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
