// @ts-nocheck
import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import BasicModal from "../../MultiuseComponents/BasicModal"
import { ShareModal } from "../../MultiuseComponents/ShareModal"
import { urlbackend } from "../../../../config.js"

type ActionItem = {
  icon: string
  label: string
  onClick?: () => void
}

type Props = {
  open: boolean
  name: string
  projectId?: string
  slideCount?: number
  lastModified?: string | Date | null
  onClose: () => void
  onDelete?: (id: string) => Promise<void> | void
  onRename?: (id: string, newName: string) => Promise<void> | void
  actions?: ActionItem[]
}

function ProjectPreview({
  open,
  name,
  projectId,
  slideCount = 0,
  lastModified = null,
  onClose,
  onDelete,
  onRename,
  actions,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [renameText, setRenameText] = useState(name || "")
  const [busy, setBusy] = useState(false)
  const [slides, setSlides] = useState<any[]>([])
  const [selectedSlide, setSelectedSlide] = useState<number>(0)
  const [mainScale, setMainScale] = useState(1)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const mainPreviewRef = useRef<HTMLDivElement>(null)
  const [previewsHeight, setPreviewsHeight] = useState<number>(0)
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (open) {
      setMounted(true)
      document.documentElement.classList.add("overflow-hidden")
      requestAnimationFrame(() => setShow(true))
    } else {
      setShow(false)
      setShowDelete(false)
      setShowRename(false)
      setConfirmText("")
      document.documentElement.classList.remove("overflow-hidden")
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
      if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
        if (selectedSlide < slides.length - 1) {
          setSelectedSlide(selectedSlide + 1)
        }
      }
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowUp")) {
        if (selectedSlide > 0) {
          setSelectedSlide(selectedSlide - 1)
        }
      }
    }
    if (mounted) window.addEventListener("keydown", handler)
    return () => {
      window.removeEventListener("keydown", handler)
      document.documentElement.classList.remove("overflow-hidden")
    }
  }, [mounted, selectedSlide, slides.length])

  useEffect(() => {
    setRenameText(name || "")
  }, [name])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!open || !projectId) return
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`${urlbackend}/projects/${projectId}/slides`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (!res.ok) throw new Error("Failed to load slides")
        const data = await res.json()
        if (!cancelled) {
          setSlides(data.slides || [])
          setSelectedSlide(0)
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, projectId])

  useEffect(() => {
    function updateScale() {
      if (!mainPreviewRef.current) return
      const rect = mainPreviewRef.current.getBoundingClientRect()
      const containerWidth = rect.width
      const containerHeight = rect.height
      const baseWidth = 1920
      const baseHeight = 1080
      const scaleX = containerWidth / baseWidth
      const scaleY = containerHeight / baseHeight
      const newScale = Math.min(scaleX, scaleY)
      setMainScale(newScale)
    }
    updateScale()
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale)
  }, [slides])

  useEffect(() => {
    const current = slides.find((s) => s.position === selectedSlide)
    if (!current) return
    const target = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
    if (!target) return
    target.open()
    target.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            html, body { width:1920px; height:1080px; overflow:hidden; background:white; }
            body { 
              transform: scale(${mainScale}); 
              transform-origin: top left; 
              display:flex; 
              align-items:center; 
              justify-content:center; 
            }
            section { 
              width:1920px; 
              height:1080px; 
              display:flex; 
              flex-direction:column; 
              align-items:center; 
              justify-content:center; 
              padding:4rem; 
              text-align:center; 
              background:white; 
            }
          </style>
        </head>
        <body>
          ${current.html || ""}
        </body>
      </html>
    `)
    target.close()
  }, [slides, selectedSlide, mainScale])

  useEffect(() => {
    function updateHeight() {
      if (mainPreviewRef.current) {
        setPreviewsHeight(mainPreviewRef.current.offsetHeight)
      }
    }
    updateHeight()
    window.addEventListener("resize", updateHeight)
    return () => window.removeEventListener("resize", updateHeight)
  }, [slides])

  const handleClose = () => setShow(false)

  const handleTransitionEnd = () => {
    if (!show) {
      setMounted(false)
      setShowDelete(false)
      setShowRename(false)
      setConfirmText("")
      document.documentElement.classList.remove("overflow-hidden")
      onClose()
    }
  }

  const formatUSDate = (d: string | Date | null | undefined) => {
    if (!d) return ""
    const date = typeof d === "string" ? new Date(d) : d
    if (!(date instanceof Date) || isNaN(date.getTime())) return ""
    const m = String(date.getMonth() + 1)
    const day = String(date.getDate())
    const y = date.getFullYear()
    return `${m}/${day}/${y}`
  }

  const description = `${slides.length} slides${formatUSDate(lastModified) ? " · " + formatUSDate(lastModified) : ""}`

  const goOpen = () => {
    if (projectId) navigate(`/p/${projectId}`)
  }

  const goPresent = () => {
    if (projectId) navigate(`/v/${projectId}`)
  }

  const token = localStorage.getItem("token")

  const doDelete = async () => {
    if (!projectId) return
    if (confirmText !== name) return
    setBusy(true)
    try {
      const res = await fetch(`${urlbackend}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        setBusy(false)
        return
      }
      await onDelete?.(projectId)
      setShowDelete(false)
      setConfirmText("")
      handleClose()
    } finally {
      setBusy(false)
    }
  }

  const doRename = async () => {
    if (!projectId) return
    const next = renameText.trim() || "Untitled"
    setBusy(true)
    try {
      const res = await fetch(`${urlbackend}/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: next }),
      })
      if (!res.ok) {
        setBusy(false)
        return
      }
      await onRename?.(projectId, next)
      setShowRename(false)
    } finally {
      setBusy(false)
    }
  }

  const defaultActions: ActionItem[] = [
    { icon: "delete", label: "Delete", onClick: () => setShowDelete(true) },
    { icon: "edit", label: "Rename", onClick: () => setShowRename(true) },
    { icon: "share", label: "Share", onClick: () => setShowShare(true) },
    { icon: "slideshow", label: "Present", onClick: goPresent },
    { icon: "open_in_new", label: "Open", onClick: goOpen },
  ]
  const items = actions?.length ? actions : defaultActions

  if (!mounted) return null

  return (
    <div
      className={[
        "fixed z-50 inset-0 flex items-center justify-center",
        "bg-black/40 transition-[backdrop-filter,opacity] duration-200 ease-out",
        show ? "opacity-100 backdrop-blur-xl" : "opacity-0 backdrop-blur-0",
      ].join(" ")}
      onMouseDown={handleClose}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`text-white rounded-xl bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 card-animate w-[95vw] md:w-[85vw] max-w-[1400px] h-[90vh] md:max-h-[90vh] overflow-hidden flex flex-col border border-white/10 bg-[#0b0b0bcc] transform transition-all duration-200 ease-out backdrop-bl-sm select-none${show ? " opacity-100 scale-100" : " opacity-0 scale-95"}`}
      >
        <div className="flex items-center justify-between gap-2 w-full p-2 md:p-4 flex-shrink-0">
          <div className="flex items-start flex-col min-w-0 flex-1 text-theme-primary">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: isMobile ? 24 : 35 }}>
                crop_landscape
              </span>
              <p className="font-medium text-sm md:text-lg truncate select-text">{name || "Untitled"}</p>
            </div>
            {!isMobile && <p className="text-xs md:text-sm">{description}</p>}
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center rounded-full p-1.5 md:p-2 hover:bg-theme-hover text-theme-primary flex-shrink-0"
            aria-label="Close"
            title="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </div>

        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-start justify-start gap-2 w-full min-h-0 px-2 md:px-4 pb-1 md:pb-2`} style={{ flex: '1 1 0', overflow: 'hidden' }}>
          <div ref={mainPreviewRef} className={`text-white rounded-xl border  bg-white ${isMobile ? 'w-full flex-1 min-h-0' : 'w-full'} ${isMobile ? '' : 'aspect-video'} p-0 overflow-hidden border-solid relative select-none`}>
            {slides.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-400 text-lg">Empty presentation - Add slides to get started!</p>
              </div>
            ) : (
              <iframe ref={iframeRef} title="Project Preview" className="w-full h-full border-0 bg-white" style={{ background: 'white' }} />
            )}
          </div>
          <div
            className={`rounded-xl ${isMobile ? 'w-full h-16' : 'w-1/6 min-w-[120px]'} p-1.5 md:p-2 flex ${isMobile ? 'flex-row overflow-x-auto' : 'flex-col overflow-y-auto'} gap-1.5 md:gap-2 scrollbar-custom flex-shrink-0`}
            style={isMobile ? {} : { height: previewsHeight }}
          >
            {slides.map((s) => {
              const thumbWidth = isMobile
                ? 90
                : mainPreviewRef.current ? mainPreviewRef.current.offsetWidth * 0.2 - 16 : 100
              const thumbScale = thumbWidth / 1920

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSlide(s.position)}
                  className={`cursor-pointer border rounded-md overflow-hidden bg-white ${selectedSlide === s.position ? "border-blue-500 border-2" : "border-transparent"}`}
                  style={{
                    flex: "0 0 auto",
                    aspectRatio: "16/9",
                    ...(isMobile ? { width: '90px', height: '50px' } : {})
                  }}
                >
                  <iframe
                    title={`slide-${s.position}`}
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(${thumbScale});transform-origin:top left;width:1920px;height:1080px;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${s.html}</body></html>`}
                    className="w-full h-full border-0 pointer-events-none bg-white"
                    sandbox=""
                    style={{ background: 'white' }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-end self-end w-full flex-shrink-0">
          <div className={`flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2.5 ${isMobile ? 'w-full' : ''}`}>
            {items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`${isMobile ? 'flex-1' : 'min-w-[100px]'} flex items-center justify-center bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 hover:bg-theme-hover rounded-3xl p-1.5 md:p-2.5 hover:bg-[#222]`}
                title={item.label}
                disabled={item.label === "Open" && !projectId}
              >
                <div className="flex items-center justify-center gap-1 text-theme-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: isMobile ? 18 : 18,}}>
                    {item.icon}
                  </span>
                  <span className={`text-xs ${isMobile ? 'hidden' : ''}`}>{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <BasicModal
          open={showDelete}
          title="Delete project"
          description={`Please type "${name}" to confirm deletion.`}
          onClose={() => {
            setConfirmText("")
            setShowDelete(false)
          }}
          actions={
            <>
              <button
                onClick={() => {
                  setConfirmText("")
                  setShowDelete(false)
                }}
                disabled={busy}
                className="px-4 py-2 rounded-lg border hover:bg-theme-hover"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={confirmText !== name || busy}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          }
        >
          <input
            className="w-full rounded-lg bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 px-3 py-2 text-sm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={name}
          />
        </BasicModal>

        <BasicModal
          open={showRename}
          title="Rename project"
          onClose={() => setShowRename(false)}
          actions={
            <>
              <button
                onClick={() => setShowRename(false)}
                disabled={busy}
                className="px-4 py-2 rounded-lg border hover:bg-theme-hover"
              >
                Cancel
              </button>
              <button
                onClick={doRename}
                disabled={!renameText.trim() || busy}
                className="px-4 py-2 rounded-lg bg-[#d0d0d0] text-black hover:brightness-95 disabled:opacity-50"
              >
                Save
              </button>
            </>
          }
        >
          <input
            className="w-full rounded-lg bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 px-3 py-2 text-sm text-white"
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
          />
        </BasicModal>

        <ShareModal
          projectId={projectId || null}
          isOpen={showShare}
          onClose={() => setShowShare(false)}
        />
      </div>
    </div>
  )
}

export default ProjectPreview