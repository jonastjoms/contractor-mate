import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Cloud, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DropZoneProps {
  onFileAccepted: (recording: {
    id: string;
    name: string;
    duration: string;
    status: "processing" | "completed";
    transcript?: string;
  }) => void;
  projectId: string;
}

export function DropZone({ onFileAccepted, projectId }: DropZoneProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { toast } = useToast();

  const processRecordingResults = async (recordingId: string) => {
    try {
      const { error: processError } = await supabase.functions
        .invoke('process-transcript', {
          body: { recording_id: recordingId }
        });

      if (processError) {
        console.error('Processing error:', processError);
        toast({
          title: "Processing failed",
          description: processError.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Processing complete",
        description: "Tasks, materials, and offer have been generated."
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Upload to Supabase Storage
      const filePath = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create recording record
      const { data: recording, error: dbError } = await supabase
        .from('recordings')
        .insert({
          project_id: projectId,
          file_path: filePath,
          status: 'processing'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Start transcription with retries
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;

      while (attempts < maxAttempts) {
        try {
          const { data, error: transcriptionError } = await supabase.functions
            .invoke('transcribe-audio', {
              body: { recording_id: recording.id }
            });

          if (transcriptionError) {
            console.error('Transcription error:', transcriptionError);
            if (transcriptionError.message.includes('503')) {
              lastError = transcriptionError;
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
                continue;
              }
            }
            throw transcriptionError;
          }

          if (!data?.success) {
            throw new Error('Transcription failed: No success response received');
          }

          // Update recording with transcript
          const { data: updatedRecording, error: updateError } = await supabase
            .from('recordings')
            .update({
              transcript: data.transcript,
              status: 'completed'
            })
            .eq('id', recording.id)
            .select()
            .single();

          if (updateError) throw updateError;

          // Notify parent component with updated recording
          onFileAccepted({
            id: updatedRecording.id,
            name: file.name,
            duration: "Processing...",
            status: "completed",
            transcript: updatedRecording.transcript
          });

          toast({
            title: "Recording processed",
            description: "Your recording has been successfully transcribed."
          });

          // Process the transcript to generate tasks, materials, and offer
          await processRecordingResults(recording.id);
          
          setIsUploading(false);
          return;
        } catch (error) {
          lastError = error;
          attempts++;
          if (attempts < maxAttempts && error.message.includes('503')) {
            continue;
          }
          break;
        }
      }

      // If we get here, all attempts failed
      throw lastError || new Error('Failed to process recording after multiple attempts');

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
      setIsUploading(false);
    }
  }, [projectId, onFileAccepted, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/flac': ['.flac'] // Only accept FLAC files
    },
    maxFiles: 1
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-gray-600">Analyserer innhold</p>
          </>
        ) : (
          <>
            <Cloud className="h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-600">
              Drag and drop your FLAC audio recording here, or click to select
            </p>
            <p className="text-xs text-gray-400">
              Only FLAC files are supported
            </p>
          </>
        )}
      </div>
    </div>
  );
}