import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../utils/supabaseClient'

/**
 * Provider de Yjs que transporta updates del documento y awareness (cursores)
 * sobre Supabase Realtime Broadcast. Pensado para entornos serverless donde no
 * se puede hostear y-websocket: el backend Express en Vercel no mantiene
 * conexiones websocket propias, pero Supabase Realtime ya está disponible.
 *
 * Protocolo (eventos broadcast en el canal `project:{id}:doc`):
 *  - yjs-update      → update incremental del Y.Doc (base64)
 *  - yjs-awareness   → update de awareness (base64)
 *  - sync-request    → un peer nuevo pide el estado actual (envía su stateVector)
 *  - sync-reply      → respuesta con el diff faltante, troceada en chunks
 *
 * El sync inicial puede ser grande, por eso `sync-reply` se trocea para no
 * exceder el límite de tamaño de mensaje de Realtime. Los updates incrementales
 * en cambio son pequeños y van en un solo mensaje.
 */

const CHUNK_SIZE = 48 * 1024 // bytes por chunk antes de base64 (~64KB en base64)

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export type ProviderStatus = 'connecting' | 'connected' | 'disconnected'

export class SupabaseYjsProvider {
  readonly doc: Y.Doc
  readonly awareness: Awareness
  private channel: RealtimeChannel | null = null
  private readonly topic: string
  private readonly clientId: string
  private joined = false
  private destroyed = false
  private attempt = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private syncTimer: ReturnType<typeof setTimeout> | null = null

  // buffers para reensamblar sync-reply troceado, por mensaje origen
  private chunkBuffers = new Map<string, { total: number; parts: string[] }>()

  onStatus: ((status: ProviderStatus) => void) | null = null
  onSynced: (() => void) | null = null
  synced = false

  constructor(projectId: string, doc: Y.Doc, awareness: Awareness) {
    this.doc = doc
    this.awareness = awareness
    this.topic = `project:${projectId}:doc`
    // id estable por instancia (no usamos Math.random ni Date.now a nivel módulo;
    // crypto.randomUUID está disponible en el navegador moderno)
    this.clientId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c-${doc.clientID}`

    this.doc.on('update', this.handleDocUpdate)
    this.awareness.on('update', this.handleAwarenessUpdate)

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleUnload)
    }

    this.connect()
  }

  private setStatus(status: ProviderStatus) {
    this.onStatus?.(status)
  }

  private connect = () => {
    this.cleanupChannel()
    if (this.destroyed) return
    this.setStatus('connecting')

    const channel = supabase.channel(this.topic, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        if (!payload?.data) return
        Y.applyUpdate(this.doc, base64ToBytes(payload.data), this)
      })
      .on('broadcast', { event: 'yjs-awareness' }, ({ payload }) => {
        if (!payload?.data) return
        applyAwarenessUpdate(this.awareness, base64ToBytes(payload.data), this)
      })
      .on('broadcast', { event: 'sync-request' }, ({ payload }) => {
        if (!payload || payload.from === this.clientId) return
        this.sendSyncReply(payload.to ?? null, payload.stateVector)
      })
      .on('broadcast', { event: 'sync-reply' }, ({ payload }) => {
        if (!payload || (payload.to && payload.to !== this.clientId)) return
        this.handleSyncReplyChunk(payload)
      })
      .subscribe((status, err) => {
        if (this.destroyed) return

        if (status === 'SUBSCRIBED') {
          this.attempt = 0
          this.joined = true
          this.setStatus('connected')
          this.requestSync()
          return
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          this.joined = false
          this.setStatus('disconnected')
          console.warn(`[yjs-provider] channel status=${status}`, err || '')
          if (status !== 'CLOSED') {
            const delay = Math.min(1000 * 2 ** this.attempt, 10000)
            this.attempt += 1
            this.retryTimer = setTimeout(this.connect, delay)
          }
        }
      })

    this.channel = channel
  }

  /** Pide a los peers el estado que nos falta enviando nuestro state vector. */
  private requestSync() {
    if (!this.channel || !this.joined) return
    const stateVector = bytesToBase64(Y.encodeStateVector(this.doc))
    this.channel.send({
      type: 'broadcast',
      event: 'sync-request',
      payload: { from: this.clientId, stateVector },
    })
    // Si nadie responde, el consumidor (useCollabDoc) decide sembrar; aquí solo
    // marcamos sincronizado tras una ventana de gracia si seguimos vacíos.
    if (this.syncTimer) clearTimeout(this.syncTimer)
    this.syncTimer = setTimeout(() => this.markSynced(), 2000)
  }

  private markSynced() {
    if (this.synced || this.destroyed) return
    this.synced = true
    this.onSynced?.()
  }

  /** Responde a un peer con el diff que le falta, troceado. */
  private sendSyncReply(to: string | null, peerStateVectorB64?: string) {
    if (!this.channel || !this.joined) return
    let update: Uint8Array
    try {
      const sv = peerStateVectorB64
        ? base64ToBytes(peerStateVectorB64)
        : undefined
      update = Y.encodeStateAsUpdate(this.doc, sv)
    } catch {
      update = Y.encodeStateAsUpdate(this.doc)
    }
    if (update.byteLength === 0) return // no tenemos nada nuevo para este peer

    const b64 = bytesToBase64(update)
    const total = Math.ceil(b64.length / CHUNK_SIZE) || 1
    const msgId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${this.clientId}-${this.doc.clientID}-${b64.length}`

    for (let i = 0; i < total; i++) {
      const part = b64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      this.channel.send({
        type: 'broadcast',
        event: 'sync-reply',
        payload: { to, from: this.clientId, msgId, index: i, total, data: part },
      })
    }
  }

  private handleSyncReplyChunk(payload: any) {
    const { msgId, index, total, data } = payload
    if (typeof msgId !== 'string' || typeof total !== 'number') return

    let buf = this.chunkBuffers.get(msgId)
    if (!buf) {
      buf = { total, parts: new Array(total).fill('') }
      this.chunkBuffers.set(msgId, buf)
    }
    buf.parts[index] = data

    if (buf.parts.every((p) => p !== '' || total === 1)) {
      const full = buf.parts.join('')
      this.chunkBuffers.delete(msgId)
      try {
        Y.applyUpdate(this.doc, base64ToBytes(full), this)
      } catch (err) {
        console.warn('[yjs-provider] failed to apply sync-reply:', err)
      }
      this.markSynced()
    }
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    // No reenviar lo que acabamos de aplicar desde la red (evita bucles).
    if (origin === this) return
    if (!this.channel || !this.joined) return
    this.channel.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { data: bytesToBase64(update) },
    })
  }

  private handleAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return
    if (!this.channel || !this.joined) return
    const changed = added.concat(updated, removed)
    const data = bytesToBase64(encodeAwarenessUpdate(this.awareness, changed))
    this.channel.send({
      type: 'broadcast',
      event: 'yjs-awareness',
      payload: { data },
    })
  }

  private handleUnload = () => {
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'unload')
  }

  private cleanupChannel() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.channel) {
      try {
        supabase.removeChannel(this.channel)
      } catch (err) {
        console.warn('[yjs-provider] removeChannel error:', err)
      }
      this.channel = null
    }
    this.joined = false
  }

  destroy() {
    this.destroyed = true
    if (this.syncTimer) clearTimeout(this.syncTimer)
    this.doc.off('update', this.handleDocUpdate)
    this.awareness.off('update', this.handleAwarenessUpdate)
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleUnload)
    }
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'destroy')
    this.cleanupChannel()
    this.chunkBuffers.clear()
    this.setStatus('disconnected')
  }
}
