import { useState, useEffect } from "react"

type PanelType = "design" | "text" | "elements" | "projects" | "multimedia" | null

type CanvasElement = {
  id: string
  type: "text" | "shape" | "image"
  content?: string
  tagName?: string
  className?: string
  style?: string
}

export default function VisualEditorMode({
  doc,
  onChange,
  previewRef
}: {
  doc: string
  onChange: (d: string) => void
  previewRef: React.RefObject<HTMLIFrameElement>
}) {
  const [activePanel, setActivePanel] = useState<PanelType>("text")
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null)

  const [fontSize, setFontSize] = useState(16)
  const [fontWeight, setFontWeight] = useState("normal")
  const [textColor, setTextColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("transparent")

  useEffect(() => {
    const iframe = previewRef.current
    if (!iframe) return

    const injectScript = () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc || !iframeDoc.body) return false

      const existingScript = iframeDoc.getElementById('visual-editor-script')
      if (existingScript) return true

      const script = iframeDoc.createElement('script')
      script.id = 'visual-editor-script'
      script.textContent = `
        (function() {
          let selectedElement = null;
          let isDragging = false;
          let dragStartX = 0;
          let dragStartY = 0;
          let elementStartX = 0;
          let elementStartY = 0;

          document.addEventListener('click', function(e) {
            e.stopPropagation();

            const section = document.querySelector('section');
            if (!section) return;

            const target = e.target;

            if (target === section) {
              if (selectedElement) {
                selectedElement.style.outline = 'none';
                selectedElement.removeAttribute('data-selected');
              }
              selectedElement = null;
              window.parent.postMessage({ type: 'element-selected', element: null }, '*');
              return;
            }

            if (selectedElement && selectedElement !== target) {
              selectedElement.style.outline = 'none';
              selectedElement.removeAttribute('data-selected');
            }

            selectedElement = target;
            selectedElement.style.outline = '2px solid #3b82f6';
            selectedElement.setAttribute('data-selected', 'true');

            const computedStyle = window.getComputedStyle(selectedElement);
            const fontSize = parseInt(computedStyle.fontSize);
            const fontWeight = computedStyle.fontWeight === '700' || computedStyle.fontWeight === 'bold' ? 'bold' : 'normal';

            window.parent.postMessage({
              type: 'element-selected',
              element: {
                id: selectedElement.id || 'element-' + Math.random().toString(36).substr(2, 9),
                tagName: selectedElement.tagName,
                content: selectedElement.textContent,
                className: selectedElement.className,
                fontSize: fontSize,
                fontWeight: fontWeight,
                color: computedStyle.color,
                backgroundColor: computedStyle.backgroundColor
              }
            }, '*');
          });

          document.addEventListener('dblclick', function(e) {
            if (!selectedElement) return;
            e.preventDefault();
            e.stopPropagation();

            selectedElement.contentEditable = 'true';
            selectedElement.focus();

            const range = document.createRange();
            range.selectNodeContents(selectedElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          });

          document.addEventListener('blur', function(e) {
            if (e.target.contentEditable === 'true') {
              e.target.contentEditable = 'false';

              const section = document.querySelector('section');
              if (section) {
                window.parent.postMessage({
                  type: 'content-changed',
                  content: section.outerHTML
                }, '*');
              }
            }
          }, true);

          document.addEventListener('keydown', function(e) {
            if (e.key === 'Delete' && selectedElement && selectedElement.contentEditable !== 'true') {
              e.preventDefault();
              selectedElement.remove();
              selectedElement = null;

              const section = document.querySelector('section');
              if (section) {
                window.parent.postMessage({
                  type: 'content-changed',
                  content: section.outerHTML
                }, '*');
              }
            } else if (e.key === 'Escape' && selectedElement && selectedElement.contentEditable === 'true') {
              selectedElement.contentEditable = 'false';
              selectedElement.blur();
            }
          });

          document.addEventListener('mousedown', function(e) {
            if (!selectedElement || selectedElement.contentEditable === 'true') return;

            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            if (window.getComputedStyle(selectedElement).position !== 'absolute') {
              const rect = selectedElement.getBoundingClientRect();
              selectedElement.style.position = 'absolute';
              selectedElement.style.left = rect.left + 'px';
              selectedElement.style.top = rect.top + 'px';
            }

            elementStartX = parseFloat(selectedElement.style.left) || 0;
            elementStartY = parseFloat(selectedElement.style.top) || 0;

            e.preventDefault();
          });

          document.addEventListener('mousemove', function(e) {
            if (!isDragging || !selectedElement) return;

            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;

            selectedElement.style.left = (elementStartX + deltaX) + 'px';
            selectedElement.style.top = (elementStartY + deltaY) + 'px';
          });

          document.addEventListener('mouseup', function(e) {
            if (isDragging) {
              isDragging = false;

              const section = document.querySelector('section');
              if (section) {
                window.parent.postMessage({
                  type: 'content-changed',
                  content: section.outerHTML
                }, '*');
              }
            }
          });
        })();
      `

      iframeDoc.body.appendChild(script)
      return true
    }

    const timer = setTimeout(() => {
      injectScript()
    }, 300)

    const interval = setInterval(() => {
      if (!injectScript()) {
        console.log('Re-injecting visual editor script')
      }
    }, 500)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'element-selected') {
        const element = e.data.element
        if (element) {
          setSelectedElement(element)
          setFontSize(element.fontSize || 16)
          setFontWeight(element.fontWeight || 'normal')

          const rgbToHex = (rgb: string) => {
            if (rgb.startsWith('#')) return rgb
            const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
            if (!match) return '#000000'
            const r = parseInt(match[1])
            const g = parseInt(match[2])
            const b = parseInt(match[3])
            return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
          }

          setTextColor(rgbToHex(element.color || '#000000'))

          const bg = element.backgroundColor || 'transparent'
          if (bg === 'transparent' || bg.includes('rgba(0, 0, 0, 0)') || bg.includes('rgba(255, 255, 255, 0)')) {
            setBgColor('#ffffff')
          } else {
            setBgColor(rgbToHex(bg))
          }
        } else {
          setSelectedElement(null)
        }
      } else if (e.data.type === 'content-changed') {
        const section = e.data.content
        const updatedSection = section.startsWith('<section') ? section : `<section class="slide">${section}</section>`
        const newDoc = doc.replace(
          /<section[^>]*>[\s\S]*?<\/section>/i,
          updatedSection
        )
        onChange(newDoc)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [doc, onChange])

  const applyStyle = (property: string, value: string) => {
    const iframe = previewRef.current
    if (!iframe || !selectedElement) return

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    const element = iframeDoc.querySelector('[data-selected="true"]')
    if (!element) return

    (element as HTMLElement).style[property as any] = value

    const section = iframeDoc.querySelector('section')
    if (section) {
      const updatedContent = `<section${section.outerHTML.substring(8)}`
      onChange(doc.replace(
        /<section[^>]*>[\s\S]*?<\/section>/i,
        updatedContent
      ))
    }
  }

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize)
    applyStyle('fontSize', `${newSize}px`)
  }

  const handleColorChange = (newColor: string) => {
    setTextColor(newColor)
    applyStyle('color', newColor)
  }

  const handleBgColorChange = (newColor: string) => {
    setBgColor(newColor)
    applyStyle('backgroundColor', newColor)
  }

  const handleFontWeightChange = (weight: string) => {
    setFontWeight(weight)
    applyStyle('fontWeight', weight)
  }

  const addElement = (html: string) => {
    const iframe = previewRef.current
    if (!iframe) return

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    const section = iframeDoc.querySelector('section')
    if (!section) return

    const temp = iframeDoc.createElement('div')
    temp.innerHTML = html
    const newElement = temp.firstChild

    if (newElement) {
      section.appendChild(newElement)

      const updatedSection = `<section${section.outerHTML.substring(8)}`
      onChange(doc.replace(
        /<section[^>]*>[\s\S]*?<\/section>/i,
        updatedSection
      ))
    }
  }

  const handleAddText = (styleType: string) => {
    let className = 'text-lg'
    let content = 'Double-click to edit'

    if (styleType === 'title') {
      className = 'text-6xl font-bold'
      content = 'Title'
    } else if (styleType === 'heading') {
      className = 'text-4xl font-semibold'
      content = 'Heading'
    } else if (styleType === 'subheading') {
      className = 'text-2xl font-medium'
      content = 'Subheading'
    } else if (styleType === 'body') {
      className = 'text-base'
      content = 'Body text'
    } else if (styleType === 'tilted') {
      className = 'text-base italic'
      content = 'Italic text'
    }

    addElement(`<div class="${className} p-4" style="position: absolute; left: 200px; top: 200px;">${content}</div>`)
  }

  const handleAddElement = (shapeType: string) => {
    let html = ''

    if (shapeType === 'square') {
      html = '<div class="w-48 h-48 bg-blue-500" style="position: absolute; left: 400px; top: 300px;"></div>'
    } else if (shapeType === 'rectangle') {
      html = '<div class="w-64 h-32 bg-blue-500" style="position: absolute; left: 400px; top: 300px;"></div>'
    } else if (shapeType === 'circle') {
      html = '<div class="w-48 h-48 bg-blue-500 rounded-full" style="position: absolute; left: 400px; top: 300px;"></div>'
    } else if (shapeType === 'triangle') {
      html = '<div style="position: absolute; left: 400px; top: 300px; width: 0; height: 0; border-left: 100px solid transparent; border-right: 100px solid transparent; border-bottom: 173px solid #3b82f6;"></div>'
    }

    addElement(html)
  }

  const handleAddMedia = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      addElement(`<img src="${src}" class="w-64 h-auto" style="position: absolute; left: 600px; top: 400px;" />`)
    }
    reader.readAsDataURL(file)
  }

  const textStyles = [
    { id: "title", label: "Title", style: "text-6xl font-bold" },
    { id: "heading", label: "Heading", style: "text-4xl font-semibold" },
    { id: "subheading", label: "Subheading", style: "text-2xl font-medium" },
    { id: "body", label: "Body", style: "text-base" }
  ]

  const moreOptions = [
    { id: "tilted", label: "Tilted", style: "italic" },
  ]

  const shapeElements = [
    { id: "square", label: "Square", viewBox: "0 0 100 100", path: "M 10 10 L 90 10 L 90 90 L 10 90 Z" },
    { id: "rectangle", label: "Rectangle", viewBox: "0 0 120 80", path: "M 10 10 L 110 10 L 110 70 L 10 70 Z" },
    { id: "circle", label: "Circle", viewBox: "0 0 100 100", path: "M 50 50 m -40 0 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0" },
    { id: "triangle", label: "Triangle", viewBox: "0 0 100 100", path: "M 50 10 L 90 90 L 10 90 Z" },
  ]

  const panels = [
    { id: "design" as const, icon: "palette", label: "Design" },
    { id: "text" as const, icon: "text_fields", label: "Text" },
    { id: "elements" as const, icon: "category", label: "Elements" },
    { id: "projects" as const, icon: "folder", label: "Projects" },
    { id: "multimedia" as const, icon: "perm_media", label: "Multimedia" }
  ]

  return (
    <div className="absolute inset-0 bg-theme-alt">
      <div className="flex w-full h-full items-center justify-center p-4">
        <div className="flex gap-2 w-full max-w-full min-h-full rounded-xl overflow-hidden">

          {activePanel === "design" && (
            <div className="flex-1 bg-theme-primary border border-theme-tertiary rounded-xl overflow-hidden relative">
              <svg
                className="absolute inset-0 w-full h-full opacity-10"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 800 600"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  <filter id="blur1">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
                  </filter>
                </defs>
                <g filter="url(#blur1)">
                  <ellipse cx="200" cy="400" rx="300" ry="200" fill="#7182FF" fillOpacity="0.5" />
                  <ellipse cx="600" cy="200" rx="250" ry="180" fill="#249931" fillOpacity="0.5" />
                  <ellipse cx="400" cy="300" rx="200" ry="150" fill="#7182FF" fillOpacity="0.3" />
                </g>
              </svg>
              <div className="relative z-10 text-center text-theme-primary flex flex-col items-center justify-center gap-2 p-8 text-md h-full">
                <p>We're still</p>
                <p className="text-4xl font-bold">Cooking our website</p>
                <p>New feature coming soon.</p>
                <p>Stay tuned.</p>
              </div>
            </div>
          )}

          {activePanel === "text" && (
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <div className="p-2 bg-theme-secondary border-2 border-theme-tertiary rounded-3xl backdrop-blur-lg flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-semibold text-theme-secondary">Element</span>
                    <div className="px-2 py-1 bg-theme-secondary border-2 border-theme-tertiary rounded-lg">
                      <span className="text-[13px] font-semibold text-theme-primary">
                        {selectedElement ? selectedElement.tagName.toLowerCase() : "none"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-semibold text-theme-secondary">Font size</span>
                    <div className="px-1.5 py-1 bg-theme-secondary border-2 border-theme-tertiary rounded-lg flex items-center gap-1">
                      <button onClick={() => handleFontSizeChange(Math.max(8, fontSize - 2))} className="text-[16px] font-semibold text-theme-secondary hover:text-theme-primary w-3 text-center">-</button>
                      <span className="text-[13px] font-semibold text-theme-primary min-w-[16px] text-center">{fontSize}</span>
                      <button onClick={() => handleFontSizeChange(fontSize + 2)} className="text-[16px] font-semibold text-theme-secondary hover:text-theme-primary w-3 text-center">+</button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-semibold text-theme-secondary">color</span>
                    <div className="relative px-1.5 py-2 flex items-center justify-center">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-[20px] font-semibold text-theme-primary">A</span>
                      <div className="absolute bottom-0 left-1.5 right-1.5 h-[4px] rounded" style={{ backgroundColor: textColor }}></div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-semibold text-theme-secondary">background</span>
                    <div className="relative px-1.5 py-2 flex items-center justify-center">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => handleBgColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="w-[15px] h-[15px] border border-theme-primary"></div>
                      <div className="absolute bottom-0 left-1.5 right-1.5 h-[4px] rounded" style={{ backgroundColor: bgColor }}></div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-semibold text-theme-secondary">Font weight</span>
                    <select
                      value={fontWeight}
                      onChange={(e) => handleFontWeightChange(e.target.value)}
                      className="px-2 py-1 bg-theme-secondary border-2 border-theme-tertiary rounded-lg text-[13px] font-semibold text-theme-primary"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-theme-primary border border-theme-tertiary rounded-xl overflow-hidden min-h-0">
                <div className="p-4 h-full overflow-y-auto">
                  <button
                    onClick={() => handleAddText("default")}
                    className="w-full bg-theme-inverted text-theme-inverted rounded-xl py-3 px-4 mb-4 hover:opacity-90 transition-opacity font-semibold text-sm"
                  >
                    Add a textbox
                  </button>

                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-theme-secondary mb-2">predetermined text styles</h3>
                    <div className="flex flex-col gap-2">
                      {textStyles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => handleAddText(style.id)}
                          className="w-full bg-theme-primary border border-theme-tertiary rounded-xl py-3 px-4 text-left hover:bg-theme-hover transition-colors"
                        >
                          <span className={
                            style.style === "text-6xl font-bold" ? "text-3xl font-bold text-theme-primary" :
                              style.style === "text-4xl font-semibold" ? "text-2xl font-semibold text-theme-primary" :
                                style.style === "text-2xl font-medium" ? "text-xl font-medium text-theme-primary" :
                                  "text-base text-theme-primary"
                          }>
                            {style.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-theme-secondary mb-2">More options</h3>
                    <div className="flex flex-col gap-2">
                      {moreOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleAddText(option.id)}
                          className="w-full bg-theme-primary border border-theme-tertiary rounded-xl py-3 px-4 text-left hover:bg-theme-hover transition-colors"
                        >
                          <span className={
                            option.style === "italic" ? "italic text-theme-primary" :
                              "text-theme-primary"
                          }>
                            {option.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === "elements" && (
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <div className="p-2 bg-theme-secondary border-2 border-theme-tertiary rounded-3xl backdrop-blur-lg flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-semibold text-theme-secondary">Element</span>
                    <div className="px-2 py-1 bg-theme-secondary border-2 border-theme-tertiary rounded-lg">
                      <span className="text-[13px] font-semibold text-theme-primary">
                        {selectedElement ? selectedElement.tagName.toLowerCase() : "none"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-semibold text-theme-secondary">color</span>
                    <div className="relative px-1.5 py-2 flex items-center justify-center">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => handleBgColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-[20px] font-semibold text-theme-primary">■</span>
                      <div className="absolute bottom-0 left-1.5 right-1.5 h-[4px] rounded" style={{ backgroundColor: bgColor }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-theme-primary border border-theme-tertiary rounded-xl overflow-hidden min-h-0">
                <div className="p-4 h-full overflow-y-auto">
                  <h3 className="text-xs font-medium text-theme-secondary mb-2">Basic Shapes</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {shapeElements.map((element) => (
                      <button
                        key={element.id}
                        onClick={() => handleAddElement(element.id)}
                        className="aspect-square bg-theme-primary border border-theme-tertiary rounded-xl hover:bg-theme-hover transition-colors flex flex-col items-center justify-center gap-1 p-3"
                      >
                        <svg viewBox={element.viewBox} className="w-12 h-12">
                          <path d={element.path} fill="currentColor" className="text-theme-primary" />
                        </svg>
                        <span className="text-xs text-theme-secondary">{element.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === "multimedia" && (
            <div className="flex-1 overflow-y-hidden bg-theme-primary border border-theme-tertiary rounded-xl">
              <div className="p-6 overflow-hidden">
                <div className="relative border-2 border-dashed rounded-xl p-10 mb-6 border-theme-tertiary bg-theme-primary hover:border-[#7182FF] hover:bg-[#7182FF]/10 transition-colors">
                  <input
                    type="file"
                    id="media-upload"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files
                      if (files) {
                        Array.from(files).forEach(file => {
                          if (file.type.startsWith('image/')) {
                            handleAddMedia(file)
                          }
                        })
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-3 pointer-events-none">
                    <svg
                      className="w-14 h-14 text-theme-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-theme-primary text-sm font-medium">Drag & drop images to upload</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === "projects" && (
            <div className="flex-1 bg-theme-primary border border-theme-tertiary rounded-xl overflow-hidden relative">
              <svg
                className="absolute inset-0 w-full h-full opacity-10"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 800 600"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  <filter id="blurProjects">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
                  </filter>
                </defs>
                <g filter="url(#blurProjects)">
                  <ellipse cx="200" cy="400" rx="300" ry="200" fill="#7182FF" fillOpacity="0.5" />
                  <ellipse cx="600" cy="200" rx="250" ry="180" fill="#249931" fillOpacity="0.5" />
                  <ellipse cx="400" cy="300" rx="200" ry="150" fill="#7182FF" fillOpacity="0.3" />
                </g>
              </svg>
              <div className="relative z-10 text-center text-theme-primary flex flex-col items-center justify-center gap-2 p-8 text-md h-full">
                <p>We're still</p>
                <p className="text-4xl font-bold">Cooking our website</p>
                <p>New feature coming soon.</p>
                <p>Stay tuned.</p>
              </div>
            </div>
          )}

          <div className="w-16 min-h-full bg-theme-primary border border-theme-tertiary flex flex-col items-center py-6 gap-2 rounded-xl">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(activePanel === panel.id ? null : panel.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${activePanel === panel.id
                    ? "bg-theme-inverted text-theme-inverted"
                    : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                  }`}
                title={panel.label}
              >
                <span className="material-symbols-outlined text-xl">{panel.icon}</span>
                <span className="text-[9px] font-medium">{panel.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
