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
        className="w-120 rounded-xl bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 border p-6 text-white"
      >
        <p className="text-lg font-semibold">{title}</p>
        {description && <p className="text-sm text-[#9aa0a6] mt-1">{description}</p>}

        <div className="mt-4">{children}</div>

        <div className="flex justify-end gap-2 mt-6">{actions}</div>
      </div>
    </div>
  );
}

export default BasicModal;
