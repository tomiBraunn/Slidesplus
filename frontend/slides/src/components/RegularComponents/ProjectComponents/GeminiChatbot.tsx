import React, { useMemo, useState, useEffect } from "react"
import { urlbackend } from "../../../config.js"

type ChatMsg = { role: "user" | "assistant"; content: string }

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
  const slidesHints = ["slides", "slide deck", "presentation", "deck", "slideshow", "diapositivas"]
  if (slidesHints.some((k) => s.includes(k))) return "slides"
  const codeVerbs = ["generate", "create", "write", "build", "implement", "refactor", "convert"]
  const langs = ["html", "css", "javascript", "typescript", "react", "tsx", "jsx", "python", "java", "c#", "php", "go", "rust", "sql", "tailwind", "component"]
  const codeWords = ["snippet", "function", "component", "layout", "api", "endpoint", "hook"]
  const looksCodey = /<\w+[^>]*>/.test(msg) || /function\s*\(|class\s+\w+/.test(msg)
  if (looksCodey || codeVerbs.some((v) => s.includes(v)) || langs.some((l) => s.includes(l)) || codeWords.some((w) => s.includes(w))) return "code"
  return "chat"
}

const SLIDES_SYSTEM_PROMPT = `You are an elite presentation designer specializing in modern, stunning visual designs. Create presentations that look professional and captivating. Use modern gradients, glassmorphism, system fonts, and high-quality Unsplash images. Return ONLY HTML <section> tags with inline styles.`

