// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { urlbackend } from '../../../config.js'

interface Collaborator {
    id?: string
    user_id?: string
    username?: string
    name?: string
    first_name?: string
    last_name?: string
    email?: string
    avatar?: string
    role: string
}

interface UserSearchResult {
    id: string
    username: string
    first_name?: string
    last_name?: string
    avatar?: string
    email?: string
}

interface ShareModalProps {
    projectId: string | null
    isOpen: boolean
    onClose: () => void
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

export const ShareModal: React.FC<ShareModalProps> = ({ projectId, isOpen, onClose }) => {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [owner, setOwner] = useState<any>(null)
    const [projectName, setProjectName] = useState<string>('')
    const [isPublic, setIsPublic] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    const [show, setShow] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            if (projectId) {
                fetchProjectAccess()
            }
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setShow(true))
            })
        } else {
            setShow(false)
        }
    }, [isOpen, projectId])

    const handleClose = () => {
        setShow(false)
    }

    const handleTransitionEnd = () => {
        if (!show) {
            setMounted(false)
            onClose()
        }
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearchResults(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose()
            }
        }

        if (mounted) {
            window.addEventListener('keydown', handleKeyDown)
        }
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [mounted])

    useEffect(() => {
        if (searchQuery.length >= 2) {
            searchUsers()
        } else {
            setSearchResults([])
            setShowSearchResults(false)
        }
    }, [searchQuery])

    const fetchProjectAccess = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${urlbackend}/projects/${projectId}/access`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()

            if (data.ok) {
                setCollaborators(data.collaborators || [])
                setOwner(data.project?.owner || null)
                setProjectName(data.project?.name || '')
                setIsPublic(data.project?.visibility === 'public')
            }
        } catch (err) {
            console.error('Error fetching access:', err)
            setCollaborators([])
        }
    }

    const searchUsers = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${urlbackend}/users/search?q=${encodeURIComponent(searchQuery)}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()

            if (data.ok) {
                const existingIds = collaborators.map(c => c.user_id)
                const filtered = data.users.filter((u: UserSearchResult) => !existingIds.includes(u.id))
                setSearchResults(filtered)
                setShowSearchResults(filtered.length > 0)
            }
        } catch (err) {
            console.error('Error searching users:', err)
        }
    }

    const handleAddCollaborator = async (user: UserSearchResult) => {
        try {
            setLoading(true)
            setError('')
            const token = localStorage.getItem('token')
            const res = await fetch(`${urlbackend}/projects/${projectId}/collaborators`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: user.username,
                    role: 'editor'
                })
            })

            const data = await res.json().catch(() => ({ ok: false, error: 'Server error' }))

            if (res.status === 403) {
                setError('You do not have permission to add collaborators to this project')
            } else if (data.ok) {
                setCollaborators(data.collaborators)
                setSearchQuery('')
                setShowSearchResults(false)
            } else {
                setError(data.error || `Failed to add collaborator (${res.status})`)
            }
        } catch (err) {
            setError(`Network error: ${err instanceof Error ? err.message : 'Failed to add collaborator'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveCollaborator = async (userId: string) => {
        if (!userId) {
            console.error('userId is undefined')
            return
        }

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${urlbackend}/projects/${projectId}/collaborators/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })

            const data = await res.json()

            if (data.ok) {
                setCollaborators(data.collaborators)
            } else {
                setError(data.error || 'Failed to remove collaborator')
            }
        } catch (err) {
            console.error('Error removing collaborator:', err)
            setError('Failed to remove collaborator')
        }
    }

    const handleTogglePublic = async () => {
        try {
            const token = localStorage.getItem('token')
            const nextPublic = !isPublic
            const res = await fetch(`${urlbackend}/projects/${projectId}/visibility`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ visibility: nextPublic ? 'public' : 'private' })
            })

            const data = await res.json()

            if (data.ok) {
                setIsPublic(nextPublic)
            } else {
                setError(data.error || 'Failed to update visibility')
            }
        } catch (err) {
            setError('Failed to update visibility')
        }
    }

    const handleCopyLink = () => {
        const viewLink = `${window.location.origin}/v/${projectId}`
        navigator.clipboard.writeText(viewLink)
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
    }

    if (!mounted) return null

    return (
        <div
            className={[
                "fixed z-50 inset-0 flex items-center justify-center p-4",
                "bg-black/40 transition-[backdrop-filter,opacity] duration-200 ease-out",
                show ? "opacity-100 backdrop-blur-xl" : "opacity-0 backdrop-blur-0",
            ].join(" ")}
            onMouseDown={handleClose}
            onTransitionEnd={handleTransitionEnd}
        >
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className={`bg-theme-primary text-theme-primary rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transform transition-all duration-200 ease-out ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            >
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Share {projectName || 'presentation'}</h2>
                            <p className="text-xs text-theme-secondary mt-1">Invite your friends to create with you</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-theme-secondary hover:text-theme-primary transition-colors p-1.5 hover:bg-theme-hover rounded-full"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="mb-6" ref={searchRef}>
                        <div className="flex items-center gap-2 border border-theme-tertiary rounded-lg px-3 py-2.5 focus-within:border-blue-500">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                                placeholder="Add email to invite"
                                className="flex-1 outline-none text-sm bg-transparent placeholder-theme-secondary"
                            />
                            <button className="p-1 hover:bg-theme-hover rounded transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
                            </button>
                        </div>

                        {showSearchResults && searchResults.length > 0 && (
                            <div className="mt-2 bg-theme-quaternary border border-theme-tertiary rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {searchResults.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleAddCollaborator(user)}
                                        className="flex items-center gap-3 p-3 hover:bg-theme-hover cursor-pointer transition-colors w-full text-left"
                                    >
                                        {user.avatar ? (
                                            <img
                                                src={normalizeAvatar(user.avatar)}
                                                alt={user.username}
                                                className="w-9 h-9 rounded-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling && (e.currentTarget.nextElementSibling.style.display = 'flex');
                                                }}
                                            />
                                        ) : null}
                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm ${user.avatar ? 'hidden' : ''}`}>
                                            {getInitials(user.first_name, user.last_name, user.username)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium">
                                                {user.first_name && user.last_name
                                                    ? `${user.first_name} ${user.last_name}`
                                                    : user.username}
                                            </div>
                                            <div className="text-xs text-theme-secondary truncate">{user.email || user.username}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <div className="text-xs font-semibold text-theme-secondary tracking-wide mb-3">People with access</div>

                        {owner && (
                            <div className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-3">
                                    {owner.avatar ? (
                                        <img
                                            src={normalizeAvatar(owner.avatar)}
                                            alt={owner.username}
                                            className="w-9 h-9 rounded-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling && (e.currentTarget.nextElementSibling.style.display = 'flex');
                                            }}
                                        />
                                    ) : null}
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm ${owner.avatar ? 'hidden' : ''}`}>
                                        {getInitials(owner.firstName, owner.lastName, owner.username)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">
                                            {owner.firstName && owner.lastName
                                                ? `${owner.firstName} ${owner.lastName}`
                                                : owner.username}
                                            <span className="text-theme-secondary text-xs ml-1">(you)</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-theme-secondary">Owner</span>
                            </div>
                        )}

                        {collaborators && collaborators.map((collab) => {
                            const userId = collab.user_id || collab.id
                            const displayName = collab.name || (collab.first_name && collab.last_name ? `${collab.first_name} ${collab.last_name}` : collab.username || collab.email)
                            return (
                                <div key={userId} className="flex items-center justify-between py-2.5 group">
                                    <div className="flex items-center gap-3">
                                        {collab.avatar ? (
                                            <img
                                                src={normalizeAvatar(collab.avatar)}
                                                alt={collab.username}
                                                className="w-9 h-9 rounded-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling && (e.currentTarget.nextElementSibling.style.display = 'flex');
                                                }}
                                            />
                                        ) : null}
                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-semibold text-sm ${collab.avatar ? 'hidden' : ''}`}>
                                            {getInitials(collab.first_name, collab.last_name, collab.username || collab.name)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">
                                                {displayName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-theme-secondary">Can edit</span>
                                        <button
                                            onClick={() => handleRemoveCollaborator(userId)}
                                            className="opacity-0 group-hover:opacity-100 text-theme-secondary hover:text-theme-primary transition-all p-1"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="">
                        <div className="text-xs font-semibold text-theme-secondary uppercase tracking-wide mb-3">General Access</div>
                        <div className="flex items-center justify-between py-2.5 hover:bg-theme-hover rounded-lg px-2 -mx-2 cursor-pointer transition-colors" onClick={handleTogglePublic}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-theme-tertiary flex items-center justify-center">
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                        {isPublic ? "public" : "lock"}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-sm font-medium">
                                        {isPublic ? "Anyone with the link" : "Restricted"}
                                    </div>
                                    <div className="text-xs text-theme-secondary">
                                        {isPublic ? "Can view" : "Only people with access"}
                                    </div>
                                </div>
                            </div>
                            <button className="text-xs text-theme-secondary hover:text-theme-primary flex items-center gap-1">
                                {isPublic ? "Can view" : "Change"}
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                            </button>
                        </div>

                        {isPublic && (
                            <div className="mt-3 pt-3 border-t border-theme-tertiary">
                                <button
                                    onClick={handleCopyLink}
                                    className="w-full flex items-center justify-between py-2.5 px-2 hover:bg-theme-hover rounded-lg transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-theme-tertiary flex items-center justify-center">
                                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                                {linkCopied ? "check" : "content_copy"}
                                            </span>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-medium">
                                                {linkCopied ? "Link copied!" : "Copy presentation link"}
                                            </div>
                                            <div className="text-xs text-theme-secondary truncate max-w-[200px]">
                                                {`${window.location.origin}/v/${projectId}`}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-theme-secondary flex-shrink-0" style={{ fontSize: 20 }}>
                                        content_copy
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}