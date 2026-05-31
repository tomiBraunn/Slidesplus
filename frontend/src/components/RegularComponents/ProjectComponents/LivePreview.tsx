import React, { useEffect, useRef, useState, forwardRef } from "react"

type Props = {
  document: string
  currentSlide: number
  totalSlides: number
  onSlideChange: (index: number) => void
  visualMode?: boolean
}

const LivePreview = forwardRef<HTMLIFrameElement, Props>(({
  document,
  currentSlide,
  totalSlides,
  onSlideChange,
  visualMode = false,
}, ref) => {
  const internalRef = useRef<HTMLIFrameElement>(null)
  const iframeRef = (ref as React.RefObject<HTMLIFrameElement>) || internalRef
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [dims, setDims] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateScale = () => {
      if (!wrapperRef.current) return

      const rect = wrapperRef.current.getBoundingClientRect()
      const availW = rect.width
      const availH = rect.height

      const BASE_W = 1920
      const BASE_H = 1080

      // fit 16:9 inside available space
      const scaleByW = availW / BASE_W
      const scaleByH = availH / BASE_H
      const newScale = Math.min(scaleByW, scaleByH)

      const finalW = BASE_W * newScale
      const finalH = BASE_H * newScale

      setScale(newScale)
      setDims({ width: finalW, height: finalH })
    }

    updateScale()

    const ro = new ResizeObserver(() => requestAnimationFrame(updateScale))
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    window.addEventListener('resize', updateScale)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  useEffect(() => {
    const writeContent = () => {
      const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
      if (!doc) return

      const existingScript = doc.getElementById('visual-editor-script')

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
                background: #000;
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
                background: #000;
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

      if (existingScript && visualMode) {
        if (doc.body && !doc.getElementById('visual-editor-script')) {
          doc.body.appendChild(existingScript)
        }
      }
    }

    writeContent()
  }, [document, scale, visualMode])

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) onSlideChange(currentSlide + 1)
  }

  const handlePrev = () => {
    if (currentSlide > 0) onSlideChange(currentSlide - 1)
  }
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
        e.preventDefault()
        handleNext()
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault()
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlide, totalSlides])

  return (
    <div ref={wrapperRef} className="flex items-center justify-center w-full h-full">
      <div
        ref={containerRef}
        className={`overflow-hidden relative flex-shrink-0 ${visualMode ? '' : 'rounded-2xl border border-theme-tertiary'}`}
        style={visualMode
          ? { width: '100%', height: '100%' }
          : { width: dims.width || '100%', height: dims.height || 'auto' }
        }
      >
        <iframe
          ref={iframeRef}
          title="Live Preview"
          className="absolute top-0 left-0 border-none"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  )
})

LivePreview.displayName = 'LivePreview'

export default LivePreview