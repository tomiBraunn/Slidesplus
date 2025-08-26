import React, { useEffect, useState } from "react";

type Props = {
    onClose: () => void;
};

function CreateProject({ onClose }: Props) {
    const [open, setOpen] = useState(false);

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
                    <div className="flex flex-col items-start justify-start gap-2 p-4">
                        <div className="flex items-center justify-start gap-2">
                            <span className="material-symbols-outlined text-white" style={{ fontSize: 35 }}>
                                crop_landscape
                            </span>
                            <p className="text-white font-medium">Create presentation:</p>
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Title?"
                                className="rounded-lg p-2 w-full text-white bg-[#1F1F1F] border-[2.5px] border-[#181818] focus:outline-none placeholder-white/50"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-end justify-between gap-4">
                        <span
                            className="material-symbols-outlined text-white cursor-pointer"
                            style={{ fontSize: 35 }}
                            onClick={handleClose}
                        >
                            close
                        </span>
                        <button className="px-4 py-2 appColorFade rounded-lg text-white font-medium transition-colors">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateProject;
