// @ts-nocheck
import React, { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { urlbackend } from "../../../config.js"

type Version = {
    id: string
    version_number: number
    name: string
    created_at: string
    username: string
    first_name?: string
    last_name?: string
    avatar?: string
    slide_count: number
    content?: string | any[]
    slides?: any[]  
}

type Props = {
    isOpen: boolean
    onClose: () => void
    projectId: string | null
}

export function VersionHistoryModal({ isOpen, onClose, projectId }: Props) {
    const navigate = useNavigate()
    const [versions, setVersions] = useState<Version[]>([])
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const [show, setShow] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const mainPreviewRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            setShow(true)
            document.documentElement.classList.add("overflow-hidden")
            loadVersions()
        } else {
            setShow(false)
            document.documentElement.classList.remove("overflow-hidden")
        }
    }, [isOpen, projectId])

    useEffect(() => {
        if (selectedVersion?.slides && selectedVersion.slides.length > 0) {
            const slide = selectedVersion.slides[selectedSlideIndex]
            if (!slide) return

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
          <body>${slide.html || ""}</body>
        </html>
      `)
            target.close()
        }
    }, [selectedVersion, selectedSlideIndex])

    const loadVersions = async () => {
        if (!projectId) return
        setLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${urlbackend}/projects/${projectId}/versions`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error("Failed to load versions")
            const data = await res.json()
            console.log('Versions data from backend:', data)
            const versionsList = data.versions || []
            setVersions(versionsList)
            if (versionsList.length > 0) {
                console.log('First version:', versionsList[0])
                loadVersionDetailDirect(versionsList[0])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const parseSlidesFromVersion = (version: Version) => {
        if (version.slides && Array.isArray(version.slides) && version.slides.length > 0) {
            return version.slides.map((slide: any, index: number) => ({
                html: slide.html || slide,
                position: slide.position ?? index,
            }))
        }

        const contentData = version.content
        if (!contentData || typeof contentData !== "string") return []

        const parser = new DOMParser()
        const doc = parser.parseFromString(contentData, "text/html")
        const slideElements = doc.querySelectorAll("section")

        if (slideElements.length > 0) {
            return Array.from(slideElements).map((slide) => ({
                html: slide.outerHTML,
            }))
        }

        return []
    }

    const loadVersionDetailDirect = (version: Version) => {
        try {
            const slides = parseSlidesFromVersion(version)
            if (slides.length === 0) {
                console.error("No slides in version:", version)
                return
            }

            setSelectedVersion({ ...version, slides })
            setSelectedSlideIndex(0)
        } catch (err) {
            console.error("Error parsing version content:", err)
        }
    }

    const loadVersionDetail = (versionId: string) => {
        const version = versions.find(v => v.id === versionId)
        console.log('Loading version detail for:', versionId, 'Found:', version)
        if (!version) {
            console.error('Version not found in list:', versionId)
            return
        }
        loadVersionDetailDirect(version)
    }

    const handleDuplicate = async () => {
        if (!selectedVersion || !projectId) return
        if (!confirm("¿Crear una copia nueva del proyecto con esta versión? El proyecto actual no se modificará.")) return

        setRestoring(true)
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(
                `${urlbackend}/projects/${projectId}/versions/${selectedVersion.id}/duplicate`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            )
            if (!res.ok) throw new Error("Failed to duplicate version")

            const data = await res.json()
            onClose()

            if (data.project_id) {
                navigate(`/projects/${data.project_id}`)
            }
        } catch (err) {
            console.error(err)
            alert("Error al crear la copia del proyecto")
        } finally {
            setRestoring(false)
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
                    <div className="p-4 border-b border-[#2B2B2B]">
                        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-xl">history</span>
                            Version History
                        </h2>
                    </div>

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
                                    onClick={() => loadVersionDetail(v.id)}
                                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${selectedVersion?.id === v.id
                                            ? "bg-blue-600/20 border border-blue-500/50"
                                            : "bg-[#1a1a1a] hover:bg-[#222] border border-transparent"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">
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
                            Versions are automatically saved every minute when changes are made
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

                    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                        <div
                            ref={mainPreviewRef}
                            className="flex-1 rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] overflow-hidden"
                        >
                            {selectedVersion ? (
                                <iframe
                                    ref={iframeRef}
                                    title="Version Preview"
                                    className="w-full h-full border-0"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Select a version to preview
                                </div>
                            )}
                        </div>

                        {selectedVersion?.slides && selectedVersion.slides.length > 0 && (
                            <div className="w-48 rounded-xl bg-[#0f0f0f] p-2 overflow-y-auto">
                                {selectedVersion.slides.map((slide: any, index: number) => (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedSlideIndex(index)}
                                        className={`cursor-pointer border rounded-md overflow-hidden mb-2 ${selectedSlideIndex === index ? "border-blue-500" : "border-[#2B2B2B]"
                                            }`}
                                    >
                                        <div className="w-full" style={{ paddingTop: "56.25%", position: "relative" }}>
                                            <iframe
                                                title={`slide-${index}`}
                                                srcDoc={`<html><head><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff}</style></head><body>${slide.html}</body></html>`}
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
                            disabled={!selectedVersion || restoring}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">content_copy</span>
                            {restoring ? "Creando copia..." : "Restaurar como copia"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}