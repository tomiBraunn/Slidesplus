// @ts-nocheck
import ProjectTile from "../RegularComponents/HomeComponents/ProjectTile"
import AppTextLogo from "../RegularComponents/MultiuseComponents/AppTextLogo"
import NavBar from "../RegularComponents/HomeComponents/Navbar"
import CreateProject from "../RegularComponents/HomeComponents/Modals/CreateProject"
import ProjectPreview from "../RegularComponents/HomeComponents/Modals/ProjectPreview"
import SortBy from "../RegularComponents/HomeComponents/SortBy"
import ViewModeSwitch from "../RegularComponents/HomeComponents/ViewModeSwitch"
import { useEffect, useState } from "react"
import { urlbackend } from "../../config.js"
import { motion, AnimatePresence } from "framer-motion"

type Project = {
  id: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
  slideCount?: number
  owner?: {
    id: string
    username: string
    avatar?: string
    first_name?: string
    last_name?: string
  }
  collaborators?: Array<{
    id: string
    username: string
    avatar?: string
    first_name?: string
    last_name?: string
  }>
  preview_url?: string
}

type User = {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  avatar?: string
}

function HomePage() {
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Project | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const savedSort = localStorage.getItem('sortOption')
    if (savedSort) {
      setSortOption(savedSort)
    }
  }, [])

  const handleSortChange = (option: string) => {
    setSortOption(option)
    localStorage.setItem('sortOption', option)
  }

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const res = await fetch(`${urlbackend}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token")
          window.location.href = "/login"
        }
        return
      }
      const data = await res.json()
      setUser(data.user)
    } catch {
      console.error("Error fetching user")
    }
  }

  const fetchProjects = async () => {
    setErr("")
    setLoading(true)
    try {
      const token = localStorage.getItem("token")

      let currentUser = user
      if (!currentUser && token) {
        try {
          const userRes = await fetch(`${urlbackend}/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (userRes.ok) {
            const userData = await userRes.json()
            currentUser = userData.user
            setUser(currentUser)
          }
        } catch (err) {
          console.error("Error fetching user:", err)
        }
      }

      const res = await fetch(`${urlbackend}/projects`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token")
          window.location.href = "/login"
          return
        }
        const data = await res.json().catch(() => ({}))
        setErr(data?.message || "Failed to load projects")
        return
      }
      const data = await res.json()

      const mapped: Project[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: "",
        created_at: p.created_at,
        updated_at: p.updated_at,
        slideCount: p.slideCount,
        owner: p.owner || currentUser,
        collaborators: p.collaborators || [],
        preview_url: p.preview_url,
      }))

      setProjects(mapped)
      setFilteredProjects(mapped)
    } catch {
      setErr("Server connection error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchProjects()
  }, [])

  useEffect(() => {
    setFilteredProjects(projects)
  }, [projects])

  const openPreview = (p: Project) => {
    setSelected(p)
    setShowPreview(true)
  }

  const onCreated = (p: Project) => {
    setProjects((prev) => [p, ...prev])
    setFilteredProjects((prev) => [p, ...prev])
    setShowCreate(false)
  }

  const onDeleteProject = async () => {
    if (!selected) return
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${urlbackend}/projects/${selected.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token")
          window.location.href = "/login"
          return
        }
        const data = await res.json().catch(() => ({}))
        alert(data?.message || "Failed to delete project")
        return
      }
      setProjects((prev) => prev.filter((p) => p.id !== selected.id))
      setFilteredProjects((prev) => prev.filter((p) => p.id !== selected.id))
      setShowPreview(false)
    } catch {
      alert("Server connection error")
    }
  }

  const filterProjects = (value: string) => {
    const term = value.toLowerCase()
    if (!term) {
      setFilteredProjects(projects)
    } else {
      const fp = projects.filter((item) => item.name.toLowerCase().includes(term))
      setFilteredProjects(fp)
    }
  }
  const [sortOption, setSortOption] = useState("Recent")

  const sortProjects = (criteria: string) => {
    let sorted = [...filteredProjects]

    switch (criteria) {
      case "A-Z":
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "Creation date":
        sorted.sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
        )
        break
      case "Recent":
        sorted.sort(
          (a, b) =>
            new Date(b.updated_at || "").getTime() -
            new Date(a.updated_at || "").getTime()
        )
        break
      default:
        break
    }

    setFilteredProjects(sorted)
  }

  useEffect(() => {
    sortProjects(sortOption)
  }, [sortOption])

  const [activeTab, setActiveTab] = useState<"my-designs" | "ai-tryout" | "templates">("my-designs")

  return (
    <>
      <div className="bg-theme-primary w-screen h-screen flex items-center justify-start flex-col gap-5 relative overflow-y-auto overflow-x-hidden">
        <div className="bg-theme-primary flex flex-col items-center justify-start z-10 w-full">
          <NavBar user={user} />
          <div className="flex flex-col items-center justify-start text-white w-full max-w-[90vw] md:max-w-[70vw] px-4 md:px-0">
            <div className="searchbar flex flex-col items-center justify-start w-full gap-6">
              <AppTextLogo size={isMobile ? 60 : 100} />
              <div className="flex w-full md:w-[50vw] items-center justify-center gap-2 rounded-full bg-theme-primary border border-theme-tertiary hover:bg-theme-hover transition-colors px-1 min-h-[50px]">
                <input
                  type="text"
                  placeholder="Search for your projects"
                  onChange={(e) => filterProjects(e.target.value)}
                  className="text-theme-primary placeholder-theme-secondary px-5 rounded-full focus:outline-none w-full bg-transparent"
                />
                <span className="material-symbols-outlined text-theme-secondary select-none flex w-[2em] aspect-square items-center justify-center">
                  search
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAIPanel(true)}
                  className={`relative flex items-center justify-center gap-2 rounded-full border border-theme-tertiary hover:bg-theme-hover transition-colors cursor-pointer overflow-hidden ${
                    isMobile ? "p-2" : "px-4 py-2"
                  }`}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <svg
                      style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
                      preserveAspectRatio="xMidYMid slice"
                      width="839"
                      height="400"
                      viewBox="0 0 839 400"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <filter id="filter0_f_ai" x="-400" y="-300" width="1628" height="800" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix" />
                          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                          <feGaussianBlur stdDeviation="150" result="effect1_foregroundBlur" />
                        </filter>
                        <filter id="filter1_f_ai" x="-100" y="-100" width="1000" height="500" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix" />
                          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                          <feGaussianBlur stdDeviation="80" result="effect1_foregroundBlur" />
                        </filter>
                      </defs>
                      <g filter="url(#filter0_f_ai)">
                        <ellipse cx="420" cy="150" rx="300" ry="200" fill="#7182FF" fillOpacity="0.4" />
                      </g>
                      <g filter="url(#filter1_f_ai)">
                        <ellipse cx="350" cy="200" rx="250" ry="150" fill="#249931" fillOpacity="0.5" />
                      </g>
                    </svg>
                  </div>
                  {!isMobile && (
                    <span className="relative z-10 text-sm font-medium text-theme-primary">Create with AI</span>
                  )}
                  <span className="relative z-10 material-symbols-outlined text-lg text-theme-primary">auto_awesome</span>
                </button>
                <button
                  onClick={() => setActiveTab("my-designs")}
                  className={`px-6 py-2 rounded-full transition-all ${activeTab === "my-designs"
                    ? "bg-white text-black"
                    : "bg-transparent text-theme-secondary hover:text-theme-primary"
                    }`}
                >
                  My designs
                </button>
                <button
                  onClick={() => setActiveTab("templates")}
                  className={`px-6 py-2 rounded-full transition-all ${activeTab === "templates"
                    ? "bg-white text-black"
                    : "bg-transparent text-theme-secondary hover:text-theme-primary"
                    }`}
                >
                  Templates
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex justify-center w-full overflow-x-hidden px-4 flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ x: activeTab === "my-designs" ? -50 : 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: activeTab === "my-designs" ? -50 : 50, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full md:max-w-7xl h-full flex flex-col"
            >
              <div className="flex items-center justify-between py-2 w-full flex-shrink-0">
                <h2 className="text-2xl font-semibold text-theme-primary">
                  {activeTab === "my-designs" ? sortOption : "Templates"}
                </h2>
                <div className="flex items-center gap-3">
                  {!isMobile && activeTab === "my-designs" && (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="px-4 py-2 rounded-full bg-theme-inverted text-theme-inverted border border-theme-tertiary transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      <span className="text-sm font-medium">Create project</span>
                    </button>
                  )}
                  {activeTab === "my-designs" && (
                    <>
                      <SortBy selected={sortOption} setSelected={handleSortChange} />
                      {!isMobile && <ViewModeSwitch viewMode={viewMode} setViewMode={setViewMode} />}
                    </>
                  )}
                </div>
              </div>

              {activeTab === "my-designs" ? (
                <div
                  className={`gap-4 flex-1 overflow-y-auto pb-8 ${isMobile ? "flex flex-col" : viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 transition-all duration-300" : "flex flex-col"
                    }`}
                >
              {(() => {
                if (loading)
                  return (
                    <div className="text-white/70 col-span-full">Loading projects…</div>
                  )
                if (err) return <div className="text-red-400 col-span-full">{err}</div>
                if (projects.length === 0)
                  return (
                    <div className="flex flex-col items-center justify-center text-white/70 p-4 col-span-full">
                      <span
                        className="material-symbols-outlined mb-2 opacity-70"
                        style={{ fontSize: "40px" }}
                      >
                        scan_delete
                      </span>
                      <p className="text-center text-sm max-w-xs">
                        No projects available.
                        <br /> Try creating one.
                      </p>
                    </div>
                  )
                if (projects.length > 0 && filteredProjects.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center text-white/70 p-4 col-span-full">
                      <span className="material-symbols-outlined">block</span>
                      <p className="text-center text-sm max-w-xs">
                        No projects match your search.
                      </p>
                    </div>
                  )
                }
                return filteredProjects.map((p) => (
                  <motion.div
                    key={p.id}
                    className="h-auto"
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      layout: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.2 }
                    }}
                  >
                    <ProjectTile
                      name={p.name}
                      description={p.description ?? ""}
                      onClick={() => openPreview(p)}
                      listMode={isMobile || viewMode === "list"}
                      owner={p.owner}
                      collaborators={p.collaborators}
                      previewUrl={p.preview_url}
                      projectId={p.id}
                    />
                  </motion.div>
                ))
              })()}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pb-8 flex items-center justify-center">
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* AI Panel */}
        <AnimatePresence>
          {showAIPanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setShowAIPanel(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-theme-primary border-l border-theme-tertiary z-50 flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-theme-tertiary">
                  <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Create with AI
                  </h2>
                  <button
                    onClick={() => setShowAIPanel(false)}
                    className="p-2 rounded-full hover:bg-theme-hover text-theme-primary"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  <p className="text-theme-secondary">AI creation panel coming soon...</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {isMobile && (
          <button
            onClick={() => setShowCreate(true)}
            className="fixed bottom-3 right-3 w-12 h-12 bg-theme-inverted text-theme-inverted border border-theme-tertiary rounded-full flex items-center justify-center transition-transform z-50"
          >
            <span className="material-symbols-outlined text-4xl">add</span>
          </button>
        )}

        {showCreate && (
          <CreateProject onClose={() => setShowCreate(false)} onCreated={onCreated} />
        )}

        <ProjectPreview
          open={showPreview}
          name={selected?.name || ""}
          projectId={selected?.id}
          slideCount={selected?.slideCount}
          lastModified={selected?.updated_at}
          onClose={() => setShowPreview(false)}
          onDelete={async (id) => {
            setProjects((prev) => prev.filter((p) => p.id !== id))
            setFilteredProjects((prev) => prev.filter((p) => p.id !== id))
            setShowPreview(false)
          }}
          onRename={async (id, next) => {
            setProjects((prev) =>
              prev.map((p) => (p.id === id ? { ...p, name: next } : p))
            )
            setFilteredProjects((prev) =>
              prev.map((p) => (p.id === id ? { ...p, name: next } : p))
            )
            setSelected((prev) => (prev ? { ...prev, name: next } : prev))
          }}
        />
      </div>
    </>
  )
}

export default HomePage