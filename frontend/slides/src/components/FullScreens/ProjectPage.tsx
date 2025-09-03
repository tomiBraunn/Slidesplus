import React from "react";
import { useParams } from "react-router-dom";
import ProjectNavBar from "../RegularComponents/ProjectComponents/ProjectNavBar";
import SlidesEditor from "../RegularComponents/ProjectComponents/SlidesEditor";

function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="bg-[#121212] w-screen h-screen flex flex-col">
      <ProjectNavBar projectId={id} />
      <div className="flex-1 w-full p-5">
        <SlidesEditor projectId={id} />
      </div>
    </div>
  );
}

export default ProjectPage;
