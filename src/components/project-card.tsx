import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  date: string;
}

export function ProjectCard({ id, title, description, date }: ProjectCardProps) {
  return (
    <Link to={`/project/${id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            <div className="mt-2 text-sm text-gray-500">{description}</div>
            <div className="mt-1 text-xs text-gray-400">{date}</div>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}