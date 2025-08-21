import React from "react";

type Props = {
  name: string;
  description: string;
  onClick?: () => void;
};

function ProjectTile({ name, description, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start justify-start gap-1 bg-[#1F1F1F] text-white p-3 rounded-xl w-[16rem] text-left hover:bg-[#242424] transition-colors"
    >
      <span className="material-symbols-outlined aspect-square" style={{ fontSize: "35px" }}>
        crop_landscape
      </span>
      <div className="flex flex-col items-start justify-start gap-2 w-full">
        <p className="text-[clamp(16px,2vw,32px)]">{name}</p>
        <p className="text-[clamp(10px,1.5vw,16px)] text-[#999999]">{description}</p>
      </div>
    </button>
  );
}
export default ProjectTile;
