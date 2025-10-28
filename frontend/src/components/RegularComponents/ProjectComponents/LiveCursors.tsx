import React from 'react'

interface Cursor {
    user_id: string
    username: string
    first_name?: string
    last_name?: string
    avatar?: string
    cursor_x: number
    cursor_y: number
    slide_index: number
    color: string
    last_seen: string
}

interface LiveCursorsProps {
    cursors: Cursor[]
    currentSlideIndex: number
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({ cursors, currentSlideIndex }) => {
    const cursorsOnCurrentSlide = cursors.filter(c => c.slide_index === currentSlideIndex)

    return (
        <>
            {cursorsOnCurrentSlide.map((cursor) => (
                <div
                    key={cursor.user_id}
                    className="fixed pointer-events-none z-50 transition-all duration-75"
                    style={{
                        left: `${cursor.cursor_x}px`,
                        top: `${cursor.cursor_y}px`,
                        transform: 'translate(-2px, -2px)'
                    }}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M5.65376 12.3673L8.60399 16.2238L11.3667 10.3866L17.2038 7.62391L13.3473 4.67376L7.5 2L5.65376 12.3673Z"
                            fill={cursor.color}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>

                    <div
                        className="mt-1 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap"
                        style={{
                            backgroundColor: cursor.color,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                    >
                        {cursor.first_name || cursor.username}
                    </div>
                </div>
            ))}
        </>
    )
}