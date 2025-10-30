import React, { useEffect, useState, useRef } from "react"
import ProjectNavBar from "../RegularComponents/ProjectComponents/ProjectNavBar"
import CodeEditorMode from "../RegularComponents/ProjectComponents/Modes/CodeEditorMode"
import VisualEditorMode from "../RegularComponents/ProjectComponents/Modes/VisualEditorMode"
import LivePreview from "../RegularComponents/ProjectComponents/LivePreview"
import GeminiChatbot from "../RegularComponents/ProjectComponents/GeminiChatbot"
import { ActiveUsers } from "../RegularComponents/ProjectComponents/ActiveUsers"
import { LiveCursors } from "../RegularComponents/ProjectComponents/LiveCursors"
import { ShareModal } from "../RegularComponents/MultiuseComponents/ShareModal"
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

export default function ProjectPage() {
  const [mode, setMode] = useState<ProjectMode>("code")
  const [projectId, setProjectId] = useState<string | null>(null)
  const [name, setName] = useState<string>("Untitled")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [doc, setDoc] = useState<string>("")
  const [previewWidth, setPreviewWidth] = useState(55)
  const [drawerWidth, setDrawerWidth] = useState(160)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<string[]>([])
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const isDragging = useRef(false)
  const isDrawerDragging = useRef(false)
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

    fetch(`${urlbackend}/projects/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) setName(data.name)
      })

    fetch(`${urlbackend}/projects/${id}/slides`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.slides.length > 0) {
          setDoc(
            "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>" +
            data.slides.map((s: any) => s.html).join("\n") +
            "</body></html>"
          )
        } else {
          setDoc(
            "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><section class='slide'><h1>Slide 1</h1></section></body></html>"
          )
        }
      })
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
      .filter((s) => s.trim().length > 20)
    setSlides(extractedSlides)
    if (currentSlide >= extractedSlides.length) {
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

  const onRename = (next: string) => {
    setName(next)
  }

  const onChangeDoc = (next: string) => {
    if (isApplyingRemoteChange.current) {
      return
    }

    setDoc(next)
    setSaveState("saving")

    if (isConnected && projectId) {
      broadcastChange('doc_update', { doc: next })
    }

    window.clearTimeout((onChangeDoc as any)._t)
      ; (onChangeDoc as any)._t = window.setTimeout(async () => {
        try {
          if (!projectId) return
          const token = localStorage.getItem("token")
          if (!token) return
          const slides = next
            .split("<section")
            .filter((s) => s.trim() !== "")
            .map((s, i) => ({
              html: "<section" + s,
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
    setPreviewWidth(Math.min(Math.max(newWidth, 30), 70))
  }

  const handleMouseUp = () => {
    isDragging.current = false
    isDrawerDragging.current = false
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }

  const handleDrawerMouseDown = () => {
    isDrawerDragging.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  const handleDrawerMouseMove = (e: MouseEvent) => {
    if (!isDrawerDragging.current || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = e.clientX - containerRect.left
    setDrawerWidth(Math.min(Math.max(newWidth, 120), 300))
  }

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      handleMouseMove(e)
      handleDrawerMouseMove(e)
    }

    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  const getCurrentSlideDoc = () => {
    if (slides.length === 0) return doc
    return `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${slides[currentSlide]}</body></html>`
  }

  const isVisualMode = mode === "visual"

  return (
    <div className="w-screen h-screen flex flex-col">
      <ProjectNavBar
        name={name}
        saveState={saveState}
        onRename={onRename}
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
          <style>{`
            .scrollbar-thin::-webkit-scrollbar {
              width: 6px;
            }
            .scrollbar-thin::-webkit-scrollbar-track {
              background: #1e1e1e;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb {
              background: #3a3a3a;
              border-radius: 3px;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb:hover {
              background: #4a4a4a;
            }
          `}</style>
          <div
            style={{ width: `${previewWidth}%` }}
            className="h-full flex flex-col"
          >
            <div className={`flex-1 min-h-0 flex ${isVisualMode ? 'flex-row p-0' : 'flex-col p-4'}`}>
              {/* Vertical Slide Drawer - Left Side (Figma-like) */}
              {slides.length > 0 && isVisualMode && (
                <>
                  <div
                    className="bg-[#1e1e1e] border-r border-[#2a2a2a] py-3 flex flex-col overflow-hidden"
                    style={{ width: `${drawerWidth}px` }}
                  >
                    {/* Header */}
                    <div className="px-3 mb-3 flex items-center justify-between">
                      <button className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors bg-[#2a2a2a] px-3 py-1.5 rounded-lg">
                        <span>New slide</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Add new slide functionality
                        }}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Slides List */}
                    <div className="flex-1 overflow-y-auto px-3 space-y-2 scrollbar-thin">
                      {slides.map((slide, index) => (
                        <div
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`relative group cursor-pointer transition-all ${currentSlide === index
                              ? "bg-[#0d7dff]/10"
                              : "hover:bg-[#2a2a2a]"
                            } rounded-lg p-2`}
                        >
                          {/* Slide Number */}
                          <div className="flex items-start gap-2">
                            <span className={`text-xs font-medium mt-1 ${currentSlide === index ? "text-[#0d7dff]" : "text-gray-500"
                              }`}>
                              {index + 1}
                            </span>

                            {/* Slide Preview */}
                            <div className={`flex-1 overflow-hidden border-2 transition-all ${currentSlide === index
                                ? "border-[#0d7dff] shadow-lg shadow-[#0d7dff]/20"
                                : "border-[#3a3a3a] group-hover:border-gray-500"
                              } rounded-md`}
                              style={{ aspectRatio: "16/9" }}
                            >
                              <iframe
                                srcDoc={`<!DOCTYPE html><html><head><meta charset='utf-8'><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(0.052083);transform-origin:top left;width:1920px;height:1080px;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${slide}</body></html>`}
                                className="w-full h-full border-none bg-white pointer-events-none"
                                title={`Slide ${index + 1}`}
                                style={{ background: 'white' }}
                              />
                            </div>
                          </div>

                          {/* Hover Actions */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: Duplicate slide
                              }}
                              className="p-1 bg-[#1e1e1e] hover:bg-[#2a2a2a] rounded text-gray-400 hover:text-white transition-colors"
                              title="Duplicate"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: Delete slide
                              }}
                              className="p-1 bg-[#1e1e1e] hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer - Slide Count */}
                    <div className="px-3 pt-3 mt-2 border-t border-[#2a2a2a]">
                      <div className="text-xs text-gray-500 text-center">
                        {slides.length} slide{slides.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Resize Handle */}
                  <div
                    onMouseDown={handleDrawerMouseDown}
                    className="w-1 bg-[#2a2a2a] hover:bg-[#0d7dff] cursor-col-resize transition-colors relative group"
                  >
                    <div className="absolute inset-y-0 -left-1 -right-1" />
                  </div>
                </>
              )}

              <div className="flex-1 flex items-center justify-center">
                <div className="w-full h-full">
                  <LivePreview
                    document={getCurrentSlideDoc()}
                    currentSlide={currentSlide}
                    totalSlides={slides.length}
                    onSlideChange={setCurrentSlide}
                    visualMode={isVisualMode}
                  />
                </div>
              </div>

              {/* Horizontal Slide Drawer - Bottom (non-visual mode) */}
              {slides.length > 0 && !isVisualMode && (
                <div className={`mt-4 pt-4 border border-[#666666] py-8 px-4 rounded-4xl`}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-xs text-gray-500">
                      {currentSlide + 1} / {slides.length}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-custom">
                    {slides.map((slide, index) => (
                      <div
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${currentSlide === index
                          ? "border-blue-500 ring-2 ring-blue-500/30"
                          : "border-[#3a3a3a] hover:border-gray-500"
                          }`}
                        style={{ width: "100px", aspectRatio: "16/9" }}
                      >
                        <iframe
                          srcDoc={`<!DOCTYPE html><html><head><meta charset='utf-8'><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(0.052083);transform-origin:top left;width:1920px;height:1080px;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${slide}</body></html>`}
                          className="w-full h-full border-none bg-white pointer-events-none"
                          title={`Slide ${index + 1}`}
                          style={{ background: 'white' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                projectId={projectId}
                currentSlideIndex={currentSlide}
                slides={slides}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}