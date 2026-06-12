// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react'
import { urlbackend } from '../config'

export function useAutoSave(
  projectId: string | undefined,
  documentContent: string,
  options?: {
    onContentSynced?: (content: string) => void
  }
) {
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Contenido vivo del documento (espejo del Y.Doc).
  const lastContentRef = useRef<string>(documentContent)
  // Último contenido que YA fue versionado en /auto-save (o sembrado como
  // baseline al abrir). Es la referencia contra la que decidimos si el
  // intervalo de 60s debe crear una versión nueva. NO se actualiza con los
  // guardados debounced a /slides (eso era el bug que impedía versionar).
  const lastVersionedRef = useRef<string>(documentContent)
  // Refs estables para opciones, para que el intervalo no se reinicie.
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    lastContentRef.current = documentContent
  }, [documentContent])

  // Marca el contenido sembrado/cargado como baseline ya versionado, para no
  // crear una versión del seed inicial al abrir el proyecto.
  const syncBaseline = useCallback((content: string) => {
    lastContentRef.current = content
    lastVersionedRef.current = content
  }, [])

  const runAutoSave = useCallback(async () => {
    if (!projectId) return false

    const currentContent = lastContentRef.current
    if (currentContent === lastVersionedRef.current) {
      return true
    }

    // No guardar contenido vacío o sin slides: el backend lo rechaza con 400 y
    // solo ensucia la consola. Ocurre durante la ventana inicial antes de que el
    // documento colaborativo termine de sincronizar/sembrar.
    if (!currentContent || !/<section/i.test(currentContent)) {
      return true
    }

    const token = localStorage.getItem('token')
    if (!token) {
      console.error('Auto-save abortado: no hay token de autenticación')
      return false
    }

    setIsSaving(true)

    try {
      const response = await fetch(`${urlbackend}/projects/${projectId}/auto-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: currentContent }),
        keepalive: true,
      })

      if (response.ok) {
        // El backend dedupea por fingerprint: tanto si creó versión como si no,
        // este contenido ya está representado, así que avanzamos el baseline.
        lastVersionedRef.current = currentContent
        setLastSaveTime(new Date())
        optionsRef.current?.onContentSynced?.(currentContent)
        return true
      }
      console.error('Auto-save failed:', await response.text())
      return false
    } catch (error) {
      console.error('Auto-save error:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [projectId])

  // Intervalo estable: solo depende de projectId. runAutoSave es estable
  // (sus dependencias son refs), así que el timer no se reinicia en cada edición.
  useEffect(() => {
    if (!projectId) return

    const interval = setInterval(() => {
      runAutoSave()
    }, 60000)

    return () => clearInterval(interval)
  }, [projectId, runAutoSave])

  const hasUnsavedChanges = documentContent !== lastVersionedRef.current

  return {
    isSaving,
    lastSaveTime,
    hasUnsavedChanges,
    syncBaseline,
    runAutoSave,
  }
}
