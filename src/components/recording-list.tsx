import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileAudio, Loader2, Wand2, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Recording {
  id: string;
  name: string;
  duration: string;
  status: "processing" | "completed";
  transcript?: string;
}

interface RecordingListProps {
  recordings: Recording[];
  onUpdate: (recording: Recording) => void;
  onGenerate: (id: string) => void;
}

export function RecordingList({ recordings, onUpdate, onGenerate }: RecordingListProps) {
  const { toast } = useToast();

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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recording deleted successfully."
      });
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Error",
        description: "Failed to delete recording.",
        variant: "destructive"
      });
    }
  };

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
              {recording.status === "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onGenerate(recording.id)}
                  title="Generate tasks, materials, and offer"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(recording.id)}
                title="Delete recording"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
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