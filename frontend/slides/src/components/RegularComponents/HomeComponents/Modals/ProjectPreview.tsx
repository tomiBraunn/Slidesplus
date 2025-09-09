import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BasicModal from "../../MultiuseComponents/BasicModal";
import { urlbackend } from "../../../../config.js";

type ActionItem = {
  icon: string;
  label: string;
  onClick?: () => void;
};

type Props = {
  open: boolean;
  name: string;
  projectId?: string;
  slideCount?: number;
  lastModified?: string | Date | null;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void> | void;
  onRename?: (id: string, newName: string) => Promise<void> | void;
  actions?: ActionItem[];
};

function ProjectPreview({
  open,
  name,
  projectId,
  slideCount = 0,
  lastModified = null,
  onClose,
  onDelete,
  onRename,
  actions,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [renameText, setRenameText] = useState(name || "");
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<string>("");
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docErr, setDocErr] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (mounted) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mounted]);

  useEffect(() => {
    setRenameText(name || "");
  }, [name]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!open || !projectId) {
        setDoc("");
        setDocErr("");
        setLoadingDoc(false);
        return;
      }
      setLoadingDoc(true);
      setDocErr("");
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const res = await fetch(`${urlbackend}/projects/${projectId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({} as any));
          throw new Error(data?.message || "No se pudo cargar el proyecto");
        }
        const data = await res.json();
        if (!cancelled) setDoc(typeof data?.document === "string" ? data.document : "");
      } catch (e: any) {
        if (!cancelled) setDocErr(e?.message || "Error al cargar");
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    const d =
      doc && doc.trim()
        ? doc
        : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name || "Sin título"}</title><style>html,body{height:100%}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;display:flex;align-items:center;justify-content:center;background:#fff;color:#111}</style></head><body><h1>${name || "Sin título"}</h1></body></html>`;
    const target = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
    if (!target) return;
    target.open();
    target.write(d);
    target.close();
  }, [doc, name]);

  const handleClose = () => setShow(false);

  const handleTransitionEnd = () => {
    if (!show) {
      setMounted(false);
      onClose();
    }
  };

  if (!mounted) return null;

  const formatUSDate = (d: string | Date | null | undefined) => {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    const m = String(date.getMonth() + 1);
    const day = String(date.getDate());
    const y = date.getFullYear();
    return `${m}/${day}/${y}`;
  };

  const description = `${slideCount} slides${formatUSDate(lastModified) ? " · " + formatUSDate(lastModified) : ""}`;

  const goOpen = () => {
    if (projectId) navigate(`/p/${projectId}`);
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const doDelete = async () => {
    if (!projectId) return;
    if (confirmText !== name) return;
    setBusy(true);
    try {
      const res = await fetch(`${urlbackend}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setBusy(false);
        return;
      }
      await onDelete?.(projectId);
      setShowDelete(false);
      setConfirmText("");
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  const doRename = async () => {
    if (!projectId) return;
    const next = renameText.trim() || "Sin título";
    setBusy(true);
    try {
      const res = await fetch(`${urlbackend}/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        setBusy(false);
        return;
      }
      await onRename?.(projectId, next);
      setShowRename(false);
    } finally {
      setBusy(false);
    }
  };

  const defaultActions: ActionItem[] = [
    { icon: "delete", label: "Delete", onClick: () => setShowDelete(true) },
    { icon: "edit", label: "Rename", onClick: () => setShowRename(true) },
    { icon: "share", label: "Share", onClick: () => console.log("share") },
    { icon: "open_in_new", label: "Open", onClick: goOpen },
  ];
  const items = actions?.length ? actions : defaultActions;

  return (
    <div className="absolute z-50 inset-0 glassBackground flex items-center justify-center" onMouseDown={handleClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTransitionEnd={handleTransitionEnd}
        className={[
          "text-white rounded-xl defaultStyle card-animate w-[70vw] max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col border border-white/10 backdrop-blur-xl",
          "transform transition-all duration-200 ease-out",
          show ? "opacity-100 scale-100" : "opacity-0 scale-95",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2 w-full p-4">
          <div className="flex items-start flex-col">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 35 }}>crop_landscape</span>
              <p className="text-white font-medium text-lg">{name || "Sin título"}</p>
            </div>
            <p className="text-[#999999] text-sm">{description}</p>
          </div>
          <button onClick={handleClose} className="flex items-center justify-center rounded-full p-2 hover:bg-white/10 text-white" aria-label="Cerrar" title="Cerrar">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div className="flex items-start justify-start gap-2 w-full h-full px-4 pb-2">
          <div className="text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] w-4/5 aspect-video p-0 overflow-hidden border-solid relative">
            {loadingDoc ? (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">Loading preview…</div>
            ) : docErr ? (
              <div className="w-full h-full flex items-center justify-center text-red-400 text-sm">{docErr}</div>
            ) : (
              <iframe ref={iframeRef} title="Project Preview" className="w-full h-full border-0 bg-white" />
            )}
          </div>
          <div className="rounded-xl w-1/5 h-[100%] p-4 bg-red-500"></div>
        </div>

        <div className="flex items-center justify-end self-end w-full">
          <div className="flex items-center justify-center gap-2 px-4 py-2.5">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex-1 min-w-[100px] flex items-center justify-center text-[#999999] border border-[#2B2B2B] bg-[#0f0f0f] rounded-3xl p-2.5 hover:bg-[#222]"
                title={item.label}
                disabled={item.label === "Open" && !projectId}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#4B4B4B" }}>{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BasicModal
        open={showDelete}
        title="Delete project"
        description={`Please type "${name}" to confirm deletion.`}
        onClose={() => {
          setConfirmText("");
          setShowDelete(false);
        }}
        actions={
          <>
            <button onClick={() => { setConfirmText(""); setShowDelete(false); }} disabled={busy} className="px-4 py-2 rounded-lg border border-[#2B2B2B] hover:bg-[#1a1a1a]">
              Cancel
            </button>
            <button onClick={doDelete} disabled={confirmText !== name || busy} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50">
              Delete
            </button>
          </>
        }
      >
        <input
          className="w-full rounded-lg defaultStyle px-3 py-2 text-sm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={name}
        />
      </BasicModal>

      <BasicModal
        open={showRename}
        title="Rename project"
        onClose={() => setShowRename(false)}
        actions={
          <>
            <button onClick={() => setShowRename(false)} disabled={busy} className="px-4 py-2 rounded-lg border border-[#2B2B2B] hover:bg-[#1a1a1a]">
              Cancel
            </button>
            <button onClick={doRename} disabled={!renameText.trim() || busy} className="px-4 py-2 rounded-lg bg-[#d0d0d0] text-black hover:brightness-95 disabled:opacity-50">
              Save
            </button>
          </>
        }
      >
        <input
          className="w-full rounded-lg defaultStyle px-3 py-2 text-sm text-white"
          value={renameText}
          onChange={(e) => setRenameText(e.target.value)}
        />
      </BasicModal>
    </div>
  );
}

export default ProjectPreview;
