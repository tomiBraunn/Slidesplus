// @ts-nocheck
import { supabase } from './supabaseClient'

export async function getAuthToken(): Promise<string | null> {
  try {
    // Legacy token stored by backend login flow
    const legacy = localStorage.getItem('token')
    if (legacy) return legacy

    // Try Supabase session
    try {
      const { data } = await supabase.auth.getSession()
      const session = data?.session
      if (session?.access_token) return session.access_token
    } catch (e) {
      // ignore
    }

    // Search for sb-... auth token keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('sb-') && key.includes('auth')) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        try {
          const parsed = JSON.parse(raw)
          if (parsed?.access_token) return parsed.access_token
          if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token
        } catch (e) {
          continue
        }
      }
    }

    return null
  } catch (e) {
    console.error('getAuthToken error', e)
    return null
  }
}

export default getAuthToken
