import express from "express";
import cors from "cors";

// ⚠️ Node 18+ already supports fetch
// REMOVE node-fetch installation if using Node >=18

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

//     const systemPrompt = `
// You are a cooking assistant.
// Return ONLY the recipe content.
// Use clear line breaks.
// Do not write explanations.
// `;

const systemPrompt = `
You are a cooking assistant.

Return recipe ONLY using this structure:

Dish:
<name>

Ingredients:
- item
- item

Steps:
1. step
2. step

Tips:
- tip
- tip

Do not write paragraphs.
Do not explain anything.
`;

    // ✅ Call Ollama
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

    // ✅ Handle Ollama errors
    if (!ollamaResponse.ok) {
      const text = await ollamaResponse.text();
      console.error("Ollama Error:", text);
      return res.status(500).json({
        error: "Ollama API failed"
      });
    }

    const data = await ollamaResponse.json();

    // ✅ Safe extraction
    let raw = data?.message?.content ?? "";

    // ✅ Normalize formatting
    const reply = raw
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    res.json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ OWN AI API running at http://localhost:${PORT}`);
});