import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const recording_id = body.recording_id;

    if (!recording_id) {
      console.error("No recording_id provided in request body");
      throw new Error("recording_id is required");
    }

    console.log("Processing recording:", recording_id);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get recording details
    const { data: recording, error: recordingError } = await supabaseClient
      .from("recordings")
      .select("*")
      .eq("id", recording_id)
      .single();

    if (recordingError) {
      console.error("Error fetching recording:", recordingError);
      throw recordingError;
    }

    console.log("Found recording:", recording.file_path);

    // Download the audio file from storage
    const { data: fileData, error: downloadError } =
      await supabaseClient.storage.from("audio").download(recording.file_path);

    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      throw downloadError;
    }

    console.log("Successfully downloaded audio file");

    // Convert audio file to ArrayBuffer
    const audioBuffer = await fileData.arrayBuffer();
    console.log("Audio buffer size:", audioBuffer.byteLength);

    // Implement retry logic for Hugging Face API calls
    const maxRetries = 3;
    const baseDelay = 2000; // Start with 1 second delay
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      try {
        console.log(
          `Attempt ${attempt + 1} of ${maxRetries} to call Hugging Face API`
        );
        const response = await fetch(
          "https://kelhfabjfneinfr9.us-east-1.aws.endpoints.huggingface.cloud",
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${Deno.env.get("HUGGINGFACE_API_KEY")}`,
              "Content-Type": "audio/m4a",
            },
            method: "POST",
            body: audioBuffer,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Hugging Face API error:", response.status, errorText);

          if (response.status === 503) {
            // Service unavailable - implement exponential backoff
            const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000); // Cap at 10 seconds
            console.log(`Service unavailable, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            attempt++;
            lastError = new Error(
              `Hugging Face API temporarily unavailable (503) - attempt ${attempt}`
            );
            continue;
          }

          throw new Error(
            `Hugging Face API error: ${response.status} - ${errorText}`
          );
        }

        const result = await response.json();
        console.log("Transcription result:", result);

        // Update the recording with the transcription
        const { error: updateError } = await supabaseClient
          .from("recordings")
          .update({
            transcript: result.text,
            status: "completed",
          })
          .eq("id", recording_id);

        if (updateError) {
          console.error("Error updating recording:", updateError);
          throw updateError;
        }

        console.log("Successfully updated recording with transcript");

        return new Response(
          JSON.stringify({ success: true, transcript: result.text }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1 && error.message.includes("503")) {
          attempt++;
          continue;
        }
        break;
      }
    }

    // If we get here, all attempts failed
    throw (
      lastError || new Error("Failed to transcribe after multiple attempts")
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
