// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback } from "react"
import { useLocation } from "react-router-dom"
import ProjectNavBar from "../RegularComponents/ProjectComponents/ProjectNavBar"
import { FullscreenLoader } from "../ui/FullscreenLoader"
import CodeEditorMode from "../RegularComponents/ProjectComponents/Modes/CodeEditorMode"
// VISUAL MODE comentado temporalmente:
// import VisualEditorMode from "../RegularComponents/ProjectComponents/Modes/VisualEditorMode"
// import VisualEditorModeLegacy from "../RegularComponents/ProjectComponents/Modes/VisualEditorModeLegacy"
import LivePreview from "../RegularComponents/ProjectComponents/LivePreview"
import GeminiChatbot from "../RegularComponents/ProjectComponents/GeminiChatbot"
import { ShareModal } from "../RegularComponents/MultiuseComponents/ShareModal"
import ProjectAccessRoute from "../RegularComponents/ProjectComponents/ProjectAccessRoute"
import { useAutoSave } from "../../hooks/useAutoSave"
import { useRealtimeCollaboration } from "../../useRealtimeProject"
import { buildSlidesPayload } from "../../utils/projectDocument"
import { urlbackend } from "../../config.js"
import { Spinner } from "../ui/spinner"
import MonacoEditor from "@monaco-editor/react"

type ProjectMode = "code" | "visual" | "ai"
type SaveState = "idle" | "saving" | "saved" | "error"

interface User {
  id: string
  username: string
  avatar?: string
  firstName?: string
  lastName?: string
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function getDefaultMode(): ProjectMode {
  const savedMode = getCookie("defaultMode");
  if (savedMode === "code") return "code";
  // VISUAL MODE comentado temporalmente — si la cookie tenía "visual", fallback a "ai"
  // if (savedMode === "visual") return "visual";
  if (savedMode === "chat") return "ai";
  return "ai";
}

function getUserFromStorage(): User | null {
  try {
    const stored = localStorage.getItem("user")
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        id: parsed.id,
        username: parsed.username,
        avatar: parsed.avatar,
        firstName: parsed.first_name,
        lastName: parsed.last_name
      }
    }

    const token = localStorage.getItem("token")
    if (token) {
      const [, payload] = token.split(".")
      if (payload) {
        const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
        return {
          id: json.sub || json.userId,
          username: json.username,
          avatar: localStorage.getItem("avatar") || undefined
        }
      }
    }
  } catch { }
  return null
}

/* ─────────────────────────────────────────────
   Edit Panel — Figma-style property inspector
───────────────────────────────────────────── */
const FONT_OPTIONS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway",
  "Oswald", "Merriweather", "Playfair Display", "Source Code Pro", "JetBrains Mono",
  "Georgia", "Times New Roman", "Arial", "Helvetica", "Verdana", "Trebuchet MS",
]
type CSSProps = {
  fontFamily: string; fontSize: string; fontWeight: string
  color: string; textAlign: string; lineHeight: string; letterSpacing: string
  width: string; height: string
  backgroundColor: string; opacity: string
  padding: string; margin: string; border: string; borderRadius: string
}

function parseCSSProps(style: CSSStyleDeclaration): CSSProps {
  return {
    fontFamily: style.fontFamily || "",
    fontSize: style.fontSize || "",
    fontWeight: style.fontWeight || "",
    color: style.color || "",
    textAlign: style.textAlign || "",
    lineHeight: style.lineHeight || "",
    letterSpacing: style.letterSpacing || "",
    width: style.width || "",
    height: style.height || "",
    backgroundColor: style.backgroundColor || "",
    opacity: style.opacity || "1",
    padding: style.padding || "",
    margin: style.margin || "",
    border: style.border || "",
    borderRadius: style.borderRadius || "",
  }
}

function colorToHex(color: string): string {
  if (!color || color === "transparent") return ""
  if (color.startsWith("#")) return color
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return color
  return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("")
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center h-8 px-3 gap-2">
      <span className="text-[10px] text-theme-secondary w-[70px] flex-shrink-0">{label}</span>
      <div className="flex-1 flex items-center">{children}</div>
    </div>
  )
}

function PropInput({ value, onChange, type = "text", suffix }: { value: string; onChange: (v: string) => void; type?: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-0.5 flex-1">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        type={type}
        className="w-full bg-transparent text-[11px] text-theme-primary text-right focus:outline-none focus:bg-theme-quaternary rounded px-1 py-0.5"
        style={{ minWidth: 0 }}
      />
      {suffix && <span className="text-[10px] text-theme-secondary flex-shrink-0">{suffix}</span>}
    </div>
  )
}

