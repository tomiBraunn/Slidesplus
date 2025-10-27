import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
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

export const useRealtimeProject = (
    projectId,
    currentUserId,
    username,
    firstName,
    lastName,
    avatar
) => {
    const [activeUsers, setActiveUsers] = useState([])
    const [lastChange, setLastChange] = useState(null)
    const channelRef = useRef(null)
    const presenceIntervalRef = useRef(null)
    const [isConnected, setIsConnected] = useState(false)

    const updatePresence = async (slideId = 0) => {
        if (!projectId || !supabaseClient) return

        try {
            const { error } = await supabaseClient
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

            if (error) console.error('Error updating presence:', error)
        } catch (err) {
            console.error('Error in updatePresence:', err)
        }
    }

    const broadcastChange = async (changeType, changeData) => {
        if (!projectId || !supabaseClient) return

        try {
            const { error } = await supabaseClient
                .from('project_changes')
                .insert({
                    project_id: projectId,
                    user_id: currentUserId,
                    change_type: changeType,
                    change_data: changeData
                })

            if (error) console.error('Error broadcasting change:', error)
        } catch (err) {
            console.error('Error in broadcastChange:', err)
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

                    const { data, error } = await client
                        .from('user_presence')
                        .select('*')
                        .eq('project_id', projectId)
                        .gte('last_seen', fiveMinutesAgo)

                    if (error) {
                        console.error('Error fetching active users:', error)
                        return
                    }

                    if (data) {
                        setActiveUsers(data.filter((u) => u.user_id !== currentUserId))
                    }
                } catch (err) {
                    console.error('Error in fetchActiveUsers:', err)
                }
            }

            await fetchActiveUsers()

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
        }

        setupRealtime()

        return () => {
            mounted = false

            if (presenceIntervalRef.current) {
                clearInterval(presenceIntervalRef.current)
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
                    .catch((err) => console.error('Error removing presence:', err))
            }
        }
    }, [projectId, currentUserId])

    return {
        activeUsers,
        lastChange,
        isConnected,
        broadcastChange,
        updatePresence,
        clearLastChange: () => setLastChange(null)
    }
}