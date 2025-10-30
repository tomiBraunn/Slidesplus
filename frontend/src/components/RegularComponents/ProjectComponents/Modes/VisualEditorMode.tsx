import React, { useState, useRef, useEffect } from "react"

interface Element {
  id: string
  type: 'text' | 'image' | 'shape'
  x: number
  y: number
  width: number
  height: number
  content?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  backgroundColor?: string
  borderRadius?: number
  rotation?: number
}

export default function VisualEditorMode({ doc, onChange }: { doc: string; onChange: (d: string) => void }) {
  const [elements, setElements] = useState<Element[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [tool, setTool] = useState<'select' | 'text' | 'rectangle' | 'circle'>('select')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(100)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === 'select') return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newElement: Element = {
      id: `element-${Date.now()}`,
      type: tool === 'text' ? 'text' : 'shape',
      x,
      y,
      width: tool === 'text' ? 200 : 150,
      height: tool === 'text' ? 50 : 150,
      content: tool === 'text' ? 'Double click to edit' : '',
      fontSize: 24,
      fontFamily: 'Inter, sans-serif',
      color: '#000000',
      backgroundColor: tool === 'rectangle' ? '#E0E0E0' : tool === 'circle' ? '#90CAF9' : 'transparent',
      borderRadius: tool === 'circle' ? 999 : 0,
      rotation: 0
    }

    setElements([...elements, newElement])
    setSelectedElement(newElement.id)
    setTool('select')
  }

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    setSelectedElement(elementId)
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !selectedElement) return

      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y

      setElements(elements.map(el =>
        el.id === selectedElement
          ? { ...el, x: el.x + dx, y: el.y + dy }
          : el
      ))

      setDragStart({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, selectedElement, dragStart, elements])

  const handleDelete = () => {
    if (!selectedElement) return
    setElements(elements.filter(el => el.id !== selectedElement))
    setSelectedElement(null)
  }

  const updateElement = (id: string, updates: Partial<Element>) => {
    setElements(elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  const selectedEl = elements.find(el => el.id === selectedElement)

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
      {/* Top Toolbar */}
      <div className="h-14 bg-[#2a2a2a] border-b border-[#3a3a3a] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Tools */}
          <button
            onClick={() => setTool('select')}
            className={`p-2 rounded transition-colors ${tool === 'select' ? 'bg-[#0d7dff] text-white' : 'text-gray-400 hover:bg-[#3a3a3a]'
              }`}
            title="Select (V)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded transition-colors ${tool === 'text' ? 'bg-[#0d7dff] text-white' : 'text-gray-400 hover:bg-[#3a3a3a]'
              }`}
            title="Text (T)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded transition-colors ${tool === 'rectangle' ? 'bg-[#0d7dff] text-white' : 'text-gray-400 hover:bg-[#3a3a3a]'
              }`}
            title="Rectangle (R)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="4" y="6" width="16" height="12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded transition-colors ${tool === 'circle' ? 'bg-[#0d7dff] text-white' : 'text-gray-400 hover:bg-[#3a3a3a]'
              }`}
            title="Circle (O)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="w-px h-6 bg-[#3a3a3a] mx-2" />

          {selectedElement && (
            <button
              onClick={handleDelete}
              className="p-2 rounded text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete (Del)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(10, zoom - 10))}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-[#282828] p-8">
          <div className="w-full h-full flex items-center justify-center">
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="relative bg-white shadow-2xl"
              style={{
                width: `${1920 * (zoom / 100)}px`,
                height: `${1080 * (zoom / 100)}px`,
                transformOrigin: 'center',
              }}
            >
              {/* Grid */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #e0e0e0 1px, transparent 1px),
                    linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)
                  `,
                  backgroundSize: `${20 * (zoom / 100)}px ${20 * (zoom / 100)}px`
                }}
              />

              {/* Elements */}
              {elements.map(element => (
                <div
                  key={element.id}
                  onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                  className={`absolute cursor-move ${selectedElement === element.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  style={{
                    left: `${element.x * (zoom / 100)}px`,
                    top: `${element.y * (zoom / 100)}px`,
                    width: `${element.width * (zoom / 100)}px`,
                    height: `${element.height * (zoom / 100)}px`,
                    backgroundColor: element.backgroundColor,
                    borderRadius: `${(element.borderRadius || 0) * (zoom / 100)}px`,
                    transform: `rotate(${element.rotation || 0}deg)`,
                  }}
                >
                  {element.type === 'text' && (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      className="w-full h-full outline-none p-2"
                      style={{
                        fontSize: `${(element.fontSize || 24) * (zoom / 100)}px`,
                        fontFamily: element.fontFamily,
                        color: element.color,
                      }}
                    >
                      {element.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        {selectedEl && (
          <div className="w-64 bg-[#2a2a2a] border-l border-[#3a3a3a] p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Properties</h3>

            <div className="space-y-4">
              {/* Position */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedEl.x)}
                      onChange={(e) => updateElement(selectedEl.id, { x: Number(e.target.value) })}
                      className="w-full bg-[#1e1e1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3a]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedEl.y)}
                      onChange={(e) => updateElement(selectedEl.id, { y: Number(e.target.value) })}
                      className="w-full bg-[#1e1e1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3a]"
                    />
                  </div>
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">W</label>
                    <input
                      type="number"
                      value={Math.round(selectedEl.width)}
                      onChange={(e) => updateElement(selectedEl.id, { width: Number(e.target.value) })}
                      className="w-full bg-[#1e1e1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3a]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">H</label>
                    <input
                      type="number"
                      value={Math.round(selectedEl.height)}
                      onChange={(e) => updateElement(selectedEl.id, { height: Number(e.target.value) })}
                      className="w-full bg-[#1e1e1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3a]"
                    />
                  </div>
                </div>
              </div>

              {/* Colors */}
              {selectedEl.type === 'text' && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Text Color</label>
                  <input
                    type="color"
                    value={selectedEl.color}
                    onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })}
                    className="w-full h-8 rounded border border-[#3a3a3a]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 mb-2 block">Background</label>
                <input
                  type="color"
                  value={selectedEl.backgroundColor}
                  onChange={(e) => updateElement(selectedEl.id, { backgroundColor: e.target.value })}
                  className="w-full h-8 rounded border border-[#3a3a3a]"
                />
              </div>

              {/* Border Radius */}
              {selectedEl.type === 'shape' && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Border Radius</label>
                  <input
                    type="range"
                    min="0"
                    max="999"
                    value={selectedEl.borderRadius}
                    onChange={(e) => updateElement(selectedEl.id, { borderRadius: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {/* Font Size */}
              {selectedEl.type === 'text' && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Font Size</label>
                  <input
                    type="number"
                    value={selectedEl.fontSize}
                    onChange={(e) => updateElement(selectedEl.id, { fontSize: Number(e.target.value) })}
                    className="w-full bg-[#1e1e1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3a]"
                  />
                </div>
              )}

              {/* Rotation */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Rotation</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={selectedEl.rotation}
                  onChange={(e) => updateElement(selectedEl.id, { rotation: Number(e.target.value) })}
                  className="w-full"
                />
                <span className="text-xs text-gray-600">{selectedEl.rotation}°</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}