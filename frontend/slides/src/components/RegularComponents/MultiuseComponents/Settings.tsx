import React, { useState } from "react";
import SettingsModal from "../MultiuseComponents/SettingsModal";

function Settings() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <span
        className="material-symbols-outlined flex items-center justify-center text-[#4B4B4B] text-[40px] cursor-pointer"
        style={{ fontSize: "32.5px" }}
        onClick={() => setIsOpen(true)}
      >
        settings
      </span>

      {isOpen && <SettingsModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

export default Settings;
