import express from "express";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post("/api/assistant", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const lowerMessage = message.toLowerCase();

    let systemPrompt = "";

    /* ---------------- PROMPT LOGIC ---------------- */

    // 🍲 If user asks for full recipe
    if (
      lowerMessage.includes("recipe") ||
      lowerMessage.includes("how to make")
    ) {
      systemPrompt = `
You are a professional cooking assistant.

Return ONLY valid JSON in this format:

{
  "name": "Dish Name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "steps": ["step 1", "step 2", "step 3"],
  "tips": ["tip 1"]
}

Rules:
- Do NOT write explanations.
- Do NOT write text outside JSON.
- Keep steps clear and beginner-friendly.
- Minimum 4 cooking steps.
`;
    } 
    // 🥗 If user gives ingredients → suggest dishes
    else {
      systemPrompt = `
You are a professional cooking assistant.

User will provide ingredients.

Task:
- Suggest 5 DIFFERENT dishes.
- Be creative.
- Avoid repeating similar dish names.
- If ingredients are limited, still try to suggest possible dishes.

Return ONLY valid JSON in this format:

{
  "dishes": [
    "Dish Name 1",
    "Dish Name 2",
    "Dish Name 3",
    "Dish Name 4",
    "Dish Name 5"
  ]
}

Rules:
- Do NOT explain anything.
- Do NOT write text outside JSON.
`;
    }

    /* ---------------- CALL OLLAMA ---------------- */

    const ollamaResponse = await fetch(
      "http://localhost:11434/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3",
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          options: {
            temperature: 0.7,   // Increased creativity
            top_p: 0.9
          },
        }),
      }
    );

    if (!ollamaResponse.ok) {
      const text = await ollamaResponse.text();
      console.error("Ollama Error:", text);
      return res.status(500).json({
        error: "Ollama API failed",
      });
    }

    const data = await ollamaResponse.json();
    let raw = data?.message?.content ?? "";

    /* ---------------- CLEAN JSON ---------------- */

    raw = raw.trim();

    // Remove markdown blocks if model adds them
    raw = raw.replace(/```json|```/g, "").trim();

    // Extract JSON safely using regex
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("No valid JSON found:", raw);
      return res.json({
        reply: JSON.stringify({
          dishes: ["Unable to generate suggestions. Try again."],
        }),
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("Invalid JSON from model:", raw);
      return res.json({
        reply: JSON.stringify({
          dishes: ["AI response formatting error. Please retry."],
        }),
      });
    }

    /* ---------------- RETURN CLEAN JSON ---------------- */

    res.json({ reply: JSON.stringify(parsed) });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ OWN AI API running at http://localhost:${PORT}`);
});