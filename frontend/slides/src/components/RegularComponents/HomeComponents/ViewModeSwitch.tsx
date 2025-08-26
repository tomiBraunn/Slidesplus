import React from "react";

type Props = {
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
};

function ViewModeSwitch({ viewMode, setViewMode }: Props) {
    return (
        <div className="flex items-center justify-center bg-[#1F1F1F] text-white rounded-full gap-0 h-fit">
            <span
                className={`material-symbols-outlined cursor-pointer select-none w-[2em] aspect-square ${
                    viewMode === "grid" ? "text-[#3CFF52]" : ""
                }`}
                onClick={() => setViewMode("grid")}
            >
                view_comfy_alt
            </span>
            <span className="w-[1px] h-7 bg-[#999999]"></span>
            <span
                className={`material-symbols-outlined cursor-pointer select-none w-[2em] aspect-square ${
                    viewMode === "list" ? "text-[#3CFF52]" : ""
                }`}
                onClick={() => setViewMode("list")}
            >
                dehaze
            </span>
        </div>
    );
}

export default ViewModeSwitch;
