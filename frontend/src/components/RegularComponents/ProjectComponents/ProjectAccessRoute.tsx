// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AccessDenied from './AccessDenied'
import UrlNotFoundPage from '../../FullScreens/UrlNotFoundPage'
import { urlbackend } from '../../../config.js'
import { FullscreenLoader } from '../../ui/FullscreenLoader'

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
            setUserRole(data.userRole ?? null)
            setProjectExists(true)
          } else {
            setHasAccess(false)
            // El 404 del backend no trae `exists`; un 404 implica que no existe,
            // cualquier otra respuesta sin acceso implica que sí existe.
            setProjectExists(res.status !== 404)
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

  if (checking) return <FullscreenLoader />

  if (!hasAccess) {
    return <AccessDenied projectExists={projectExists} />
  }

  return children(hasAccess, userRole)
}