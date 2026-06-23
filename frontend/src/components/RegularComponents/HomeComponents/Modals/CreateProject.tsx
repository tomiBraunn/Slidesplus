// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { urlbackend } from "../../../../config.js";

type Props = {
  onClose: () => void;
  onCreated?: (project: { id: string; name: string; created_at?: string }) => void;
};

function CreateProject({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
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
      setError(t("createProject.noTitleError"));
      return;
    }
    if (name.length > 120) {
      setError(t("createProject.titleTooLong"));
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
        setError(data?.message || t("createProject.createFailed"));
        setSubmitting(false);
        return;
      }

      onCreated?.(data);

      setSubmitting(false);
      handleClose();
    } catch (e) {
      setSubmitting(false);
      setError(t("createProject.serverError"));
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
          "rounded-[30px] border border-theme-tertiary bg-theme-primary card-animate m-3",
          "transform transition-all duration-200 ease-out",
          open ? "opacity-100 scale-100" : "opacity-0 scale-95",
        ].join(" ")}
      >
        <div className="flex flex-col items-center justify-center p-10 gap-5 text-theme-secondary relative">
          <span
            className="material-symbols-outlined text-theme-primary cursor-pointer absolute top-4 right-4"
            style={{ fontSize: 28 }}
            onClick={handleClose}
          >
            close
          </span>

          <h2 className="text-4xl text-theme-primary font-bold">{t("createProject.title")}</h2>
          <p className="text-[10px] text-center">{t("createProject.description")}</p>

          <div className="flex flex-col gap-2 w-min-full">
            <div className="flex gap-2 w-full">
              <input
                type="text"
                placeholder={t("createProject.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={onKeyDownInput}
                disabled={submitting}
                className="text-theme-primary placeholder-theme-secondary w-full bg-theme-primary border border-theme-tertiary rounded-[15px] px-4 py-3 focus:outline-none disabled:opacity-60"
              />
              <button
                onClick={createProject}
                disabled={submitting}
                className={[
                  "h-full aspect-square w-16 bg-theme-inverted text-theme-primary flex items-center justify-center rounded-[15px] transition-opacity",
                  submitting ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-theme-inverted">arrow_forward</span>
              </button>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateProject;
