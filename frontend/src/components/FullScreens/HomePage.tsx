// @ts-nocheck
import ProjectTile from "../RegularComponents/HomeComponents/ProjectTile"
import AppTextLogo from "../RegularComponents/MultiuseComponents/AppTextLogo"
// import WelcomeMessages from "../RegularComponents/HomeComponents/WelcomeMessages"
import ProjectSearchBar from "../RegularComponents/HomeComponents/ProjectSearchBar"
import NavBar from "../RegularComponents/HomeComponents/Navbar"
import CreateProject from "../RegularComponents/HomeComponents/Modals/CreateProject"
import ProjectPreview from "../RegularComponents/HomeComponents/Modals/ProjectPreview"
import { useEffect, useState } from "react"
import { urlbackend } from "../../config.js"

type Project = {
  id: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
  slideCount?: number
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
      const mapped: Project[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: "",
        created_at: p.created_at,
        updated_at: p.updated_at,
        slideCount: p.slideCount,
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

  return (
    <>
      <div className="bg-theme-primary w-screen h-screen flex items-center justify-start flex-col gap-5 relative overflow-y-auto">
        <div className="bg-theme-primary flex flex-col items-center justify-start z-10 w-full">
          <NavBar user={user} />
          <div className="flex flex-col items-center justify-start text-white w-[90vw] md:w-[70vw] px-4 md:px-0">
            <div className="searchbar flex flex-col items-center justify-start w-full">
              <AppTextLogo />
              {/* <WelcomeMessages username={user?.username}/> */}
              <ProjectSearchBar
                onAddClick={() => setShowCreate(true)}
                viewMode={isMobile ? "list" : viewMode}
                setViewMode={setViewMode}
                setFiltrar={filterProjects}
                selected={sortOption}
                setSelected={setSortOption}
                isMobile={isMobile}
              />
            </div>
          </div>
        </div>

        <main className="flex justify-center w-full relative px-4 md:px-0 pb-8">
          <div
            className={`w-[90vw] md:w-[70vw] gap-4 ${isMobile ? "flex flex-col" : viewMode === "grid" ? "grid grid-cols-4" : "flex flex-col"
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
                  />
                </div>
              ))
            })()}
          </div>
        </main>

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