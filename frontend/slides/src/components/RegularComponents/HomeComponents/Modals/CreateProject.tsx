import React, { useEffect, useState } from "react";
import { urlbackend } from "../../MultiuseComponents/config.js";

type Props = {
  onClose: () => void;
  onCreated?: (project: { id: string; name: string; created_at?: string }) => void;
};

function CreateProject({ onClose, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => setOpen(false);

  const handleTransitionEnd = () => {
    if (!open) onClose();
  };

  const createProject = async () => {
    setError("");

    const name = title.trim();
    if (!name) {
      setError("No title.");
      return;
    }
    if (name.length > 120) {
      setError("El título no puede superar 120 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${urlbackend}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "No se pudo crear el proyecto.");
        setSubmitting(false);
        return;
      }

      // Notificar al padre
      onCreated?.(data);

      // Cerrar con animación
      setSubmitting(false);
      handleClose();
    } catch (e) {
      setSubmitting(false);
      setError("Error de conexión con el servidor.");
    }
  };

  const onKeyDownInput: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !submitting) {
      e.preventDefault();
      createProject();
    }
  };

  return (
    <div className="absolute z-50 w-screen h-screen glassBackground flex items-center justify-center">
      <div
        onTransitionEnd={handleTransitionEnd}
        className={[
          "presentationComponentsStyle rounded-xl bg-[#1F1F1F]/80 card-animate",
          "transform transition-all duration-200 ease-out",
          open ? "opacity-100 scale-100" : "opacity-0 scale-95",
        ].join(" ")}
      >
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-start justify-start gap-2 p-4 min-w-[360px]">
            <div className="flex items-center justify-start gap-2">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 35 }}>
                crop_landscape
              </span>
              <p className="text-white font-medium">Create presentation:</p>
            </div>

            <div className="w-full">
              <input
                type="text"
                placeholder="Title?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={onKeyDownInput}
                disabled={submitting}
                className="rounded-lg p-2 w-full text-white bg-[#1F1F1F] border-[2.5px] border-[#181818] focus:outline-none placeholder-white/50 disabled:opacity-60"
              />
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </div>
          </div>

          <div className="flex flex-col items-end justify-between gap-4 p-4">
            <span
              className="material-symbols-outlined text-white cursor-pointer"
              style={{ fontSize: 35 }}
              onClick={handleClose}
            >
              close
            </span>

            <button
              onClick={createProject}
              disabled={submitting}
              className={[
                "px-4 py-2 appColorFade rounded-lg text-white font-medium transition-colors",
                submitting ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
              ].join(" ")}
            >
              {submitting ? "Creating..." : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateProject;
