import React, { useEffect, useState } from "react";

type ActionItem = {
    icon: string;
    label: string;
    onClick?: () => void;
};

type Props = {
    items: ActionItem[];
    onClose?: () => void;
};

function PreviewButtons({ items, onClose }: Props) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setOpen(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const handleClose = () => {
        setOpen(false);
    };

    const handleTransitionEnd = () => {
        if (!open && onClose) onClose();
    };

    return (
        <div
            onTransitionEnd={handleTransitionEnd}
            className="flex items-center justify-center gap-2 px-4 py-2.5"
        >
            {items.map((item) => (
                <div key={item.label} onClick={item.onClick} className="flex-1 min-w-[100px] flex items-center justify-center bg-[#181818] text-[#999999] rounded-3xl p-2.5">
                    <div className="flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#4B4B4B" }}>
                            {item.icon}
                        </span>
                        <span className="text-xs">{item.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default PreviewButtons;
