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
  refreshTrigger?: number
  onColorChange?: (color: string) => void
}

export const SpotifyController: React.FC<SpotifyControllerProps> = ({ onOpenSettings, refreshTrigger, onColorChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dominantColor, setDominantColor] = useState<string>('#1DB954')
  const controllerRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    checkSpotifyConnection()

    const pollInterval = setInterval(checkSpotifyConnection, 5000)
    return () => clearInterval(pollInterval)
  }, [])

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      checkSpotifyConnection()
    }
  }, [refreshTrigger])

  useEffect(() => {
    if (isConnected && isOpen) {
      fetchCurrentTrack()
      const interval = setInterval(fetchCurrentTrack, 1000)
      return () => clearInterval(interval)
    }
  }, [isConnected, isOpen])

  useEffect(() => {
    if (currentTrack?.album_art) {
      extractColors(currentTrack.album_art)
    } else {
      setDominantColor('#1DB954')
      if (onColorChange) {
        onColorChange('')
      }
    }
  }, [currentTrack?.album_art])

  const extractColors = async (imageUrl: string) => {
    try {
      const img = new Image()
      img.crossOrigin = 'Anonymous'

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          const size = 50
          canvas.width = size
          canvas.height = size
          ctx.drawImage(img, 0, 0, size, size)

          const imageData = ctx.getImageData(0, 0, size, size)
          const data = imageData.data
          let r = 0, g = 0, b = 0
          let count = 0

          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3]
            if (alpha > 125) {
              r += data[i]
              g += data[i + 1]
              b += data[i + 2]
              count++
            }
          }

          if (count > 0) {
            r = Math.floor(r / count)
            g = Math.floor(g / count)
            b = Math.floor(b / count)

            const brightness = (r * 299 + g * 587 + b * 114) / 1000
            const factor = brightness > 128 ? 0.7 : 1.3
            r = Math.min(255, Math.floor(r * factor))
            g = Math.min(255, Math.floor(g * factor))
            b = Math.min(255, Math.floor(b * factor))

            const widgetColor = `rgb(${r}, ${g}, ${b})`

            setTimeout(() => {
              setDominantColor(widgetColor)
              if (onColorChange) {
                const navbarR = Math.floor(r * 0.5)
                const navbarG = Math.floor(g * 0.5)
                const navbarB = Math.floor(b * 0.5)
                onColorChange(`rgba(${navbarR}, ${navbarG}, ${navbarB}, 0.9)`)
              }
            }, 100)
          }
        } catch (err) {
          console.error('Error processing image:', err)
        }
      }

      img.onerror = () => {
        console.error('Error loading image')
        setDominantColor('#1DB954')
        if (onColorChange) {
          onColorChange('')
        }
      }

      img.src = imageUrl
    } catch (err) {
      console.error('Error extracting colors:', err)
    }
  }

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

  const handleNext = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${urlbackend}/spotify/next`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      setTimeout(fetchCurrentTrack, 300)
    } catch (err) {
      console.error('Error skipping to next track:', err)
    }
  }

  const handlePrevious = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${urlbackend}/spotify/previous`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      setTimeout(fetchCurrentTrack, 300)
    } catch (err) {
      console.error('Error going to previous track:', err)
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

  const handleMouseEnter = () => {
    if (!isConnected) {
      return
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (!isOpen) {
      fetchCurrentTrack()
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    if (!isConnected) {
      return
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 300)
  }

  const handleClick = () => {
    if (!isConnected) {
      onOpenSettings()
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) return null

  return (
    <div
      className="relative"
      ref={controllerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className="w-8 flex items-center justify-center transition-all"
        title={isConnected ? 'Spotify Player' : 'Connect Spotify'}
      >
        <svg className="w-9 h-9 text-bg-inverted z-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
        <span className='w-[80%] h-[80%] rounded-full absolute bg-theme-primary'></span>
      </button>

      {isOpen && isConnected && (
        <div
          className="absolute top-full right-0 mt-2 w-60 h-35 rounded-2xl shadow-2xl overflow-hidden z-200"
          style={{
            background: currentTrack
              ? `linear-gradient(135deg, ${dominantColor} 0%, rgba(0,0,0,0.95) 100%)`
              : 'black'
          }}
        >

          <div className='flex flex-col w-full h-full p-3'>
            <svg className="absolute top-4 right-4 w-3 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            <div className="h-full w-full flex items-center justify-top gap-2">
              {!currentTrack ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <svg className="w-16 h-16 text-white/60 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  <p className="text-base text-white/90 font-medium">No music playing</p>
                  <p className="text-sm text-white/60 mt-1">Open Spotify and play something</p>
                </div>
              ) : (
                <>
                  <img
                    src={currentTrack.album_art}
                    alt={currentTrack.name}
                    className="h-24 aspect-square rounded-lg object-cover shadow-2xl"
                  />

                  <div className="flex items-start justify-start flex-col w-full min-w-0">
                    <div className="min-w-0 flex flex-col w-full">
                      <p className="text-sm font-bold text-white truncate w-full">
                        {currentTrack.name}
                      </p>
                      <p className="text-xs text-white/80 truncate w-full">
                        {currentTrack.artist}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={handlePrevious}
                        className="hover:opacity-80 transition-opacity"
                        title="Previous"
                      >
                        <svg className="w-4 h-4 fill-white" viewBox="0 0 50 48">
                          <path fillRule="evenodd" clipRule="evenodd"
                            d="M10.6679 27.8312L10.6679 46.3396C10.6679 47.2557 9.92579 48 8.90538 48L1.66976 48C0.742116 48 7.45803e-07 47.2557 8.29252e-07 46.3396L4.89935e-06 1.65941C4.9828e-06 0.743334 0.74212 8.38556e-07 1.66976 9.16385e-07L8.90538 1.52345e-06C9.92579 1.60906e-06 10.6679 0.743335 10.6679 1.65941L10.6679 20.1679L45.9184 0.627619C46.7532 0.167356 47.7737 0.167356 48.6085 0.627619C49.4434 1.08788 50 1.93804 50 2.85857C50 12.5517 50 35.4473 50 45.1414C50 46.061 49.4434 46.9112 48.6085 47.3714C47.7737 47.8317 46.7532 47.8318 45.9184 47.3724L10.6679 27.8312Z" />
                        </svg>
                      </button>

                      <button
                        onClick={handlePlayPause}
                        title={currentTrack.is_playing ? 'Pause' : 'Play'}
                      >
                        {currentTrack.is_playing ? (
                          <svg className="w-8 h-8" viewBox="0 0 110 110" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd"
                              d="M55.0039 0C85.3632 0 110.008 24.6441 110.008 54.9995C110.008 85.3559 85.3632 110 55.0039 110C24.6446 110 0 85.3559 0 54.9995C0 24.6441 24.6446 0 55.0039 0ZM48.5749 33.0133C48.5749 31.7902 47.5034 30.7965 46.3426 30.7965H37.0562C35.8061 30.7965 34.8239 31.7902 34.8239 33.0133V76.7162C34.8239 77.9402 35.8061 78.9339 37.0562 78.9339H46.3426C47.5034 78.9339 48.5749 77.9402 48.5749 76.7162V33.0133ZM76.0769 33.0133C76.0769 31.7902 75.0947 30.7965 73.8446 30.7965H64.5582C63.3081 30.7965 62.3259 31.7902 62.3259 33.0133V76.7162C62.3259 77.9402 63.3081 78.9339 64.5582 78.9339H73.8446C75.0947 78.9339 76.0769 77.9402 76.0769 76.7162V33.0133Z"
                              fill="white" />
                          </svg>
                        ) : (
                          <svg className="w-8 h-8" viewBox="0 0 110 110" fill="none">
                            <defs>
                              <mask id="playMask">
                                <rect width="110" height="110" fill="white" />
                                <path
                                  d="M0 5.16392C0 2.86171 2.486 1.41746 4.48595 2.55778L52.4292 29.8939C54.448 31.0449 54.448 33.9551 52.4292 35.1061L4.48596 62.4422C2.486 63.5825 0 62.1383 0 59.8361V5.16392Z"
                                  fill="black" transform="translate(35,22)" />
                              </mask>
                            </defs>
                            <circle cx="55" cy="55" r="55" fill="white" mask="url(#playMask)" />
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={handleNext}
                        className="hover:opacity-80 transition-opacity"
                        title="Next"
                      >
                        <svg className="w-4 h-4 fill-white" viewBox="0 0 50 48">
                          <path fillRule="evenodd" clipRule="evenodd"
                            d="M39.3321 20.1688V1.66036C39.3321 0.74429 40.0742 0 41.0946 0H48.3302C49.2579 0 50 0.74429 50 1.66036V46.3406C50 47.2567 49.2579 48 48.3302 48H41.0946C40.0742 48 39.3321 47.2567 39.3321 46.3406V27.8321L4.08163 47.3724C3.24675 47.8326 2.22635 47.8326 1.39147 47.3724C0.556586 46.9121 0 46.062 0 45.1414C0 35.4483 0 12.5527 0 2.85865C0 1.93901 0.556586 1.08883 1.39147 0.62857C2.22635 0.168307 3.24675 0.168241 4.08163 0.627614L39.3321 20.1688Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {currentTrack && (
              <div className="flex justify-between items-center gap-2 w-full">
                <div className="flex justify-between text-xs text-white/70">
                  <span>{formatTime(currentTrack.progress_ms)}</span>
                </div>
                <div className="relative w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all">
                  <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-1000"
                    style={{
                      width: `${(currentTrack.progress_ms / currentTrack.duration_ms) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/70">
                  <span>{formatTime(currentTrack.duration_ms)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}