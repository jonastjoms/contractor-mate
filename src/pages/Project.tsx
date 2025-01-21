import { useState } from "react";
import { useParams } from "react-router-dom";
import { DropZone } from "@/components/drop-zone";
import { RecordingList } from "@/components/recording-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

interface Recording {
  id: string;
  name: string;
  duration: string;
  status: "processing" | "completed";
  transcript?: string;
}

export default function Project() {
  const { id } = useParams();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<Recording[]>([]);

  const handleFileAccepted = async (file: File) => {
    const newRecording: Recording = {
      id: Date.now().toString(),
      name: file.name,
      duration: "0:00",
      status: "processing"
    };

    setRecordings(prev => [newRecording, ...prev]);

    // Simulate processing delay
    setTimeout(() => {
      setRecordings(prev =>
        prev.map(rec =>
          rec.id === newRecording.id
            ? {
                ...rec,
                status: "completed",
                transcript: "Sample transcript from the recording...",
                duration: "1:30"
              }
            : rec
        )
      );

      toast({
        title: "Recording processed",
        description: "Your recording has been successfully processed."
      });
    }, 3000);
  };

  const handlePlay = (id: string) => {
    toast({
      title: "Playing recording",
      description: "Audio playback started."
    });
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
            <DropZone onFileAccepted={handleFileAccepted} />
          </CardContent>
        </Card>

        <Tabs defaultValue="recordings">
          <TabsList>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="plan">Progress Plan</TabsTrigger>
            <TabsTrigger value="offer">Offer</TabsTrigger>
          </TabsList>

          <TabsContent value="recordings">
            <Card>
              <CardContent className="pt-6">
                <RecordingList
                  recordings={recordings}
                  onPlay={handlePlay}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">
                  AI-generated tasks will appear here after processing recordings.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">
                  AI-generated materials list will appear here after processing recordings.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plan">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">
                  AI-generated progress plan will appear here after processing recordings.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offer">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">
                  AI-generated offer will appear here after processing recordings.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}