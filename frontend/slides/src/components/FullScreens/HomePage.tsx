// src/components/FullScreens/HomePage.tsx
import React, { useState } from "react";
import AppTextLogo from "../RegularComponents/MultiuseComponents/AppTextLogo";
import ProjectSearchBar from "../RegularComponents/HomeComponents/ProjectSearchBar";
import NavBar from "../RegularComponents/HomeComponents/Navbar";
import CreateProject from "../RegularComponents/HomeComponents/Modals/CreateProject";
import ProjectPreview from "../RegularComponents/HomeComponents/Modals/ProjectPreview";
import ProjectsMasonry from "../RegularComponents/HomeComponents/ProjectsMasonry";
import type { Project } from "../RegularComponents/HomeComponents/ProjectsMasonry";

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
        { name: "E", description: "E" },
        { name: "F", description: "F" },
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
                <div className="w-[70vw]">
                    {viewMode === "grid" ? (
                        <ProjectsMasonry
                            items={projects}
                            onItemClick={openPreview}
                            settings={{
                                gap: 15,
                                animateFrom: "right",
                                duration: 1,
                                hoverScale: 0.95,
                                tileHeight: 120,
                            }}
                        />
                    ) : (
                        <div className="flex flex-col gap-2 w-auto h-auto">
                            {projects.map((p, i) => (
                                <ProjectTile
                                    key={i}
                                    name={p.name}
                                    description={p.description}
                                    onClick={() => openPreview(p)}
                                    listMode
                                />
                            ))}
                        </div>
                    )}
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

<button id="configuracion_btn"></button>

