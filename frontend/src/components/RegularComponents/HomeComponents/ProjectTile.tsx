import { useState, useEffect, useRef } from 'react'
import { urlbackend } from '../../../config.js'
import SpotlightCard from '../MultiuseComponents/SpotlightCard'

type UserInfo = {
    id: string
    username: string
    avatar?: string
    first_name?: string
    last_name?: string
}

type Props = {
    name: string
    description: string
    onClick?: () => void
    listMode?: boolean
    owner?: UserInfo
    collaborators?: UserInfo[]
    previewUrl?: string
    projectId?: string
}

const normalizeAvatar = (avatar?: string): string | undefined => {
    if (!avatar) return undefined
    if (avatar.startsWith('data:image')) return avatar
    if (avatar.startsWith('http')) return avatar
    return `data:image/png;base64,${avatar}`
}

const getInitials = (firstName?: string, lastName?: string, username?: string): string => {
    if (firstName && lastName) {
        return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) return firstName[0].toUpperCase()
    if (username) return username[0].toUpperCase()
    return '?'
}

function ProjectTile({ name, description, onClick, listMode = false, owner, collaborators = [], previewUrl, projectId }: Props) {
    const [slidePreview, setSlidePreview] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(0.25)

    useEffect(() => {
        if (!listMode && projectId) {
            fetchSlidePreview()
        }
    }, [projectId, listMode])

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth
                const containerHeight = containerRef.current.offsetHeight

                if (containerWidth > 0 && containerHeight > 0) {
                    const scaleX = containerWidth / 1920
                    const scaleY = containerHeight / 1080
                    setScale(Math.min(scaleX, scaleY))
                }
            }
        }

        const timer = setTimeout(updateScale, 100)

        window.addEventListener('resize', updateScale)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updateScale)
        }
    }, [slidePreview])

    const fetchSlidePreview = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${urlbackend}/projects/${projectId}/slides`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            const data = await res.json()
            const slides = data.slides || data

            if (slides && Array.isArray(slides) && slides.length > 0) {
                const firstSlide = slides[0]
                const slideHtml = firstSlide.html || firstSlide.content

                if (slideHtml) {
                    setSlidePreview(slideHtml)
                }
            }
        } catch (err) {
            console.error('Error fetching slide preview:', err)
        }
    }

    const visibleCollaborators = collaborators.slice(0, 3)
    const hasMoreCollaborators = collaborators.length > 3

    if (listMode) {
        return (
            <SpotlightCard
                onClick={onClick}
                className="rounded-xl bg-theme-primary border border-theme-tertiary text-theme-primary hover:bg-theme-hover transition-colors duration-300 w-full cursor-pointer flex flex-row items-center py-2 px-3 gap-3 rounded-full"
                spotlightColor="rgba(255, 255, 255, 0.15)"
            >
                <span
                    className="material-symbols-outlined aspect-square shrink-0"
                    style={{ fontSize: "22px" }}
                >
                    crop_landscape
                </span>

                <div className="flex w-full min-w-0 text-left flex-row items-center justify-start gap-3">
                    <p
                        className="truncate w-full min-w-0 text-left text-[clamp(14px,1.5vw,20px)]"
                        title={name}
                    >
                        {name}
                    </p>
                    <p
                        className="truncate w-full min-w-0 text-left text-[clamp(10px,1vw,14px)] text-[#999999]"
                        title={description}
                    >
                        {description}
                    </p>
                </div>
            </SpotlightCard>
        )
    }

    return (
        <SpotlightCard
            onClick={onClick}
            className="rounded-[15px] bg-theme-primary border border-theme-tertiary transition-all duration-300 w-full cursor-pointer flex flex-col gap-2 overflow-hidden group p-1.5 hover:bg-theme-hover"
            spotlightColor="rgba(255, 255, 255, 0.15)"
        >
            <div ref={containerRef} className="w-full aspect-[16/9] bg-white overflow-hidden relative rounded-[15px] border border-theme-tertiary flex items-center justify-center">
                {slidePreview ? (
                    <iframe
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(${scale});transform-origin:top left;width:1920px;height:1080px;display:flex;align-items:center;justify-content:center;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${slidePreview}</body></html>`}
                        className="w-full h-full border-0 pointer-events-none bg-white"
                        sandbox="allow-same-origin allow-scripts"
                        style={{ background: 'white' }}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <span className="material-symbols-outlined text-gray-400 opacity-50" style={{ fontSize: "35px" }}>
                            crop_landscape
                        </span>
                        <p className='text-[10px] text-gray-500'>Empty project</p>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1">
                <div className="flex items-center pl-1">
                    {owner && (
                        <div className="relative">
                            {owner.avatar ? (
                                <img
                                    src={normalizeAvatar(owner.avatar)}
                                    alt={owner.username}
                                    className="w-3.5 h-3.5 rounded-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        const sibling = e.currentTarget.nextElementSibling as HTMLElement
                                        if (sibling) sibling.style.display = 'flex'
                                    }}
                                />
                            ) : null}
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-medium text-[6px] bg-gradient-to-br from-blue-500 to-purple-600 ${owner.avatar ? 'hidden' : ''}`}>
                                {getInitials(owner.first_name, owner.last_name, owner.username)}
                            </div>
                        </div>
                    )}
                    {visibleCollaborators.map((collab, idx) => (
                        <div key={collab.id || idx} className="relative">
                            {collab.avatar ? (
                                <img
                                    src={normalizeAvatar(collab.avatar)}
                                    alt={collab.username}
                                    className="w-3.5 h-3.5 rounded-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        const sibling = e.currentTarget.nextElementSibling as HTMLElement
                                        if (sibling) sibling.style.display = 'flex'
                                    }}
                                />
                            ) : null}
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-medium text-[6px] bg-gradient-to-br from-green-500 to-teal-600 ${collab.avatar ? 'hidden' : ''}`}>
                                {getInitials(collab.first_name, collab.last_name, collab.username)}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="truncate flex-1 text-left text-base font-medium text-theme-primary" title={name}>
                    {name}
                </p>
            </div>
        </SpotlightCard>
    )
}

export default ProjectTile
