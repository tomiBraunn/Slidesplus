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

      const existingScript = doc.getElementById('visual-editor-script')

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
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
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
      <div className={`w-full h-full flex items-center justify-center ${visualMode ? '' : 'rounded-3xl'}`}>
        <div
          ref={containerRef}
          className={`w-full aspect-[16/9] overflow-hidden max-h-full bg-white relative ${visualMode ? '' : 'rounded-4xl border'}`}
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
    </div>
  )
})

LivePreview.displayName = 'LivePreview'

export default LivePreview