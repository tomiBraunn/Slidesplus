import React, { useState, useRef, useEffect } from "react"
import LivePreview from "../LivePreview"
import GeminiChatbot from "../GeminiChatbot"

export default function ChatBotMode({
  doc,
  onChange,
  applySetDoc,
  projectId,
}: {
  doc: string
  onChange: (d: string) => void
  applySetDoc: (val: string | ((v: string) => string)) => void
  projectId?: string
}) {
  const [previewWidth, setPreviewWidth] = useState(35)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<string[]>([])
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const extractedSlides = doc
      .split(/<section/i)
      .slice(1)
      .map((s) => "<section" + s.split("</section>")[0] + "</section>")
      .filter((s) => s.trim().length > 20)
    setSlides(extractedSlides)
    if (currentSlide >= extractedSlides.length) {
      setCurrentSlide(Math.max(0, extractedSlides.length - 1))
    }
  }, [doc, currentSlide])

  const handleMouseDown = () => {
    isDragging.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    setPreviewWidth(Math.min(Math.max(newWidth, 30), 70))
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  const getCurrentSlideDoc = () => {
    if (slides.length === 0) return doc
    return `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${slides[currentSlide]}</body></html>`
  }

  return (
    <div ref={containerRef} className="w-full h-full flex bg-[#121212]">
      <div
        style={{ width: `${previewWidth}%` }}
        className="h-full flex flex-col border-r border-[#2a2a2a]"
      >
        <div className="flex-1 min-h-0 p-4 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-4xl h-full">
              <LivePreview
                document={getCurrentSlideDoc()}
                currentSlide={currentSlide}
                totalSlides={slides.length}
                onSlideChange={setCurrentSlide}
              />
            </div>
          </div>

          {slides.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
              <div className="flex items-center gap-2 mb-2 px-1">
                {/* <span className="text-xs text-gray-400 font-medium">
                  Slides ({slides.length})
                </span> */}
                <span className="text-xs text-gray-500">
                  {currentSlide + 1} / {slides.length}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${currentSlide === index
                        ? "border-blue-500 ring-2 ring-blue-500/30"
                        : "border-[#3a3a3a] hover:border-gray-500"
                      }`}
                    style={{ width: "120px", height: "68px" }}
                  >
                    <iframe
                      srcDoc={`<!doctype html><html><head><meta charset='utf-8'><style>body{margin:0;transform:scale(0.2);transform-origin:top left;width:500%;height:500%;overflow:hidden;}</style></head><body>${slide}</body></html>`}
                      className="w-full h-full border-none bg-white pointer-events-none"
                      title={`Slide ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        onMouseDown={handleMouseDown}
        className="w-1 bg-[#2a2a2a] hover:bg-blue-500 cursor-col-resize transition-colors relative group"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-8 bg-blue-400 rounded-full" />
            <div className="w-0.5 h-8 bg-blue-400 rounded-full" />
          </div>
        </div>
      </div>

      <div style={{ width: `${100 - previewWidth}%` }} className="h-full">
        <GeminiChatbot
          setCode={applySetDoc}
          code={doc}
          projectId={projectId}
          currentSlideIndex={currentSlide}
          slides={slides}
        />
      </div>
    </div>
  )
}
