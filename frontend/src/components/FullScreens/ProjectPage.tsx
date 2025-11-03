// @ts-nocheck
import React, { useEffect, useState, useRef } from "react"
import ProjectNavBar from "../RegularComponents/ProjectComponents/ProjectNavBar"
import CodeEditorMode from "../RegularComponents/ProjectComponents/Modes/CodeEditorMode"
import VisualEditorMode from "../RegularComponents/ProjectComponents/Modes/VisualEditorMode"
import LivePreview from "../RegularComponents/ProjectComponents/LivePreview"
import GeminiChatbot from "../RegularComponents/ProjectComponents/GeminiChatbot"
import { ActiveUsers } from "../RegularComponents/ProjectComponents/ActiveUsers"
import { LiveCursors } from "../RegularComponents/ProjectComponents/LiveCursors"
import { ShareModal } from "../RegularComponents/MultiuseComponents/ShareModal"
import ProjectAccessRoute from "../RegularComponents/ProjectComponents/ProjectAccessRoute"
import { useRealtimeCollaboration } from "../../useRealtimeProject"
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
  const [mode, setMode] = useState<ProjectMode>("code")
  const [projectId, setProjectId] = useState<string | null>(null)
  const [name, setName] = useState<string>("Untitled")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [doc, setDoc] = useState<string>("")
  const [previewWidth, setPreviewWidth] = useState(55)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<string[]>([])
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [draggedSlide, setDraggedSlide] = useState<number | null>(null)
  const [hoveredSlide, setHoveredSlide] = useState<number | null>(null)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const isApplyingRemoteChange = useRef(false)

  const user = getUserFromStorage()

  const {
    activeUsers,
    lastChange,
    chatMessages,
    cursors,
    isConnected,
    broadcastChange,
    updatePresence,
    updateCursor,
    sendChatMessage,
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
    const parts = window.location.pathname.split("/")
    const id = parts[parts.length - 1]
    if (!id) return
    setProjectId(id)

    const token = localStorage.getItem("token")
    if (!token) return

    const loadProject = async () => {
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

        if (slidesData.ok && slidesData.slides.length > 0) {
          setDoc(
            "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>" +
            slidesData.slides.map((s: any) => s.html).join("\n") +
            "</body></html>"
          )
        } else {
          setDoc(
            "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><section class='slide'><h1>Slide 1</h1></section></body></html>"
          )
        }
      } catch (error) {
        console.error("Error loading project:", error)
      }
    }

    loadProject()
  }, [])

  useEffect(() => {
    if (!lastChange) return

    if (lastChange.change_type === 'doc_update') {
      isApplyingRemoteChange.current = true
      setDoc(lastChange.change_data.doc)
      setTimeout(() => {
        isApplyingRemoteChange.current = false
      }, 100)
    }

    clearLastChange()
  }, [lastChange, clearLastChange])

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

  useEffect(() => {
    if (projectId && currentSlide !== undefined) {
      updatePresence(currentSlide)
    }
  }, [currentSlide, projectId, updatePresence])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (editorRef.current && projectId) {
        const rect = editorRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          updateCursor(e.clientX, e.clientY, currentSlide)
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [projectId, currentSlide, updateCursor])

  const onChangeDoc = (next: string) => {
    if (isApplyingRemoteChange.current) {
      return
    }

    const minimalDoc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><section class=\"slide\"></section></body></html>"

    const hasContent = next.replace(/<[^>]*>/g, '').trim().length > 0
    const finalDoc = hasContent ? next : minimalDoc

    setDoc(finalDoc)
    setSaveState("saving")

    if (isConnected && projectId) {
      broadcastChange('doc_update', { doc: finalDoc })
    }

    window.clearTimeout((onChangeDoc as any)._t)
      ; (onChangeDoc as any)._t = window.setTimeout(async () => {
        try {
          if (!projectId) return
          const token = localStorage.getItem("token")
          if (!token) return
          const slides = finalDoc
            .split(/<section/i)
            .slice(1)
            .map((s) => "<section" + s.split("</section>")[0] + "</section>")
            .filter((s) => s.trim() !== "")
            .map((s, i) => ({
              html: s,
              position: i,
            }))
          await fetch(`${urlbackend}/projects/${projectId}/slides`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ slides }),
          })
          setSaveState("saved")
          window.setTimeout(() => setSaveState("idle"), 800)
        } catch {
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
        onShareClick={() => setShareModalOpen(true)}
      />

      {user && (
        <>
          <ActiveUsers
            users={activeUsers as any}
            currentUserId={user.id}
            isConnected={isConnected}
          />
          <LiveCursors cursors={cursors} currentSlideIndex={currentSlide} />
        </>
      )}

      <ShareModal
        projectId={projectId}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      <div className="flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full flex bg-[#121212]">
          <div
            style={{ width: `${previewWidth}%` }}
            className="h-full flex flex-col"
          >
            <div className="flex-1 min-h-0 p-4 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full h-full">
                  <LivePreview
                    document={getCurrentSlideDoc()}
                    currentSlide={currentSlide}
                    totalSlides={slides.length}
                    onSlideChange={setCurrentSlide}
                  />
                </div>
              </div>

              <div className="mt-4 border border-[#666666] rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '30vh' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#666666] bg-[#1a1a1a]">
                  <span className="text-xs text-gray-500">
                    {slides.length > 0 ? `${currentSlide + 1} / ${slides.length}` : 'No slides'}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto overflow-y-auto p-4 scrollbar-custom">
                  <div
                    onClick={addNewSlide}
                    className="flex-shrink-0 cursor-pointer rounded-lg border-2 border-dashed border-[#3a3a3a] hover:border-blue-500 transition-all flex items-center justify-center bg-[#1a1a1a]"
                    style={{ width: "100px", height: "56.25px" }}
                  >
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
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
                      className={`flex-shrink-0 cursor-move rounded-lg overflow-hidden border-2 transition-all relative group ${
                        currentSlide === index
                          ? "border-blue-500 ring-2 ring-blue-500/30"
                          : draggedSlide === index
                          ? "opacity-50 border-blue-400"
                          : hoveredSlide === index && draggedSlide !== null
                          ? "border-green-500"
                          : "border-[#3a3a3a] hover:border-gray-500"
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
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            onMouseDown={handleMouseDown}
            className="w-1 bg-[#2a2a2a] hover:bg-blue-500 cursor-col-resize transition-colors relative group"
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
            {mode === "visual" && <VisualEditorMode doc={doc} onChange={onChangeDoc} />}
            {mode === "ai" && (
              <GeminiChatbot
                setCode={applySetDoc}
                code={doc}
                projectId={projectId || undefined}
                currentSlideIndex={currentSlide}
                slides={slides}
                onDeleteSlide={deleteSlide}
                onDeleteAllSlides={deleteAllSlides}
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
