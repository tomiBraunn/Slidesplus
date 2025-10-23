import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import BasicModal from "../../MultiuseComponents/BasicModal"
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
  const [confirmText, setConfirmText] = useState("")
  const [renameText, setRenameText] = useState(name || "")
  const [busy, setBusy] = useState(false)
  const [slides, setSlides] = useState<any[]>([])
  const [selectedSlide, setSelectedSlide] = useState<number>(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const mainPreviewRef = useRef<HTMLDivElement>(null)
  const [previewsHeight, setPreviewsHeight] = useState<number>(0)
  const navigate = useNavigate()

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
    }
    if (mounted) window.addEventListener("keydown", handler)
    return () => {
      window.removeEventListener("keydown", handler)
      document.documentElement.classList.remove("overflow-hidden")
    }
  }, [mounted])

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
    const current = slides.find((s) => s.position === selectedSlide)
    if (!current) return
    const target = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
    if (!target) return
    target.open()
    target.write(`
      <html>
        <head>
          <style>
            html, body { margin:0; padding:0; height:100%; overflow:hidden; background:#ffffff }
            body > * { width:100%; height:100%; box-sizing:border-box }
          </style>
        </head>
        <body>
          ${current.html || ""}
        </body>
      </html>
    `)
    target.close()
  }, [slides, selectedSlide])

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

  const description = `${slideCount} slides${formatUSDate(lastModified) ? " · " + formatUSDate(lastModified) : ""}`

  const goOpen = () => {
    if (projectId) navigate(`/p/${projectId}`)
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
    { icon: "share", label: "Share", onClick: goOpen },
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
        className={`text-white rounded-xl defaultStyle card-animate w-[70vw] max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col border border-white/10 bg-[#0b0b0bcc] transform transition-all duration-200 ease-out backdrop-bl-sm${show ? " opacity-100 scale-100" : " opacity-0 scale-95"}`}
      >
        <div className="flex items-center justify-between gap-2 w-full p-4">
          <div className="flex items-start flex-col">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 35 }}>
                crop_landscape
              </span>
              <p className="text-white font-medium text-lg">{name || "Untitled"}</p>
            </div>
            <p className="text-[#ffffff] text-sm">{description}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center rounded-full p-2 hover:bg-white/10 text-white"
            aria-label="Close"
            title="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              close
            </span>
          </button>
        </div>

        <div className="flex items-start justify-start gap-2 w-full h-full px-4 pb-2">
          <div ref={mainPreviewRef} className="text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] w-full aspect-video p-0 overflow-hidden border-solid relative">
            <iframe ref={iframeRef} title="Project Preview" className="w-full h-full border-0" />
          </div>
          <div
            className="rounded-xl w-1/5 p-2 bg-[#0f0f0f] flex flex-col gap-2 overflow-y-auto"
            style={{ height: previewsHeight }}
          >
            {slides.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedSlide(s.position)}
                className={`cursor-pointer border rounded-md overflow-hidden ${selectedSlide === s.position ? "border-blue-500" : "border-[#2B2B2B]"}`}
                style={{ flex: "0 0 auto" }}
              >
                <div className="w-full" style={{ paddingTop: `${(9 / 16) * 100}%`, position: "relative" }}>
                  <iframe
                    title={`slide-${s.position}`}
                    srcDoc={`<html><head><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#ffffff}body>*{width:100%;height:100%;box-sizing:border-box}</style></head><body>${s.html}</body></html>`}
                    className="absolute top-0 left-0 w-full h-full border-0 pointer-events-none"
                    sandbox=""
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end self-end w-full">
          <div className="flex items-center justify-center gap-2 px-4 py-2.5">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex-1 min-w-[100px] flex items-center justify-center defaultStyle defaultStyleHover rounded-3xl p-2.5 hover:bg-[#222]"
                title={item.label}
                disabled={item.label === "Open" && !projectId}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#ffffff" }}>
                    {item.icon}
                  </span>
                  <span className="text-xs">{item.label}</span>
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
                className="px-4 py-2 rounded-lg border border-[#2B2B2B] hover:bg-[#1a1a1a]"
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
            className="w-full rounded-lg defaultStyle px-3 py-2 text-sm"
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
                className="px-4 py-2 rounded-lg border border-[#2B2B2B] hover:bg-[#1a1a1a]"
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
            className="w-full rounded-lg defaultStyle px-3 py-2 text-sm text-white"
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
          />
        </BasicModal>
      </div>
    </div>
  )
}

export default ProjectPreview
