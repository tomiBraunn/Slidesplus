// @ts-nocheck
import ProjectTile from "../RegularComponents/HomeComponents/ProjectTile"
import AppTextLogo from "../RegularComponents/MultiuseComponents/AppTextLogo"
import NavBar from "../RegularComponents/HomeComponents/Navbar"
import CreateProject from "../RegularComponents/HomeComponents/Modals/CreateProject"
import ProjectPreview from "../RegularComponents/HomeComponents/Modals/ProjectPreview"
import SortBy from "../RegularComponents/HomeComponents/SortBy"
import ViewModeSwitch from "../RegularComponents/HomeComponents/ViewModeSwitch"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
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
  const navigate = useNavigate()

  // Read viewMode from cookies
  const getViewModeFromCookie = (): "grid" | "list" => {
    const cookies = document.cookie.split(';');
    const viewModeCookie = cookies.find(c => c.trim().startsWith('viewMode='));
    if (viewModeCookie) {
      const value = viewModeCookie.split('=')[1];
      return value === "list" ? "list" : "grid";
    }
    return "grid";
  };

  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Project | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">(getViewModeFromCookie())
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
    navigate(`/p/${p.id}`)
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
  const [aiTitle, setAiTitle] = useState("")
  const [aiCreating, setAiCreating] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiFiles, setAiFiles] = useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAiFiles(Array.from(e.target.files))
    }
  }

  const handleAICreate = async () => {
    setAiError("")
    const title = aiTitle.trim()
    if (!title) {
      setAiError("No title.")
      return
    }
    if (title.length > 120) {
      setAiError("Title can't be longer than 120 characters.")
      return
    }

    setAiCreating(true)
    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      formData.append("title", title)

      aiFiles.forEach((file) => {
        formData.append("files", file)
      })

      const res = await fetch(`${urlbackend}/projects/ai/generate`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      let data
      try {
        data = await res.json()
      } catch (e) {
        setAiError(`Server error (${res.status}). Check backend logs.`)
        setAiCreating(false)
        return
      }

      if (!res.ok) {
        setAiError(data?.message || data?.detail || `Failed to create project (${res.status}).`)
        setAiCreating(false)
        return
      }

      const project = data.ok ? { id: data.id, name: data.name, created_at: data.created_at } : data

      setProjects((prev) => [project, ...prev])
      setFilteredProjects((prev) => [project, ...prev])
      setAiTitle("")
      setAiFiles([])
      setShowAIPanel(false)
      setActiveTab("my-designs")

      navigate(`/p/${project.id}`, { state: { openAIChat: true, aiPrompt: title } })
    } catch (e) {
      setAiCreating(false)
      setAiError("Error connecting to the server.")
    }
  }

  const handleAIPanelOpen = () => {
    setShowAIPanel(true)
    setActiveTab("ai-tryout")
  }

  const handleAIPanelClose = () => {
    setShowAIPanel(false)
    setActiveTab("my-designs")
    setAiTitle("")
    setAiFiles([])
    setAiError("")
  }

  return (
    <>
      <div className="bg-theme-primary w-screen h-screen flex items-center justify-start flex-col gap-5 relative overflow-y-auto overflow-x-hidden">
        <div className="bg-theme-primary flex flex-col items-center justify-start z-10 w-full">
          <NavBar user={user} />
          <div className="flex flex-col items-center justify-start text-white w-full max-w-[90vw] md:max-w-[70vw] px-4 md:px-0">
            <div className="searchbar flex flex-col items-center justify-start w-full gap-6">
              <AppTextLogo size={isMobile ? 60 : 100} />

              <div className="relative w-full md:w-[70vw] flex items-center justify-center">
                {showAIPanel && (
                  <button
                    onClick={handleAIPanelClose}
                    className="absolute -top-1 right-0 text-xs flex items-center justify-center gap-1 p-4 w-5 h-5 text-theme-secondary hover:text-theme-primary transition-colors bg-theme-primary border border-theme-tertiary rounded-full"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
                <div
                  className={`relative flex w-full gap-2 bg-theme-primary border border-theme-tertiary ${showAIPanel ? "rounded-3xl h-[60vh] flex-col items-start justify-start py-4 px-4 searchbar-glow-ai mt-10" : "rounded-full min-h-[50px] items-center justify-center px-4 searchbar-glow-subtle"}`}
                  style={{
                    transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1), padding 0.5s cubic-bezier(0.4, 0, 0.2, 1), margin 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {showAIPanel ? (
                    <input
                      key="ai-input"
                      type="text"
                      placeholder="Let's slide together"
                      value={aiTitle}
                      onChange={(e) => setAiTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !aiCreating) {
                          e.preventDefault()
                          handleAICreate()
                        }
                      }}
                      disabled={aiCreating}
                      autoFocus
                      className="text-theme-primary placeholder-theme-secondary focus:outline-none w-full bg-transparent disabled:opacity-60 text-left"
                    />
                  ) : (
                    <input
                      key="search-input"
                      type="text"
                      placeholder="Search for your projects"
                      defaultValue=""
                      onChange={(e) => filterProjects(e.target.value)}
                      className="text-theme-primary placeholder-theme-secondary focus:outline-none w-full bg-transparent"
                    />
                  )}
                  {!showAIPanel && (
                    <span className="material-symbols-outlined text-theme-secondary select-none">
                      search
                    </span>
                  )}
                  {showAIPanel && (
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      <input
                        type="file"
                        id="ai-file-upload"
                        className="hidden"
                        accept="image/*,.pdf,.txt,.md"
                        multiple
                        onChange={handleFileChange}
                      />
                      <label
                        htmlFor="ai-file-upload"
                        className="flex items-center justify-center p-3 text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer relative"
                      >
                        <span className="material-symbols-outlined">attach_file</span>
                        {aiFiles.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-theme-inverted text-theme-inverted text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {aiFiles.length}
                          </span>
                        )}
                      </label>
                      <button
                        onClick={handleAICreate}
                        disabled={aiCreating}
                        className="flex items-center justify-center p-3 text-theme-inverted bg-theme-inverted rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {aiError && showAIPanel && (
                <p className="text-red-500 text-xs">{aiError}</p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setActiveTab("my-designs"); setShowAIPanel(false) }}
                  className={`px-6 py-2 rounded-full transition-all ${activeTab === "my-designs"
                    ? "bg-theme-inverted text-theme-inverted"
                    : "bg-transparent text-theme-secondary hover:text-theme-primary"
                    }`}
                >
                  My designs
                </button>
                <button
                  type="button"
                  onClick={handleAIPanelOpen}
                  className={`relative flex items-center justify-center gap-2 rounded-full transition-all duration-300 overflow-hidden ${showAIPanel
                    ? "bg-transparent text-theme-primary border border-theme-tertiary"
                    : "border border-theme-tertiary hover:bg-theme-hover"
                    } ${isMobile ? "p-2" : "px-4 py-2"}`}
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
                  onClick={() => { setActiveTab("templates"); setShowAIPanel(false) }}
                  className={`px-6 py-2 rounded-full transition-all ${activeTab === "templates"
                    ? "bg-theme-inverted text-theme-inverted"
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
            {activeTab !== "ai-tryout" && (
              <motion.div
                key={activeTab}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
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
                  className={`gap-4 flex-1 overflow-y-auto overflow-x-hidden pb-8 ${isMobile ? "flex flex-col" : viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 transition-all duration-300" : "flex flex-col"
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
                <div className="flex-1 overflow-y-auto m-8 flex items-center justify-center relative border border-theme-tertiary rounded-[20px]">
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <svg
                      style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", minWidth: "100%", minHeight: "100%" }}
                      preserveAspectRatio="xMidYMid slice"
                      width="1738"
                      height="421"
                      viewBox="0 0 1738 421"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g filter="url(#filter0_f_3378_1076)">
                        <path d="M60.1211 -469L142.378 19.1523L-26.9893 147.364L-246.28 42.8938L60.1211 -469Z" fill="#7182FF"/>
                      </g>
                      <g filter="url(#filter1_f_3378_1076)">
                        <path d="M1887.2 -362L1969.45 126.152L1800.09 254.364L1580.8 149.894L1887.2 -362Z" fill="#7182FF"/>
                      </g>
                      <g filter="url(#filter2_f_3378_1076)">
                        <path d="M1060.06 450.832L643.802 782.665L434.922 690.198L418.871 429.482L1060.06 450.832Z" fill="#7182FF"/>
                      </g>
                      <g opacity="0.4">
                        <g filter="url(#filter3_f_3378_1076)">
                          <path d="M7.59824 13.9287L175.828 101.85L-28.3075 283.6L-86.5945 85.2329L7.59824 13.9287Z" fill="#249931" fillOpacity="0.71"/>
                          <path d="M7.59824 13.9287L175.828 101.85L-28.3075 283.6L-86.5945 85.2329L7.59824 13.9287Z" stroke="black"/>
                        </g>
                      </g>
                      <g opacity="0.4">
                        <g filter="url(#filter4_f_3378_1076)">
                          <path d="M1834.67 120.929L2002.9 208.85L1798.77 390.6L1740.48 192.233L1834.67 120.929Z" fill="#249931" fillOpacity="0.71"/>
                          <path d="M1834.67 120.929L2002.9 208.85L1798.77 390.6L1740.48 192.233L1834.67 120.929Z" stroke="black"/>
                        </g>
                      </g>
                      <g filter="url(#filter5_f_3378_1076)">
                        <path d="M1263.63 -89.7244L1472.44 61.0165L692.999 -102.015L926.885 -165.817L1263.63 -89.7244Z" fill="#249966" fillOpacity="0.33"/>
                        <path d="M1263.63 -89.7244L1472.44 61.0165L692.999 -102.015L926.885 -165.817L1263.63 -89.7244Z" stroke="black"/>
                      </g>
                      <defs>
                        <filter id="filter0_f_3378_1076" x="-646.279" y="-869" width="1188.66" height="1416.36" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                          <feGaussianBlur stdDeviation="200" result="effect1_foregroundBlur_3378_1076"/>
                        </filter>
                        <filter id="filter1_f_3378_1076" x="1180.8" y="-762" width="1188.66" height="1416.36" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                          <feGaussianBlur stdDeviation="200" result="effect1_foregroundBlur_3378_1076"/>
                        </filter>
                        <filter id="filter2_f_3378_1076" x="18.8711" y="29.4819" width="1441.19" height="1153.18" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                          <feGaussianBlur stdDeviation="200" result="effect1_foregroundBlur_3378_1076"/>
                        </filter>
                        <filter id="filter3_f_3378_1076" x="-287.172" y="-186.661" width="663.873" height="671.159" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                          <feGaussianBlur stdDeviation="100" result="effect1_foregroundBlur_3378_1076"/>
                        </filter>
                        <filter id="filter4_f_3378_1076" x="1539.9" y="-79.6613" width="663.873" height="671.159" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                          <feGaussianBlur stdDeviation="100" result="effect1_foregroundBlur_3378_1076"/>
                        </filter>
                        <filter id="filter5_f_3378_1076" x="492.867" y="-366.332" width="1179.86" height="627.838" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                          <feGaussianBlur stdDeviation="100" result="effect1_foregroundBlur_3378_1076"/>
                        </filter>
                      </defs>
                    </svg>
                  </div>
                  <div className="relative z-10 text-center text-theme-primary flex flex-col items-center justify-center gap-2 p-8 text-md">
                    <p>We're still</p>
                    <p className="text-4xl font-bold">Cooking our website</p>
                    <p>New feature coming soon.</p>
                    <p>Stay tuned.</p>
                  </div>
                </div>
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>


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