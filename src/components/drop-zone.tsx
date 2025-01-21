import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Cloud, File } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
}

export function DropZone({ onFileAccepted }: DropZoneProps) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress === 100) {
          clearInterval(interval);
          onFileAccepted(file);
          setTimeout(() => setUploadProgress(0), 500);
        }
      }, 100);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a']
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
        {uploadProgress > 0 ? (
          <>
            <File className="h-10 w-10 text-primary" />
            <Progress value={uploadProgress} className="w-[60%]" />
          </>
        ) : (
          <>
            <Cloud className="h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-600">
              Drag and drop your audio recording here, or click to select
            </p>
            <p className="text-xs text-gray-400">
              Supports MP3, WAV, M4A
            </p>
          </>
        )}
      </div>
    </div>
  );
}