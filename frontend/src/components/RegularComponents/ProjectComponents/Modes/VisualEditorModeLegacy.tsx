import { useState, useEffect, useRef } from "react"

interface SlideElement {
  element: HTMLElement
  type: 'text' | 'image' | 'shape' | 'section'
  tagName: string
  content?: string
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  color?: string
  backgroundColor?: string
  width?: number
  height?: number
  x?: number
  y?: number
}

export default function VisualEditorModeLegacy({
  doc,
  onChange
}: {
  doc: string
  onChange: (d: string) => void
}) {
  const [selectedElement, setSelectedElement] = useState<SlideElement | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<string[]>([])
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

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

  useEffect(() => {
    const setupIframeInteraction = () => {
      const iframes = document.querySelectorAll('iframe[title="Live Preview"]')

      if (iframes.length === 0) {
        return
      }

      iframes.forEach(iframe => {
        const iframeDoc = (iframe as HTMLIFrameElement).contentDocument
        if (!iframeDoc || !iframeDoc.body) {
          return
        }

        iframeRef.current = iframe as HTMLIFrameElement

        let hoveredElement: HTMLElement | null = null
        let lastHoveredElement: HTMLElement | null = null

        const clearHover = () => {
          if (hoveredElement) {
            hoveredElement.style.outline = ''
            hoveredElement.style.outlineOffset = ''
            hoveredElement.style.cursor = ''
            hoveredElement = null
          }
        }

        const handleMouseMove = (e: MouseEvent) => {
          e.stopPropagation()
          const target = e.target as HTMLElement

          if (target === iframeDoc.body || target === iframeDoc.documentElement) {
            clearHover()
            return
          }

          if (target === lastHoveredElement) {
            return
          }

          clearHover()

          lastHoveredElement = target
          hoveredElement = target
          target.style.outline = '2px solid rgba(13, 125, 255, 0.5)'
          target.style.outlineOffset = '2px'
          target.style.cursor = 'pointer'
        }

        const handleMouseLeave = () => {
          clearHover()
          lastHoveredElement = null
        }

        const handleIframeClick = (e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()

          const target = e.target as HTMLElement

          if (!target || target === iframeDoc.body || target === iframeDoc.documentElement) {
            const section = iframeDoc.querySelector('section')
            if (section) {
              selectElement(section as HTMLElement, true)
            }
            return
          }

          selectElement(target, false)
        }

        const selectElement = (target: HTMLElement, isSection: boolean) => {
          const computedStyle = window.getComputedStyle(target)
          const rect = target.getBoundingClientRect()

          const getTextContent = (el: HTMLElement): string => {
            if (el.childNodes.length === 0) return el.textContent || ''

            let text = ''
            el.childNodes.forEach(node => {
              if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent || ''
              }
            })
            return text
          }

          const element: SlideElement = {
            element: target,
            type: isSection ? 'section' :
                  target.tagName === 'IMG' ? 'image' :
                  ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'DIV', 'A', 'BUTTON'].includes(target.tagName) ? 'text' : 'shape',
            tagName: target.tagName,
            content: getTextContent(target),
            fontSize: parseInt(computedStyle.fontSize),
            fontWeight: computedStyle.fontWeight,
            fontFamily: computedStyle.fontFamily,
            color: computedStyle.color,
            backgroundColor: computedStyle.backgroundColor,
            width: rect.width,
            height: rect.height,
            x: rect.left,
            y: rect.top
          }

          const allElements = Array.from(iframeDoc.body.querySelectorAll('*'))
          allElements.forEach(el => {
            const htmlEl = el as HTMLElement
            htmlEl.style.outline = ''
            htmlEl.style.outlineOffset = ''
          })

          target.style.outline = '2px solid #0d7dff'
          target.style.outlineOffset = '2px'

          setSelectedElement(element)
        }

        iframeDoc.removeEventListener('mousemove', handleMouseMove)
        iframeDoc.removeEventListener('mouseleave', handleMouseLeave)
        iframeDoc.removeEventListener('click', handleIframeClick)

        iframeDoc.addEventListener('mousemove', handleMouseMove, true)
        iframeDoc.addEventListener('mouseleave', handleMouseLeave)
        iframeDoc.addEventListener('click', handleIframeClick, true)
      })
    }

    const timeoutId = setTimeout(setupIframeInteraction, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [doc, currentSlide, slides])

  const saveChanges = () => {
    if (!iframeRef.current?.contentDocument) return

    const section = iframeRef.current.contentDocument.querySelector('section')
    if (!section) return

    const updatedSlideHTML = section.outerHTML
    const newSlides = [...slides]
    newSlides[currentSlide] = updatedSlideHTML

    const newDoc = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>" +
      newSlides.join("\n") +
      "</body></html>"

    onChange(newDoc)
  }

  const updateElement = (updates: Partial<SlideElement>) => {
    if (!selectedElement?.element) return

    const target = selectedElement.element

    if (updates.fontSize !== undefined) {
      target.style.fontSize = `${updates.fontSize}px`
    }
    if (updates.fontWeight !== undefined) {
      target.style.fontWeight = updates.fontWeight
    }
    if (updates.color !== undefined) {
      target.style.color = updates.color
    }
    if (updates.backgroundColor !== undefined) {
      target.style.backgroundColor = updates.backgroundColor
    }
    if (updates.content !== undefined) {
      const hasOnlyTextChildren = Array.from(target.childNodes).every(
        node => node.nodeType === Node.TEXT_NODE
      )

      if (hasOnlyTextChildren || target.childNodes.length === 0) {
        target.textContent = updates.content
      } else {
        let updated = false
        target.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            node.textContent = updates.content!
            updated = true
          }
        })
        if (!updated && target.childNodes.length > 0) {
          target.insertBefore(document.createTextNode(updates.content), target.firstChild)
        }
      }
    }
    if (updates.width !== undefined) {
      target.style.width = `${updates.width}px`
    }
    if (updates.height !== undefined) {
      target.style.height = `${updates.height}px`
    }
    if (updates.x !== undefined || updates.y !== undefined) {
      if (target.style.position !== 'absolute' && target.style.position !== 'fixed') {
        target.style.position = 'relative'
      }
      if (updates.x !== undefined) {
        const currentLeft = parseInt(target.style.left || '0')
        target.style.left = `${currentLeft + (updates.x - (selectedElement.x || 0))}px`
      }
      if (updates.y !== undefined) {
        const currentTop = parseInt(target.style.top || '0')
        target.style.top = `${currentTop + (updates.y - (selectedElement.y || 0))}px`
      }
    }

    const rect = target.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(target)

    setSelectedElement({
      ...selectedElement,
      ...updates,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      fontSize: updates.fontSize !== undefined ? updates.fontSize : parseInt(computedStyle.fontSize),
      color: updates.color || computedStyle.color,
      backgroundColor: updates.backgroundColor || computedStyle.backgroundColor
    })

    saveChanges()
  }

  return (
    <div className="w-full h-full bg-theme-primary flex items-center justify-center">
      {selectedElement ? (
        <div className="w-full h-full bg-theme-quaternary p-6 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-6">
            {selectedElement.type === 'section' ? 'Slide Properties' : 'Element Properties'}
          </h3>

          <div className="space-y-6">
            <div>
              <label className="text-sm text-theme-secondary mb-2 block">Element Type</label>
              <div className="text-sm text-white bg-theme-primary px-4 py-3 rounded-lg font-mono">
                {selectedElement.tagName}
              </div>
            </div>

            {selectedElement.type === 'text' && (
              <>
                <div>
                  <label className="text-sm text-theme-secondary mb-2 block">Content</label>
                  <textarea
                    value={selectedElement.content}
                    onChange={(e) => updateElement({ content: e.target.value })}
                    className="w-full bg-theme-primary text-white text-sm px-4 py-3 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm text-theme-secondary mb-2 block">Font Size</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="range"
                      min="8"
                      max="200"
                      value={selectedElement.fontSize}
                      onChange={(e) => updateElement({ fontSize: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      value={selectedElement.fontSize}
                      onChange={(e) => updateElement({ fontSize: Number(e.target.value) })}
                      className="w-20 bg-theme-primary text-white text-sm px-3 py-2 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-theme-secondary mb-2 block">Font Weight</label>
                  <select
                    value={selectedElement.fontWeight}
                    onChange={(e) => updateElement({ fontWeight: e.target.value })}
                    className="w-full bg-theme-primary text-white text-sm px-4 py-3 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none"
                  >
                    <option value="300">Light (300)</option>
                    <option value="400">Regular (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semibold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra Bold (800)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-theme-secondary mb-2 block">Text Color</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={rgbToHex(selectedElement.color || '#000000')}
                      onChange={(e) => updateElement({ color: e.target.value })}
                      className="w-16 h-12 rounded-lg border-2 border-theme-tertiary cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedElement.color}
                      onChange={(e) => updateElement({ color: e.target.value })}
                      className="flex-1 bg-theme-primary text-white text-sm px-4 py-3 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-sm text-theme-secondary mb-2 block">Background Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={rgbToHex(selectedElement.backgroundColor || '#ffffff')}
                  onChange={(e) => updateElement({ backgroundColor: e.target.value })}
                  className="w-16 h-12 rounded-lg border-2 border-theme-tertiary cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedElement.backgroundColor}
                  onChange={(e) => updateElement({ backgroundColor: e.target.value })}
                  className="flex-1 bg-theme-primary text-white text-sm px-4 py-3 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-theme-secondary mb-2 block">Dimensions</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-theme-secondary mb-1 block">Width (px)</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.width || 0)}
                    onChange={(e) => updateElement({ width: Number(e.target.value) })}
                    className="w-full bg-theme-primary text-white text-sm px-3 py-2 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-theme-secondary mb-1 block">Height (px)</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.height || 0)}
                    onChange={(e) => updateElement({ height: Number(e.target.value) })}
                    className="w-full bg-theme-primary text-white text-sm px-3 py-2 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-theme-secondary mb-2 block">Position</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-theme-secondary mb-1 block">X (px)</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.x || 0)}
                    onChange={(e) => updateElement({ x: Number(e.target.value) })}
                    className="w-full bg-theme-primary text-white text-sm px-3 py-2 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-theme-secondary mb-1 block">Y (px)</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.y || 0)}
                    onChange={(e) => updateElement({ y: Number(e.target.value) })}
                    className="w-full bg-theme-primary text-white text-sm px-3 py-2 rounded-lg border border-theme-tertiary focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-theme-secondary gap-4">
          <svg className="w-24 h-24 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <div className="text-center">
            <p className="text-lg font-medium text-theme-secondary mb-1">No element selected</p>
            <p className="text-sm text-theme-secondary">Click on an element in the preview to edit its properties</p>
          </div>
        </div>
      )}
    </div>
  )
}

function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb

  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return '#000000'

  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])

  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}
