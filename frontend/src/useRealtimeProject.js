// @ts-nocheck
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from './utils/supabaseClient'

async function getSupabase() {
  return supabase
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
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef(null)

  const clearLastChange = useCallback(() => setLastChange(null), [])

  const notifySlidesUpdated = useCallback(() => {
    const channel = channelRef.current
    if (!channel || !currentUserId) return
    channel.send({
      type: 'broadcast',
      event: 'slides_updated',
      payload: {
        userId: currentUserId,
        timestamp: Date.now(),
      },
    })
  }, [currentUserId])

  useEffect(() => {
    if (!projectId || !currentUserId) return

    let cancelled = false

    const setup = async () => {
      try {
        const supabase = await getSupabase()
        if (cancelled) return

        const channel = supabase.channel(`project:${projectId}`, {
          config: {
            presence: { key: currentUserId },
            broadcast: { self: false },
          },
        })

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState()
            const users = Object.values(state)
              .flat()
              .filter((u) => u.userId !== currentUserId)
            setActiveUsers(users)
          })
          .on('broadcast', { event: 'slides_updated' }, ({ payload }) => {
            if (!payload || payload.userId === currentUserId) return
            setLastChange({
              change_type: 'slides_updated',
              change_data: payload,
            })
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              setIsConnected(true)
              await channel.track({
                userId: currentUserId,
                username: username || 'Anonymous',
                firstName,
                lastName,
                avatar,
                online_at: new Date().toISOString(),
              })
            }
          })

        channelRef.current = channel
      } catch (err) {
        console.warn('Realtime collaboration unavailable:', err)
        setIsConnected(false)
      }
    }

    setup()

    return () => {
      cancelled = true
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      setIsConnected(false)
      setActiveUsers([])
    }
  }, [projectId, currentUserId, username, firstName, lastName, avatar])

  return {
    activeUsers,
    lastChange,
    chatMessages: [],
    cursors: [],
    isConnected,
    updatePresence: () => {},
    updateCursor: () => {},
    broadcastChange: () => {},
    notifySlidesUpdated,
    sendChatMessage: () => {},
    clearLastChange,
  }
}
