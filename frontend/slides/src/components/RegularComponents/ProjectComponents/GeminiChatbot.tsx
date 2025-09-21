import React, { useMemo, useState } from "react"
import { urlbackend } from "../../../config.js"

type ChatMsg = { role: "user" | "assistant"; content: string }
type AutoAction = "off" | "insert" | "replace"

function extractFirstCodeBlock(s: string): { lang?: string; code: string } | null {
  const m = s.match(/```(\w+)?\s*([\s\S]*?)```/)
  if (!m) return null
  return { lang: m[1]?.toLowerCase(), code: m[2].trim() }
}

function looksLikeHTML(doc: string): boolean {
  const s = doc.trim()
  if (!s.startsWith("<")) return false
  return /<html[\s>]/i.test(s) || /<!doctype html>/i.test(s) || /<section[\s>]/i.test(s)
}

function normalizeLLMText(data: any): string {
  const fromCandidates =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text)?.filter(Boolean)?.join("\n")
  return fromCandidates || data?.text || "No response"
}

function classifyPrompt(msg: string): "slides" | "code" | "chat" {
  const s = msg.toLowerCase()
  const slidesHints = ["slides", "slide deck", "presentation", "deck"]
  if (slidesHints.some((k) => s.includes(k)) && (s.includes("html") || s.includes("web"))) return "slides"
  const codeVerbs = ["generate", "create", "write", "build", "implement", "refactor", "convert"]
  const langs = ["html", "css", "javascript", "typescript", "react", "tsx", "jsx", "python", "java", "c#", "php", "go", "rust", "sql", "tailwind", "component"]
  const codeWords = ["snippet", "function", "component", "layout", "api", "endpoint", "hook"]
  const looksCodey = /<\w+[^>]*>/.test(msg) || /function\s*\(|class\s+\w+/.test(msg)
  if (looksCodey || codeVerbs.some((v) => s.includes(v)) || langs.some((l) => s.includes(l)) || codeWords.some((w) => s.includes(w))) return "code"
  return "chat"
}

async function createSlidesBulk(apiBase: string, projectId: string, slides: { html: string }[]) {
  const token = localStorage.getItem("token")
  const res = await fetch(`${apiBase}/projects/${projectId}/slides/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ slides }),
  })
  if (!res.ok) {
    throw new Error((await res.json().catch(() => ({}))).message || "Failed to create slides")
  }
  return res.json()
}

function htmlToSlides(html: string): string[] {
  const parts = html.split(/<section(?=\s|>)/i)
  if (parts.length > 1) {
    const slides: string[] = []
    for (let i = 1; i < parts.length; i++) {
      const chunk = "<section" + parts[i]
      const closeIdx = chunk.toLowerCase().lastIndexOf("</section>")
      slides.push(closeIdx >= 0 ? chunk.slice(0, closeIdx + 10) : chunk)
    }
    return slides.map(s => s.trim()).filter(Boolean)
  }
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const inner = bodyMatch ? bodyMatch[1] : html
  const wrapped = `
    <section class="slide" style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto;color:#e5e7eb;background:#111827;padding:32px;border-radius:16px;">
      ${inner}
    </section>
  `
  return [wrapped]
}

export default function GeminiChatbot({
  setCode,
  code,
  projectId,
}: {
  setCode: (val: string | ((v: string) => string)) => void
  code?: string
  projectId?: string
}) {
  const [autoAction, setAutoAction] = useState<AutoAction>("off")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [k: string]: string }>({})
  const [customSystem, setCustomSystem] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const baseSystemInstruction = useMemo(() => {
    return [
      "Act like a technical assistant similar to GitHub Copilot.",
      "If the user asks for code, return a single markdown code block (```lang) with no extra text.",
      "If the user asks for HTML slides, return ONLY valid HTML (no markdown, no explanations).",
      "If the user just wants to chat, answer briefly and clearly in English.",
    ].join(" ")
  }, [])

  const systemInstruction = useMemo(() => {
    const extra = customSystem?.trim() ? ` ${customSystem.trim()}` : ""
    return baseSystemInstruction + extra
  }, [baseSystemInstruction, customSystem])

  const sendMessage = async () => {
    if (!input.trim()) return
    setErrors({})
    setSaveMsg(null)
    setLoading(true)
    const userMsg = input.trim()
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setInput("")
    try {
      const decision = classifyPrompt(userMsg)
      let message: string
      if (decision === "slides") {
        message = `Return ONLY valid HTML for a presentation (slides). No explanations, no markdown. Content: ${userMsg}`
      } else if (decision === "code") {
        message = ["Return a single markdown code block (```<language>) and nothing else.", "If the language is HTML and it makes sense, return a full document.", "", "Spec:", userMsg].join("\n")
      } else {
        message = userMsg
      }
      const body: any = { system: systemInstruction, mode: "auto", message, context: code ? code.slice(-12000) : undefined, history: messages.slice(-10) }
      const res = await fetch(`${urlbackend}/gemini`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) {
        setErrors({ form: data?.error || "Error connecting to Gemini" })
        return
      }
      const raw = normalizeLLMText(data)
      const codeBlock = extractFirstCodeBlock(raw)
      const htmlOnly = !codeBlock && looksLikeHTML(raw)
      let assistantTextToShow = raw
      let snippetToApply: string | null = null
      if (codeBlock) {
        assistantTextToShow = "```" + (codeBlock.lang || "") + "\n" + codeBlock.code + "\n```"
        snippetToApply = codeBlock.code
      } else if (htmlOnly) {
        assistantTextToShow = raw
        snippetToApply = raw
      }
      setMessages((prev) => [...prev, { role: "assistant", content: assistantTextToShow }])
      if (snippetToApply && autoAction !== "off") {
        if (autoAction === "insert") {
          setCode((prev: any) => (prev ? `${prev}\n${snippetToApply}` : snippetToApply))
        } else if (autoAction === "replace") {
          setCode(snippetToApply)
        }
      }
    } catch {
      setErrors({ form: "Connection error" })
    } finally {
      setLoading(false)
    }
  }

  const insertIntoEditor = (snippet: string) => {
    setCode((prev: any) => (prev ? `${prev}\n${snippet}` : snippet))
  }
  const replaceEditor = (snippet: string) => setCode(snippet)

  const findLastAssistantSnippet = (): string | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role !== "assistant") continue
      const block = extractFirstCodeBlock(m.content)
      if (block) return block.code
      if (looksLikeHTML(m.content)) return m.content
    }
    return null
  }

  const saveAssistantAsSlides = async () => {
    if (!projectId) {
      setSaveMsg("Missing project id")
      return
    }
    const snippet = findLastAssistantSnippet()
    if (!snippet) {
      setSaveMsg("No HTML to save")
      return
    }
    try {
      setSaving(true)
      setSaveMsg(null)
      const slides = htmlToSlides(snippet).map((html) => ({ html }))
      const created = await createSlidesBulk(urlbackend, projectId, slides)
      setSaveMsg(`Saved ${Array.isArray(created) ? created.length : 0} slides`)
    } catch (e: any) {
      setSaveMsg(e?.message || "Failed to save slides")
    } finally {
      setSaving(false)
    }
  }

  const renderActionsForAssistant = (msg: string) => {
    const block = extractFirstCodeBlock(msg)
    const snippet = block ? block.code : looksLikeHTML(msg) ? msg : ""
    if (!snippet) return null
    const canSave = Boolean(projectId)
    return (
      <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <button onClick={() => insertIntoEditor(snippet)} className="rounded-md px-2 py-1 text-sm" style={{ background: "#2e7d32", color: "white", border: "none" }}>
          Insert
        </button>
        <button onClick={() => replaceEditor(snippet)} className="rounded-md px-2 py-1 text-sm" style={{ background: "#1565c0", color: "white", border: "none" }}>
          Replace
        </button>
        <button onClick={() => navigator.clipboard.writeText(snippet)} className="rounded-md px-2 py-1 text-sm" style={{ background: "#424242", color: "white", border: "none" }}>
          Copy
        </button>
        <button onClick={saveAssistantAsSlides} disabled={!canSave || saving} className="rounded-md px-2 py-1 text-sm" style={{ background: canSave ? "#9c27b0" : "#5e5e5e", color: "white", border: "none", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save as slides"}
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: 380, maxWidth: "100vw", height: "100vh", background: "#181818", color: "white", display: "flex", flexDirection: "column", borderLeft: "1px solid #333", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 12, borderBottom: "1px solid #333" }}>
        <button onClick={() => setShowSettings((v) => !v)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #444", cursor: "pointer", background: "#222", color: "#ddd", fontWeight: 700 }}>
          Settings
        </button>
        <label style={{ fontSize: 12, color: "#9e9e9e" }}>
          Auto-apply:&nbsp;
          <select value={autoAction} onChange={(e) => setAutoAction(e.target.value as AutoAction)} style={{ background: "#222", color: "white", border: "1px solid #444", borderRadius: 6, padding: "4px 6px" }}>
            <option value="off">Off</option>
            <option value="insert">Insert</option>
            <option value="replace">Replace</option>
          </select>
        </label>
      </div>

      {showSettings && (
        <div style={{ padding: 12, borderBottom: "1px solid #333" }}>
          <div style={{ fontSize: 12, color: "#9e9e9e", marginBottom: 6 }}>Custom system instructions (optional)</div>
          <textarea value={customSystem} onChange={(e) => setCustomSystem(e.target.value)} rows={3} style={{ width: "100%", resize: "none", background: "#222", color: "white", borderRadius: 6, border: "1px solid #444", padding: 10 }} placeholder="e.g., Prefer Tailwind CSS, be concise, adopt a functional React style…" />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.map((msg, i) => {
          const isAssistant = msg.role === "assistant"
          const looksLikeCode = msg.content.includes("```") || looksLikeHTML(msg.content)
          return (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: "bold", color: isAssistant ? "#81c784" : "#4fc3f7", marginBottom: 4 }}>{isAssistant ? "Assistant" : "You"}</div>
              {looksLikeCode ? (
                <pre style={{ background: "#222", padding: 10, borderRadius: 6, whiteSpace: "pre-wrap", overflowX: "auto" }}>{msg.content}</pre>
              ) : (
                <div style={{ lineHeight: 1.4 }}>{msg.content}</div>
              )}
              {isAssistant && renderActionsForAssistant(msg.content)}
            </div>
          )
        })}
        {errors.form && <div style={{ color: "tomato" }}>{errors.form}</div>}
        {saveMsg && <div style={{ color: "#b39ddb", marginTop: 6 }}>{saveMsg}</div>}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid #333" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          style={{ width: "100%", resize: "none", background: "#222", color: "white", borderRadius: 6, border: "none", marginBottom: 8, padding: 10 }}
          placeholder="Type your request (the bot will auto-detect chat vs code vs slides)…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !loading) {
              e.preventDefault()
              sendMessage()
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) {
              e.preventDefault()
              sendMessage()
            }
          }}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ width: "100%", background: "#4fc3f7", color: "#181818", border: "none", borderRadius: 6, padding: 10, fontWeight: "bold" }}>
          {loading ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  )
}
