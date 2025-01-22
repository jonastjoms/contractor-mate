import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recording_id } = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get recording details
    const { data: recording, error: recordingError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recording_id)
      .single()

    if (recordingError) {
      throw recordingError
    }

    // Download the audio file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('audio')
      .download(recording.file_path)

    if (downloadError) {
      throw downloadError
    }

    // Convert audio file to ArrayBuffer
    const audioBuffer = await fileData.arrayBuffer()

    // Send directly to Hugging Face API
    const response = await fetch(
      "https://kelhfabjfneinfr9.us-east-1.aws.endpoints.huggingface.cloud",
      {
        headers: { 
          "Accept": "application/json",
          "Authorization": `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
          "Content-Type": "audio/m4a"
        },
        method: "POST",
        body: audioBuffer,
      }
    )

    const result = await response.json()

    // Update the recording with the transcription
    const { error: updateError } = await supabaseClient
      .from('recordings')
      .update({
        transcript: result.text,
        status: 'completed'
      })
      .eq('id', recording_id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})