function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = colorToHex(value)
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <label className="w-4 h-4 rounded cursor-pointer border border-white/20 flex-shrink-0 overflow-hidden" style={{ backgroundColor: hex || "#888" }}>
        <input type="color" value={hex || "#888888"} onChange={e => onChange(e.target.value)} className="opacity-0 w-0 h-0" />
      </label>
      <input value={hex} onChange={e => onChange(e.target.value)} className="flex-1 bg-transparent text-[11px] text-theme-primary focus:outline-none focus:bg-theme-quaternary rounded px-1 py-0.5" style={{ minWidth: 0 }} />
    </div>
  )
}

function EditPanel({
  slideHtml, onApply, onClose,
  onStartPickMode, pickMode, targetIndex
}: {
  slideHtml: string
  onApply: (newHtml: string) => void
  onClose: () => void
  onStartPickMode: () => void
  pickMode: boolean
  targetIndex: number
}) {
  const [props, setProps] = useState<CSSProps | null>(null)
  const [activeEl, setActiveEl] = useState<HTMLElement | null>(null)
  const [cssText, setCssText] = useState("")
  const [fontOpen, setFontOpen] = useState(false)
  const domRef = useRef<Document | null>(null)
  const allElsRef = useRef<HTMLElement[]>([])

  useEffect(() => {
    onStartPickMode()
  }, [])

  useEffect(() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(slideHtml, "text/html")
    domRef.current = doc
    const section = doc.querySelector("section")
    if (!section) return
    const all = Array.from(section.querySelectorAll("*")).filter(el => {
      const tag = el.tagName.toLowerCase()
      return ["h1","h2","h3","h4","p","div","span","img","button","a","ul","li"].includes(tag)
    }) as HTMLElement[]
    allElsRef.current = all
    const el = all[targetIndex] || all[0]
    if (el) {
      setActiveEl(el)
      setProps(parseCSSProps(el.style as any))
      setCssText(el.getAttribute("style") || "")
    }
  }, [slideHtml, targetIndex])

  const update = (key: keyof CSSProps, value: string) => {
    setProps(p => p ? { ...p, [key]: value } : p)
  }

  const applyChanges = () => {
    if (!activeEl || !domRef.current) return
    if (cssText.trim()) {
      activeEl.setAttribute("style", cssText)
    } else if (props) {
      const s = activeEl.style
      if (props.fontFamily) s.fontFamily = props.fontFamily
      if (props.fontSize) s.fontSize = props.fontSize.includes("px") ? props.fontSize : props.fontSize + "px"
      if (props.fontWeight) s.fontWeight = props.fontWeight
      if (props.color) s.color = props.color
      if (props.textAlign) s.textAlign = props.textAlign
      if (props.lineHeight) s.lineHeight = props.lineHeight
      if (props.letterSpacing) s.letterSpacing = props.letterSpacing.includes("px") ? props.letterSpacing : props.letterSpacing + "px"
      if (props.width) s.width = props.width.includes("px") || props.width.includes("%") ? props.width : props.width + "px"
      if (props.height) s.height = props.height.includes("px") || props.height.includes("%") ? props.height : props.height + "px"
      if (props.backgroundColor) s.backgroundColor = props.backgroundColor
      if (props.opacity !== "") s.opacity = props.opacity
      if (props.padding) s.padding = props.padding.includes("px") ? props.padding : props.padding + "px"
      if (props.margin) s.margin = props.margin.includes("px") ? props.margin : props.margin + "px"
      if (props.border) s.border = props.border
      if (props.borderRadius) s.borderRadius = props.borderRadius.includes("px") ? props.borderRadius : props.borderRadius + "px"
    }
    const section = domRef.current.querySelector("section")
    if (section) onApply(section.outerHTML)
  }

  if (!props) return null

  const stripPx = (v: string) => v.replace("px", "")

  return (
    <div className="absolute inset-0 z-30 bg-theme-primary border-l border-theme-tertiary overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-theme-tertiary flex-shrink-0">
        <span className="text-xs font-semibold text-theme-primary">Edit</span>
        <button onClick={onClose} className="text-theme-secondary hover:text-theme-primary transition-colors p-0.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Element selector */}
      <div className="px-3 py-2 border-b border-theme-tertiary flex-shrink-0">
        <button
          onClick={onStartPickMode}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${pickMode ? "border-blue-500 bg-blue-500/10 text-blue-400 animate-pulse" : activeEl ? "border-theme-tertiary bg-theme-quaternary text-theme-primary hover:border-theme-secondary" : "border-dashed border-theme-tertiary text-theme-secondary hover:border-theme-primary hover:text-theme-primary"}`}
        >
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 13 }}>ads_click</span>
          {pickMode ? "Click an element…" : activeEl ? `${activeEl.tagName.toLowerCase()}${activeEl.textContent?.trim() ? ` — ${activeEl.textContent.trim().slice(0, 24)}` : ""}` : "Select element"}
        </button>
      </div>

      <div className="overflow-y-auto flex-1 scrollbar-custom">
        {/* TYPOGRAPHY */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[9px] font-semibold tracking-widest text-theme-secondary uppercase">Typography</span>
        </div>
        <PropRow label="Font">
          <div className="relative flex-1">
            <button
              onClick={() => setFontOpen(v => !v)}
              className="w-full flex items-center justify-between bg-transparent text-[11px] text-theme-primary text-right focus:outline-none focus:bg-theme-quaternary rounded px-1 py-0.5 hover:bg-theme-quaternary transition-colors"
            >
              <span className="truncate">{props.fontFamily.replace(/['"]/g, "").split(",")[0].trim() || "—"}</span>
              <svg className="w-3 h-3 text-theme-secondary flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {fontOpen && (
              <div className="absolute left-0 right-0 top-full mt-0.5 z-50 bg-theme-primary border border-theme-tertiary rounded-lg shadow-xl overflow-y-auto max-h-[180px] scrollbar-custom">
                {FONT_OPTIONS.map(f => (
                  <button
                    key={f}
                    onClick={() => { update("fontFamily", f); setFontOpen(false) }}
                    className={`w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-theme-quaternary transition-colors ${props.fontFamily.includes(f) ? "text-blue-400" : "text-theme-primary"}`}
                    style={{ fontFamily: f }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PropRow>
        <div className="flex">
          <div className="flex-1 border-r border-theme-tertiary">
            <PropRow label="Size">
              <PropInput value={stripPx(props.fontSize)} onChange={v => update("fontSize", v)} suffix="px" />
            </PropRow>
          </div>
          <div className="flex-1">
            <PropRow label="Weight">
              <PropInput value={props.fontWeight} onChange={v => update("fontWeight", v)} suffix="" />
            </PropRow>
          </div>
        </div>
        <div className="flex">
          <div className="flex-1 border-r border-theme-tertiary">
            <PropRow label="Color">
              <ColorSwatch value={props.color} onChange={v => update("color", v)} />
            </PropRow>
          </div>
          <div className="flex-1">
            <PropRow label="Align">
              <PropInput value={props.textAlign} onChange={v => update("textAlign", v)} />
            </PropRow>
          </div>
        </div>
        <div className="flex">
          <div className="flex-1 border-r border-theme-tertiary">
            <PropRow label="Line Height">
              <PropInput value={props.lineHeight} onChange={v => update("lineHeight", v)} />
            </PropRow>
          </div>
          <div className="flex-1">
            <PropRow label="Tracking">
              <PropInput value={stripPx(props.letterSpacing)} onChange={v => update("letterSpacing", v)} suffix="px" />
            </PropRow>
          </div>
        </div>

        {/* SIZE */}
        <div className="px-3 pt-3 pb-1 mt-1 border-t border-theme-tertiary">
          <span className="text-[9px] font-semibold tracking-widest text-theme-secondary uppercase">Size</span>
        </div>
        <div className="flex">
          <div className="flex-1 border-r border-theme-tertiary">
            <PropRow label="Width">
              <PropInput value={stripPx(props.width)} onChange={v => update("width", v)} suffix="px" />
            </PropRow>
          </div>
          <div className="flex-1">
            <PropRow label="Height">
              <PropInput value={stripPx(props.height)} onChange={v => update("height", v)} suffix="px" />
            </PropRow>
          </div>
        </div>

        {/* BOX */}
        <div className="px-3 pt-3 pb-1 mt-1 border-t border-theme-tertiary">
          <span className="text-[9px] font-semibold tracking-widest text-theme-secondary uppercase">Box</span>
        </div>
        <div className="flex">
          <div className="flex-1 border-r border-theme-tertiary">
            <PropRow label="Fill">
              <ColorSwatch value={props.backgroundColor} onChange={v => update("backgroundColor", v)} />
            </PropRow>
          </div>
          <div className="flex-1">
            <PropRow label="Opacity">
              <PropInput value={props.opacity === "1" ? "100" : String(Math.round(Number(props.opacity) * 100))} onChange={v => update("opacity", String(Number(v) / 100))} suffix="%" />
            </PropRow>
          </div>
        </div>
        <PropRow label="Padding">
          <PropInput value={stripPx(props.padding)} onChange={v => update("padding", v)} suffix="px" />
        </PropRow>
        <PropRow label="Margin">
          <PropInput value={stripPx(props.margin)} onChange={v => update("margin", v)} suffix="px" />
        </PropRow>
        <PropRow label="Border">
          <PropInput value={props.border} onChange={v => update("border", v)} suffix="px" />
        </PropRow>
        <PropRow label="Border Radius">
          <PropInput value={stripPx(props.borderRadius)} onChange={v => update("borderRadius", v)} suffix="px" />
        </PropRow>

        {/* CSS Editor — al final del scroll */}
        <div className="border-t border-theme-tertiary mt-1">
          <div className="px-3 pt-2.5 pb-1">
            <span className="text-[9px] font-semibold tracking-widest text-theme-secondary uppercase">CSS</span>
          </div>
          <div style={{ height: 140 }}>
            <MonacoEditor
              height={140}
              language="css"
              theme="vs-dark"
              value={cssText}
              onChange={v => setCssText(v || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                lineNumbers: "off",
                folding: false,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                padding: { top: 6, bottom: 6 },
                scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
                fontFamily: '"JetBrains Mono", Consolas, monospace',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-theme-tertiary flex-shrink-0">
        <button
          onClick={applyChanges}
          className="w-full py-1.5 text-xs font-medium bg-theme-inverted text-theme-inverted rounded-lg hover:opacity-90 transition-all"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

function ProjectPageContent() {
  const location = useLocation()
  const [mode, setMode] = useState<ProjectMode>(getDefaultMode())
  const [projectId, setProjectId] = useState<string | null>(null)
  const [name, setName] = useState<string>("Untitled")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [doc, setDoc] = useState<string>("")
  const [previewWidth, setPreviewWidth] = useState(55)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<string[]>([])
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [projectLoading, setProjectLoading] = useState(true)
  const [draggedSlide, setDraggedSlide] = useState<number | null>(null)
  const [hoveredSlide, setHoveredSlide] = useState<number | null>(null)
  const [initialAIPrompt, setInitialAIPrompt] = useState<string | null>(null)
  const [useLegacyVisualEditor, setUseLegacyVisualEditor] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [editPickMode, setEditPickMode] = useState(false)
  const [editTargetIndex, setEditTargetIndex] = useState(0)
  const [isEditingSlide, setIsEditingSlide] = useState(false)
  const [tweakMode, setTweakMode] = useState(false)
  const [tweakElement, setTweakElement] = useState<string | null>(null)
  const tweakInputRef = useRef<HTMLInputElement>(null)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const isApplyingRemoteChange = useRef(false)
  const livePreviewRef = useRef<HTMLIFrameElement>(null)
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDocRef = useRef<string | null>(null)
  const docRef = useRef(doc)
  const projectIdRef = useRef(projectId)

  const user = getUserFromStorage()

  const { syncBaseline, runAutoSave } = useAutoSave(
    projectId || undefined,
    doc
  )

  const {
    activeUsers,
    lastChange,
    isConnected,
    notifySlidesUpdated,
    clearLastChange
  } = useRealtimeCollaboration(
    projectId,
    user?.id || '',
    user?.username || 'Anonymous',
    user?.firstName,
    user?.lastName,
    user?.avatar
  )

  useEffect(() => {
    docRef.current = doc
  }, [doc])

  useEffect(() => {
    projectIdRef.current = projectId
  }, [projectId])

  const loadProject = async (id: string, options?: { applyToEditor?: boolean }) => {
    const token = localStorage.getItem("token")
    if (!token) return

    const applyToEditor = options?.applyToEditor !== false

    try {
      const projectRes = await fetch(`${urlbackend}/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const projectData = await projectRes.json()
      if (projectData?.name) setName(projectData.name)

      const slidesRes = await fetch(`${urlbackend}/projects/${id}/slides`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const slidesData = await slidesRes.json()

      let loadedDoc: string
      if (slidesData.ok && slidesData.slides.length > 0) {
        loadedDoc =
          "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>" +
          slidesData.slides.map((s: any) => s.html).join("\n") +
          "</body></html>"
      } else {
        loadedDoc =
          "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><section class='slide'><h1>Slide 1</h1></section></body></html>"
      }

      if (applyToEditor) {
        isApplyingRemoteChange.current = true
        setDoc(loadedDoc)
        syncBaseline(loadedDoc)
        pendingDocRef.current = null
        setTimeout(() => {
          isApplyingRemoteChange.current = false
        }, 150)
      }

      return loadedDoc
    } catch (error) {
      console.error("Error loading project:", error)
    } finally {
      setProjectLoading(false)
    }
  }

  const saveSlidesToServer = async (finalDoc: string, options?: { keepalive?: boolean }) => {
    const id = projectIdRef.current
    if (!id) return false

    const token = localStorage.getItem("token")
    if (!token) return false

    const slides = buildSlidesPayload(finalDoc)
    if (slides.length === 0) return false

    const response = await fetch(`${urlbackend}/projects/${id}/slides`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slides, content: finalDoc }),
      keepalive: options?.keepalive ?? false,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Failed to save slides:", response.status, errorText)
      return false
    }

    syncBaseline(finalDoc)
    notifySlidesUpdated()
    return true
  }

  const flushPendingSave = async (options?: { keepalive?: boolean }) => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current)
      saveDebounceRef.current = null
    }

    const docToSave = pendingDocRef.current ?? docRef.current
    if (!docToSave || !projectIdRef.current) return

    pendingDocRef.current = null
    setSaveState("saving")
    const ok = await saveSlidesToServer(docToSave, options)
    setSaveState(ok ? "saved" : "error")
    if (ok) {
      window.setTimeout(() => setSaveState("idle"), 800)
    }
  }

  useEffect(() => {
    const parts = window.location.pathname.split("/")
    const id = parts[parts.length - 1]
    if (!id) return
    setProjectId(id)
    loadProject(id)

    if (location.state?.openAIChat) {
      setMode("ai")
      if (location.state?.aiPrompt) {
        setInitialAIPrompt(location.state.aiPrompt)
      }
    }
  }, [])

  useEffect(() => {
    if (!lastChange || !projectId) return

    if (lastChange.change_type === "slides_updated") {
      loadProject(projectId)
    }

    clearLastChange()
  }, [lastChange, clearLastChange, projectId])

  const flushPendingSaveRef = useRef(flushPendingSave)
  const runAutoSaveRef = useRef(runAutoSave)
  flushPendingSaveRef.current = flushPendingSave
  runAutoSaveRef.current = runAutoSave

  useEffect(() => {
    const handleBeforeUnload = () => {
      const docToSave = pendingDocRef.current ?? docRef.current
      if (!docToSave || !projectIdRef.current) return

      const token = localStorage.getItem("token")
      if (!token) return

      const slides = buildSlidesPayload(docToSave)
      if (slides.length === 0) return

      fetch(`${urlbackend}/projects/${projectIdRef.current}/slides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slides, content: docToSave }),
        keepalive: true,
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingSaveRef.current({ keepalive: true })
        runAutoSaveRef.current()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      flushPendingSaveRef.current()
      runAutoSaveRef.current()
    }
  }, [projectId])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTweakMode(false)
        setTweakElement(null)
        setShowEditPanel(false)
        setEditPickMode(false)
      }
      if (e.altKey && e.key === '1') {
        e.preventDefault()
        setMode('code')
      // VISUAL MODE comentado temporalmente
      // } else if (e.altKey && e.key === '2') {
      //   e.preventDefault()
      //   setMode('visual')
      } else if (e.altKey && e.key === '3') {
        e.preventDefault()
        setMode('ai')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const extractedSlides = doc
      .split(/<section/i)
      .slice(1)
      .map((s) => "<section" + s.split("</section>")[0] + "</section>")
    setSlides(extractedSlides)
    if (currentSlide >= extractedSlides.length && extractedSlides.length > 0) {
      setCurrentSlide(Math.max(0, extractedSlides.length - 1))
    }
  }, [doc, currentSlide])


  const onChangeDoc = (next: string) => {
    if (isApplyingRemoteChange.current) {
      return
    }

    const minimalDoc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><section class=\"slide\"></section></body></html>"

    const hasContent = next.replace(/<[^>]*>/g, '').trim().length > 0
    const finalDoc = hasContent ? next : minimalDoc

    setDoc(finalDoc)
    setSaveState("saving")
    pendingDocRef.current = finalDoc

    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current)
    }

    saveDebounceRef.current = window.setTimeout(async () => {
      saveDebounceRef.current = null
      try {
        const ok = await saveSlidesToServer(finalDoc)
        if (!ok) {
          setSaveState("error")
          return
        }
        pendingDocRef.current = null
        setSaveState("saved")
        window.setTimeout(() => setSaveState("idle"), 800)
      } catch (error) {
        console.error("Error saving slides:", error)
        setSaveState("error")
      }
    }, 500)
  }

  const applySetDoc = (val: string | ((v: string) => string)) => {
    setDoc((prev) => {
      const next = typeof val === "function" ? val(prev) : val
      onChangeDoc(next)
      return next
    })
  }

  const handleMouseDown = () => {
    isDragging.current = true
    setIsResizing(true)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.querySelectorAll("iframe").forEach((f) => (f.style.pointerEvents = "none"))
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    setPreviewWidth(Math.min(Math.max(newWidth, 25), 58))
  }

  const handleMouseUp = () => {
    isDragging.current = false
    setIsResizing(false)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    document.querySelectorAll("iframe").forEach((f) => (f.style.pointerEvents = ""))
  }

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  const getCurrentSlideDoc = () => {
    if (slides.length === 0) return doc
    return `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${slides[currentSlide]}</body></html>`
  }

  const addNewSlide = () => {
    const newSlide = '<section class="slide"><h1>New Slide</h1></section>'
    const newSlides = [...slides, newSlide]

    const newDoc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>" +
      newSlides.join("\n") +
      "</body></html>"

    onChangeDoc(newDoc)
    setCurrentSlide(newSlides.length - 1)
  }

  const deleteSlide = (index: number) => {
    const newSlides = slides.filter((_, i) => i !== index)

    let newDoc: string
    if (newSlides.length === 0) {
      newDoc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><section class=\"slide\"></section></body></html>"
    } else {
      newDoc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>" +
        newSlides.join("\n") +
        "</body></html>"
    }

    onChangeDoc(newDoc)

    if (currentSlide >= newSlides.length && newSlides.length > 0) {
      setCurrentSlide(Math.max(0, newSlides.length - 1))
    } else if (currentSlide >= index && newSlides.length > 0) {
      setCurrentSlide(Math.max(0, currentSlide - 1))
    } else if (newSlides.length === 0) {
      setCurrentSlide(0)
    }
  }

  const deleteAllSlides = () => {
    const newDoc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><section class=\"slide\"></section></body></html>"
    onChangeDoc(newDoc)
    setCurrentSlide(0)
  }

  const handleDragStart = (index: number) => {
    setDraggedSlide(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setHoveredSlide(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedSlide === null || draggedSlide === dropIndex) {
      setDraggedSlide(null)
      setHoveredSlide(null)
      return
    }

    const newSlides = [...slides]
    const [removed] = newSlides.splice(draggedSlide, 1)
    newSlides.splice(dropIndex, 0, removed)

    const newDoc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>" +
      newSlides.join("\n") +
      "</body></html>"

    onChangeDoc(newDoc)

    if (currentSlide === draggedSlide) {
      setCurrentSlide(dropIndex)
    } else if (currentSlide > draggedSlide && currentSlide <= dropIndex) {
      setCurrentSlide(currentSlide - 1)
    } else if (currentSlide < draggedSlide && currentSlide >= dropIndex) {
      setCurrentSlide(currentSlide + 1)
    }

    setDraggedSlide(null)
    setHoveredSlide(null)
  }

  const EDIT_SLIDE_SYSTEM_PROMPT = `You are a surgical HTML slide editor. You receive the HTML of a <section> slide and an instruction.
Return ONLY the modified <section> HTML. Rules:
- Apply ONLY the requested change
- Preserve all existing content, layout, and Tailwind classes unless explicitly asked to change them
- Return raw HTML only — no markdown, no code fences, no explanation`

  const callEditSlide = async (instruction: string) => {
    if (!slides[currentSlide]) return
    const token = localStorage.getItem("token")
    const savedModel = localStorage.getItem("selectedModel") || "gpt-4o"
    setIsEditingSlide(true)
    try {
      const res = await fetch(`${urlbackend}/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          system: EDIT_SLIDE_SYSTEM_PROMPT,
          message: instruction,
          context: slides[currentSlide],
          model: savedModel,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.text) return
      let html = data.text.trim()
      html = html.replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim()
      const updatedSlides = [...slides]
      updatedSlides[currentSlide] = html
      applySetDoc(
        `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${updatedSlides.join("\n")}</body></html>`
      )
    } catch { /* silent */ }
    finally { setIsEditingSlide(false) }
  }

  const enterTweakMode = () => {
    setTweakMode(true)
    setTweakElement(null)
    const iframe = livePreviewRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    const script = doc.createElement("script")
    script.id = "tweak-mode-script"
    script.textContent = `
      if (!window.__tweakModeActive) {
        window.__tweakModeActive = true;
        const style = document.createElement('style');
        style.id = '__tweak-style';
        style.textContent = '*:hover { outline: 2px solid rgba(59,130,246,0.7) !important; cursor: crosshair !important; }';
        document.head.appendChild(style);
        document.addEventListener('click', function __tweakClick(e) {
          e.preventDefault(); e.stopPropagation();
          const el = e.target;
          const tag = el.tagName.toLowerCase();
          const text = el.innerText?.trim().slice(0, 120) || '';
          const cls = el.className?.toString().slice(0, 80) || '';
          const info = [tag, text ? '"' + text + '"' : '', cls ? '.' + cls.split(' ').join('.') : ''].filter(Boolean).join(' ');
          window.parent.postMessage({ type: 'tweak-element', info }, '*');
          document.getElementById('__tweak-style')?.remove();
          document.removeEventListener('click', __tweakClick, true);
          window.__tweakModeActive = false;
        }, true);
      }
    `
    doc.body.appendChild(script)
  }

  const exitTweakMode = () => {
    setTweakMode(false)
    setTweakElement(null)
    const iframe = livePreviewRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.getElementById("__tweak-style")?.remove()
    doc.getElementById("tweak-mode-script")?.remove()
  }

  const enterEditPickMode = () => {
    setEditPickMode(true)
    const iframe = livePreviewRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    const script = doc.createElement("script")
    script.id = "edit-pick-script"
    script.textContent = `
      if (!window.__editPickActive) {
        window.__editPickActive = true;
        const style = document.createElement('style');
        style.id = '__edit-pick-style';
        style.textContent = '*:hover { outline: 2px solid rgba(99,102,241,0.8) !important; cursor: crosshair !important; }';
        document.head.appendChild(style);
        const TAGS = ['h1','h2','h3','h4','p','div','span','img','button','a','ul','li'];
        const section = document.querySelector('section');
        const allEls = section ? Array.from(section.querySelectorAll('*')).filter(el => TAGS.includes(el.tagName.toLowerCase())) : [];
        document.addEventListener('click', function __editPick(e) {
          e.preventDefault(); e.stopPropagation();
          const idx = allEls.indexOf(e.target);
          window.parent.postMessage({ type: 'edit-element', index: idx >= 0 ? idx : 0 }, '*');
          document.getElementById('__edit-pick-style')?.remove();
          document.removeEventListener('click', __editPick, true);
          window.__editPickActive = false;
        }, true);
      }
    `
    doc.body.appendChild(script)
  }

  useEffect(() => {
    const handleTweakMessage = (e: MessageEvent) => {
      if (e.data?.type === "tweak-element") {
        setTweakMode(false)
        setTweakElement(e.data.info)
        setTimeout(() => tweakInputRef.current?.focus(), 50)
      }
      if (e.data?.type === "edit-element") {
        setEditPickMode(false)
        setEditTargetIndex(typeof e.data.index === "number" ? e.data.index : 0)
        const iframe = livePreviewRef.current
        if (iframe) {
          const doc = iframe.contentDocument || iframe.contentWindow?.document
          doc?.getElementById("__edit-pick-style")?.remove()
          doc?.getElementById("edit-pick-script")?.remove()
        }
      }
    }
    window.addEventListener("message", handleTweakMessage)
    return () => window.removeEventListener("message", handleTweakMessage)
  }, [])

  if (projectLoading) return <FullscreenLoader />

  return (
    <div className="w-screen h-screen flex flex-col">
      <ProjectNavBar
        projectId={projectId || undefined}
        name={name}
        saveState={saveState}
        mode={mode}
        onChangeMode={setMode}
        activeUsers={activeUsers as any}
        currentUserId={user?.id}
        isCollaborationConnected={isConnected}
        onShareClick={() => setShareModalOpen(true)}
        useLegacyVisualEditor={useLegacyVisualEditor}
        onToggleLegacyEditor={() => setUseLegacyVisualEditor(!useLegacyVisualEditor)}
        showEditPanel={showEditPanel}
        onToggleEditPanel={() => setShowEditPanel(v => !v)}
        tweakMode={tweakMode}
        onToggleTweakMode={() => tweakMode ? exitTweakMode() : enterTweakMode()}
        isEditingSlide={isEditingSlide}
        hasCurrentSlide={!!slides[currentSlide]}
      />


      <ShareModal
        projectId={projectId}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      <div className="flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full flex bg-theme-primary">
          <div
            style={{ width: `${previewWidth}%` }}
            className="h-full flex flex-col"
          >
            <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">
              <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative">
                <div className="w-full h-full max-h-full">
                  <LivePreview
                    ref={livePreviewRef}
                    document={getCurrentSlideDoc()}
                    currentSlide={currentSlide}
                    totalSlides={slides.length}
                    onSlideChange={setCurrentSlide}
                    visualMode={mode === "visual"}
                  />
                </div>
                {/* Tweak mode overlay */}
                {tweakMode && (
                  <div className="absolute inset-0 z-20 flex items-start justify-center pt-4 pointer-events-none">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/95 text-white text-xs font-medium rounded-full shadow-lg select-none">
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 13 }}>ads_click</span>
                      Click on an element · Esc to cancel
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-theme-tertiary rounded-3xl overflow-hidden flex flex-col flex-shrink-0" style={{ maxHeight: '28vh', minHeight: '80px' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-tertiary">
                  <span className="text-xs text-theme-secondary">
                    {slides.length > 0 ? `${currentSlide + 1} / ${slides.length}` : 'No slides'}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto overflow-y-auto p-4 scrollbar-custom">
                  <div
                    onClick={addNewSlide}
                    className="flex-shrink-0 cursor-pointer rounded-lg border-2 border border-theme-tertiary bg-theme-inverted hover:border-blue-500 transition-all flex items-center justify-center"
                    style={{ width: "100px", height: "56.25px" }}
                  >
                    <span className="material-symbols-outlined text-4xl text-theme-inverted">
                      add_2
                    </span>
                  </div>

                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragLeave={() => setHoveredSlide(null)}
                      onClick={() => setCurrentSlide(index)}
                      onMouseEnter={() => setHoveredSlide(index)}
                      onMouseLeave={() => setHoveredSlide(null)}
                      className={`flex-shrink-0 cursor-move rounded-lg overflow-hidden border-2 transition-all relative group ${currentSlide === index
                        ? "border-blue-500 ring-2 ring-blue-500/30"
                        : draggedSlide === index
                          ? "opacity-50 border-blue-400"
                          : hoveredSlide === index && draggedSlide !== null
                            ? "border-green-500"
                            : "border-theme-tertiary hover:border-gray-500"
                        }`}
                      style={{ width: "100px", height: "56.25px" }}
                    >
                      <iframe
                        srcDoc={`<!DOCTYPE html><html><head><meta charset='utf-8'><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(0.052083);transform-origin:top left;width:1920px;height:1080px;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${slide}</body></html>`}
                        className="w-full h-full border-none bg-white pointer-events-none"
                        title={`Slide ${index + 1}`}
                        style={{ background: 'white' }}
                      />

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSlide(index)
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <span className="material-symbols-outlined text-white text-sm">
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            onMouseDown={handleMouseDown}
            className="w-px bg-theme-quaternary cursor-col-resize relative select-none flex-shrink-0"
          >
            <div className="absolute inset-y-0 -left-2 -right-2" />
          </div>

          <div
            ref={editorRef}
            className="h-full flex-1 relative flex justify-center items-center"
            style={{
              width: `${100 - previewWidth}%`,
              height: "100%"
            }}
          >
            {mode === "code" && <CodeEditorMode doc={doc} onChange={onChangeDoc} />}
            {/* VISUAL MODE comentado temporalmente, descomentar para reactivar:
            {mode === "visual" && !useLegacyVisualEditor && <VisualEditorMode doc={doc} onChange={onChangeDoc} previewRef={livePreviewRef} projectId={projectId} />}
            {mode === "visual" && useLegacyVisualEditor && <VisualEditorModeLegacy doc={doc} onChange={onChangeDoc} />}
            */}
            {mode === "ai" && (
              <div className="relative flex flex-col h-full w-full overflow-hidden">
                {/* Tweak element input + edit panel — botones movidos a la navbar */}
                <div className="flex flex-col gap-2 px-4 pt-3 pb-1 flex-shrink-0">
                  {/* Panel Tweak: input pre-populado con el elemento seleccionado */}
                  {tweakElement && !tweakMode && (
                    <div className="flex gap-2 items-center">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400 flex-shrink-0 max-w-[140px] truncate">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>ads_click</span>
                        <span className="truncate">{tweakElement}</span>
                      </div>
                      <input
                        ref={tweakInputRef}
                        placeholder="What to change on this element?"
                        className="flex-1 bg-theme-primary border border-theme-tertiary rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-theme-secondary transition-colors text-theme-primary placeholder:text-theme-secondary"
                        onKeyDown={async e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            const instruction = `On the element: ${tweakElement} — ${(e.target as HTMLInputElement).value}`
                            setTweakElement(null);
                            (e.target as HTMLInputElement).value = ""
                            await callEditSlide(instruction)
                          }
                          if (e.key === "Escape") { setTweakElement(null) }
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  <GeminiChatbot
                    setCode={applySetDoc}
                    code={doc}
                    projectId={projectId || undefined}
                    currentSlideIndex={currentSlide}
                    slides={slides}
                    onDeleteSlide={deleteSlide}
                    onDeleteAllSlides={deleteAllSlides}
                    initialPrompt={initialAIPrompt}
                  />
                </div>
                {/* Edit panel flotante sobre el chatbot */}
                {showEditPanel && slides[currentSlide] && (
                  <EditPanel
                    slideHtml={slides[currentSlide]}
                    targetIndex={editTargetIndex}
                    pickMode={editPickMode}
                    onStartPickMode={enterEditPickMode}
                    onApply={(newHtml) => {
                      const updatedSlides = [...slides]
                      updatedSlides[currentSlide] = newHtml
                      applySetDoc(`<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${updatedSlides.join("\n")}</body></html>`)
                    }}
                    onClose={() => { setShowEditPanel(false); setEditPickMode(false) }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectPage() {
  return (
    <ProjectAccessRoute>
      {() => <ProjectPageContent />}
    </ProjectAccessRoute>
  )
}
