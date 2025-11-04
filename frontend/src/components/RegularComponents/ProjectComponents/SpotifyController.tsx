// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { urlbackend } from '../../../config.js'

interface SpotifyTrack {
  name: string
  artist: string
  album_art: string
  duration_ms: number
  progress_ms: number
  is_playing: boolean
}

interface SpotifyControllerProps {
  onOpenSettings: () => void
}

export const SpotifyController: React.FC<SpotifyControllerProps> = ({ onOpenSettings }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const controllerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkSpotifyConnection()
  }, [])

  useEffect(() => {
    if (isConnected && isOpen) {
      fetchCurrentTrack()
      const interval = setInterval(fetchCurrentTrack, 1000)
      return () => clearInterval(interval)
    }
  }, [isConnected, isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (controllerRef.current && !controllerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const checkSpotifyConnection = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${urlbackend}/spotify/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setIsConnected(data.connected || false)
    } catch (err) {
      console.error('Error checking Spotify connection:', err)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCurrentTrack = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${urlbackend}/spotify/current-track`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.ok && data.track) {
        setCurrentTrack(data.track)
      }
    } catch (err) {
      console.error('Error fetching current track:', err)
    }
  }

  const handlePlayPause = async () => {
    if (!currentTrack) return
    try {
      const token = localStorage.getItem('token')
      const endpoint = currentTrack.is_playing ? 'pause' : 'play'
      await fetch(`${urlbackend}/spotify/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCurrentTrack()
    } catch (err) {
      console.error('Error toggling playback:', err)
    }
  }

  const handleShuffle = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${urlbackend}/spotify/shuffle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCurrentTrack()
    } catch (err) {
      console.error('Error toggling shuffle:', err)
    }
  }

  const handleRepeat = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${urlbackend}/spotify/repeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCurrentTrack()
    } catch (err) {
      console.error('Error toggling repeat:', err)
    }
  }

  const handleIconClick = () => {
    if (!isConnected) {
      onOpenSettings()
      return
    }
    setIsOpen(!isOpen)
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) return null

  return (
    <div className="relative" ref={controllerRef}>
      <button
        onClick={handleIconClick}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          isConnected
            ? 'bg-[#1DB954] hover:bg-[#1ed760]'
            : 'bg-theme-tertiary hover:bg-theme-hover'
        }`}
        title={isConnected ? 'Spotify Player' : 'Connect Spotify'}
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </button>

      {isOpen && isConnected && currentTrack && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-theme-primary border border-theme-tertiary rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={currentTrack.album_art}
                alt={currentTrack.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-theme-primary truncate">
                  {currentTrack.name}
                </p>
                <p className="text-xs text-theme-secondary truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <div className="mb-3">
              <div className="relative w-full h-1 bg-theme-tertiary rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-[#1DB954] transition-all duration-1000"
                  style={{
                    width: `${(currentTrack.progress_ms / currentTrack.duration_ms) * 100}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-theme-secondary mt-1">
                <span>{formatTime(currentTrack.progress_ms)}</span>
                <span>{formatTime(currentTrack.duration_ms)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleShuffle}
                className="p-2 hover:bg-theme-hover rounded-full transition-colors"
                title="Shuffle"
              >
                <svg className="w-4 h-4 text-theme-secondary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                </svg>
              </button>

              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ed760] flex items-center justify-center transition-colors"
                title={currentTrack.is_playing ? 'Pause' : 'Play'}
              >
                {currentTrack.is_playing ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              <button
                onClick={handleRepeat}
                className="p-2 hover:bg-theme-hover rounded-full transition-colors"
                title="Repeat"
              >
                <svg className="w-4 h-4 text-theme-secondary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
