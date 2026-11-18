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
    const { system, prompt, mode, image } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Please provide a prompt." });
    }

    const isVision = mode === "vision";
    if (isVision && (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image))) {
      return res.status(400).json({ error: "Please upload a JPG, PNG or WebP fridge photo." });
    }
    if (isVision && image.length > 5_000_000) {
      return res.status(413).json({ error: "That image is too large. Please choose a smaller photo." });
    }

    const messages = isVision
      ? [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }]
      : [
          ...(typeof system === "string" && system.trim() ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt }
        ];

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: isVision ? "qwen/qwen3.8-27b" : "openai/gpt-oss-20b",
        messages,
        max_completion_tokens: isVision ? 1200 : 4096,
        ...(mode === "vision" || mode === "planner" ? { response_format: { type: "json_object" } } : {}),
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
