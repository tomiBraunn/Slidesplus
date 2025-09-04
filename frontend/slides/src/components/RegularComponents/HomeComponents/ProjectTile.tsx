import React from "react";

type Props = {
    name: string;
    description: string;
    onClick?: () => void;
    listMode?: boolean;
};

function ProjectTile({ name, description, onClick, listMode = false }: Props) {
    return (
        <button
            onClick={onClick}
            className={`text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] hover:bg-[#161616] transition-colors w-full cursor-pointer ${listMode
                ? "flex flex-row items-center py-2 px-3 gap-3 w-full rounded-full"
                : "flex flex-col items-start justify-start gap-2 p-3 text-left"
                }`}
        >
            <span
                className="material-symbols-outlined aspect-square shrink-0"
                style={{ fontSize: listMode ? "22px" : "35px" }}
            >
                crop_landscape
            </span>

            <div
                className={`flex ${listMode
                    ? "flex-row items-center justify-start w-full gap-3"
                    : "flex-col items-start gap-1 w-full"
                    }`}
            >
                <p
                    className={`truncate ${listMode
                        ? "text-[clamp(14px,1.5vw,20px)]"
                        : "text-[clamp(16px,2vw,32px)]"
                        }`}
                >
                    {name}
                </p>
                <p
                    className={`truncate ${listMode
                        ? "text-[clamp(10px,1vw,14px)] text-[#999999]"
                        : "text-[clamp(12px,1.5vw,16px)] text-[#999999]"
                        }`}
                >
                    {description}
                </p>
            </div>
        </button>
    );
}

export default ProjectTile;
