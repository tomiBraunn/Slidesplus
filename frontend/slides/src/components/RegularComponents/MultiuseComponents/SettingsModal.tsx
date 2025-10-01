import React, { useEffect, useState } from "react";

function Settings() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  const openModal = () => {
    setMounted(true);
    document.documentElement.classList.add("overflow-hidden");
    requestAnimationFrame(() => setShow(true));
  };

  const closeModal = () => {
    setShow(false);
    document.documentElement.classList.remove("overflow-hidden");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (mounted) window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      document.documentElement.classList.remove("overflow-hidden");
    };
  }, [mounted]);

  const handleTransitionEnd = () => {
    if (!show) setMounted(false);
  };

  return (
    <>
      <span
        className="material-symbols-outlined flex items-center justify-center text-[#4B4B4B] text-[40px] cursor-pointer"
        style={{ fontSize: "32.5px" }}
        onClick={openModal}
      >
        settings
      </span>

      {mounted && (
        <div
          className={[
            "fixed z-50 inset-0 flex items-center justify-center",
            "bg-black/40 transition-[backdrop-filter,opacity] duration-200 ease-out",
            show ? "opacity-100 backdrop-blur-xl" : "opacity-0 backdrop-blur-0",
          ].join(" ")}
          onMouseDown={closeModal}
          onTransitionEnd={handleTransitionEnd}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className={`text-white rounded-xl defaultStyle card-animate w-[70vw] max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col border border-white/10 bg-[#0b0b0bcc] transform transition-all duration-200 ease-out backdrop-bl-sm${
              show ? " opacity-100 scale-100" : " opacity-0 scale-95"
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full p-4">
              <div className="flex items-start flex-col">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-white"
                    style={{ fontSize: 35 }}
                  >
                    settings
                  </span>
                  <p className="text-white font-medium text-lg">Settings</p>
                </div>
                <p className="text-[#999999] text-sm">Options</p>
              </div>
              <button
                onClick={closeModal}
                className="flex items-center justify-center rounded-full p-2 hover:bg-white/10 text-white"
                aria-label="Close"
                title="Close"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 22 }}
                >
                  close
                </span>
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#999999]">Empty content</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;