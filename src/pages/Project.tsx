import { useState } from "react";
import { useParams } from "react-router-dom";
import { DropZone } from "@/components/drop-zone";
import { RecordingList } from "@/components/recording-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Create recording record in the database
      const { data: recordingData, error: recordingError } = await supabase
        .from('recordings')
        .insert({
          project_id: id,
          file_path: filePath,
          name: file.name,
          status: 'processing'
        })
        .select()
        .single();

      if (recordingError) {
        throw recordingError;
      }

      // Add the new recording to the local state
      const newRecording: Recording = {
        id: recordingData.id,
        name: file.name,
        duration: "Processing...",
        status: "processing"
      };

      setRecordings(prev => [newRecording, ...prev]);

      // Call the transcribe function
      const { error: transcribeError } = await supabase.functions.invoke('transcribe-audio', {
        body: { recordingId: recordingData.id }
      });

      if (transcribeError) {
        throw transcribeError;
      }

      toast({
        title: "Recording uploaded",
        description: "Your recording is being processed."
      });
    } catch (error) {
      console.error('Error handling file:', error);
      toast({
        title: "Error",
        description: "Failed to upload recording. Please try again.",
        variant: "destructive"
      });
    }
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
                  onUpdate={handleUpdate}
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