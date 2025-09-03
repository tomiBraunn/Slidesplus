import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type ActionItem = {
  icon: string;
  label: string;
  onClick?: () => void;
};

type Props = {
  open: boolean;
  name: string;
  projectId?: string;                // <--- agregado
  slideCount?: number;
  lastModified?: string | Date | null;
  onClose: () => void;
  onDelete?: () => Promise<void> | void;
  actions?: ActionItem[];
};

export default function ProjectPreview({
  open,
  name,
  projectId,
  slideCount = 0,
  lastModified = null,
  onClose,
  onDelete,
  actions,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
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

  const handleDelete = async () => {
    try {
      await onDelete?.();
    } finally {
      handleClose();
    }
  };

  const goOpen = () => {
    if (projectId) navigate(`/p/${projectId}`);
  };

  const defaultActions: ActionItem[] = [
    { icon: "delete", label: "Delete", onClick: handleDelete },
    { icon: "edit", label: "Rename", onClick: () => console.log("rename") },
    { icon: "share", label: "Share", onClick: () => console.log("share") },
    { icon: "open_in_new", label: "Open", onClick: goOpen }, // <--- navega
  ];
  const items = actions?.length ? actions : defaultActions;

  return (
    <div
      className="absolute z-50 inset-0 glassBackground flex items-center justify-center"
      onMouseDown={handleClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTransitionEnd={handleTransitionEnd}
        className={[
          "presentationComponentsStyle rounded-xl card-animate w-[70vw] max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col border border-white/10 backdrop-blur-xl",
          "transform transition-all duration-200 ease-out",
          show ? "opacity-100 scale-100" : "opacity-0 scale-95",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2 w-full p-4">
          <div className="flex items-start flex-col">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 35 }}>
                crop_landscape
              </span>
              <p className="text-white font-medium text-lg">
                {name || "Sin título"}
              </p>
            </div>
            <p className="text-[#999999] text-sm">{description}</p>
          </div>

          <button
            onClick={handleClose}
            className="flex items-center justify-center rounded-full p-2 hover:bg-white/10 text-white"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              close
            </span>
          </button>
        </div>

        <div className="flex items-start justify-start gap-2 w-full h-full px-4 pb-2">
          <div className="presentationComponentsStyleBorderLess rounded-xl w-4/5 aspect-video p-4 overflow-auto border-solid border-[5px] border-[#181818]">
            <p className="text-white text-3xl">PLACEHOLDER</p>
          </div>
          <div className="rounded-xl w-1/5 h-[100%] p-4 bg-red-500"></div>
        </div>

        <div className="flex items-center justify-end self-end w-full">
          <div className="flex items-center justify-center gap-2 px-4 py-2.5">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex-1 min-w-[100px] flex items-center justify-center bg-[#181818] text-[#999999] rounded-3xl p-2.5 hover:bg-[#222]"
                title={item.label}
                disabled={item.label === "Open" && !projectId}
              >
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: "#4B4B4B" }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-xs">{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
