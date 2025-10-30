import React, { useMemo, useState, useEffect, useRef } from "react"
import { urlbackend } from "../../../config.js"

type ChatMsg = { role: "user" | "assistant"; content: string; attachments?: FileAttachment[]; previewSlides?: string[] }
type FileAttachment = { name: string; type: string; size: number; url: string }

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

const SLIDES_SYSTEM_PROMPT = `You are an elite presentation designer specializing in modern, stunning visual designs. Create presentations that look professional and captivating. Use modern gradients, glassmorphism, system fonts, and high-quality Unsplash images. 

CRITICAL: All slides MUST have a 16:9 aspect ratio. Add this inline style to EVERY <section> tag:
style="width: 100%; aspect-ratio: 16/9; display: flex; flex-direction: column; justify-content: center; align-items: center; overflow: hidden;"

Return ONLY HTML <section> tags with inline styles. NEVER include <!doctype html>, <html>, <head>, or <body> tags. Return ONLY the <section> elements.`

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
  let cleanHtml = html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .trim()
  const sections = cleanHtml.match(/<section[\s\S]*?<\/section>/gi)
  if (sections && sections.length > 0) {
    return sections
      .map(section => section.trim())
      .filter(section => section.startsWith('<section'))
  }
  return []
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function uploadFileToStorage(file: File, projectId: string): Promise<string> {
  const token = localStorage.getItem("token")
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${urlbackend}/projects/${projectId}/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData
  })

  if (!res.ok) {
    throw new Error("Failed to upload file")
  }

  const data = await res.json()
  return data.url
}

