import React from 'react'

interface ActiveUser {
    user_id: string
    username: string
    avatar?: string
    first_name?: string
    last_name?: string
    current_slide: number
    last_seen: string
}

interface ActiveUsersProps {
    users: ActiveUser[]
    currentUserId: string
    isConnected: boolean
}

const normalizeAvatar = (avatar?: string): string => {
    if (!avatar) return ''
    if (avatar.startsWith('data:image')) return avatar
    if (avatar.startsWith('http')) return avatar
    return `data:image/png;base64,${avatar}`
}

const getActivityText = (user: ActiveUser) => {
    return `viewing slide ${user.current_slide + 1}`
}

export const ActiveUsers: React.FC<ActiveUsersProps> = ({ users, currentUserId, isConnected }) => {
    const otherUsers = users.filter(u => u.user_id !== currentUserId)

    if (otherUsers.length === 0 && !isConnected) {
        return null
    }

    return (
        <div className="hidden top-20 right-4 bg-[#1a1a1a] rounded-lg shadow-lg border border-[#2B2B2B] p-3 z-50 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-300">
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span className="text-xs text-gray-400">
                        {isConnected ? 'Live' : 'Offline'}
                    </span>
                </div>
                {otherUsers.length > 0 && (
                    <span className="text-xs text-gray-500">
                        ({otherUsers.length})
                    </span>
                )}
            </div>

            {otherUsers.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">No collaborators online</p>
            ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {otherUsers.map((user) => (
                        <div
                            key={user.user_id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-[#2a2a2a] transition-colors"
                        >
                            <div className="relative flex-shrink-0">
                                {user.avatar ? (
                                    <img
                                        src={normalizeAvatar(user.avatar)}
                                        alt={user.username}
                                        className="w-8 h-8 rounded-full border-2 border-green-400"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-green-400 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                        {(user.first_name?.[0] || user.username[0] || '?').toUpperCase()}
                                    </div>
                                )}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1a1a1a]" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate">
                                    {user.first_name && user.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : user.username
                                    }
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {getActivityText(user)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export const ActiveUsersAvatars: React.FC<ActiveUsersProps> = ({ users, currentUserId }) => {
    const otherUsers = users.filter(u => u.user_id !== currentUserId).slice(0, 3)

    if (otherUsers.length === 0) {
        return null
    }

    return (
        <div className="flex items-center">
            <div className="flex -space-x-2">
                {otherUsers.map((user, index) => (
                    user.avatar ? (
                        <img
                            key={user.user_id}
                            src={normalizeAvatar(user.avatar)}
                            alt={user.username}
                            title={user.username}
                            className="w-8 h-8 rounded-full border-2 border-[#121212] hover:z-10 transition-transform hover:scale-110 cursor-pointer"
                            style={{ zIndex: otherUsers.length - index }}
                        />
                    ) : (
                        <div
                            key={user.user_id}
                            title={user.username}
                            className="w-8 h-8 rounded-full border-2 border-[#121212] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold hover:z-10 transition-transform hover:scale-110 cursor-pointer"
                            style={{ zIndex: otherUsers.length - index }}
                        >
                            {(user.first_name?.[0] || user.username[0] || '?').toUpperCase()}
                        </div>
                    )
                ))}
            </div>

            {users.filter(u => u.user_id !== currentUserId).length > 3 && (
                <div className="ml-2 w-8 h-8 rounded-full bg-[#2a2a2a] border-2 border-[#121212] flex items-center justify-center text-xs font-medium text-gray-400">
                    +{users.filter(u => u.user_id !== currentUserId).length - 3}
                </div>
            )}
        </div>
    )
}