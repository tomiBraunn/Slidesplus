import React from 'react';
import ProjectNavBar from '../RegularComponents/ProjectComponents/ProjectNavBar';
import SlidesEditor from '../RegularComponents/ProjectComponents/SlidesEditor';

function ProjectPage() {
  return (
    <div className=" bg-[#121212] w-screen h-screen flex flex-col">
      <ProjectNavBar />
      <div className="flex-1 w-full p-5">
        <SlidesEditor />
      </div>
    </div>
  );
}

export default ProjectPage;
