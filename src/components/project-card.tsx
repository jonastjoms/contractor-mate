import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  date: string;
  onDelete?: (id: string) => void;
}

export function ProjectCard({
  id,
  title,
  description,
  date,
  onDelete,
}: ProjectCardProps) {
  const handleDelete = async () => {
    try {
      if (!confirm("Are you sure you want to delete this project?")) return;

      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted successfully.",
      });

      if (onDelete) {
        onDelete(id); // Notify the parent to refetch the project list
      }
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project.",
        variant: "destructive",
      });
    }
  };

  return (
    <Link to={`/project/${id}`}>
      <Card className="hover:shadow-lg transition-shadow relative">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            <div className="mt-2 text-sm text-gray-500">{description}</div>
            <div className="mt-1 text-xs text-gray-400">{date}</div>
          </CardDescription>
        </CardHeader>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2"
          onClick={() => handleDelete}
          title="Slett"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </Card>
    </Link>
  );
}
