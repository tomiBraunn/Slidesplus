import { useEffect, useRef, useState } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { urlbackend } from './config'

let supabaseClient = null

const initSupabase = async () => {
    if (supabaseClient) return supabaseClient

    try {
        const res = await fetch(`${urlbackend}/realtime/config`)
        const data = await res.json()

        if (data.ok && data.config) {
            supabaseClient = createClient(data.config.url, data.config.anonKey)
        }
    } catch (err) {
        console.error('Failed to fetch Supabase config:', err)
    }

    return supabaseClient
}

const generateColor = (userId) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']
    const index = parseInt(userId.slice(0, 8), 16) % colors.length
    return colors[index]
}

export const useRealtimeCollaboration = (
    projectId,
    currentUserId,
    username,
    firstName,
    lastName,
    avatar
) => {
    const [activeUsers, setActiveUsers] = useState([])
    const [lastChange, setLastChange] = useState(null)
    const [chatMessages, setChatMessages] = useState([])
    const [cursors, setCursors] = useState([])
    const channelRef = useRef(null)
    const presenceIntervalRef = useRef(null)
    const cursorIntervalRef = useRef(null)
    const [isConnected, setIsConnected] = useState(false)
    const userColor = useRef(generateColor(currentUserId))

    const updatePresence = async (slideId = 0) => {
        if (!projectId || !supabaseClient) return

        try {
            await supabaseClient
                .from('user_presence')
                .upsert({
                    project_id: projectId,
                    user_id: currentUserId,
                    username,
                    first_name: firstName,
                    last_name: lastName,
                    avatar,
                    current_slide: slideId,
                    last_seen: new Date().toISOString()
                }, {
                    onConflict: 'project_id,user_id'
                })
        } catch (err) {
            console.error('Error in updatePresence:', err)
        }
    }

    const updateCursor = async (x, y, slideIndex = 0) => {
        if (!projectId || !supabaseClient) return

        try {
            await supabaseClient
                .from('user_cursors')
                .upsert({
                    project_id: projectId,
                    user_id: currentUserId,
                    username,
                    first_name: firstName,
                    last_name: lastName,
                    avatar,
                    cursor_x: x,
                    cursor_y: y,
                    slide_index: slideIndex,
                    color: userColor.current,
                    last_seen: new Date().toISOString()
                }, {
                    onConflict: 'project_id,user_id'
                })
        } catch (err) {
            console.error('Error updating cursor:', err)
        }
    }

    const broadcastChange = async (changeType, changeData) => {
        if (!projectId || !supabaseClient) return

        try {
            await supabaseClient
                .from('project_changes')
                .insert({
                    project_id: projectId,
                    user_id: currentUserId,
                    change_type: changeType,
                    change_data: changeData
                })
        } catch (err) {
            console.error('Error broadcasting change:', err)
        }
    }

    const sendChatMessage = async (content, attachments = null) => {
        if (!projectId || !supabaseClient) return

        try {
            await supabaseClient
                .from('shared_chat_messages')
                .insert({
                    project_id: projectId,
                    user_id: currentUserId,
                    username,
                    first_name: firstName,
                    last_name: lastName,
                    avatar,
                    role: 'user',
                    content,
                    attachments
                })
        } catch (err) {
            console.error('Error sending chat message:', err)
        }
    }

    useEffect(() => {
        if (!projectId) return

        let mounted = true

        const setupRealtime = async () => {
            const client = await initSupabase()
            if (!client || !mounted) return

            const fetchActiveUsers = async () => {
                try {
                    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

                    const { data } = await client
                        .from('user_presence')
                        .select('*')
                        .eq('project_id', projectId)
                        .gte('last_seen', fiveMinutesAgo)

                    if (data) {
                        setActiveUsers(data.filter((u) => u.user_id !== currentUserId))
                    }
                } catch (err) {
                    console.error('Error in fetchActiveUsers:', err)
                }
            }

            const fetchChatMessages = async () => {
                try {
                    const { data } = await client
                        .from('shared_chat_messages')
                        .select('*')
                        .eq('project_id', projectId)
                        .order('created_at', { ascending: true })
                        .limit(100)

                    if (data) {
                        setChatMessages(data)
                    }
                } catch (err) {
                    console.error('Error fetching chat messages:', err)
                }
            }

            const fetchCursors = async () => {
                try {
                    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString()

                    const { data } = await client
                        .from('user_cursors')
                        .select('*')
                        .eq('project_id', projectId)
                        .gte('last_seen', fiveSecondsAgo)

                    if (data) {
                        setCursors(data.filter((c) => c.user_id !== currentUserId))
                    }
                } catch (err) {
                    console.error('Error fetching cursors:', err)
                }
            }

            await fetchActiveUsers()
            await fetchChatMessages()
            await fetchCursors()

            const channel = client
                .channel(`project:${projectId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'project_changes',
                        filter: `project_id=eq.${projectId}`
                    },
                    (payload) => {
                        const change = payload.new
                        if (change.user_id === currentUserId) return
                        setLastChange(change)
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'user_presence',
                        filter: `project_id=eq.${projectId}`
                    },
                    () => {
                        fetchActiveUsers()
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'shared_chat_messages',
                        filter: `project_id=eq.${projectId}`
                    },
                    (payload) => {
                        setChatMessages(prev => [...prev, payload.new])
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'user_cursors',
                        filter: `project_id=eq.${projectId}`
                    },
                    () => {
                        fetchCursors()
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        setIsConnected(true)
                        updatePresence(0)
                    }
                })

            channelRef.current = channel

            presenceIntervalRef.current = setInterval(() => {
                updatePresence()
            }, 30000)

            cursorIntervalRef.current = setInterval(() => {
                fetchCursors()
            }, 2000)
        }

        setupRealtime()

        return () => {
            mounted = false

            if (presenceIntervalRef.current) {
                clearInterval(presenceIntervalRef.current)
            }

            if (cursorIntervalRef.current) {
                clearInterval(cursorIntervalRef.current)
            }

            if (channelRef.current) {
                channelRef.current.unsubscribe()
                setIsConnected(false)
            }

            if (supabaseClient && projectId) {
                supabaseClient
                    .from('user_presence')
                    .delete()
                    .eq('project_id', projectId)
                    .eq('user_id', currentUserId)
                    .then(() => { })
                    .catch(() => { })

                supabaseClient
                    .from('user_cursors')
                    .delete()
                    .eq('project_id', projectId)
                    .eq('user_id', currentUserId)
                    .then(() => { })
                    .catch(() => { })
            }
        }
    }, [projectId, currentUserId])

    return {
        activeUsers,
        lastChange,
        chatMessages,
        cursors,
        isConnected,
        broadcastChange,
        updatePresence,
        updateCursor,
        sendChatMessage,
        clearLastChange: () => setLastChange(null)
    }
}