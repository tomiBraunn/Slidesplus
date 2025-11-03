// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { urlbackend } from '../../../config.js'

interface Collaborator {
    id?: string  // Backend returns 'id'
    user_id?: string  // Some endpoints might use 'user_id'
    username?: string
    name?: string  // Backend returns 'name'
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

    useEffect(() => {
        if (isOpen && projectId) {
            fetchProjectAccess()
        }
    }, [isOpen, projectId])

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
                setIsPublic(data.project?.is_public || false)
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
            const res = await fetch(`${urlbackend}/projects/${projectId}/visibility`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ is_public: !isPublic })
            })

            const data = await res.json()

            if (data.ok) {
                setIsPublic(!isPublic)
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

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-normal text-gray-900">Share "{projectName || 'Project'}"</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 mb-1">Public Link</div>
                                <div className="text-xs text-gray-500">
                                    {isPublic
                                        ? "Anyone with the link can view this presentation"
                                        : "Only you and collaborators can view this project"}
                                </div>
                            </div>
                            <button
                                onClick={handleTogglePublic}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    isPublic ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        isPublic ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        {isPublic && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={`${window.location.origin}/v/${projectId}`}
                                    readOnly
                                    className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        linkCopied
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {linkCopied ? (
                                        <div className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Copied
                                        </div>
                                    ) : (
                                        'Copy'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mb-6" ref={searchRef}>
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                                placeholder="Add editors by username or email"
                                className="flex-1 outline-none text-sm text-gray-900"
                            />
                        </div>

                        {showSearchResults && searchResults.length > 0 && (
                            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {searchResults.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleAddCollaborator(user)}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors w-full text-left"
                                    >
                                        {user.avatar ? (
                                            <img
                                                src={normalizeAvatar(user.avatar)}
                                                alt={user.username}
                                                className="w-10 h-10 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                                {getInitials(user.first_name, user.last_name, user.username)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.first_name && user.last_name
                                                    ? `${user.first_name} ${user.last_name}`
                                                    : user.username}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{user.email || user.username}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">Editors</div>

                        {owner && (
                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    {owner.avatar ? (
                                        <img
                                            src={normalizeAvatar(owner.avatar)}
                                            alt={owner.username}
                                            className="w-10 h-10 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                            {getInitials(owner.firstName, owner.lastName, owner.username)}
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {owner.firstName && owner.lastName
                                                ? `${owner.firstName} ${owner.lastName}`
                                                : owner.username}
                                        </div>
                                        <div className="text-xs text-gray-500">{owner.username}</div>
                                    </div>
                                </div>
                                <span className="text-sm text-gray-600">Owner</span>
                            </div>
                        )}

                        {collaborators && collaborators.map((collab) => {
                            const userId = collab.user_id || collab.id
                            const displayName = collab.name || (collab.first_name && collab.last_name ? `${collab.first_name} ${collab.last_name}` : collab.username || collab.email)
                            return (
                                <div key={userId} className="flex items-center justify-between py-2 group">
                                    <div className="flex items-center gap-3">
                                        {collab.avatar ? (
                                            <img
                                                src={normalizeAvatar(collab.avatar)}
                                                alt={collab.username}
                                                className="w-10 h-10 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-medium">
                                                {getInitials(collab.first_name, collab.last_name, collab.username || collab.name)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {displayName}
                                            </div>
                                            <div className="text-xs text-gray-500">{collab.email || collab.username}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveCollaborator(userId)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    {error && (
                        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                            {error}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}