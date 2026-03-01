import { useState, useRef, useEffect } from "react";
import "./App.css";

/* ---------------- RECIPE PARSER ---------------- */
function parseRecipe(text) {
  if (!text || !text.toLowerCase().includes("dish")) return null;

  const extract = (start, endList) => {
    const lower = text.toLowerCase();
    const startIndex = lower.indexOf(start);

    if (startIndex === -1) return "";

    let endIndex = text.length;

    endList.forEach((e) => {
      const i = lower.indexOf(e);
      if (i > startIndex && i < endIndex) endIndex = i;
    });

    return text.substring(startIndex + start.length, endIndex).trim();
  };

  const dish = extract("dish:", ["ingredients:", "steps:", "tips:"]);

  const ingredients = extract("ingredients:", ["steps:", "tips:"])
    .split("\n")
    .map((i) => i.replace(/[-•]/g, "").trim())
    .filter(Boolean);

  const steps = extract("steps:", ["tips:"])
    .split("\n")
    .map((s) => s.replace(/^\d+[).\s]*/, "").trim())
    .filter(Boolean);

  const tips = extract("tips:", [])
    .split("\n")
    .map((t) => t.replace(/[-•]/g, "").trim())
    .filter(Boolean);

  return { dish, ingredients, steps, tips };
}
/* ---------------- COMPONENT ---------------- */

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI cooking assistant. Tell me what ingredients you have, and I'll suggest delicious recipes you can make!"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatRef = useRef(null);

  /* AUTO SCROLL */
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const updated = [...messages, { role: "user", content: input }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });

      const data = await res.json();

      setMessages([
        ...updated,
        { role: "assistant", content: data.reply }
      ]);
    } catch (err) {
      setMessages([
        ...updated,
        { role: "assistant", content: "⚠️ Server error. Try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      <header className="header">
        🍳 AI Cooking Assistant
      </header>

      <main className="chat" ref={chatRef}>
        {messages.map((m, i) => {
          const recipe = parseRecipe(m.content);

          return (
            <div key={i} className={`message ${m.role}`}>
              {recipe ? (
                <div className="recipe-card">
                  <h2>🍲 {recipe.dish}</h2>

                  <div className="section">
                    <h3>Ingredients</h3>
                    <ul>
                      {recipe.ingredients.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="section">
                    <h3>Steps</h3>
                    <ol>
                      {recipe.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="section">
                    <h3>Tips</h3>
                    <ul>
                      {recipe.tips.map((tip, idx) => (
                        <li key={idx}>✅ {tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                m.content
              )}
            </div>
          );
        })}

        {loading && (
          <div className="message assistant typing">
            🤖 Cooking...
          </div>
        )}
      </main>

      <footer className="input-area">
        <textarea
          placeholder="E.g., I have chicken, tomato and rice..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button onClick={sendMessage} disabled={loading}>
          ➤
        </button>

        <div className="hint">
          Press Enter to send • Shift+Enter for new line
        </div>
      </footer>
    </div>
  );
}

export default App;