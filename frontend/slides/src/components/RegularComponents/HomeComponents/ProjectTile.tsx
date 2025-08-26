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
            className={`bg-[#1F1F1F] text-white rounded-xl hover:bg-[#242424] transition-colors ${listMode
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
                    className={
                        listMode
                            ? "text-[clamp(14px,1.5vw,20px)]"
                            : "text-[clamp(16px,2vw,32px)]"
                    }
                >
                    {name}
                </p>
                <p
                    className={
                        listMode
                            ? "text-[clamp(10px,1vw,14px)] text-[#999999]"
                            : "text-[clamp(12px,1.5vw,16px)] text-[#999999]"
                    }
                >
                    {description}
                </p>
            </div>
        </button>
    );
}

export default ProjectTile;
