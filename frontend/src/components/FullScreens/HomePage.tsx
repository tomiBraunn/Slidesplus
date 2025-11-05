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
      if (!res.ok) return
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

      // First, get user data if not already loaded
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

      // Then fetch projects
      const res = await fetch(`${urlbackend}/projects`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErr(data?.message || "Failed to load projects")
        return
      }
      const data = await res.json()

      // Map projects using owner and collaborators from backend
      const mapped: Project[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: "",
        created_at: p.created_at,
        updated_at: p.updated_at,
        slideCount: p.slideCount,
        owner: p.owner || currentUser,  // Use owner from backend, fallback to current user
        collaborators: p.collaborators || [],  // Use collaborators from backend
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
              <AppTextLogo />

              <div className="relative w-full flex items-center justify-center">
                <div className="absolute inset-0 pointer-events-none" style={{ padding: '0 50px' }}>
                  <svg className="w-full h-full" viewBox="0 0 1112 189" fill="none" preserveAspectRatio="none">
                    <defs>
                      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation="30" result="blur"/>
                      </filter>
                      <linearGradient id="gradient" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#249931"/>
                        <stop offset="100%" stopColor="#7182FF"/>
                      </linearGradient>
                    </defs>
                    <rect x="2.5%" y="27.5%" width="95%" height="45%" rx="40" stroke="url(#gradient)" strokeWidth="3" fill="none" filter="url(#glow)"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search for your projects"
                  onChange={(e) => filterProjects(e.target.value)}
                  className="relative z-10 w-full bg-transparent border border-theme-tertiary rounded-full px-6 py-3 text-theme-primary placeholder-theme-secondary focus:outline-none"
                />
                <span className="absolute right-6 z-10 material-symbols-outlined text-theme-secondary">search</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("my-designs")}
                  className={`px-6 py-2 rounded-full transition-all ${
                    activeTab === "my-designs"
                      ? "bg-white text-black"
                      : "bg-transparent text-theme-secondary hover:text-theme-primary"
                  }`}
                >
                  My designs
                </button>
                <button
                  onClick={() => setActiveTab("ai-tryout")}
                  className={`px-6 py-2 rounded-full transition-all ${
                    activeTab === "ai-tryout"
                      ? "bg-white text-black"
                      : "bg-transparent text-theme-secondary hover:text-theme-primary"
                  }`}
                >
                  AI Tryout
                </button>
                <button
                  onClick={() => setActiveTab("templates")}
                  className={`px-6 py-2 rounded-full transition-all ${
                    activeTab === "templates"
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

        <main className="flex justify-center w-full relative px-4 md:px-0 pb-8 overflow-x-hidden">
          <div className="w-full max-w-[90vw] md:max-w-[70vw]">
            <div className="flex items-center justify-between mb-6 w-full">
              <h2 className="text-2xl font-semibold text-theme-primary">{sortOption}</h2>
              <div className="flex items-center gap-2">
                <SortBy selected={sortOption} setSelected={handleSortChange} />
                {!isMobile && <ViewModeSwitch viewMode={viewMode} setViewMode={setViewMode} />}
              </div>
            </div>

            <div
              className={`gap-4 ${isMobile ? "flex flex-col" : viewMode === "grid" ? "grid grid-cols-4" : "flex flex-col"
                }`}
            >
              {(() => {
                if (loading)
                  return (
                    <div className="text-white/70 col-span-4">Loading projects…</div>
                  )
                if (err) return <div className="text-red-400 col-span-4">{err}</div>
                if (projects.length === 0)
                  return (
                    <div className="flex flex-col items-center justify-center text-white/70 p-4 col-span-4">
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
                    <div className="flex flex-col items-center justify-center text-white/70 p-4 col-span-4">
                      <span className="material-symbols-outlined">block</span>
                      <p className="text-center text-sm max-w-xs">
                        No projects match your search.
                      </p>
                    </div>
                  )
                }
                return filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    className={
                      isMobile ? "flex items-center gap-3" : viewMode === "grid"
                        ? "relative"
                        : "flex items-center gap-3"
                    }
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
                  </div>
                ))
              })()}
            </div>
          </div>
        </main>

        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50"
        >
          <span className="material-symbols-outlined text-black text-4xl">add</span>
        </button>

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