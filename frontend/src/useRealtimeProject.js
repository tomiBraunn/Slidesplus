// @ts-nocheck
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from './utils/supabaseClient'

/**
 * Presencia en tiempo real (avatares de colaboradores online) sobre el canal
 * `project:{id}`. La co-edición del documento (Yjs) viaja por su propio
 * provider/canal; este hook se ocupa SOLO de la lista de usuarios activos y del
 * estado de conexión que muestra la navbar.
 */
export const useRealtimeCollaboration = (
  projectId,
  currentUserId,
  username,
  firstName,
  lastName,
  avatar
) => {
  const [activeUsers, setActiveUsers] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef(null)
  const joinedRef = useRef(false)

  useEffect(() => {
    if (!projectId || !currentUserId) return

    let cancelled = false
    let retryTimer = null
    let attempt = 0

    const teardown = () => {
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch (err) {
          console.warn('[realtime] error removing presence channel:', err)
        }
        channelRef.current = null
      }
      joinedRef.current = false
    }

    const setup = () => {
      teardown()
      if (cancelled) return

      const channel = supabase.channel(`project:${projectId}:presence`, {
        config: {
          presence: { key: currentUserId },
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
        .subscribe(async (status, err) => {
          if (cancelled) return

          if (status === 'SUBSCRIBED') {
            attempt = 0
            joinedRef.current = true
            setIsConnected(true)
            try {
              await channel.track({
                userId: currentUserId,
                username: username || 'Anonymous',
                firstName,
                lastName,
                avatar,
                online_at: new Date().toISOString(),
              })
            } catch (trackErr) {
              console.warn('[realtime] presence track failed:', trackErr)
            }
            return
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            joinedRef.current = false
            setIsConnected(false)
            console.warn(
              `[realtime] presence channel status=${status}`,
              err || ''
            )
            // Reintento con backoff exponencial (cap 10s) salvo cierre limpio
            // por desmontaje.
            if (!cancelled && status !== 'CLOSED') {
              const delay = Math.min(1000 * 2 ** attempt, 10000)
              attempt += 1
              retryTimer = setTimeout(setup, delay)
            }
          }
        })

      channelRef.current = channel
    }

    setup()

    return () => {
      cancelled = true
      teardown()
      setIsConnected(false)
      setActiveUsers([])
    }
  }, [projectId, currentUserId, username, firstName, lastName, avatar])

  return {
    activeUsers,
    isConnected,
  }
}
