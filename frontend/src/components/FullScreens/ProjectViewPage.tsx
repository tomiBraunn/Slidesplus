// @ts-nocheck
import { useTranslation } from "react-i18next"
import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "react-router-dom"
import { urlbackend } from "../../config.js"
import { ShareModal } from "../RegularComponents/MultiuseComponents/ShareModal"
import AppIconWithoutLink from "../RegularComponents/MultiuseComponents/AppIconWithoutLink"
import SEO from "../SEO"
import { getAuthToken } from "../../utils/getAuthToken"
import { useCollabDoc } from "../../hooks/useCollabDoc"

// Extrae las <section> de un documento HTML completo (el formato del Y.Doc).
function extractSectionsFromDoc(html: string): string[] {
  if (!html) return []
  const matches = html.match(/<section[\s\S]*?<\/section>/gi)
  return matches ? matches.map((s) => s.trim()) : []
}

// Construye el documento del iframe del visor a partir de las slides. `startIndex`
// es el slide que debe quedar activo al cargar — clave para que, cuando el doc se
// actualiza en vivo, el espectador no salte de vuelta al slide 1.
function buildViewerDoc(slidesHtml: string, startIndex: number): string {
  return `<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; overflow: hidden; background: black; width: 100vw; height: 100vh; }
.slides-container { width: 1920px; height: 1080px; position: absolute; overflow: hidden; background: black; transform-origin: top left; }
section { width: 1920px; height: 1080px; position: absolute; top: 0; left: 0; display: none !important; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 0; margin: 0; }
section.active { display: flex !important; }
</style>
</head>
<body>
<div class="slides-container" id="slides-container">
${slidesHtml}
</div>
<script>
let currentSlide = ${startIndex};
let isTransitioning = false;
const slides = document.querySelectorAll('section');
const container = document.getElementById('slides-container');

function updateScale() {
  const baseWidth = 1920, baseHeight = 1080;
  const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
  const scale = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight);
  container.style.transform = 'scale(' + scale + ')';
  const offsetX = (viewportWidth - baseWidth * scale) / 2;
  const offsetY = (viewportHeight - baseHeight * scale) / 2;
  container.style.left = offsetX + 'px';
  container.style.top = offsetY + 'px';
}
updateScale();
window.addEventListener('resize', updateScale);

function updateSlide(index) {
  if (slides.length === 0) return;
  if (index < 0 || index >= slides.length) return;
  if (isTransitioning) return;
  if (index === currentSlide) return;
  isTransitioning = true;
  if (slides[currentSlide]) slides[currentSlide].classList.remove('active');
  currentSlide = index;
  if (slides[currentSlide]) slides[currentSlide].classList.add('active');
  window.parent.postMessage({ type: 'slideChange', slide: currentSlide }, '*');
  isTransitioning = false;
}

// Activar el slide inicial (clamp por si se borraron slides y el índice quedó fuera de rango).
if (slides.length > 0) {
  if (currentSlide >= slides.length) currentSlide = slides.length - 1;
  slides[currentSlide].classList.add('active');
  window.parent.postMessage({ type: 'slideChange', slide: currentSlide }, '*');
}

window.addEventListener('message', (event) => {
  if (event.data.type === 'nextSlide') updateSlide(currentSlide + 1);
  else if (event.data.type === 'prevSlide') updateSlide(currentSlide - 1);
  else if (event.data.type === 'goToSlide') updateSlide(event.data.slide);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); updateSlide(currentSlide + 1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); updateSlide(currentSlide - 1); }
});
</script>
</body>
</html>`
}

