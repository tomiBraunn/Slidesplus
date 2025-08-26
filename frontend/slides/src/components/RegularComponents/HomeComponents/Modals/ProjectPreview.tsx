import React, { useEffect, useState } from "react";

type ActionItem = {
  icon: string;
  label: string;
  onClick?: () => void;
};

type Props = {
  open: boolean;
  name: string;
  description: string;
  onClose: () => void;
  actions?: ActionItem[]; // opcional: para sobrescribir acciones
};

export default function ProjectPreview({
  open,
  name,
  description,
  onClose,
  actions,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  // Montaje/desmontaje según 'open'
  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
    }
  }, [open]);

  // ESC para cerrar
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

  // Acciones por defecto si no se pasan por props
  const defaultActions: ActionItem[] = [
    { icon: "delete", label: "Delete", onClick: () => console.log("delete") },
    { icon: "edit", label: "Rename", onClick: () => console.log("rename") },
    { icon: "share", label: "Share", onClick: () => console.log("share") },
    { icon: "open_in_new", label: "Open", onClick: () => console.log("open") },
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
        {/* Header */}
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
            <p className="text-[#999999] text-sm">
              {description || "Sin descripción"}
            </p>
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

        {/* Content */}
        <div className="flex items-start justify-start gap-2 w-full h-full px-4 pb-2">
          <div className="presentationComponentsStyleBorderLess rounded-xl w-4/5 aspect-video p-4 overflow-auto border-solid border-[5px] border-[#181818]">
            <p className="text-white text-3xl">PLACEHOLDER</p>
          </div>
          <div className="rounded-xl w-1/5 h-[100%] p-4 bg-red-500"></div>
        </div>

        {/* Botonera integrada */}
        <div className="flex items-center justify-end self-end w-full">
          <div className="flex items-center justify-center gap-2 px-4 py-2.5">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex-1 min-w-[100px] flex items-center justify-center bg-[#181818] text-[#999999] rounded-3xl p-2.5 hover:bg-[#222]"
                title={item.label}
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
