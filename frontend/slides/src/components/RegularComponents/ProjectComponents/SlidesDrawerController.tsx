import React from "react";

function SlidesDrawerController() {
    const items = [
        { icon: "add", label: "Add" },
        { icon: "delete", label: "Delete" },
        { icon: "zoom_in", label: "Zoom In" },
        { icon: "zoom_out", label: "Zoom Out" },
        { icon: "stack", label: "Change z order" },
    ];

    return (
        <div className="bg-[#121212] flex items-center justify-center gap-1 py-1 px-1.5 absolute top-0 right-0 rounded-none rounded-bl-3xl border-l-[5px] border-b-[5px] border-[#181818]">
            {items.map((item) => (
                <span
                    key={item.label}
                    className="material-symbols-outlined text-[#4B4B4B]"
                    style={{ fontSize: "18px" }}
                >
                    {item.icon}
                </span>
            ))}
        </div>
    );
}

export default SlidesDrawerController;
