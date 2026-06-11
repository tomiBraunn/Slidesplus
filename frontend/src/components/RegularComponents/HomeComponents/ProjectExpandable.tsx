// @ts-nocheck
import React, { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
  useExpandableScreen,
} from "../../ui/expandable-screen"
import SpotlightCard from "../MultiuseComponents/SpotlightCard"
import BasicModal from "../MultiuseComponents/BasicModal"
import { ShareModal } from "../MultiuseComponents/ShareModal"
import { urlbackend } from "../../../config.js"

type UserInfo = {
  id: string
  username: string
  avatar?: string
  first_name?: string
  last_name?: string
}

type Project = {
  id: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
  slideCount?: number
  owner?: UserInfo
  collaborators?: UserInfo[]
  preview_url?: string
}

type Props = {
  project: Project
  listMode?: boolean
  onDelete?: (id: string) => void
  onRename?: (id: string, name: string) => void
}

const normalizeAvatar = (avatar?: string): string | undefined => {
  if (!avatar) return undefined
  if (avatar.startsWith("data:image")) return avatar
  if (avatar.startsWith("http")) return avatar
  return `data:image/png;base64,${avatar}`
}

const getInitials = (firstName?: string, lastName?: string, username?: string): string => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  if (username) return username[0].toUpperCase()
  return "?"
}

