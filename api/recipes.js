// Vercel serverless function: keep ANTHROPIC_API_KEY in Project Settings → Environment Variables.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "Recipe AI is not configured yet. Add ANTHROPIC_API_KEY to the server environment." });
  }

  try {
    const { system, prompt } = req.body || {};
    if (typeof system !== "string" || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Please provide ingredients and recipe preferences." });
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      const message = data?.error?.message || "The recipe service is temporarily unavailable.";
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: message });
    }

    const content = (data.content || [])
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n");
    if (!content) return res.status(502).json({ error: "The recipe service returned an empty response. Please retry." });

    return res.status(200).json({ content });
  } catch (error) {
    console.error("Pasi recipe endpoint error:", error);
    return res.status(500).json({ error: "Something went wrong while making recipes. Please retry." });
  }
}