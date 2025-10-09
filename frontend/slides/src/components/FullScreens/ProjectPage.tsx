import React, { useEffect, useRef, useState } from "react"

type Props = {
  document: string
  onSlideChange?: (index: number) => void
}

export default function LivePreview({ document: htmlDocument, onSlideChange }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [totalSlides, setTotalSlides] = useState(1)

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(htmlDocument || "")
    doc.close()

    const sections = doc.querySelectorAll('section')
    setTotalSlides(sections.length || 1)

    sections.forEach((section, index) => {
      (section as HTMLElement).style.display = index === 0 ? 'block' : 'none'
    })
    setCurrentSlide(0)
  }, [htmlDocument])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
    if (!doc) return

    const sections = doc.querySelectorAll('section')
    sections.forEach((section, index) => {
      (section as HTMLElement).style.display = index === currentSlide ? 'block' : 'none'
    })

    if (onSlideChange) {
      onSlideChange(currentSlide)
    }
  }, [currentSlide, onSlideChange])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!window.document.fullscreenElement)
    }
    window.document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => window.document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (!window.document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await window.document.exitFullscreen()
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err)
    }
  }

  const goToPreviousSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const goToNextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full">
      <div
        ref={containerRef}
        className="flex items-center justify-center w-full h-full select-none aspect-video defaultStyle rounded-t-xl rounded-b-none"
      >
        <iframe ref={iframeRef} title="Live Preview" className="w-full h-full border-none bg-white overflow-hidden rounded-t-sm" />
      </div>
      <div className="w-full flex justify-center presentationComponentsStyle rounded-none rounded-b-3xl">
        <div className="flex items-center justify-between gap-2 rounded-none rounded-b-3xl w-auto">
          <span
            onClick={toggleFullscreen}
            className="material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B] hover:text-[#6B6B6B] transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "fullscreen_exit" : "fullscreen"}
          </span>
          <span
            onClick={goToPreviousSlide}
            className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B] hover:text-[#6B6B6B] transition-colors ${currentSlide === 0 ? "opacity-30 cursor-not-allowed" : ""
              }`}
            title="Previous slide"
          >
            chevron_left
          </span>
          <span
            onClick={goToNextSlide}
            className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B] hover:text-[#6B6B6B] transition-colors ${currentSlide === totalSlides - 1 ? "opacity-30 cursor-not-allowed" : ""
              }`}
            title="Next slide"
          >
            chevron_right
          </span>
          <span className="material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B] hover:text-[#6B6B6B] transition-colors" title="Show all slides">filter_none</span>
        </div>
      </div>
    </div>
  )
}