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
        error: "Message is required"
      });
    }

    const lowerMsg = message.toLowerCase();

    /* ---------------- SMART INTENT DETECTION ---------------- */

    const isDirectRecipeRequest =
      lowerMsg.includes("recipe") ||
      lowerMsg.includes("how to make") ||
      lowerMsg.includes("how do i make") ||
      lowerMsg.includes("cook") ||
      lowerMsg.includes("prepare");

    const looksLikeIngredients =
      message.includes(",") &&
      message.split(",").length >= 2;

    const isRecipeRequest =
      isDirectRecipeRequest && !looksLikeIngredients;

    let systemPrompt = "";

    if (isRecipeRequest) {
      /* -------- FULL RECIPE MODE -------- */
      systemPrompt = `
You are a professional chef AI.

Return ONLY valid JSON.

Format strictly like this:

{
  "name": "Dish Name",
  "ingredients": ["item 1", "item 2"],
  "steps": ["step 1", "step 2"],
  "tips": ["tip 1", "tip 2"]
}

Do not write explanations.
Do not write text outside JSON.
`;
    } else {
      /* -------- INGREDIENT SUGGESTION MODE -------- */
      systemPrompt = `
You are a professional chef AI.

User will provide ingredients.

Return ONLY valid JSON in this format:

{
  "dishes": [
    "Dish 1",
    "Dish 2",
    "Dish 3",
    "Dish 4",
    "Dish 5"
  ]
}

Do not write explanations.
Do not write text outside JSON.
`;
    }

    /* ---------------- CALL OLLAMA ---------------- */

    const ollamaResponse = await fetch(
      "http://localhost:11434/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3",
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          options: {
            temperature: 0,
            top_p: 0.1
          }
        })
      }
    );

    if (!ollamaResponse.ok) {
      const text = await ollamaResponse.text();
      console.error("Ollama Error:", text);
      return res.status(500).json({
        error: "Ollama API failed"
      });
    }

    const data = await ollamaResponse.json();
    let raw = data?.message?.content ?? "";

    raw = raw.trim();

    /* -------- REMOVE MARKDOWN JSON BLOCKS IF PRESENT -------- */
    if (raw.startsWith("```")) {
      raw = raw.replace(/```json/g, "")
               .replace(/```/g, "")
               .trim();
    }

    /* -------- VALIDATE JSON -------- */
    try {
      const parsed = JSON.parse(raw);

      return res.json({
        reply: JSON.stringify(parsed)
      });
    } catch (err) {
      console.error("Invalid JSON from LLM:", raw);
      return res.status(500).json({
        error: "AI returned invalid JSON"
      });
    }

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ AI API running at http://localhost:${PORT}`);
});