import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, FileAudio, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Recording {
  id: string;
  name: string;
  duration: string;
  status: "processing" | "completed";
  transcript?: string;
}

interface RecordingListProps {
  recordings: Recording[];
  onPlay: (id: string) => void;
  onUpdate: (recording: Recording) => void;
}

export function RecordingList({ recordings, onPlay, onUpdate }: RecordingListProps) {
  useEffect(() => {
    // Subscribe to changes in the recordings table
    const channel = supabase
      .channel('recordings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
        },
        (payload) => {
          const updatedRecording = payload.new;
          const existingRecording = recordings.find(r => r.id === updatedRecording.id);
          if (existingRecording) {
            onUpdate({
              ...existingRecording,
              status: updatedRecording.status as "processing" | "completed",
              transcript: updatedRecording.transcript
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordings, onUpdate]);

  return (
    <div className="space-y-4">
      {recordings.map((recording) => (
        <Card key={recording.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <FileAudio className="h-4 w-4" />
                {recording.name}
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{recording.duration}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPlay(recording.id)}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recording.status === "processing" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : (
              <p className="text-sm text-gray-600">{recording.transcript}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}