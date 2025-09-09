import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProjectNavBar from "../RegularComponents/ProjectComponents/ProjectNavBar";
import SlidesEditor from "../RegularComponents/ProjectComponents/SlidesEditor";
import GeminiChatbot from "../RegularComponents/MultiuseComponents/GeminiChatbot";
import { urlbackend } from "../../config.js";

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
  const [editorBump, setEditorBump] = useState(0);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const defaultDoc = ``;

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
      setProject({ id: data.id, name: data.name || "Untitled", document: doc, updated_at: data.updated_at });
      lastSavedRef.current = doc;
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
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
        alert("You already have a project with that name.");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setProject(prev => (prev ? { ...prev, name: data.name } : prev));
    } catch { }
  };

  const applySetCode = (val: string | ((v: string) => string)) => {
    setProject(prev => {
      if (!prev) return prev;
      const current = prev.document || "";
      const computed = typeof val === "function" ? (val as (v: string) => string)(current) : val;
      const nextDoc = computed ?? "";
      if (debRef.current) window.clearTimeout(debRef.current);
      debRef.current = window.setTimeout(() => save(nextDoc), 700) as unknown as number;
      setEditorBump(x => x + 1);
      return { ...prev, document: nextDoc };
    });
  };

  const name = useMemo(() => project?.name || "", [project]);
  const doc = useMemo(() => project?.document || defaultDoc, [project]);

  return (
    <div className="bg-[#121212] w-screen h-screen flex flex-col">
      <ProjectNavBar projectId={id || ""} name={name} saveState={saveState} onRename={onRename} />
      <div className="flex-1 w-full m-5 flex">
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && <div className="text-white/70">Loading…</div>}
          {!loading && notFound && <div className="text-red-400">Project not found.</div>}
          {!loading && project && (
            <SlidesEditor key={`editor-${project.id}-${editorBump}`} initialDocument={doc} onChange={onDocChange} />
          )}
        </div>
        <div className="hidden">
          <GeminiChatbot setCode={applySetCode} />
        </div>
      </div>
    </div>
  );
}
