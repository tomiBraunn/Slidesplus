import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { SupabaseYjsProvider } from '../collab/SupabaseYjsProvider'
import type { ProviderStatus } from '../collab/SupabaseYjsProvider'

export type CollabUser = {
  name: string
  color: string
}

type UseCollabDocArgs = {
  projectId: string | null | undefined
  enabled: boolean
  user: CollabUser | null
  /**
   * Carga el snapshot inicial (HTML completo) desde el backend. Solo se usa para
   * sembrar el Y.Doc cuando somos el primer usuario (no hay peers que sincronicen).
   */
  loadSnapshot: () => Promise<string | undefined>
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

export function pickUserColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

/** Reemplaza el contenido de un Y.Text aplicando solo el diff (prefijo/sufijo
 * común), para preservar la intención del cambio y minimizar conflictos. */
export function replaceYText(ytext: Y.Text, next: string) {
  const prev = ytext.toString()
  if (prev === next) return

  let start = 0
  const minLen = Math.min(prev.length, next.length)
  while (start < minLen && prev[start] === next[start]) start++

  let endPrev = prev.length
  let endNext = next.length
  while (
    endPrev > start &&
    endNext > start &&
    prev[endPrev - 1] === next[endNext - 1]
  ) {
    endPrev--
    endNext--
  }

  const deleteLen = endPrev - start
  const insertStr = next.slice(start, endNext)

  ytext.doc?.transact(() => {
    if (deleteLen > 0) ytext.delete(start, deleteLen)
    if (insertStr.length > 0) ytext.insert(start, insertStr)
  })
}

export function useCollabDoc({
  projectId,
  enabled,
  user,
  loadSnapshot,
}: UseCollabDocArgs) {
  const [doc, setDoc] = useState<string>('')
  const [status, setStatus] = useState<ProviderStatus>('connecting')
  const [ready, setReady] = useState(false)

  const ydocRef = useRef<Y.Doc | null>(null)
  const ytextRef = useRef<Y.Text | null>(null)
  const awarenessRef = useRef<Awareness | null>(null)
  const providerRef = useRef<SupabaseYjsProvider | null>(null)
  // Evita que un cambio que originamos localmente (espejado a React) se reescriba
  // de vuelta en el Y.Text.
  const mirroringRef = useRef(false)

  useEffect(() => {
    if (!enabled || !projectId) return

    let cancelled = false
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText('doc')
    const awareness = new Awareness(ydoc)

    ydocRef.current = ydoc
    ytextRef.current = ytext
    awarenessRef.current = awareness

    if (user) {
      awareness.setLocalStateField('user', {
        name: user.name,
        color: user.color,
      })
    }

    // Espejo Y.Text -> estado React (preview, slides, export se alimentan de `doc`).
    const observer = () => {
      mirroringRef.current = true
      setDoc(ytext.toString())
      // microtask para liberar el flag tras el render programado
      queueMicrotask(() => {
        mirroringRef.current = false
      })
    }
    ytext.observe(observer)

    const provider = new SupabaseYjsProvider(projectId, ydoc, awareness)
    providerRef.current = provider

    provider.onStatus = (s) => {
      if (!cancelled) setStatus(s)
    }

    provider.onSynced = async () => {
      if (cancelled) return
      // Si tras el sync el documento sigue vacío, somos el primer usuario:
      // sembramos desde el snapshot del backend.
      if (ytext.length === 0) {
        try {
          const snapshot = await loadSnapshot()
          if (!cancelled && snapshot && ytext.length === 0) {
            ydoc.transact(() => ytext.insert(0, snapshot))
          }
        } catch (err) {
          console.warn('[useCollabDoc] seed snapshot failed:', err)
        }
      }
      if (!cancelled) {
        setDoc(ytext.toString())
        setReady(true)
      }
    }

    return () => {
      cancelled = true
      ytext.unobserve(observer)
      provider.destroy()
      awareness.destroy()
      ydoc.destroy()
      providerRef.current = null
      ydocRef.current = null
      ytextRef.current = null
      awarenessRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, projectId])

  /** Aplica un cambio del doc completo proveniente de fuera del editor Monaco
   * (chat AI, reordenar/añadir/borrar slides, tweaks visuales). */
  const applyExternalDoc = useCallback((next: string) => {
    const ytext = ytextRef.current
    if (!ytext) return
    if (mirroringRef.current) return // ya viene del espejo, no re-aplicar
    replaceYText(ytext, next)
  }, [])

  return {
    doc,
    setDocExternally: applyExternalDoc,
    status,
    ready,
    ytext: ytextRef,
    awareness: awarenessRef,
  }
}
