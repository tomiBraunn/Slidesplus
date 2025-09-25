import React, { useState } from "react";
import SortBy from "./SortBy";

const projects = [
  { name: "Zeta", createdAt: "2025-01-01" },
  { name: "Alpha", createdAt: "2025-02-10" },
  { name: "Beta", createdAt: "2025-01-20" },
];

function ProjectList() {
  const [sortedProjects, setSortedProjects] = useState(projects);

  const handleSortChange = (option: string) => {
    let sorted = [...projects];

    if (option === "Recent") {
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (option === "Creation date") {
      sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (option === "A-Z") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    setSortedProjects(sorted);
  };

  return (
    <div>
      <SortBy onSortChange={handleSortChange} />

      <ul className="mt-4">
        {sortedProjects.map((p) => (
          <li key={p.name} className="text-white">
            {p.name} — {p.createdAt}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProjectList;
