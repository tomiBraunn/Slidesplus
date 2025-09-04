import React from "react";

type BasicModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
};

function BasicModal({ open, title, description, children, onClose, actions }: BasicModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[420px] rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] p-6 text-white"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-[#9aa0a6] mt-1">{description}</p>}

        <div className="mt-4">{children}</div>

        <div className="flex justify-end gap-2 mt-6">{actions}</div>
      </div>
    </div>
  );
}

export default BasicModal;
