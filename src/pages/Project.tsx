import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DropZone } from "@/components/drop-zone";
import { RecordingList } from "@/components/recording-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  const [recordings, setRecordings] = useState<Recording[]>([]);

  const { data: tasks } = useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id);
      
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: materials } = useQuery({
    queryKey: ['materials', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('project_id', id);
      
      if (error) throw error;
      return data as Material[];
    },
  });

  const { data: offer } = useQuery({
    queryKey: ['offer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('project_id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Offer;
    },
  });

  const handleFileAccepted = (recording: Recording) => {
    setRecordings(prev => [recording, ...prev]);
  };

  const handlePlay = (id: string) => {
    toast({
      title: "Playing recording",
      description: "Audio playback started."
    });
  };

  const handleUpdate = (recording: Recording) => {
    setRecordings(prev =>
      prev.map(rec =>
        rec.id === recording.id
          ? recording
          : rec
      )
    );

    if (recording.status === "completed") {
      toast({
        title: "Recording processed",
        description: "Your recording has been successfully transcribed."
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">
        {id === "new" ? "New Project" : `Project Details`}
      </h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <DropZone projectId={id!} onFileAccepted={handleFileAccepted} />
          </CardContent>
        </Card>

        <Tabs defaultValue="recordings">
          <TabsList>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="offer">Offer</TabsTrigger>
          </TabsList>

          <TabsContent value="recordings">
            <Card>
              <CardContent className="pt-6">
                <RecordingList
                  recordings={recordings}
                  onPlay={handlePlay}
                  onUpdate={handleUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardContent className="pt-6">
                {tasks?.length ? (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border p-4 rounded-lg">
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        {task.assignee && (
                          <p className="text-sm text-gray-500 mt-2">
                            Assigned to: {task.assignee}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No tasks available. Upload a recording to generate tasks.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
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
                            <span className="font-medium">${material.amount}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No materials available. Upload a recording to generate materials list.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offer">
            <Card>
              <CardContent className="pt-6">
                {offer ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold">{offer.title}</h2>
                      <p className="text-gray-600 mt-2">{offer.summary}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Progress Plan</h3>
                      <p className="text-sm text-gray-600">{offer.progress_plan}</p>
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
                    No offer available. Upload a recording to generate an offer.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}