// @ts-nocheck
import { useEffect, useRef, useState } from 'react'
import { urlbackend } from '../config'

export function useAutoSave(projectId: string | undefined, documentContent: string) {
  const [lastSavedContent, setLastSavedContent] = useState<string>(documentContent)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastContentRef = useRef<string>(documentContent)

  useEffect(() => {
    lastContentRef.current = documentContent
  }, [documentContent])

  useEffect(() => {
    if (!projectId) return

    const saveVersion = async () => {
      const currentContent = lastContentRef.current

      if (currentContent === lastSavedContent) {
        return
      }

      setIsSaving(true)

      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${urlbackend}/projects/${projectId}/auto-save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            content: currentContent
          })
        })

        if (response.ok) {
          setLastSavedContent(currentContent)
          setLastSaveTime(new Date())
        } else {
          console.error('Auto-save failed:', await response.text())
        }
      } catch (error) {
        console.error('Auto-save error:', error)
      } finally {
        setIsSaving(false)
      }
    }

    const interval = setInterval(() => {
      saveVersion()
    }, 60000) 

    return () => {
      clearInterval(interval)
    }
  }, [projectId, lastSavedContent])

  const hasUnsavedChanges = documentContent !== lastSavedContent

  return {
    isSaving,
    lastSaveTime,
    hasUnsavedChanges,
    lastSavedContent
  }
}
