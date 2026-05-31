// @ts-nocheck
import React, { useEffect, useState, useRef } from "react"
import { useLocation } from "react-router-dom"
import ProjectNavBar from "../RegularComponents/ProjectComponents/ProjectNavBar"
import { FullscreenLoader } from "../ui/FullscreenLoader"
import CodeEditorMode from "../RegularComponents/ProjectComponents/Modes/CodeEditorMode"
import VisualEditorMode from "../RegularComponents/ProjectComponents/Modes/VisualEditorMode"
import VisualEditorModeLegacy from "../RegularComponents/ProjectComponents/Modes/VisualEditorModeLegacy"
import LivePreview from "../RegularComponents/ProjectComponents/LivePreview"
import GeminiChatbot from "../RegularComponents/ProjectComponents/GeminiChatbot"
import { ShareModal } from "../RegularComponents/MultiuseComponents/ShareModal"
import ProjectAccessRoute from "../RegularComponents/ProjectComponents/ProjectAccessRoute"
import { useAutoSave } from "../../hooks/useAutoSave"
import { useRealtimeCollaboration } from "../../useRealtimeProject"
import { buildSlidesPayload } from "../../utils/projectDocument"
import { urlbackend } from "../../config.js"

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
  if (savedMode === "visual") return "visual";
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
      if (e.altKey && e.key === '1') {
        e.preventDefault()
        setMode('code')
      } else if (e.altKey && e.key === '2') {
        e.preventDefault()
        setMode('visual')
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
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    setPreviewWidth(Math.min(Math.max(newWidth, 25), 58))
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
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
            <div className="flex-1 min-h-0 p-4 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full h-full">
                  <LivePreview
                    ref={livePreviewRef}
                    document={getCurrentSlideDoc()}
                    currentSlide={currentSlide}
                    totalSlides={slides.length}
                    onSlideChange={setCurrentSlide}
                    visualMode={mode === "visual"}
                  />
                </div>
              </div>

              <div className="border border-theme-tertiary rounded-3xl overflow-hidden flex flex-col" style={{ maxHeight: '30vh' }}>
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
            className="w-1 bg-theme-quaternary hover:bg-blue-500 cursor-col-resize transition-colors relative group"
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-8 bg-blue-400 rounded-full" />
                <div className="w-0.5 h-8 bg-blue-400 rounded-full" />
              </div>
            </div>
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
            {mode === "visual" && !useLegacyVisualEditor && <VisualEditorMode doc={doc} onChange={onChangeDoc} previewRef={livePreviewRef} projectId={projectId} />}
            {mode === "visual" && useLegacyVisualEditor && <VisualEditorModeLegacy doc={doc} onChange={onChangeDoc} />}
            {mode === "ai" && (
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
