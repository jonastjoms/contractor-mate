import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    console.log('Processing recording:', recordingId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the recording details
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()

    if (recordingError || !recording) {
      throw new Error('Recording not found')
    }

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('audio')
      .download(recording.file_path)

    if (fileError) {
      throw new Error('File not found in storage')
    }

    // Convert the file to a buffer
    const buffer = await fileData.arrayBuffer()

    // Call the transcription API
    const response = await fetch(
      "https://kelhfabjfneinfr9.us-east-1.aws.endpoints.huggingface.cloud",
      {
        headers: { 
          "Accept": "application/json",
          "Authorization": `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
          "Content-Type": "audio/flac"
        },
        method: "POST",
        body: buffer,
      }
    )

    if (!response.ok) {
      throw new Error('Transcription failed')
    }

    const result = await response.json()

    // Update the recording with the transcript
    const { error: updateError } = await supabase
      .from('recordings')
      .update({ 
        transcript: result.text,
        status: 'completed'
      })
      .eq('id', recordingId)

    if (updateError) {
      throw new Error('Failed to update recording')
    }

    return new Response(
      JSON.stringify({ success: true, transcript: result.text }),
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