const formatDate = (d?: string | Date | null) => {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return ""
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

// ─── Tile (trigger) ───────────────────────────────────────────────────────────

function ProjectTileInner({ project, listMode }: { project: Project; listMode?: boolean }) {
  const { expand } = useExpandableScreen()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.25)
  const [slidePreview, setSlidePreview] = useState<string | null>(null)

  useEffect(() => {
    if (listMode || !project.id) return
    const load = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`${urlbackend}/projects/${project.id}/slides`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const slides = data.slides || data
        if (Array.isArray(slides) && slides.length > 0) {
          setSlidePreview(slides[0].html || slides[0].content || null)
        }
      } catch {}
    }
    load()
  }, [project.id, listMode])

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return
      const { offsetWidth: w, offsetHeight: h } = containerRef.current
      if (w > 0 && h > 0) setScale(Math.min(w / 1920, h / 1080))
    }
    const t = setTimeout(update, 100)
    window.addEventListener("resize", update)
    return () => { clearTimeout(t); window.removeEventListener("resize", update) }
  }, [slidePreview])

  const visibleCollabs = (project.collaborators || []).slice(0, 3)

  if (listMode) {
    return (
      <SpotlightCard
        className="rounded-full bg-theme-quaternary backdrop-blur-xl border border-theme-tertiary text-theme-primary hover:bg-theme-hover transition-colors duration-300 w-full cursor-pointer flex flex-row items-center py-2 px-3 gap-3"
        spotlightColor="rgba(255, 255, 255, 0.15)"
      >
        <span className="material-symbols-outlined aspect-square shrink-0" style={{ fontSize: "22px" }}>
          crop_landscape
        </span>
        <div className="flex w-full min-w-0 text-left flex-row items-center justify-start gap-3">
          <p className="truncate w-full min-w-0 text-left text-[clamp(14px,1.5vw,20px)]" title={project.name}>
            {project.name}
          </p>
        </div>
      </SpotlightCard>
    )
  }

  return (
    <SpotlightCard
      className="rounded-[15px] bg-theme-quaternary backdrop-blur-xl border border-theme-tertiary transition-all duration-300 w-full cursor-pointer flex flex-col gap-2 overflow-hidden group p-1.5 hover:bg-theme-hover"
      spotlightColor="rgba(255, 255, 255, 0.15)"
    >
      <div
        ref={containerRef}
        className="w-full aspect-[16/9] bg-white overflow-hidden relative rounded-[15px] border border-theme-tertiary flex items-center justify-center"
      >
        {slidePreview ? (
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(${scale});transform-origin:top left;width:1920px;height:1080px;}section{width:1920px;height:1080px;}</style></head><body>${slidePreview}</body></html>`}
            className="w-full h-full border-0 pointer-events-none bg-white"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="material-symbols-outlined text-gray-400 opacity-50" style={{ fontSize: "35px" }}>
              crop_landscape
            </span>
            <p className="text-[10px] text-gray-500">Empty project</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center pl-1">
          {project.owner && (
            <div className="relative">
              {project.owner.avatar ? (
                <img
                  src={normalizeAvatar(project.owner.avatar)}
                  alt={project.owner.username}
                  className="w-3.5 h-3.5 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    const sib = e.currentTarget.nextElementSibling as HTMLElement
                    if (sib) sib.style.display = "flex"
                  }}
                />
              ) : null}
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-medium text-[6px] bg-gradient-to-br from-blue-500 to-purple-600 ${project.owner.avatar ? "hidden" : ""}`}
              >
                {getInitials(project.owner.first_name, project.owner.last_name, project.owner.username)}
              </div>
            </div>
          )}
          {visibleCollabs.map((c, i) => (
            <div key={c.id || i} className="relative">
              {c.avatar ? (
                <img
                  src={normalizeAvatar(c.avatar)}
                  alt={c.username}
                  className="w-3.5 h-3.5 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    const sib = e.currentTarget.nextElementSibling as HTMLElement
                    if (sib) sib.style.display = "flex"
                  }}
                />
              ) : null}
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-medium text-[6px] bg-gradient-to-br from-green-500 to-teal-600 ${c.avatar ? "hidden" : ""}`}
              >
                {getInitials(c.first_name, c.last_name, c.username)}
              </div>
            </div>
          ))}
        </div>
        <p className="truncate flex-1 text-left text-base font-medium text-theme-primary" title={project.name}>
          {project.name}
        </p>
      </div>
    </SpotlightCard>
  )
}

// ─── Expanded content (preview panel) ────────────────────────────────────────

function ProjectPreviewContent({ project, onDelete, onRename }: {
  project: Project
  onDelete?: (id: string) => void
  onRename?: (id: string, name: string) => void
}) {
  const { collapse } = useExpandableScreen()
  const navigate = useNavigate()

  const [slides, setSlides] = useState<any[]>([])
  const [selectedSlide, setSelectedSlide] = useState(0)
  const [mainScale, setMainScale] = useState(1)
  const [mainDims, setMainDims] = useState({ width: 0, height: 0 })
  const [previewsHeight, setPreviewsHeight] = useState(0)

  const [showDelete, setShowDelete] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [renameText, setRenameText] = useState(project.name || "")
  const [busy, setBusy] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mainPreviewRef = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem("token")

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Load slides
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!project.id) return
      try {
        const res = await fetch(`${urlbackend}/projects/${project.id}/slides`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setSlides(data.slides || [])
          setSelectedSlide(0)
        }
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [project.id])

  // Scale observer
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      const s = Math.min(rect.width / 1920, rect.height / 1080)
      setMainScale(s)
      setMainDims({ width: 1920 * s, height: 1080 * s })
    }
    update()
    const ro = new ResizeObserver(() => requestAnimationFrame(update))
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    window.addEventListener("resize", update)
    return () => { ro.disconnect(); window.removeEventListener("resize", update) }
  }, [slides])

  // Preview height
  useEffect(() => {
    const update = () => {
      if (mainPreviewRef.current) setPreviewsHeight(mainPreviewRef.current.offsetHeight)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [slides])

  // Write slide to iframe
  useEffect(() => {
    const current = slides.find((s) => s.position === selectedSlide)
    if (!current) return
    const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { width:1920px; height:1080px; overflow:hidden; background:white; }
      body { transform:scale(${mainScale}); transform-origin:top left; }
      section { width:1920px; height:1080px; }
    </style></head><body>${current.html || ""}</body></html>`)
    doc.close()
  }, [slides, selectedSlide, mainScale])

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
        setSelectedSlide((s) => Math.min(s + 1, slides.length - 1))
      }
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowUp")) {
        setSelectedSlide((s) => Math.max(s - 1, 0))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [slides.length])

  const doDelete = async () => {
    if (!project.id || confirmText !== project.name) return
    setBusy(true)
    try {
      const res = await fetch(`${urlbackend}/projects/${project.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      if (!res.ok) return
      onDelete?.(project.id)
      collapse()
    } finally { setBusy(false) }
  }

  const doRename = async () => {
    if (!project.id) return
    const next = renameText.trim() || "Untitled"
    setBusy(true)
    try {
      const res = await fetch(`${urlbackend}/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: next }),
      })
      if (!res.ok) return
      onRename?.(project.id, next)
      setShowRename(false)
    } finally { setBusy(false) }
  }

  const description = `${slides.length} slide${slides.length !== 1 ? "s" : ""}${formatDate(project.updated_at) ? " · " + formatDate(project.updated_at) : ""}`

  const actions = [
    { icon: "delete", label: "Delete", onClick: () => setShowDelete(true) },
    { icon: "edit", label: "Rename", onClick: () => setShowRename(true) },
    { icon: "share", label: "Share", onClick: () => setShowShare(true) },
    { icon: "slideshow", label: "Present", onClick: () => { collapse(); navigate(`/v/${project.id}`) } },
    { icon: "open_in_new", label: "Open", onClick: () => { collapse(); navigate(`/p/${project.id}`) } },
  ]

  return (
    <div className="w-full h-full flex flex-col bg-theme-quaternary border border-theme-tertiary rounded-[20px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 w-full p-2 md:p-4 flex-shrink-0">
        <div className="flex items-start flex-col min-w-0 flex-1 text-theme-primary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: isMobile ? 24 : 35 }}>crop_landscape</span>
            <p className="font-medium text-sm md:text-lg truncate select-text">{project.name || "Untitled"}</p>
          </div>
          {!isMobile && <p className="text-xs md:text-sm text-theme-secondary">{description}</p>}
        </div>
        <button
          onClick={collapse}
          className="flex items-center justify-center rounded-full p-1.5 md:p-2 hover:bg-theme-hover text-theme-primary flex-shrink-0"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      {/* Preview area */}
      <div
        className={`flex ${isMobile ? "flex-col" : "flex-row"} items-start gap-2 w-full min-h-0 px-2 md:px-4 pb-1 md:pb-2`}
        style={{ flex: "1 1 0", overflow: "hidden" }}
      >
        <div
          ref={wrapperRef}
          className={`flex items-center justify-start ${isMobile ? "w-full flex-1 min-h-0" : "flex-1 min-h-0 h-full"}`}
        >
          <div
            ref={mainPreviewRef}
            className="rounded-xl border border-theme-tertiary bg-theme-quaternary overflow-hidden relative select-none flex-shrink-0"
            style={{ width: mainDims.width || "100%", height: mainDims.height || "auto" }}
          >
            {slides.length === 0 ? (
              <div className="min-w-full min-h-full flex items-center justify-center">
                <p className="text-gray-400 text-lg">Empty presentation</p>
              </div>
            ) : (
              <iframe ref={iframeRef} title="Project Preview" className="w-full h-full border-0" />
            )}
          </div>
        </div>

        {/* Slide strip */}
        <div
          className={`rounded-xl bg-theme-quaternary backdrop-blur-xl ${isMobile ? "w-full h-16" : "w-1/6 min-w-[120px]"} p-1.5 md:p-2 flex ${isMobile ? "flex-row overflow-x-auto" : "flex-col overflow-y-auto"} gap-1.5 md:gap-2 scrollbar-custom flex-shrink-0`}
          style={isMobile ? {} : { height: previewsHeight }}
        >
          {slides.map((s) => {
            const thumbW = isMobile ? 90 : (mainPreviewRef.current ? mainPreviewRef.current.offsetWidth * 0.2 - 16 : 100)
            const thumbScale = thumbW / 1920
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSlide(s.position)}
                className={`cursor-pointer border rounded-md overflow-hidden bg-theme-quaternary ${selectedSlide === s.position ? "border-blue-500 border-2" : "border-theme-tertiary"}`}
                style={{ flex: "0 0 auto", aspectRatio: "16/9", ...(isMobile ? { width: "90px", height: "50px" } : {}) }}
              >
                <iframe
                  title={`slide-${s.position}`}
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(${thumbScale});transform-origin:top left;}section{width:1920px;height:1080px;}</style></head><body>${s.html}</body></html>`}
                  className="w-full h-full border-0 pointer-events-none"
                  sandbox=""
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end self-end w-full flex-shrink-0">
        <div className={`flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2.5 ${isMobile ? "w-full" : ""}`}>
          {actions.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`${isMobile ? "flex-1" : "min-w-[100px]"} flex items-center justify-center bg-theme-quaternary backdrop-blur-xl border border-theme-tertiary text-theme-primary transition-colors duration-300 hover:bg-theme-hover rounded-3xl p-1.5 md:p-2.5`}
              disabled={item.label === "Open" && !project.id}
            >
              <div className="flex items-center justify-center gap-1 text-theme-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
                <span className={`text-xs ${isMobile ? "hidden" : ""}`}>{item.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Delete modal */}
      <BasicModal
        open={showDelete}
        title="Delete project"
        description={`Please type "${project.name}" to confirm deletion.`}
        onClose={() => { setConfirmText(""); setShowDelete(false) }}
        actions={
          <>
            <button onClick={() => { setConfirmText(""); setShowDelete(false) }} disabled={busy} className="px-4 py-2 rounded-lg border hover:bg-theme-hover">Cancel</button>
            <button onClick={doDelete} disabled={confirmText !== project.name || busy} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50">Delete</button>
          </>
        }
      >
        <input
          className="w-full rounded-lg bg-theme-primary border border-theme-tertiary text-theme-primary px-3 py-2 text-sm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={project.name}
        />
      </BasicModal>

      {/* Rename modal */}
      <BasicModal
        open={showRename}
        title="Rename project"
        onClose={() => setShowRename(false)}
        actions={
          <>
            <button onClick={() => setShowRename(false)} disabled={busy} className="px-4 py-2 rounded-lg border hover:bg-theme-hover">Cancel</button>
            <button onClick={doRename} disabled={!renameText.trim() || busy} className="px-4 py-2 rounded-lg bg-[#d0d0d0] text-black hover:brightness-95 disabled:opacity-50">Save</button>
          </>
        }
      >
        <input
          className="w-full rounded-lg bg-theme-primary border border-theme-tertiary text-theme-primary px-3 py-2 text-sm"
          value={renameText}
          onChange={(e) => setRenameText(e.target.value)}
        />
      </BasicModal>

      <ShareModal projectId={project.id || null} isOpen={showShare} onClose={() => setShowShare(false)} />
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function ProjectExpandable({ project, listMode, onDelete, onRename }: Props) {
  return (
    <ExpandableScreen layoutId={`project-${project.id}`} triggerRadius="15px" contentRadius="20px" animationDuration={0.38}>
      <ExpandableScreenTrigger className="w-full">
        <ProjectTileInner project={project} listMode={listMode} />
      </ExpandableScreenTrigger>
      <ExpandableScreenContent showCloseButton={false}>
        <ProjectPreviewContent project={project} onDelete={onDelete} onRename={onRename} />
      </ExpandableScreenContent>
    </ExpandableScreen>
  )
}
