// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AccessDenied from './AccessDenied'
import { urlbackend } from '../../../config.js'

type Props = {
  children: (hasAccess: boolean, role: string | null) => React.ReactElement
}

export default function ProjectAccessRoute({ children }: Props) {
  const [checking, setChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [projectExists, setProjectExists] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const { id } = useParams<{ id: string }>()
  const token = localStorage.getItem('token')

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      if (!token || !id) {
        setHasAccess(false)
        setChecking(false)
        return
      }

      try {
        const res = await fetch(`${urlbackend}/projects/${id}/access`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (!cancelled) {
          if (data.ok && data.hasAccess) {
            setHasAccess(true)
            setUserRole(data.role)
            setProjectExists(true)
          } else {
            setHasAccess(false)
            setProjectExists(data.exists || false)
          }
          setChecking(false)
        }
      } catch (error) {
        console.error('Error checking project access:', error)
        if (!cancelled) {
          setHasAccess(false)
          setProjectExists(false)
          setChecking(false)
        }
      }
    }

    checkAccess()
    return () => {
      cancelled = true
    }
  }, [token, id])

  if (checking) {
    return (
      <div className="w-screen h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return <AccessDenied projectExists={projectExists} />
  }

  return children(hasAccess, userRole)
}
