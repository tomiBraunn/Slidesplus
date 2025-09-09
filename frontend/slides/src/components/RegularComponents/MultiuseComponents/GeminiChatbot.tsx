import React, { useState } from "react";
import { urlbackend } from "./config.js";

type ChatMsg = { role: "user" | "assistant"; content: string };

function GeminiChatbot({ setCode }: { setCode: (val: string | ((v: string) => string)) => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const sendMessage = async () => {
    if (!input.trim()) return;
    setErrors({});
    setLoading(true);
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    try {
      const res = await fetch(`${urlbackend}/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Write only valid HTML code: ${userMsg}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ form: data?.error || "Error connecting to Gemini" });
        return;
      }
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text)
          ?.filter(Boolean)
          ?.join("\n") || "No response";
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
      setCode(prev => (prev ? `${prev}\n${text}` : text));
    } catch {
      setErrors({ form: "Connection error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: 350, height: "100%", background: "#181818", color: "white", display: "flex", flexDirection: "column", borderLeft: "1px solid #333" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: "bold", color: msg.role === "user" ? "#4fc3f7" : "#81c784" }}>
              {msg.role === "user" ? "You" : "Gemini"}
            </div>
            {msg.content.includes("```") ? (
              <pre style={{ background: "#222", padding: 8, borderRadius: 4, whiteSpace: "pre-wrap" }}>
                {msg.content}
              </pre>
            ) : (
              <div>{msg.content}</div>
            )}
          </div>
        ))}
        {errors.form && <div style={{ color: "red" }}>{errors.form}</div>}
      </div>
      <div style={{ padding: 16, borderTop: "1px solid #333" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={2}
          style={{ width: "100%", resize: "none", background: "#222", color: "white", borderRadius: 4, border: "none", marginBottom: 8 }}
          placeholder="Write your message..."
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && !loading && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ width: "100%", background: "#4fc3f7", color: "#181818", border: "none", borderRadius: 4, padding: 8, fontWeight: "bold" }}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default GeminiChatbot;
