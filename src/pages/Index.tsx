import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/project-card";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEMO_PROJECTS = [
  {
    id: "1",
    title: "Kitchen Renovation",
    description: "Complete kitchen remodel including cabinets and appliances",
    date: "2024-02-20"
  },
  {
    id: "2",
    title: "Bathroom Update",
    description: "Master bathroom renovation with new fixtures",
    date: "2024-02-18"
  }
];

export default function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = DEMO_PROJECTS.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button onClick={() => navigate("/project/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} {...project} />
        ))}
      </div>
    </div>
  );
}