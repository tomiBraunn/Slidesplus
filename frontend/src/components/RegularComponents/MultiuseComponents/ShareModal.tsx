import React, { useState, useEffect, useRef } from 'react'
import { urlbackend } from '../../../config.js'

interface Collaborator {
    user_id: string
    username: string
    first_name?: string
    last_name?: string
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
    const [visibility, setVisibility] = useState<'private' | 'public'>('private')
    const [collaborators, setCollaborators] = useState<Collaborator[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor'>('editor')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [linkCopied, setLinkCopied] = useState(false)
    const [owner, setOwner] = useState<any>(null)
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
                setVisibility(data.project.visibility)
                setCollaborators(data.collaborators)
                setOwner(data.project.owner)
            }
        } catch (err) {
            console.error('Error fetching access:', err)
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

    const handleVisibilityChange = async (newVisibility: 'private' | 'public') => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const res = await fetch(`${urlbackend}/projects/${projectId}/visibility`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    visibility: newVisibility,
                    allowComments: true
                })
            })

            if (res.ok) {
                setVisibility(newVisibility)
            }
        } catch (err) {
            setError('Failed to update visibility')
        } finally {
            setLoading(false)
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
                    role: selectedRole
                })
            })

            const data = await res.json()

            if (data.ok) {
                setCollaborators(data.collaborators)
                setSearchQuery('')
                setShowSearchResults(false)
            } else {
                setError(data.error || 'Failed to add collaborator')
            }
        } catch (err) {
            setError('Failed to add collaborator')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveCollaborator = async (userId: string) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${urlbackend}/projects/${projectId}/collaborators/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })

            const data = await res.json()

            if (data.ok) {
                setCollaborators(data.collaborators)
            }
        } catch (err) {
            console.error('Error removing collaborator:', err)
        }
    }

    const handleChangeRole = async (userId: string, newRole: 'viewer' | 'editor') => {
        try {
            const collab = collaborators.find(c => c.user_id === userId)
            if (!collab) return

            const token = localStorage.getItem('token')
            const res = await fetch(`${urlbackend}/projects/${projectId}/collaborators`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: collab.username,
                    role: newRole
                })
            })

            const data = await res.json()

            if (data.ok) {
                setCollaborators(data.collaborators)
            }
        } catch (err) {
            console.error('Error changing role:', err)
        }
    }

    const copyLink = () => {
        const link = `${window.location.origin}/project/${projectId}`
        navigator.clipboard.writeText(link)
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-normal text-gray-900">Share "Project"</h2>
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
                    <div className="mb-6" ref={searchRef}>
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                                placeholder="Add people, groups, and calendar events"
                                className="flex-1 outline-none text-sm text-gray-900"
                            />
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as 'viewer' | 'editor')}
                                className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </select>
                        </div>

                        {showSearchResults && searchResults.length > 0 && (
                            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {searchResults.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleAddCollaborator(user)}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">People with access</div>

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

                        {collaborators.map((collab) => (
                            <div key={collab.user_id} className="flex items-center justify-between py-2 group">
                                <div className="flex items-center gap-3">
                                    {collab.avatar ? (
                                        <img
                                            src={normalizeAvatar(collab.avatar)}
                                            alt={collab.username}
                                            className="w-10 h-10 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-medium">
                                            {getInitials(collab.first_name, collab.last_name, collab.username)}
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {collab.first_name && collab.last_name
                                                ? `${collab.first_name} ${collab.last_name}`
                                                : collab.username}
                                        </div>
                                        <div className="text-xs text-gray-500">{collab.username}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={collab.role}
                                        onChange={(e) => handleChangeRole(collab.user_id, e.target.value as 'viewer' | 'editor')}
                                        className="text-sm text-gray-700 border-none outline-none bg-transparent cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                    </select>
                                    <button
                                        onClick={() => handleRemoveCollaborator(collab.user_id)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">General access</div>

                        <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-gray-100 rounded-full">
                                {visibility === 'public' ? (
                                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900">
                                        {visibility === 'public' ? 'Anyone with the link' : 'Restricted'}
                                    </span>
                                    <select
                                        value={visibility}
                                        onChange={(e) => handleVisibilityChange(e.target.value as 'private' | 'public')}
                                        disabled={loading}
                                        className="text-sm text-gray-700 border-none outline-none bg-transparent cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                                    >
                                        <option value="private">Restricted</option>
                                        <option value="public">Anyone with the link</option>
                                    </select>
                                </div>
                                <div className="text-xs text-gray-500">
                                    {visibility === 'public'
                                        ? 'Anyone on the Internet with this link can view'
                                        : 'Only people with access can open with the link'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                            {error}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {linkCopied ? 'Link copied' : 'Copy link'}
                    </button>
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