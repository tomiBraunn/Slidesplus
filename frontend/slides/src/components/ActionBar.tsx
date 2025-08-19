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

function ActionBar({ items, onClose }: Props) {
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
            className="flex items-center justify-center gap-2 p-4 w-full"
        >
            {items.map((item) => (
                <button
                    key={item.label}
                    onClick={item.onClick}
                    className="flex items-center justify-center gap-1 bg-[#181818] text-[#999999] rounded-xl p-2 flex-1 "
                >
                    <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "18px", color: "#4B4B4B" }}
                    >
                        {item.icon}
                    </span>
                    <span className="text-sm">{item.label}</span>
                </button>
            ))}
        </div>
    );
}

export default ActionBar;