export default function ProjectViewPage() {
  const { t } = useTranslation()
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
  const [projectName, setProjectName] = useState(t("projectView.presentation"))
  const [copied, setCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)
  const currentSlideRef = useRef(currentSlide)
  const totalSlidesRef = useRef(totalSlides)

  useEffect(() => {
    currentSlideRef.current = currentSlide
  }, [currentSlide])

  // ── Live updates vía Yjs: el visor se conecta como peer (solo lectura) al
  // mismo Y.Doc colaborativo que el editor. Cuando el presentador edita, el doc
  // se propaga y regeneramos el iframe preservando el slide actual. ──
  const loadSnapshot = useCallback(async (): Promise<string | undefined> => {
    if (!id) return undefined
    try {
      const token = await getAuthToken()
      const res = await fetch(`${urlbackend}/projects/${id}/slides`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      const slides = data.ok ? data.slides : (data.slides || [])
      if (!slides || slides.length === 0) return undefined
      const html = slides
        .sort((a: any, b: any) => a.position - b.position)
        .map((s: any) => s.html)
        .join("\n")
      return `<!doctype html><html><head><meta charset='utf-8'></head><body>${html}</body></html>`
    } catch {
      return undefined
    }
  }, [id])

  const { doc: liveDoc, ready: liveReady } = useCollabDoc({
    projectId: id,
    enabled: !!id,
    user: null,
    loadSnapshot,
  })

  // Regenerar el iframe cada vez que cambia el doc en vivo, conservando el slide
  // activo. Solo actúa una vez que Yjs sincronizó, para no pisar la carga inicial.
  useEffect(() => {
    if (!liveReady) return
    const sections = extractSectionsFromDoc(liveDoc)
    setTotalSlides(sections.length)
    const startIndex = sections.length > 0 ? Math.min(currentSlideRef.current, sections.length - 1) : 0
    setDoc(buildViewerDoc(sections.join("\n"), startIndex))
    setLoading(false)
  }, [liveDoc, liveReady])

  useEffect(() => {
    totalSlidesRef.current = totalSlides
  }, [totalSlides])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'slideChange') {
        setCurrentSlide(event.data.slide)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const handleNextSlide = () => {
      if (currentSlideRef.current < totalSlidesRef.current - 1) {
        iframeRef.current?.contentWindow?.postMessage({ type: 'nextSlide' }, '*')
      }
    }

    const handlePrevSlide = () => {
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
    // Hide controls after 3 seconds of inactivity
    const hideAfterDelay = () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight
      const mouseY = e.clientY

      // Show controls if mouse is near bottom of screen
      if (mouseY > windowHeight - 150) {
        setShowControls(true)
        hideAfterDelay()
      }
    }

    // Start with controls visible
    setShowControls(true)

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
    }
  }, [])

  const handleNextSlide = () => {
    if (currentSlideRef.current < totalSlidesRef.current - 1) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'nextSlide' }, '*')
    }
  }

  const handlePrevSlide = () => {
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
        const token = await getAuthToken()
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
            ? t("projectView.errorBackend")
            : response.status === 404
              ? t("projectView.errorNotFound")
              : t("projectView.errorServer", { status: response.status })

          setErrorMessage(statusText)
          setError(true)
          setLoading(false)
          return
        }

        const data = await response.json()

        const project = data.ok ? data.project : data

        if (!project) {
          setErrorMessage(t("projectView.errorInvalid"))
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
        // Las slides (y su carga inicial) las maneja el Y.Doc en vivo; aquí solo
        // traemos metadata (nombre, owner). El loader se oculta cuando Yjs
        // sincroniza y produce el primer doc.
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : t("projectView.errorUnknown"))
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
          <p className="text-gray-400">{t("projectView.loading")}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-screen h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center max-w-2xl px-4">
          <h1 className="text-4xl text-white mb-4">{t("projectView.notAvailable")}</h1>
          <p className="text-gray-400 mb-2">{errorMessage}</p>
          <p className="text-gray-500 text-sm mb-8">
            {errorMessage.includes("Backend")
              ? t("projectView.errorBackendHelp")
              : t("projectView.errorAccessHelp")}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            {t("projectView.retry")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO
        title={`${projectName} - Presentation on slides+`}
        description={`View this presentation: ${projectName}. Created with slides+ - the collaborative presentation tool.`}
        keywords="presentation, slides, view presentation, online presentation"
        ogType="article"
        canonicalUrl={`https://slidesplus.com/v/${id}`}
      />
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
            {t("projectView.share")}
          </button>
        )}

        <div
          className={`fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm flex items-center justify-between px-4 py-2 z-50 transition-all duration-300 ${!showControls ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
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
              title={copied ? t("projectView.linkCopied") : t("projectView.copyLink")}
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
                title={t("projectView.prevSlide")}
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
                title={t("projectView.nextSlide")}
              >
                <span className="material-symbols-outlined text-3xl">chevron_right</span>
              </button>
            </div>

            <div className="h-6 w-px bg-white/20"></div>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title={t("projectView.fullscreen")}
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