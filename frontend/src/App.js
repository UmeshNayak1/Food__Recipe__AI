import { useState, useRef, useEffect } from "react";
import "./App.css";

/* ---------------- RECIPE PARSER ---------------- */
function parseRecipe(content) {
  if (!content) return null;

  try {
    const json = JSON.parse(content);

    if (Array.isArray(json.dishes)) {
      return {
        type: "suggestions",
        suggestions: json.dishes.filter(Boolean)
      };
    }

    if (
      json.name &&
      Array.isArray(json.ingredients) &&
      Array.isArray(json.steps)
    ) {
      return {
        type: "recipe",
        dish: json.name,
        ingredients: json.ingredients,
        steps: json.steps,
        tips: json.tips || []
      };
    }
  } catch (error) {
    return null;
  }

  return null;
}

function App() {
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "👋 Hi! I'm your AI cooking assistant. Tell me what ingredients you have!"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);

  const chatRef = useRef(null);
  const API_URL = "http://localhost:5000";

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, loading]);

  const sendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || input;
    if (!messageToSend.trim() || loading) return;

    const updatedMessages = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: messageToSend
      }
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setCurrentStep(null);

    try {
      const response = await fetch(`${API_URL}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend })
      });

      const data = await response.json();

      setMessages([
        ...updatedMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply
        }
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "⚠️ Server error."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (message) => {
    const parsed = parseRecipe(message.content);
    if (!parsed) return <p>{message.content}</p>;

    /* ----------- Suggestions ----------- */
    if (parsed.type === "suggestions") {
      return (
        <div className="card">
          <h3>🍽 Suggested Dishes</h3>
          <div className="suggestions">
            {parsed.suggestions.map((dish) => (
              <button
                key={dish}
                className="chip"
                onClick={() =>
                  sendMessage(`Give me full recipe for ${dish}`)
                }
              >
                {dish}
              </button>
            ))}
          </div>
        </div>
      );
    }

    /* ----------- Recipe ----------- */
    if (parsed.type === "recipe") {
      return (
        <div className="card recipe">
          <h2>{parsed.dish}</h2>

          <div className="grid">
            <div>
              <h4>Ingredients</h4>
              <ul>
                {parsed.ingredients.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4>Steps</h4>
              <ol>
                {parsed.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={() => setCurrentStep(0)}
          >
            🍳 Start Cooking Mode
          </button>

          {currentStep !== null && (
            <div className="cooking-mode">
              <h4>
                Step {currentStep + 1} of {parsed.steps.length}
              </h4>
              <p>{parsed.steps[currentStep]}</p>

              <div className="controls">
                <button
                  onClick={() =>
                    setCurrentStep((prev) =>
                      prev > 0 ? prev - 1 : prev
                    )
                  }
                >
                  ⬅
                </button>

                <button
                  onClick={() =>
                    setCurrentStep((prev) =>
                      prev < parsed.steps.length - 1
                        ? prev + 1
                        : prev
                    )
                  }
                >
                  ➡
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return <p>{message.content}</p>;
  };

  return (
    <div className="app">
      <header>🍳 AI Cooking Assistant</header>

      <main className="chat" ref={chatRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role}`}
          >
            {renderMessageContent(message)}
          </div>
        ))}

        {loading && (
          <div className="message assistant typing">
            🤖 Thinking...
          </div>
        )}
      </main>

      <footer>
        <textarea
          placeholder="Type ingredients or dish name..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button onClick={() => sendMessage()}>
          ➤
        </button>
      </footer>
    </div>
  );
}

export default App;