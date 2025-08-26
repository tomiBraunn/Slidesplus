import ProjectTile from "../RegularComponents/HomeComponents/ProjectTile";
import AppTextLogo from "../RegularComponents/MultiuseComponents/AppTextLogo";
import ProjectSearchBar from "../RegularComponents/HomeComponents/ProjectSearchBar";
import NavBar from "../RegularComponents/HomeComponents/Navbar";
import CreateProject from "../RegularComponents/HomeComponents/Modals/CreateProject";
import ProjectPreview from "../RegularComponents/HomeComponents/Modals/ProjectPreview";
import React, { useState } from "react";

type Project = { name: string; description: string };

function HomePage() {
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState<Project | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const openPreview = (p: Project) => {
        setSelected(p);
        setShowPreview(true);
    };

    const projects: Project[] = [
        { name: "A", description: "A" },
        { name: "B", description: "B" },
        { name: "C", description: "C" },
        { name: "D", description: "D" },
    ];

    return (
        <div className="bg-[#121212] w-screen h-screen flex items-center justify-start flex-col gap-5 relative">
            <div className="bg-[#121212] flex flex-col items-center justify-start z-10">
                <NavBar />
                <div className="flex flex-col items-center justify-start text-white w-[70vw]">
                    <div className="searchbar flex flex-col items-center justify-start w-full">
                        <AppTextLogo />
                        <ProjectSearchBar 
                            onAddClick={() => setShowCreate(true)} 
                            viewMode={viewMode} 
                            setViewMode={setViewMode} 
                        />
                    </div>
                </div>
            </div>

            <main className="flex justify-center w-full relative">
                <div
                    className={`w-[70vw] gap-4 ${
                        viewMode === "grid" ? "grid grid-cols-4" : "flex flex-col"
                    }`}
                >
                    {projects.map((p, i) => (
                        <ProjectTile
                            key={i}
                            name={p.name}
                            description={p.description}
                            onClick={() => openPreview(p)}
                            listMode={viewMode === "list"} // 👈
                        />
                    ))}
                </div>
            </main>

            {showCreate && <CreateProject onClose={() => setShowCreate(false)} />}
            <ProjectPreview
                open={showPreview}
                name={selected?.name || ""}
                description={selected?.description || ""}
                onClose={() => setShowPreview(false)}
            />
        </div>
    );
}
export default HomePage;
