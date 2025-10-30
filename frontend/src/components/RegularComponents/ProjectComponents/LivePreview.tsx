import React, { useEffect, useRef, useState } from "react"

type Props = {
  document: string
  currentSlide: number
  totalSlides: number
  onSlideChange: (index: number) => void
}

export default function LivePreview({
  document,
  currentSlide,
  totalSlides,
  onSlideChange,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const containerWidth = rect.width
      const containerHeight = rect.height

      const baseWidth = 1920
      const baseHeight = 1080

      const scaleX = containerWidth / baseWidth
      const scaleY = containerHeight / baseHeight
      const newScale = Math.min(scaleX, scaleY)

      setScale(newScale)
    }

    updateScale()

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateScale)
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', updateScale)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  useEffect(() => {
    const writeContent = () => {
      const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
      if (!doc) return

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body {
                width: 1920px;
                height: 1080px;
                overflow: hidden;
                background: white;
              }
              body {
                transform: scale(${scale});
                transform-origin: top left;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              section {
                width: 1920px;
                height: 1080px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 4rem;
                text-align: center;
                background: white;
              }
            </style>
          </head>
          <body>
          </body>
        </html>
      `)
      doc.close()

      const parser = new DOMParser()
      const parsedDoc = parser.parseFromString(document, 'text/html')
      const bodyContent = parsedDoc.body.innerHTML

      if (doc.body) {
        doc.body.innerHTML = bodyContent
      }
    }

    writeContent()
  }, [document, scale])

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) onSlideChange(currentSlide + 1)
  }

  const handlePrev = () => {
    if (currentSlide > 0) onSlideChange(currentSlide - 1)
  }

  const handleFullscreen = () => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) {
      const style = doc.createElement('style')
      style.textContent = `
        body {
          transform: scale(1) !important;
        }
      `
      doc.head.appendChild(style)
    }

    if (iframe.requestFullscreen) {
      iframe.requestFullscreen()
    } else if ((iframe as any).webkitRequestFullscreen) {
      (iframe as any).webkitRequestFullscreen()
    } else if ((iframe as any).mozRequestFullScreen) {
      (iframe as any).mozRequestFullScreen()
    } else if ((iframe as any).msRequestFullscreen) {
      (iframe as any).msRequestFullscreen()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
      <div className="w-full h-full flex items-center justify-center rounded-4xl">
        <div
          ref={containerRef}
          className="w-full aspect-[16/9] defaultStyle rounded-4xl overflow-hidden max-h-full bg-white relative"
        >
          <iframe
            ref={iframeRef}
            title="Live Preview"
            className="w-full h-full border-none absolute top-0 left-0 bg-white"
            style={{
              border: 'none',
              outline: 'none',
              overflow: 'hidden',
              background: 'white'
            }}
          />
        </div>
      </div>
      <div className="w-full flex justify-center presentationComponentsStyle rounded-none rounded-b-3xl">
        <div className="flex items-center justify-between gap-2 rounded-none rounded-b-3xl w-auto">
          <span
            className="material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B] hover:text-white transition-colors"
            onClick={handleFullscreen}
            title="Fullscreen"
          >
            fullscreen
          </span>
          <span
            className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square transition-colors ${currentSlide === 0 ? 'text-[#2a2a2a] cursor-not-allowed' : 'text-[#4B4B4B] hover:text-white'
              }`}
            onClick={handlePrev}
            title="Previous slide"
          >
            chevron_left
          </span>
          <span
            className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square transition-colors ${currentSlide === totalSlides - 1 ? 'text-[#2a2a2a] cursor-not-allowed' : 'text-[#4B4B4B] hover:text-white'
              }`}
            onClick={handleNext}
            title="Next slide"
          >
            chevron_right
          </span>
          <span
            className="material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B] hover:text-white transition-colors"
            title="View all slides"
          >
            filter_none
          </span>
        </div>
      </div>
    </div>
  )
}