function cleanSlideHtml(html: string): string {
  return html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .trim()
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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

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
            content: m.content,
            attachments: m.attachments || []
          })))
        }
      })
      .catch(err => console.error("Error loading chat history:", err))
      .finally(() => setLoadingHistory(false))
  }, [projectId])

  const saveMessage = async (role: "user" | "assistant", content: string, attachments?: FileAttachment[]) => {
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
        body: JSON.stringify({ role, content, attachments })
      })
    } catch (err) {
      console.error("Error saving message:", err)
    }
  }

  const baseSystemInstruction = useMemo(() => {
    return [
      "Act like a technical assistant similar to GitHub Copilot.",
      "If the user asks for code, return a single markdown code block (```lang) with no extra text.",
      "If the user asks for HTML slides, return ONLY <section> tags (no doctype, no html/head/body tags).",
      "If the user just wants to chat, answer briefly and clearly in English.",
    ].join(" ")
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles: File[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (file.size > 10 * 1024 * 1024) {
        setErrors({ form: `File "${file.name}" is too large. Max size is 10MB.` })
        continue
      }

      newFiles.push(file)
    }

    setAttachedFiles(prev => [...prev, ...newFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const sendMessage = async () => {
    if (!input.trim() && attachedFiles.length === 0) return
    if (!projectId) {
      setErrors({ form: "Project ID is required to send messages" })
      return
    }

    setErrors({})
    setSaveMsg(null)
    setLoading(true)
    const userMsg = input.trim()

    let uploadedAttachments: FileAttachment[] = []
    if (attachedFiles.length > 0) {
      setUploadingFiles(true)
      try {
        const uploadPromises = attachedFiles.map(async (file) => {
          const url = await uploadFileToStorage(file, projectId)
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            url
          }
        })
        uploadedAttachments = await Promise.all(uploadPromises)
      } catch (err) {
        setErrors({ form: "Failed to upload files" })
        setLoading(false)
        setUploadingFiles(false)
        return
      }
      setUploadingFiles(false)
    }

    const newUserMessage: ChatMsg = {
      role: "user" as const,
      content: userMsg,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
    }
    setMessages((prev) => [...prev, newUserMessage])
    await saveMessage("user", userMsg, uploadedAttachments.length > 0 ? uploadedAttachments : undefined)

    setInput("")
    setAttachedFiles([])

    try {
      const decision = classifyPrompt(userMsg)
      let message: string
      let systemPrompt = baseSystemInstruction
      let contextToSend = code || undefined

      let filesContext = ""
      if (uploadedAttachments.length > 0) {
        const fileContents = await Promise.all(
          uploadedAttachments.map(async (file) => {
            const isText = file.type.startsWith('text/') ||
              file.type === 'application/json' ||
              file.type === 'application/javascript'

            if (isText) {
              try {
                const response = await fetch(file.url)
                const content = await response.text()
                return `File: ${file.name} (${file.type})\n${content}`
              } catch {
                return `File: ${file.name} (${file.type})\n[Failed to read file]`
              }
            }
            return `File: ${file.name} (${file.type}) - ${formatFileSize(file.size)}\n[Image file - available at ${file.url}]`
          })
        )
        filesContext = "\n\nAttached files:\n" + fileContents.join("\n\n")
      }

      if (slides && currentSlideIndex !== undefined && slides[currentSlideIndex]) {
        const currentSlide = slides[currentSlideIndex]
        systemPrompt = SLIDES_SYSTEM_PROMPT
        contextToSend = currentSlide
        message = `Edit this slide. Current slide HTML:\n${currentSlide}\n\nUser request: ${userMsg}${filesContext}\n\nReturn ONLY the modified <section> HTML, nothing else.`
      } else if (decision === "slides") {
        systemPrompt = SLIDES_SYSTEM_PROMPT
        message = `Create presentation slides about: ${userMsg}${filesContext}. Return ONLY <section> tags with inline styles. Do NOT include doctype, html, head, or body tags.`
      } else if (decision === "code") {
        message = ["Return a single markdown code block (```<language>) and nothing else.", "If the language is HTML and it makes sense, return a full document.", "", "Spec:", userMsg, filesContext].join("\n")
      } else {
        message = userMsg + filesContext
      }

      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      const body: any = {
        system: systemPrompt,
        mode: "auto",
        message,
        context: contextToSend,
        history: conversationHistory
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
      let previewSlides: string[] | undefined = undefined

      if (codeBlock) {
        assistantTextToShow = "```" + (codeBlock.lang || "") + "\n" + codeBlock.code + "\n```"
        snippetToApply = codeBlock.code
      } else if (htmlOnly) {
        assistantTextToShow = raw
        snippetToApply = raw
      }

      if (snippetToApply && decision === "slides") {
        previewSlides = extractSlides(snippetToApply)
      }

      const assistantMessage: ChatMsg = {
        role: "assistant" as const,
        content: assistantTextToShow,
        previewSlides: previewSlides
      }
      setMessages((prev) => [...prev, assistantMessage])
      await saveMessage("assistant", assistantTextToShow)

      if (snippetToApply && slides && currentSlideIndex !== undefined && !previewSlides) {
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

    const cleanSlide = cleanSlideHtml(newSlideHtml)

    const updatedSlides = [...slides]
    updatedSlides[currentSlideIndex] = cleanSlide

    const newDoc = `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${updatedSlides.join("\n")}</body></html>`
    setCode(newDoc)
  }

  const insertSlidesAtPosition = (newSlides: string[]) => {
    const cleanSlides = newSlides.map(slide => cleanSlideHtml(slide))

    if (!slides) {
      const newDoc = `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${cleanSlides.join("\n")}</body></html>`
      setCode(newDoc)
      return
    }

    const insertPosition = currentSlideIndex !== undefined ? currentSlideIndex + 1 : slides.length
    const updatedSlides = [
      ...slides.slice(0, insertPosition),
      ...cleanSlides,
      ...slides.slice(insertPosition)
    ]
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
      const slidesToSave = slidesList.map((html) => ({ html: html.trim() }))

      await createSlidesBulk(urlbackend, projectId, slidesToSave)
      setSaveMsg(`Saved ${slidesToSave.length} slide${slidesToSave.length > 1 ? 's' : ''}`)

      const cleanDoc = `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${slidesList.join("\n")}</body></html>`
      replaceEditor(cleanDoc)
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

  const renderActionsForAssistant = (msg: ChatMsg, msgIndex: number) => {
    const block = extractFirstCodeBlock(msg.content)
    const snippet = block ? block.code : looksLikeHTML(msg.content) ? msg.content : ""

    if (msg.previewSlides && msg.previewSlides.length > 0) {
      return (
        <div className="mt-3 space-y-3">
          <div className="bg-[#121212] border border-[#52585A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">
                Preview ({previewSlideIndex + 1} / {msg.previewSlides.length})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewSlideIndex(Math.max(0, previewSlideIndex - 1))}
                  disabled={previewSlideIndex === 0}
                  className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPreviewSlideIndex(Math.min(msg.previewSlides!.length - 1, previewSlideIndex + 1))}
                  disabled={previewSlideIndex === msg.previewSlides.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="w-full aspect-[16/9] bg-white rounded overflow-hidden">
              <iframe
                srcDoc={`<!doctype html><html><head><meta charset='utf-8'><style>body{margin:0;display:flex;align-items:center;justify-center;width:100%;height:100%;overflow:hidden;}section{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}</style></head><body>${msg.previewSlides[previewSlideIndex]}</body></html>`}
                className="w-full h-full border-none"
                title="Slide preview"
              />
            </div>
          </div>
          <button
            onClick={() => {
              insertSlidesAtPosition(msg.previewSlides!)
              setPreviewSlideIndex(0)
            }}
            className="w-full px-4 py-2.5 text-sm font-medium bg-[#d0d0d0] hover:bg-[#bcbcbc] text-black rounded-lg transition-all"
          >
            Insert {msg.previewSlides.length} Slide{msg.previewSlides.length > 1 ? 's' : ''} After Current
          </button>
        </div>
      )
    }

    if (!snippet) return null

    return (
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => insertIntoEditor(snippet)}
          className="px-3 py-1.5 text-xs font-medium text-gray-300 rounded-lg border transition-all"
        >
          Insert
        </button>
        <button
          onClick={() => replaceEditor(snippet)}
          className="px-3 py-1.5 text-xs font-medium text-gray-300 rounded-lg border transition-all"
        >
          Replace
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(snippet)}
          className="px-3 py-1.5 text-xs font-medium text-gray-300 rounded-lg border transition-all"
        >
          Copy
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden p-3 relative"
    >
      <div
        className="absolute inset-0 bg-[#161616]"
        // style={{
        //   backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
        //     <svg width='832' height='982' viewBox='0 0 832 982' fill='none' xmlns='http://www.w3.org/2000/svg'>
        //     <g clip-path='url(#clip0_3086_852)'>
        //     <rect x='0.5' y='0.5' width='838' height='994' fill='#121212' stroke='#181818'/>
        //     <g opacity='0.4'>
        //     <g filter='url(#filter0_f_3086_852)'>
        //     <path d='M202.748 343L0 -206H828L580.129 343H202.748Z' fill='#7182FF'/>
        //     </g>
        //     <g filter='url(#filter1_f_3086_852)'>
        //     <path d='M254.125 319L28 35.8061L788 0L583.661 319H254.125Z' fill='#249931'/>
        //     <path d='M254.125 319L28 35.8061L788 0L583.661 319H254.125Z' stroke='black'/>
        //     </g>
        //     </g>
        //     </g>
        //     <defs>
        //     <filter id='filter0_f_3086_852' x='-400' y='-606' width='1628' height='1349' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'>
        //     <feFlood flood-opacity='0' result='BackgroundImageFix'/>
        //     <feBlend mode='normal' in='SourceGraphic' in2='BackgroundImageFix' result='shape'/>
        //     <feGaussianBlur stdDeviation='200' result='effect1_foregroundBlur_3086_852'/>
        //     </filter>
        //     <filter id='filter1_f_3086_852' x='-173.002' y='-200.545' width='1161.95' height='720.045' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'>
        //     <feFlood flood-opacity='0' result='BackgroundImageFix'/>
        //     <feBlend mode='normal' in='SourceGraphic' in2='BackgroundImageFix' result='shape'/>
        //     <feGaussianBlur stdDeviation='100' result='effect1_foregroundBlur_3086_852'/>
        //     </filter>
        //     <clipPath id='clip0_3086_852'>
        //     <rect width='839' height='995' fill='white'/>
        //     </clipPath>
        //     </defs>
        //     </svg>
        //   `)}")`,
        //   backgroundSize: "cover",
        //   backgroundPosition: "center",
        //   backgroundRepeat: "no-repeat",
        //   transform: "rotate(180deg)",
        //   zIndex: 0
        // }}
      />

      <div className="flex flex-col bg-[#121212] border border-[#52585A] rounded-xl h-full w-full p-5 overflow-hidden relative z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#52585A]">
          <h2 className="text-sm font-semibold text-gray-200">AI Assistant</h2>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
          {loadingHistory ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-12">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-12 space-y-3">
              <p className="text-sm">How can I help you today?</p>
              <p className="text-xs text-gray-600">Ask me to create slides, write code, or chat</p>
            </div>
          ) : null}

          {messages.map((msg, i) => {
            const isAssistant = msg.role === "assistant"
            const looksLikeCode = msg.content.includes("```") || looksLikeHTML(msg.content)
            return (
              <div
                key={i}
                className="space-y-2 animate-fadeIn"
                style={{
                  animation: 'fadeIn 0.3s ease-in',
                  opacity: 0,
                  animationFillMode: 'forwards',
                  animationDelay: `${i * 0.05}s`
                }}
              >
                <div className={`text-xs font-medium ${isAssistant ? "text-gray-400" : "text-gray-300"}`}>
                  {isAssistant ? "Assistant" : "You"}
                </div>

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-[#52585A] rounded-lg text-xs hover:bg-[#1a1a1a] transition-colors"
                      >
                        {file.type.startsWith('image/') ? (
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <span className="text-gray-300">{file.name}</span>
                        <span className="text-gray-500">({formatFileSize(file.size)})</span>
                      </a>
                    ))}
                  </div>
                )}

                {looksLikeCode ? (
                  <pre className="glassPanel p-4 rounded-lg text-xs text-gray-300 overflow-x-auto border border whitespace-pre-wrap">
                    {msg.content}
                  </pre>
                ) : (
                  <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
                {isAssistant && renderActionsForAssistant(msg, i)}
              </div>
            )
          })}

          {loading && (
            <div className="flex items-center gap-2 animate-fadeIn">
              <div className="text-xs font-medium text-gray-400">Assistant</div>
              <div className="flex gap-1 mt-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}

          {uploadingFiles && (
            <div className="text-blue-400 text-sm">Uploading files...</div>
          )}

          {errors.form && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/50 rounded-lg px-4 py-2">
              {errors.form}
            </div>
          )}

          {saveMsg && (
            <div className="text-green-400 text-sm bg-green-900/20 border border-green-900/50 rounded-lg px-4 py-2">
              {saveMsg}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-[#52585A]">
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-[#52585A] rounded-lg text-xs"
                >
                  {file.type.startsWith('image/') ? (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span className="text-gray-300">{file.name}</span>
                  <span className="text-gray-500">({formatFileSize(file.size)})</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-1 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles || loading}
              className="bg-[#121212] hover:bg-[#52585A] border border-[#52585A] text-gray-300 rounded-lg px-3 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach files"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={uploadingFiles || loading}
              className="flex-1 bg-[#121212] text-gray-100 rounded-lg border border-[#52585A] px-4 py-3 text-sm focus:outline-none focus:border-[#3a3a3a] transition-colors disabled:opacity-50"
              placeholder="Message AI Assistant..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && !uploadingFiles) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || uploadingFiles || (!input.trim() && attachedFiles.length === 0)}
              className="bg-[#d0d0d0] hover:bg-[#bcbcbc] disabled:bg-[#52585A] disabled:opacity-50 text-black disabled:text-gray-600 rounded-lg px-6 py-3 font-medium text-sm transition-all disabled:cursor-not-allowed"
            >
              {uploadingFiles ? "Uploading..." : loading ? "..." : "Send"}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-in forwards;
          }
        `}</style>
      </div>
    </div>
  )
}