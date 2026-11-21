// Online NPC chat using the current Gemini Interactions API.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "GEMINI_API_KEY is missing in Vercel Environment Variables. Add it and redeploy." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const npc = body.npc && typeof body.npc === "object" ? body.npc : {};
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 240) : "";
  if (!message) return res.status(400).json({ error: "Please enter a message." });

  const clean = value => typeof value === "string" ? value.replace(/[<>\u0000-\u001f]/g, " ").slice(0, 120) : "";
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const transcript = history
    .filter(item => item && typeof item.text === "string")
    .map(item => (item.role === "model" ? "NPC" : "PLAYER") + ": " + item.text.slice(0, 400))
    .join("\n");

  const systemInstruction = [
    "You are a friendly fictional pedestrian in the mobile game CityLife3D.",
    "Stay in character as this NPC. Reply naturally in 1 to 3 short sentences.",
    "Use the NPC profile and conversation history. Remember what the player said.",
    "Keep all replies suitable for a general audience. Do not claim to do real-world actions.",
    "NPC name: " + clean(npc.name),
    "Job: " + clean(npc.job),
    "Hobby: " + clean(npc.hobby),
    "Mood: " + clean(npc.mood),
    "Current activity: " + clean(npc.goal),
    "Life goal: " + clean(npc.lifeGoal),
    "Friendship level: " + String(Math.max(0, Math.min(100, Number(npc.friendship) || 0)))
  ].join("\n");

  const prompt = (transcript ? "Previous conversation:\n" + transcript + "\n\n" : "") + "PLAYER: " + message + "\nNPC:";
  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        system_instruction: systemInstruction,
        input: prompt,
        store: false
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const providerMessage = data && data.error && data.error.message ? data.error.message : "Gemini request failed.";
      console.error("Gemini NPC chat error:", upstream.status, providerMessage.slice(0, 500));
      return res.status(502).json({ error: "Gemini API " + upstream.status + ": " + providerMessage.slice(0, 220) });
    }

    const reply = (data.steps || [])
      .filter(step => step && step.type === "model_output" && Array.isArray(step.content))
      .flatMap(step => step.content)
      .filter(part => part && part.type === "text" && typeof part.text === "string")
      .map(part => part.text)
      .join("")
      .trim();

    if (!reply) {
      console.error("Gemini NPC chat returned no model_output text:", JSON.stringify(data).slice(0, 1200));
      return res.status(502).json({ error: "Gemini returned no text. Please try again." });
    }
    return res.status(200).json({ reply: reply.slice(0, 900) });
  } catch (error) {
    console.error("Gemini NPC chat connection error:", error && error.message);
    return res.status(502).json({ error: "Could not connect to Gemini. Check the Vercel deployment and internet connection." });
  }
};
