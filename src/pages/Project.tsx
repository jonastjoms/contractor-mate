import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DropZone } from "@/components/drop-zone";
import { RecordingList } from "@/components/recording-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generateOfferPDF } from "@/lib/generateOfferPdf";

interface Recording {
  id: string;
  name: string;
  duration: string;
  status: "processing" | "completed";
  transcript?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
}

interface Material {
  id: string;
  title: string;
  description: string;
  amount: number;
}

interface Offer {
  id: string;
  title: string;
  summary: string;
  progress_plan: string;
  total_price: number;
}

export default function Project() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [projectDescription, setProjectDescription] = useState("");

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProjectTitle(data.title);
      return data;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", id);

      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: materials } = useQuery({
    queryKey: ["materials", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("project_id", id);

      if (error) throw error;
      return data as Material[];
    },
  });

  const { data: offer } = useQuery({
    queryKey: ["offer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("project_id", id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as Offer | null;
    },
  });

  // Fetch recordings when component mounts or after deletion
  const fetchRecordings = async () => {
    const { data, error } = await supabase
      .from("recordings")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching recordings",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      const formattedRecordings = data.map((rec) => ({
        id: rec.id,
        name: rec.file_path.split("/").pop(),
        duration: "N/A",
        status: rec.status as "processing" | "completed",
        transcript: rec.transcript,
      }));
      setRecordings(formattedRecordings);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [id, toast]);

  const handleFileAccepted = (recording: Recording) => {
    setRecordings((prev) => [recording, ...prev]);
  };

  const handleUpdate = (recording: Recording) => {
    setRecordings((prev) =>
      prev.map((rec) => (rec.id === recording.id ? recording : rec))
    );
  };

  const handleManualGeneration = async (recordingId: string) => {
    try {
      toast({
        title: "Prosesserer",
        description: "Generer oppgaver, materialliste og tilbud...",
      });

      const { error: processError } = await supabase.functions.invoke(
        "process-transcript",
        {
          body: { recording_id: recordingId },
        }
      );

      if (processError) {
        console.error("Processing error:", processError);
        toast({
          title: "Processing failed",
          description: processError.message,
          variant: "destructive",
        });
        return;
      }

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["materials", id] });
      queryClient.invalidateQueries({ queryKey: ["offer", id] });

      toast({
        title: "Processing complete",
        description: "Oppgaver, materialliste og tilbud generert.",
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTitleSave = async () => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ title: projectTitle })
        .eq("id", id);

      if (error) throw error;

      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });

      toast({
        title: "Success",
        description: "Project title updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project title.",
        variant: "destructive",
      });
    }
  };

  const handleDescriptionSave = async () => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ description: projectDescription })
        .eq("id", id);

      if (error) throw error;

      setIsEditingDescription(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });

      toast({
        title: "Success",
        description: "Project description updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update project description.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!offer) {
      toast({
        title: "No offer available",
        description: "Please generate an offer before downloading.",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateOfferPDF(offer, "offer-content");
      toast({
        title: "Download Success",
        description: "Offer downloaded as PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-2 mb-8">
        {/* Title Section */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="text-3xl font-bold h-12"
              placeholder="Prosjektnavn"
            />
            <Button variant="outline" size="icon" onClick={handleTitleSave}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">
              {project?.title || "Prosjektnavn"}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Description Section */}
        {isEditingDescription ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={projectDescription ?? ""}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Prosjektbeskrivelse"
              rows={4}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDescriptionSave}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="hover:bg-red-100 text-red-600"
                size="sm"
                onClick={() => setIsEditingDescription(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              {project?.description || "No description available."}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setProjectDescription(project?.description ?? ""); // Safely set the description
                setIsEditingDescription(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Last opp opptak</CardTitle>
          </CardHeader>
          <CardContent>
            <DropZone projectId={id!} onFileAccepted={handleFileAccepted} />
          </CardContent>
        </Card>

        <Tabs defaultValue="Opptak">
          <TabsList>
            <TabsTrigger value="Opptak">Opptak</TabsTrigger>
            <TabsTrigger value="oppgaver">Oppgaver</TabsTrigger>
            <TabsTrigger value="materialer">Materialer</TabsTrigger>
            <TabsTrigger value="tilbud">Tilbud</TabsTrigger>
          </TabsList>

          <TabsContent value="Opptak">
            <Card>
              <CardContent className="pt-6">
                <RecordingList
                  recordings={recordings}
                  onUpdate={handleUpdate}
                  onGenerate={handleManualGeneration}
                  onDelete={fetchRecordings}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="Oppgaver">
            <Card>
              <CardContent className="pt-6">
                {tasks?.length ? (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border p-4 rounded-lg">
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {task.description}
                        </p>
                        {task.assignee && (
                          <p className="text-sm text-gray-500 mt-2">
                            Ansvarlig: {task.assignee}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Ingen oppgaver klare, last opp en opptak for å generere.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="Materialer">
            <Card>
              <CardContent className="pt-6">
                {materials?.length ? (
                  <div className="space-y-4">
                    {materials.map((material) => (
                      <div key={material.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{material.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {material.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">
                              ${material.amount}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Ingen materialliste klar, last opp en opptak for å generere.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="Tilbud">
            <Card>
              <CardContent className="pt-6" id="offer-content">
                {offer ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold">{offer.title}</h2>
                      <p className="text-gray-600 mt-2">{offer.summary}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Progress Plan</h3>
                      <p className="text-sm text-gray-600">
                        {offer.progress_plan}
                      </p>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Price</span>
                        <span className="text-xl font-semibold">
                          ${offer.total_price}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Tilbud er ikke klart, last opp en opptak for å generere.
                  </p>
                )}
              </CardContent>
              {offer && (
                <div className="m-4 flex justify-end">
                  <Button onClick={handleDownloadPDF} variant="outline">
                    Last ned
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