async function createSlidesBulk(apiBase: string, projectId: string, slides: { html: string }[]) {
  const token = localStorage.getItem("token")
  const res = await fetch(`${apiBase}/projects/${projectId}/slides`, {
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

function extractSlides(html: string): string[] {
  const sections = html.match(/<section[\s\S]*?<\/section>/gi)
  if (sections && sections.length > 0) return sections
  return [html]
}

export default function GeminiChatbot({
  setCode,
  code,
  projectId,
  currentSlideIndex,
  slides,
}: {
  setCode: (val: string | ((v: string) => string)) => void
  code?: string
  projectId?: string
  currentSlideIndex?: number
  slides?: string[]
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [errors, setErrors] = useState<{ [k: string]: string }>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setLoadingHistory(false)
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      setLoadingHistory(false)
      return
    }

    fetch(`${urlbackend}/projects/${projectId}/chat`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.messages) {
          setMessages(data.messages.map((m: any) => ({
            role: m.role,
            content: m.content
          })))
        }
      })
      .catch(err => console.error("Error loading chat history:", err))
      .finally(() => setLoadingHistory(false))
  }, [projectId])

  const saveMessage = async (role: "user" | "assistant", content: string) => {
    if (!projectId) return

    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await fetch(`${urlbackend}/projects/${projectId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role, content })
      })
    } catch (err) {
      console.error("Error saving message:", err)
    }
  }

  const baseSystemInstruction = useMemo(() => {
    return [
      "Act like a technical assistant similar to GitHub Copilot.",
      "If the user asks for code, return a single markdown code block (```lang) with no extra text.",
      "If the user asks for HTML slides, return ONLY valid HTML (no markdown, no explanations).",
      "If the user just wants to chat, answer briefly and clearly in English.",
    ].join(" ")
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return
    setErrors({})
    setSaveMsg(null)
    setLoading(true)
    const userMsg = input.trim()

    const newUserMessage = { role: "user" as const, content: userMsg }
    setMessages((prev) => [...prev, newUserMessage])
    await saveMessage("user", userMsg)

    setInput("")
    try {
      const decision = classifyPrompt(userMsg)
      let message: string
      let systemPrompt = baseSystemInstruction
      let contextToSend = code ? code.slice(-12000) : undefined

      if (slides && currentSlideIndex !== undefined && slides[currentSlideIndex]) {
        const currentSlide = slides[currentSlideIndex]
        systemPrompt = SLIDES_SYSTEM_PROMPT
        contextToSend = currentSlide
        message = `Edit this slide. Current slide HTML:\n${currentSlide}\n\nUser request: ${userMsg}\n\nReturn ONLY the modified <section> HTML, nothing else.`
      } else if (decision === "slides") {
        systemPrompt = SLIDES_SYSTEM_PROMPT
        message = `Create a presentation about: ${userMsg}. Include relevant images from Unsplash using keywords that match the topic. Use varied layouts.`
      } else if (decision === "code") {
        message = ["Return a single markdown code block (```<language>) and nothing else.", "If the language is HTML and it makes sense, return a full document.", "", "Spec:", userMsg].join("\n")
      } else {
        message = userMsg
      }

      const body: any = {
        system: systemPrompt,
        mode: "auto",
        message,
        context: contextToSend,
        history: messages.slice(-10)
      }

      const res = await fetch(`${urlbackend}/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

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

      const assistantMessage = { role: "assistant" as const, content: assistantTextToShow }
      setMessages((prev) => [...prev, assistantMessage])
      await saveMessage("assistant", assistantTextToShow)

      if (snippetToApply && slides && currentSlideIndex !== undefined) {
        replaceCurrentSlide(snippetToApply)
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

  const replaceCurrentSlide = (newSlideHtml: string) => {
    if (!slides || currentSlideIndex === undefined) return
    const updatedSlides = [...slides]
    updatedSlides[currentSlideIndex] = newSlideHtml
    const newDoc = `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${updatedSlides.join("\n")}</body></html>`
    setCode(newDoc)
  }

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
      const slidesList = extractSlides(snippet)
      const slidesToSave = slidesList.map((html) => ({ html }))
      await createSlidesBulk(urlbackend, projectId, slidesToSave)
      setSaveMsg(`Saved ${slidesToSave.length} slide${slidesToSave.length > 1 ? 's' : ''}`)
      replaceEditor(snippet)
    } catch (e: any) {
      setSaveMsg(e?.message || "Failed to save slides")
    } finally {
      setSaving(false)
    }
  }

  const clearChat = async () => {
    if (!projectId) return

    const token = localStorage.getItem("token")
    if (!token) return

    try {
      await fetch(`${urlbackend}/projects/${projectId}/chat`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages([])
    } catch (err) {
      console.error("Error clearing chat:", err)
    }
  }

  const renderActionsForAssistant = (msg: string) => {
    const block = extractFirstCodeBlock(msg)
    const snippet = block ? block.code : looksLikeHTML(msg) ? msg : ""
    if (!snippet) return null
    const canSave = Boolean(projectId)
    return (
      <div className="flex gap-2 mt-2 flex-wrap">
        <button
          onClick={() => insertIntoEditor(snippet)}
          className="px-3 py-1.5 text-xs font-medium bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
        >
          Insert
        </button>
        <button
          onClick={() => replaceEditor(snippet)}
          className="px-3 py-1.5 text-xs font-medium bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
        >
          Replace
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(snippet)}
          className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Copy
        </button>
        <button
          onClick={saveAssistantAsSlides}
          disabled={!canSave || saving}
          className="px-3 py-1.5 text-xs font-medium bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:opacity-50 text-white rounded transition-colors"
        >
          {saving ? "Saving…" : "Apply & Save"}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1a1a1a] text-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-base font-semibold">🤖 AI Assistant</h2>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="px-3 py-1.5 text-xs font-medium bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors"
          >
            Clear Chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {loadingHistory ? (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-12">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Loading chat history...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-12 space-y-2">
            <p className="text-sm">💡 Ask me to create slides, write code, or chat</p>
            <p className="text-xs text-gray-600">Your chat history is saved in the database</p>
          </div>
        ) : null}
        {messages.map((msg, i) => {
          const isAssistant = msg.role === "assistant"
          const looksLikeCode = msg.content.includes("```") || looksLikeHTML(msg.content)
          return (
            <div key={i} className="space-y-1.5">
              <div className={`text-xs font-semibold ${isAssistant ? "text-green-400" : "text-blue-400"}`}>
                {isAssistant ? "🤖 Assistant" : "👤 You"}
              </div>
              {looksLikeCode ? (
                <pre className="bg-[#0d1117] p-3 rounded-lg text-xs overflow-x-auto border border-gray-800 font-mono whitespace-pre-wrap">
                  {msg.content}
                </pre>
              ) : (
                <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">{msg.content}</div>
              )}
              {isAssistant && renderActionsForAssistant(msg.content)}
            </div>
          )
        })}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Processing...
          </div>
        )}
        {errors.form && <div className="text-red-400 text-sm">{errors.form}</div>}
        {saveMsg && <div className="text-purple-400 text-sm">{saveMsg}</div>}
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-[#0d1117] text-gray-100 rounded-lg border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Ask me anything..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg px-6 py-2.5 font-medium text-sm transition-colors disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  )
}