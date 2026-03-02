import { useState, useRef, useEffect } from "react";
import "./App.css";

/* ---------------- RECIPE PARSER ---------------- */
function parseRecipe(content) {
  if (!content) return null;

  // ✅ Try parsing JSON first
  try {
    const json = JSON.parse(content);

    // Full recipe structure
    if (json.name && json.ingredients && json.steps) {
      return {
        dish: json.name,
        ingredients: json.ingredients,
        steps: json.steps,
        tips: json.tips || []
      };
    }

    // Dish suggestions structure
    if (json.dishes && Array.isArray(json.dishes)) {
      return { suggestions: json.dishes };
    }
  } catch (e) {
    // Not JSON → fallback
  }

  return null;
}

/* ---------------- COMPONENT ---------------- */

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI cooking assistant. Tell me what ingredients you have, and I'll suggest delicious dishes you can make!"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);

  const chatRef = useRef(null);

  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  /* AUTO SCROLL */
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, loading]);

  const sendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || input;

    if (!messageToSend.trim() || loading) return;

    const updated = [
      ...messages,
      { role: "user", content: messageToSend }
    ];

    setMessages(updated);
    setInput("");
    setLoading(true);
    setCurrentStep(null);

    try {
      const res = await fetch(`${API_URL}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend })
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
                recipe.suggestions ? (
                  /* ----------- Dish Suggestions ----------- */
                  <div className="recipe-card">
                    <h3>🍽 Suggested Dishes</h3>
                    <ul>
                      {recipe.suggestions.map((dish, idx) => (
                        <li key={idx}>
                          <button
                            className="suggestion-btn"
                            onClick={() =>
                              sendMessage(
                                `Give me full recipe for ${dish} in JSON format`
                              )
                            }
                          >
                            {dish}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  /* ----------- Full Recipe ----------- */
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

                    {recipe.tips.length > 0 && (
                      <div className="section">
                        <h3>Tips</h3>
                        <ul>
                          {recipe.tips.map((tip, idx) => (
                            <li key={idx}>✅ {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* -------- Cooking Mode -------- */}
                    <button
                      className="start-cooking-btn"
                      onClick={() => setCurrentStep(0)}
                    >
                      🍳 Start Cooking Mode
                    </button>

                    {currentStep !== null &&
                      recipe.steps[currentStep] && (
                        <div className="cooking-mode">
                          <h4>Step {currentStep + 1}</h4>
                          <p>{recipe.steps[currentStep]}</p>

                          <div className="cooking-controls">
                            <button
                              onClick={() =>
                                setCurrentStep((prev) =>
                                  prev > 0 ? prev - 1 : prev
                                )
                              }
                            >
                              ⬅ Previous
                            </button>

                            <button
                              onClick={() =>
                                setCurrentStep((prev) =>
                                  prev < recipe.steps.length - 1
                                    ? prev + 1
                                    : prev
                                )
                              }
                            >
                              Next ➡
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                )
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
        <button onClick={() => sendMessage()} disabled={loading}>
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