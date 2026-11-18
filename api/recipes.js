export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Recipe service is not configured. Add ANTHROPIC_API_KEY in your Vercel project environment variables."
    });
  }

  try {
    const { system, prompt } = req.body || {};
    if (typeof system !== "string" || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Please provide ingredients and recipe preferences." });
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1800,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Anthropic API error:", data);
      return res.status(502).json({
        error: data?.error?.message || "The recipe AI could not respond. Please try again."
      });
    }

    const content = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!content) {
      return res.status(502).json({ error: "The recipe AI returned an empty response. Please retry." });
    }

    return res.status(200).json({ content });
  } catch (error) {
    console.error("Recipe API route error:", error);
    return res.status(500).json({ error: "Unable to generate recipes right now. Please retry." });
  }
}
