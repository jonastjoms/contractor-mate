import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { FFmpeg } from "https://deno.land/x/ffmpeg@v1.0.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { recordingId } = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the recording details
    const { data: recording, error: recordingError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()

    if (recordingError) {
      throw recordingError
    }

    // Download the audio file
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('audio')
      .download(recording.file_path)

    if (downloadError) {
      throw downloadError
    }

    // Convert to FLAC using FFmpeg
    const ffmpeg = new FFmpeg();
    const inputPath = await Deno.makeTempFile({ suffix: '.m4a' });
    const outputPath = await Deno.makeTempFile({ suffix: '.flac' });

    // Write the downloaded file to a temporary location
    await Deno.writeFile(inputPath, new Uint8Array(await fileData.arrayBuffer()));

    // Convert to FLAC
    await ffmpeg.run([
      '-i', inputPath,
      '-c:a', 'flac',
      outputPath
    ]);

    // Read the converted FLAC file
    const flacData = await Deno.readFile(outputPath);

    // Clean up temporary files
    await Deno.remove(inputPath);
    await Deno.remove(outputPath);

    // Send the FLAC file to the Hugging Face API
    const response = await fetch(
      "https://kelhfabjfneinfr9.us-east-1.aws.endpoints.huggingface.cloud",
      {
        headers: { 
          "Accept": "application/json",
          "Authorization": `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
          "Content-Type": "audio/flac"
        },
        method: "POST",
        body: flacData,
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const transcription = await response.json()

    // Update the recording with the transcription
    const { error: updateError } = await supabaseClient
      .from('recordings')
      .update({
        transcript: transcription.text,
        status: 'completed'
      })
      .eq('id', recordingId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})