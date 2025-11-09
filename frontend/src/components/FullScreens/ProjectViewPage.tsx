// @ts-nocheck
import { useEffect, useState, useRef } from "react"
import { useParams } from "react-router-dom"
import { urlbackend } from "../../config.js"
import { ShareModal } from "../RegularComponents/MultiuseComponents/ShareModal"
import AppIconWithoutLink from "../RegularComponents/MultiuseComponents/AppIconWithoutLink"

export default function ProjectViewPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [totalSlides, setTotalSlides] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [projectName, setProjectName] = useState("Presentation")
  const [copied, setCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)
  const currentSlideRef = useRef(currentSlide)
  const totalSlidesRef = useRef(totalSlides)

  useEffect(() => {
    currentSlideRef.current = currentSlide
  }, [currentSlide])

  useEffect(() => {
    totalSlidesRef.current = totalSlides
  }, [totalSlides])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'slideChange') {
        console.log('Parent received slideChange:', event.data.slide)
        setCurrentSlide(event.data.slide)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const handleNextSlide = () => {
      console.log('Key: Next slide requested. Current:', currentSlideRef.current, 'Total:', totalSlidesRef.current)
      if (currentSlideRef.current < totalSlidesRef.current - 1) {
        iframeRef.current?.contentWindow?.postMessage({ type: 'nextSlide' }, '*')
      }
    }

    const handlePrevSlide = () => {
      console.log('Key: Prev slide requested. Current:', currentSlideRef.current)
      if (currentSlideRef.current > 0) {
        iframeRef.current?.contentWindow?.postMessage({ type: 'prevSlide' }, '*')
      }
    }

    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen()
        setIsFullscreen(true)
      } else {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        handleNextSlide()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        handlePrevSlide()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true)
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight
      const mouseY = e.clientY

      if (mouseY > windowHeight - 100) {
        setShowControls(true)
        if (hideControlsTimeout.current) {
          clearTimeout(hideControlsTimeout.current)
        }
        hideControlsTimeout.current = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      } else {
        if (hideControlsTimeout.current) {
          clearTimeout(hideControlsTimeout.current)
        }
        setShowControls(false)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
    }
  }, [isFullscreen])

  const handleNextSlide = () => {
    console.log('Button: Next slide requested. Current:', currentSlideRef.current, 'Total:', totalSlidesRef.current)
    if (currentSlideRef.current < totalSlidesRef.current - 1) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'nextSlide' }, '*')
    }
  }

  const handlePrevSlide = () => {
    console.log('Button: Prev slide requested. Current:', currentSlideRef.current)
    if (currentSlideRef.current > 0) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'prevSlide' }, '*')
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    async function fetchProject() {
      try {
        const token = localStorage.getItem('token')
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }

        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch(`${urlbackend}/projects/${id}`, {
          headers,
        })

        if (!response.ok) {
          const statusText = response.status === 401
            ? "Backend needs to be updated to support this endpoint"
            : response.status === 404
              ? "Project not found"
              : `Server error (${response.status})`

          setErrorMessage(statusText)
          setError(true)
          setLoading(false)
          return
        }

        const data = await response.json()

        const project = data.ok ? data.project : data
        const slides = project?.slides || []

        if (!project) {
          setErrorMessage("Invalid response from server")
          setError(true)
          setLoading(false)
          return
        }

        if (project.name) {
          setProjectName(project.name)
        }

        if (token) {
          try {
            const userRes = await fetch(`${urlbackend}/me`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (userRes.ok) {
              const userData = await userRes.json()
              setIsOwner(userData.id === project.owner_id)
            }
          } catch (err) {
          }
        }

        const slidesHtml = slides
          .sort((a: any, b: any) => a.position - b.position)
          .map((slide: any, index: number) => `<div class="slide" data-slide="${index}">${slide.html}</div>`)
          .join("\n")

        setTotalSlides(slides.length)

        const fullDoc = `<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<style>
* {
  box-sizing: border-box;
}
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: black;
  width: 100vw;
  height: 100vh;
}
.slides-container {
  width: 1920px;
  height: 1080px;
  position: absolute;
  overflow: hidden;
  background: black;
  transform-origin: top left;
}
.slide {
  width: 1920px;
  height: 1080px;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
  pointer-events: none;
  background: black;
  padding: 0;
  margin: 0;
}
.slide > section {
  width: 1920px !important;
  height: 1080px !important;
  max-width: 1920px !important;
  max-height: 1080px !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.slide > section > * {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.slide.active {
  opacity: 1;
  pointer-events: auto;
  z-index: 2;
}
.slide.fading-out {
  opacity: 0;
  z-index: 1;
}
</style>
</head>
<body>
<div class="slides-container" id="slides-container">
${slidesHtml}
</div>
<script>
let currentSlide = 0;
let isTransitioning = false;
const slides = document.querySelectorAll('.slide');
const container = document.getElementById('slides-container');

console.log('Total slides found:', slides.length);

// Calculate and apply scale based on viewport
function updateScale() {
  const baseWidth = 1920;
  const baseHeight = 1080;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const scaleX = viewportWidth / baseWidth;
  const scaleY = viewportHeight / baseHeight;
  const scale = Math.min(scaleX, scaleY);

  container.style.transform = 'scale(' + scale + ')';

  // Center the container
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;
  const offsetX = (viewportWidth - scaledWidth) / 2;
  const offsetY = (viewportHeight - scaledHeight) / 2;

  container.style.left = offsetX + 'px';
  container.style.top = offsetY + 'px';
}

updateScale();
window.addEventListener('resize', updateScale);

function updateSlide(index) {
  console.log('updateSlide called with index:', index, 'current:', currentSlide, 'transitioning:', isTransitioning);
  
  if (index < 0 || index >= slides.length) {
    console.log('Index out of bounds');
    return;
  }
  
  if (isTransitioning) {
    console.log('Already transitioning');
    return;
  }
  
  if (index === currentSlide) {
    console.log('Already on this slide');
    return;
  }

  isTransitioning = true;
  const oldSlide = currentSlide;
  
  console.log('Starting transition from', oldSlide, 'to', index);

  slides[oldSlide].classList.add('fading-out');

  setTimeout(() => {
    slides[oldSlide].classList.remove('active', 'fading-out');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    
    console.log('Transition complete, new slide:', currentSlide);
    
    window.parent.postMessage({ type: 'slideChange', slide: currentSlide }, '*');
    
    setTimeout(() => {
      isTransitioning = false;
    }, 100);
  }, 100);
}

if (slides.length > 0) {
  console.log('Initializing first slide');
  slides[0].classList.add('active');
  window.parent.postMessage({ type: 'slideChange', slide: 0 }, '*');
}

window.addEventListener('message', (event) => {
  console.log('Message received:', event.data);
  
  if (event.data.type === 'nextSlide') {
    updateSlide(currentSlide + 1);
  } else if (event.data.type === 'prevSlide') {
    updateSlide(currentSlide - 1);
  } else if (event.data.type === 'goToSlide') {
    updateSlide(event.data.slide);
  }
});

console.log('Viewer initialized with', slides.length, 'slides');
</script>
</body>
</html>`

        setDoc(fullDoc)
        setLoading(false)
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Unknown error")
        setError(true)
        setLoading(false)
      }
    }

    if (id) {
      fetchProject()
    }
  }, [id])

  if (loading) {
    return (
      <div className="w-screen h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-screen h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center max-w-2xl px-4">
          <h1 className="text-4xl text-white mb-4">Presentation not available</h1>
          <p className="text-gray-400 mb-2">{errorMessage}</p>
          <p className="text-gray-500 text-sm mb-8">
            {errorMessage.includes("Backend")
              ? "Your backend needs to implement the GET /projects/:id endpoint with slides support."
              : "The presentation you're looking for doesn't exist or you don't have access."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className="relative w-screen h-screen user-select-none">
        <iframe
          ref={iframeRef}
          srcDoc={doc}
          className="w-screen h-screen border-0"
          title="Project View"
          sandbox="allow-scripts allow-same-origin"
        />

        {isOwner && (
          <button
            onClick={() => setShareModalOpen(true)}
            className="fixed top-4 right-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg z-50"
          >
            <span className="material-symbols-outlined">share</span>
            Share
          </button>
        )}

        <div
          className={`fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm flex items-center justify-between px-4 py-2 z-50 transition-all duration-300 ${isFullscreen && !showControls ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}
        >
          <div className="flex items-center gap-3">
            {/* <p className="appColorFadeText text-xl">Slides+</p> */}
            <AppIconWithoutLink />
            <div className="h-6 w-px bg-white/20"></div>
            <p className="text-white text-sm font-medium truncate max-w-xs">{projectName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title={copied ? "Link copied!" : "Copy link"}
            >
              <span className="material-symbols-outlined text-xl">
                {copied ? 'check' : 'link'}
              </span>
            </button>

            <div className="h-6 w-px bg-white/20"></div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlide === 0}
                className="p-2 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded-lg"
                title="Previous slide"
              >
                <span className="material-symbols-outlined text-3xl">chevron_left</span>
              </button>

              <span className="text-sm text-white min-w-[60px] text-center">
                {currentSlide + 1} / {totalSlides}
              </span>

              <button
                onClick={handleNextSlide}
                disabled={currentSlide === totalSlides - 1}
                className="p-2 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded-lg"
                title="Next slide"
              >
                <span className="material-symbols-outlined text-3xl">chevron_right</span>
              </button>
            </div>

            <div className="h-6 w-px bg-white/20"></div>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Fullscreen (F)"
            >
              <span className="material-symbols-outlined text-2xl">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <ShareModal
        projectId={id || null}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </>
  )
}