import ProjectTile from "../ProjectTile";
import AppTextLogo from "../AppTextLogo";
import ProjectSearchBar from "../ProjectSearchBar";
import NavBar from "../NavBar";
import CreateProject from "../CreateProject";
import React, { useState } from "react";
import ProjectPreview from "../ProjectPreview";

type Project = { name: string; description: string };

function HomePage() {
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState<Project | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const openPreview = (p: Project) => {
        setSelected(p);
        setShowPreview(true);
    };

    return (
        <div className="bg-[#121212] w-screen h-screen flex items-center justify-start flex-col gap-5 relative">
            <div className="flex flex-col items-center justify-start">
                <NavBar />
                <div className="flex flex-col items-center justify-start text-white w-[70vw]">
                    <div className="searchbar flex flex-col items-center justify-start w-full">
                        <AppTextLogo />
                        <ProjectSearchBar onAddClick={() => setShowCreate(true)} />
                    </div>
                </div>
            </div>

            <main className="flex justify-center w-full relative">
                <div className="flex flex-wrap justify-start w-[70vw] gap-4">
                    <ProjectTile
                        name="A"
                        description="A"
                        onClick={() => openPreview({ name: "A", description: "A" })}
                    />
                    <ProjectTile
                        name="B"
                        description="B"
                        onClick={() => openPreview({ name: "B", description: "B" })}
                    />
                    <ProjectTile
                        name="C"
                        description="C"
                        onClick={() => openPreview({ name: "C", description: "C" })}
                    />
                    <ProjectTile
                        name="C"
                        description="C"
                        onClick={() => openPreview({ name: "C", description: "C" })}
                    />
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
