import React, { useEffect, useState } from "react";
import ActionBar from "./ActionBar";

type Props = {
    open: boolean;
    name: string;
    description: string;
    onClose: () => void; 
};

function ProjectPreview({ open, name, description, onClose }: Props) {
    const [mounted, setMounted] = useState(false);
    const [show, setShow] = useState(false);

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
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 35 }}>
                            crop_landscape
                        </span>
                        <div className="flex flex-col">
                            <p className="text-white font-medium text-lg">{name || "Sin título"}</p>
                            <p className="text-[#999999] text-sm">{description || "Sin descripción"}</p>
                        </div>
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
                    <ActionBar
                        items={[
                            { icon: "delete", label: "Delete", onClick: () => console.log("delete") },
                            { icon: "edit", label: "Rename", onClick: () => console.log("rename") },
                            { icon: "share", label: "Share", onClick: () => console.log("share") },
                            { icon: "smart_display", label: "Present", onClick: () => console.log("present") },
                            { icon: "open_in_new", label: "Open", onClick: () => console.log("open") },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}

export default ProjectPreview;
