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
            className={`rounded-xl bg-theme-primary border border-theme-tertiary text-theme-primary hover:bg-theme-hover transition-colors duration-300 bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300Hover w-full cursor-pointer ${
                listMode
                    ? "flex flex-row items-center py-2 px-3 gap-3 rounded-full"
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
                className={`flex w-full min-w-0 text-left ${
                    listMode
                        ? "flex-row items-center justify-start gap-3"
                        : "flex-col items-start gap-1"
                }`}
            >
                <p
                    className={`truncate w-full min-w-0 text-left ${
                        listMode
                            ? "text-[clamp(14px,1.5vw,20px)]"
                            : "text-[clamp(16px,2vw,32px)]"
                    }`}
                    title={name}
                >
                    {name}
                </p>
                <p
                    className={`truncate w-full min-w-0 text-left ${
                        listMode
                            ? "text-[clamp(10px,1vw,14px)] text-[#999999]"
                            : "text-[clamp(12px,1.5vw,16px)] text-[#999999]"
                    }`}
                    title={description}
                >
                    {description}
                </p>
            </div>
        </button>
    );
}

export default ProjectTile;
