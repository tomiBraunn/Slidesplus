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
  const [lastSavedContent, setLastSavedContent] = useState<string>(documentContent)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const lastContentRef = useRef<string>(documentContent)
  const initializedRef = useRef(false)

  useEffect(() => {
    lastContentRef.current = documentContent
  }, [documentContent])

  const syncBaseline = useCallback((content: string) => {
    setLastSavedContent(content)
    lastContentRef.current = content
    initializedRef.current = true
  }, [])

  const runAutoSave = useCallback(async () => {
    if (!projectId) return false

    const currentContent = lastContentRef.current
    if (currentContent === lastSavedContent) {
      return true
    }

    // No guardar contenido vacío o sin slides: el backend lo rechaza con 400 y
    // solo ensucia la consola. Ocurre durante la ventana inicial antes de que el
    // documento colaborativo termine de sincronizar/sembrar.
    if (!currentContent || !/<section/i.test(currentContent)) {
      return true
    }

    setIsSaving(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${urlbackend}/projects/${projectId}/auto-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: currentContent }),
      })

      if (response.ok) {
        setLastSavedContent(currentContent)
        setLastSaveTime(new Date())
        options?.onContentSynced?.(currentContent)
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
  }, [projectId, lastSavedContent, options])

  useEffect(() => {
    if (!projectId) return

    const interval = setInterval(() => {
      runAutoSave()
    }, 60000)

    return () => clearInterval(interval)
  }, [projectId, runAutoSave])

  const hasUnsavedChanges = documentContent !== lastSavedContent

  return {
    isSaving,
    lastSaveTime,
    hasUnsavedChanges,
    lastSavedContent,
    syncBaseline,
    runAutoSave,
  }
}
