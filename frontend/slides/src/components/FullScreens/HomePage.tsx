import ProjectTile from "../RegularComponents/HomeComponents/ProjectTile";
import AppTextLogo from "../RegularComponents/MultiuseComponents/AppTextLogo";
import ProjectSearchBar from "../RegularComponents/HomeComponents/ProjectSearchBar";
import NavBar from "../RegularComponents/HomeComponents/Navbar";
import CreateProject from "../RegularComponents/HomeComponents/Modals/CreateProject";
import ProjectPreview from "../RegularComponents/HomeComponents/Modals/ProjectPreview";
import React, { useEffect, useState } from "react";
import { urlbackend } from "../../config.js";

type Project = {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  slideCount?: number; // <- lo usas en ProjectPreview
};

function HomePage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchProjects = async () => {
    setErr("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${urlbackend}/projects`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.message || "No se pudieron cargar los proyectos");
        return;
      }
      const data = await res.json();
      const mapped: Project[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: "",
        created_at: p.created_at,
        updated_at: p.updated_at,
        slideCount: p.slideCount,
      }));
      setProjects(mapped);
      setFilteredProjects(mapped);
    } catch {
      setErr("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Mantener filteredProjects en sync cuando cambie projects
  useEffect(() => {
    setFilteredProjects((prev) => {
      // Si prev está vacío (ej. primera carga) o su tamaño no coincide, reseteamos a projects
      if (prev.length !== projects.length) return projects;
      // Si tenían mismo tamaño, igual devolvemos projects para evitar desfasajes
      return projects;
    });
  }, [projects]);

  const openPreview = (p: Project) => {
    setSelected(p);
    setShowPreview(true);
  };

  const onCreated = (p: Project) => {
    // Insertar arriba y sincronizar la grilla
    setProjects((prev) => [p, ...prev]);
    setFilteredProjects((prev) => [p, ...prev]);
    setShowCreate(false);
  };

  const onDeleteProject = async () => {
    if (!selected) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${urlbackend}/projects/${selected.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.message || "No se pudo eliminar");
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== selected.id));
      setFilteredProjects((prev) => prev.filter((p) => p.id !== selected.id));
      setShowPreview(false);
    } catch {
      alert("Error de conexión con el servidor");
    }
  };

  const filtrar = (value: string) => {
    const term = value.toLowerCase();
    if (!term) {
      setFilteredProjects(projects);
      return;
    }
    const fp = projects.filter((item) =>
      item.name.toLowerCase().includes(term)
    );
    setFilteredProjects(fp);
  };

  return (
    <div className="bg-[#121212] w-screen h-screen flex items-center justify-start flex-col gap-5 relative">
      <div className="bg-[#121212] flex flex-col items-center justify-start z-10">
        <NavBar />
        <div className="flex flex-col items-center justify-start text-white w-[70vw]">
          <div className="searchbar flex flex-col items-center justify-start w-full">
            <AppTextLogo />
            <ProjectSearchBar
              onAddClick={() => setShowCreate(true)}
              viewMode={viewMode}
              setViewMode={setViewMode}
              setFiltrar={filtrar}
            />
          </div>
        </div>
      </div>

      <main className="flex justify-center w-full relative">
        <div
          className={`w-[70vw] gap-4 ${
            viewMode === "grid" ? "grid grid-cols-4" : "flex flex-col"
          }`}
        >
          {(() => {
            if (loading)
              return (
                <div className="text-white/70 col-span-4">Loading projects…</div>
              );
            if (err) return <div className="text-red-400 col-span-4">{err}</div>;
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
              );

              if (projects.length > 0 && filteredProjects.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center text-white/70 p-4 col-span-4">
                    <span className="material-symbols-outlined">block</span>
                    <p className="text-center text-sm max-w-xs">
                      We couldn't find your project.
                    </p>
                  </div>
                );
              }
              
              
              )
            return filteredProjects.map((p) => (
              <div
                key={p.id}
                className={viewMode === "grid" ? "relative" : "flex items-center gap-3"}
              >
                <ProjectTile
                  name={p.name}
                  description={p.description ?? ""}
                  onClick={() => openPreview(p)}
                  listMode={viewMode === "list"}
                />
              </div>
            ));
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
          setProjects((prev) => prev.filter((p) => p.id !== id));
          setFilteredProjects((prev) => prev.filter((p) => p.id !== id));
          setShowPreview(false);
        }}
        onRename={async (id, next) => {
          setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: next } : p)));
          setFilteredProjects((prev) =>
            prev.map((p) => (p.id === id ? { ...p, name: next } : p))
          );
          setSelected((prev) => (prev ? { ...prev, name: next } : prev));
        }}
      />
    </div>
  );
}

export default HomePage;
