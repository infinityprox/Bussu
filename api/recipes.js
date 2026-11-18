export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Recipe service is not configured. Add GROQ_API_KEY in your Vercel project environment variables."
    });
  }

  try {
    const { system, prompt } = req.body || {};
    if (typeof system !== "string" || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Please provide ingredients and recipe preferences." });
    }

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 4096,
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Groq API error:", data);
      return res.status(502).json({
        error: data?.error?.message || "The recipe AI could not respond. Please try again."
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return res.status(502).json({ error: "The recipe AI returned an empty response. Please retry." });
    }

    return res.status(200).json({ content });
  } catch (error) {
    console.error("Groq API route error:", error);
    return res.status(500).json({ error: "Unable to generate recipes right now. Please retry." });
  }
}
