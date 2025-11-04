// @ts-nocheck
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { urlbackend } from "../../config.js"
import { ShareModal } from "../RegularComponents/MultiuseComponents/ShareModal"

export default function ProjectViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    async function fetchProject() {
      try {
        const token = localStorage.getItem('token')
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }

        // Add authorization header if token exists (for private projects)
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

        // Support both response formats
        const project = data.ok ? data.project : data
        const slides = project?.slides || []

        if (!project) {
          setErrorMessage("Invalid response from server")
          setError(true)
          setLoading(false)
          return
        }

        // Check if user is owner
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
            // Ignore error, user just won't see share button
          }
        }

        const slidesHtml = slides
          .sort((a: any, b: any) => a.position - b.position)
          .map((slide: any) => slide.html)
          .join("\n")

        const fullDoc = `<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
.slide {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: start;
}
.slides-container {
  width: 100vw;
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}
</style>
</head>
<body>
<div class="slides-container">
${slidesHtml}
</div>
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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/home")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Projects
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative w-screen h-screen">
        <iframe
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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        )}

        <button
          onClick={() => navigate(`/p/${id}`)}
          className="fixed top-4 left-4 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-lg z-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Editor
        </button>
      </div>

      <ShareModal
        projectId={id || null}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </>
  )
}
