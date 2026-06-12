// @ts-nocheck
import React, { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { urlbackend } from "../../../config.js"

type Slide = { html: string; position?: number }

type Version = {
    id: string
    version_number: number
    change_type?: string
    name: string
    created_at: string
    username: string
    first_name?: string
    last_name?: string
    avatar?: string
    slide_count: number
    // Cargados bajo demanda al seleccionar la versión:
    content?: string | null
    slides?: Slide[]
}

type Props = {
    isOpen: boolean
    onClose: () => void
    projectId: string | null
    onVersionRestored?: (content: string) => void
}

export function VersionHistoryModal({ isOpen, onClose, projectId, onVersionRestored }: Props) {
    const navigate = useNavigate()
    const [versions, setVersions] = useState<Version[]>([])
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [show, setShow] = useState(false)
    const [savingVersion, setSavingVersion] = useState(false)
    const [newVersionName, setNewVersionName] = useState("")
    const [showNameInput, setShowNameInput] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    // Cache de detalle por id de versión para no refetch al re-seleccionar.
    const detailCacheRef = useRef<Record<string, Version>>({})

    useEffect(() => {
        if (isOpen) {
            setShow(true)
            document.documentElement.classList.add("overflow-hidden")
            detailCacheRef.current = {}
            setSelectedVersion(null)
            setError(null)
            setShowNameInput(false)
            setNewVersionName("")
            loadVersions()
        } else {
            setShow(false)
            document.documentElement.classList.remove("overflow-hidden")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, projectId])

    // Render de la slide seleccionada en el iframe principal (sandbox sin scripts).
    useEffect(() => {
        const slides = selectedVersion?.slides
        const iframe = iframeRef.current
        if (!iframe) return
        if (!slides || slides.length === 0) {
            iframe.removeAttribute("srcdoc")
            return
        }
        const slide = slides[selectedSlideIndex]
        iframe.srcdoc = `<!doctype html><html><head><style>
            html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#ffffff}
            body>*{width:100%;height:100%;box-sizing:border-box}
          </style></head><body>${slide?.html || ""}</body></html>`
    }, [selectedVersion, selectedSlideIndex])

    const authHeaders = () => {
        const token = localStorage.getItem("token")
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    const loadVersions = async () => {
        if (!projectId) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${urlbackend}/projects/${projectId}/versions`, {
                headers: authHeaders(),
            })
            if (!res.ok) throw new Error("Failed to load versions")
            const data = await res.json()
            const versionsList: Version[] = data.versions || []
            setVersions(versionsList)
            if (versionsList.length > 0) {
                selectVersion(versionsList[0])
            }
        } catch (err) {
            console.error(err)
            setError("No se pudo cargar el historial de versiones.")
        } finally {
            setLoading(false)
        }
    }

    const parseSlidesFromContent = (content?: string | null): Slide[] => {
        if (!content || typeof content !== "string") return []
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, "text/html")
        const slideElements = doc.querySelectorAll("section")
        return Array.from(slideElements).map((slide, i) => ({
            html: slide.outerHTML,
            position: i,
        }))
    }

    const normalizeSlides = (detail: any): Slide[] => {
        if (Array.isArray(detail?.slides) && detail.slides.length > 0) {
            return detail.slides.map((slide: any, index: number) => ({
                html: slide.html || slide,
                position: slide.position ?? index,
            }))
        }
        return parseSlidesFromContent(detail?.content)
    }

    // Carga el detalle (content + slides) bajo demanda y lo muestra.
    const selectVersion = async (version: Version) => {
        setSelectedSlideIndex(0)
        setError(null)

        const cached = detailCacheRef.current[version.id]
        if (cached) {
            setSelectedVersion(cached)
            return
        }

        // Mostramos metadata de inmediato mientras carga el detalle.
        setSelectedVersion({ ...version, slides: undefined })
        if (!projectId) return
        setDetailLoading(true)
        try {
            const res = await fetch(
                `${urlbackend}/projects/${projectId}/versions/${version.id}`,
                { headers: authHeaders() }
            )
            if (!res.ok) throw new Error("Failed to load version detail")
            const data = await res.json()
            const detail = data.version || {}
            const slides = normalizeSlides(detail)
            const full: Version = {
                ...version,
                content: detail.content ?? null,
                slides,
            }
            detailCacheRef.current[version.id] = full
            // Solo aplicar si sigue siendo la versión seleccionada.
            setSelectedVersion((cur) => (cur?.id === version.id ? full : cur))
        } catch (err) {
            console.error(err)
            setError("No se pudo cargar la vista previa de esta versión.")
        } finally {
            setDetailLoading(false)
        }
    }

    const handleRestore = async () => {
        if (!selectedVersion || !projectId) return
        if (!confirm("¿Restaurar esta versión? Se sobrescribirá el contenido actual del proyecto.")) return

        setBusy(true)
        setError(null)
        try {
            const res = await fetch(
                `${urlbackend}/projects/${projectId}/versions/${selectedVersion.id}/restore`,
                { method: "POST", headers: authHeaders() }
            )
            if (!res.ok) throw new Error("Failed to restore version")
            const data = await res.json()
            if (data.content && onVersionRestored) {
                onVersionRestored(data.content)
            }
            onClose()
        } catch (err) {
            console.error(err)
            setError("Error al restaurar la versión.")
        } finally {
            setBusy(false)
        }
    }

    const handleDuplicate = async () => {
        if (!selectedVersion || !projectId) return
        if (!confirm("¿Crear una copia nueva del proyecto con esta versión? El proyecto actual no se modificará.")) return

        setBusy(true)
        setError(null)
        try {
            const res = await fetch(
                `${urlbackend}/projects/${projectId}/versions/${selectedVersion.id}/duplicate`,
                { method: "POST", headers: authHeaders() }
            )
            if (!res.ok) throw new Error("Failed to duplicate version")
            const data = await res.json()
            onClose()
            if (data.project_id) {
                navigate(`/projects/${data.project_id}`)
            }
        } catch (err) {
            console.error(err)
            setError("Error al crear la copia del proyecto.")
        } finally {
            setBusy(false)
        }
    }

    const handleSaveVersion = async () => {
        if (!projectId) return
        setSavingVersion(true)
        setError(null)
        try {
            const res = await fetch(`${urlbackend}/projects/${projectId}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ name: newVersionName.trim() || null }),
            })
            if (!res.ok) throw new Error("Failed to save version")
            setShowNameInput(false)
            setNewVersionName("")
            await loadVersions()
        } catch (err) {
            console.error(err)
            setError("No se pudo guardar la versión.")
        } finally {
            setSavingVersion(false)
        }
    }

    const formatDate = (date: string) => {
        const d = new Date(date)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins} min ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return d.toLocaleDateString()
    }

    const handleClose = () => {
        setShow(false)
        setTimeout(() => onClose(), 200)
    }

    if (!isOpen) return null

    const selectedSlides = selectedVersion?.slides

    return (
        <div
            className={`fixed z-50 inset-0 flex items-center justify-center bg-black/40 transition-all duration-200 ${show ? "opacity-100 backdrop-blur-xl" : "opacity-0 backdrop-blur-0"
                }`}
            onMouseDown={handleClose}
        >
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className={`rounded-xl w-[85vw] max-w-[1300px] max-h-[90vh] overflow-hidden flex border border-white/10 bg-[#0b0b0bcc] backdrop-blur-sm transform transition-all duration-200 ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"
                    }`}
            >
                <aside className="w-64 bg-[#0f0f0f] border-r border-[#2B2B2B] flex flex-col">
                    <div className="p-4 border-b border-[#2B2B2B] flex items-center justify-between gap-2">
                        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-xl">history</span>
                            Version History
                        </h2>
                        <button
                            onClick={() => setShowNameInput((v) => !v)}
                            title="Guardar versión"
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">bookmark_add</span>
                        </button>
                    </div>

                    {showNameInput && (
                        <div className="p-3 border-b border-[#2B2B2B] bg-[#141414]">
                            <input
                                value={newVersionName}
                                onChange={(e) => setNewVersionName(e.target.value)}
                                placeholder="Nombre de la versión"
                                className="w-full px-2 py-1.5 mb-2 rounded-md bg-[#1f1f1f] border border-[#2B2B2B] text-white text-sm outline-none focus:border-blue-500"
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveVersion() }}
                                autoFocus
                            />
                            <button
                                onClick={handleSaveVersion}
                                disabled={savingVersion}
                                className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
                            >
                                {savingVersion ? "Guardando…" : "Guardar versión"}
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-2">
                        {loading ? (
                            <div className="text-center text-gray-400 py-4">Loading...</div>
                        ) : versions.length === 0 ? (
                            <div className="text-center text-gray-400 py-4 px-2 text-sm">
                                No versions yet. Versions are created automatically every minute.
                            </div>
                        ) : (
                            versions.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => selectVersion(v)}
                                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${selectedVersion?.id === v.id
                                            ? "bg-blue-600/20 border border-blue-500/50"
                                            : "bg-[#1a1a1a] hover:bg-[#222] border border-transparent"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate flex items-center gap-1">
                                                {v.change_type === "manual_save" && (
                                                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 14 }}>bookmark</span>
                                                )}
                                                {v.name || `Version ${v.version_number}`}
                                            </p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                {formatDate(v.created_at)}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                {v.slide_count} slides · {v.username || "Unknown"}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-[#2B2B2B] bg-[#1A1A1A]">
                        <p className="text-center text-gray-400 text-xs">
                            Las versiones se guardan automáticamente cada minuto al editar
                        </p>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b border-[#2B2B2B] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-white text-2xl">preview</span>
                            <div>
                                <h3 className="text-white font-medium">
                                    {selectedVersion?.name || "Select a version"}
                                </h3>
                                {selectedVersion && (
                                    <p className="text-gray-400 text-sm">
                                        {selectedVersion.slide_count} slides · Created {formatDate(selectedVersion.created_at)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {error && (
                        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                        <div className="flex-1 rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] overflow-hidden relative">
                            {detailLoading && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-[#0f0f0f]/70 z-10">
                                    Cargando vista previa…
                                </div>
                            )}
                            {!selectedVersion ? (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Select a version to preview
                                </div>
                            ) : !detailLoading && (!selectedSlides || selectedSlides.length === 0) ? (
                                <div className="flex items-center justify-center h-full text-gray-400 text-sm px-4 text-center">
                                    Esta versión no tiene contenido para previsualizar.
                                </div>
                            ) : (
                                <iframe
                                    ref={iframeRef}
                                    title="Version Preview"
                                    sandbox="allow-same-origin"
                                    className="w-full h-full border-0"
                                />
                            )}
                        </div>

                        {selectedSlides && selectedSlides.length > 0 && (
                            <div className="w-48 rounded-xl bg-[#0f0f0f] p-2 overflow-y-auto">
                                {selectedSlides.map((slide: Slide, index: number) => (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedSlideIndex(index)}
                                        className={`cursor-pointer border rounded-md overflow-hidden mb-2 ${selectedSlideIndex === index ? "border-blue-500" : "border-[#2B2B2B]"
                                            }`}
                                    >
                                        <div className="w-full" style={{ paddingTop: "56.25%", position: "relative" }}>
                                            <iframe
                                                title={`slide-${index}`}
                                                sandbox="allow-same-origin"
                                                srcDoc={`<!doctype html><html><head><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff}</style></head><body>${slide.html}</body></html>`}
                                                className="absolute top-0 left-0 w-full h-full border-0 pointer-events-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-[#2B2B2B] flex justify-end gap-2">
                        <button
                            onClick={handleDuplicate}
                            disabled={!selectedVersion || busy}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">content_copy</span>
                            Crear copia
                        </button>
                        <button
                            onClick={handleRestore}
                            disabled={!selectedVersion || busy}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">restore</span>
                            {busy ? "Procesando…" : "Restaurar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
