import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProjectNavBar from "../RegularComponents/ProjectComponents/ProjectNavBar";
import SlidesEditor from "../RegularComponents/ProjectComponents/SlidesEditor";
import { urlbackend } from "../RegularComponents/MultiuseComponents/config.js";

type Project = { id: string; name: string; document: string; updated_at?: string };
type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const defaultDoc = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Document</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; }
  h1 { margin: 0 0 12px; font-size: 28px; }
  p { margin: 0 0 8px; line-height: 1.45; }
  .btn { display:inline-block; padding:10px 14px; border-radius:8px; background:#111; color:#fff; text-decoration:none; }
</style>
</head>
<body>
  <h1>Hello</h1>
  <p>Edita este documento y se guardará automáticamente.</p>
</body>
</html>`;

  const fetchProject = async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`${urlbackend}/projects/${id}`, { headers: authHeaders });
      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      if (res.status === 404) {
        setNotFound(true);
        setProject(null);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const doc = typeof data.document === "string" && data.document.trim() ? data.document : defaultDoc;
      setProject({ id: data.id, name: data.name || "Sin título", document: doc, updated_at: data.updated_at });
      lastSavedRef.current = doc;
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async (document: string) => {
    if (!id || !project) return;
    if (document === lastSavedRef.current) return;
    setSaveState("saving");
    try {
      const res = await fetch(`${urlbackend}/projects/${id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ document }),
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      const data = await res.json();
      lastSavedRef.current = data.document;
      setProject(prev => (prev ? { ...prev, document: data.document, name: data.name, updated_at: data.updated_at } : data));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 900);
    } catch {
      setSaveState("error");
    }
  };

  const onDocChange = (nextDoc: string) => {
    if (!project) return;
    setProject(prev => (prev ? { ...prev, document: nextDoc } : prev));
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => save(nextDoc), 700) as unknown as number;
  };

  const onRename = async (nextName: string) => {
    if (!id || !nextName.trim()) return;
    try {
      const res = await fetch(`${urlbackend}/projects/${id}/rename`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ name: nextName.trim() }),
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      if (res.status === 409) {
        alert("Ya tenés un proyecto con ese nombre.");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setProject(prev => (prev ? { ...prev, name: data.name } : prev));
    } catch {}
  };

  const name = useMemo(() => project?.name || "", [project]);
  const doc = useMemo(() => project?.document || defaultDoc, [project]);

  return (
    <div className="bg-[#121212] w-screen h-screen flex flex-col">
      <ProjectNavBar projectId={id || ""} name={name} saveState={saveState} onRename={onRename} />
      <div className="flex-1 w-full p-5">
        {loading && <div className="text-white/70">Cargando…</div>}
        {!loading && notFound && <div className="text-red-400">Proyecto no encontrado.</div>}
        {!loading && project && (
          <SlidesEditor initialDocument={doc} onChange={onDocChange} />
        )}
      </div>
    </div>
  );
}
