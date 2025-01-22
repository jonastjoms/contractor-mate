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
    const { recording_id } = await req.json();

    if (!recording_id) {
      console.error("No recording_id provided");
      throw new Error("recording_id is required");
    }

    console.log("Processing recording:", recording_id);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get recording with transcript
    const { data: recording, error: recordingError } = await supabaseClient
      .from("recordings")
      .select("*")
      .eq("id", recording_id)
      .single();

    if (recordingError) {
      console.error("Error fetching recording:", recordingError);
      throw recordingError;
    }

    if (!recording.transcript) {
      throw new Error("Recording has no transcript");
    }

    console.log("Processing transcript:", recording.transcript);

    // Call OpenAI API to analyze transcript
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a construction project assistant. Analyze the transcript and generate:
              1. A list of tasks that need to be done
              2. A list of materials needed with quantities
              3. A project offer including a summary and total price estimate (must be a positive number)
              
              Return ONLY a valid JSON object with this exact structure, nothing else:
              {
                "tasks": [{ "title": string, "description": string, "assignee": Assignee }],
                "materials": [{ "title": string, "description": string, "amount": number }],
                "offer": { "title": string, "summary": string, "progress_plan": string, "total_price": number }
              }

              type Assignee = "Tømrer" | "Rørlegger" | "Elektriker" | "Riv";
              
              Make sure total_price is a positive number greater than 0.
              
              Make sure to generate the text in Norwegian, and use the provided transcript as context.`,
            },
            { role: "user", content: recording.transcript },
          ],
        }),
      }
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", openAIResponse.status, errorText);

      // Check for specific error types
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.code === "insufficient_quota") {
        throw new Error(
          "OpenAI API quota exceeded. Please check your billing details or try again later."
        );
      }

      throw new Error(
        `OpenAI API error: ${openAIResponse.status} - ${errorText}`
      );
    }

    const aiResult = await openAIResponse.json();
    console.log("Raw AI response:", aiResult.choices[0].message.content);

    // Ensure we're parsing valid JSON
    let analysis;
    try {
      analysis = JSON.parse(aiResult.choices[0].message.content.trim());
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error(
        "Invalid JSON content:",
        aiResult.choices[0].message.content
      );
      throw new Error("Failed to parse AI response as JSON");
    }

    console.log("Parsed AI Analysis:", analysis);

    // Validate the analysis structure and data types
    if (!analysis.tasks || !analysis.materials || !analysis.offer) {
      throw new Error("AI response missing required fields");
    }

    // Validate offer total_price
    if (
      !analysis.offer.total_price ||
      typeof analysis.offer.total_price !== "number" ||
      analysis.offer.total_price <= 0
    ) {
      console.error("Invalid total_price:", analysis.offer.total_price);
      throw new Error("Offer total_price must be a positive number");
    }

    // Start a transaction to insert all the data
    const { error: transactionError } = await supabaseClient.rpc(
      "process_recording_results",
      {
        p_recording_id: recording_id,
        p_project_id: recording.project_id,
        p_tasks: analysis.tasks,
        p_materials: analysis.materials,
        p_offer: analysis.offer,
      }
    );

    if (transactionError) {
      console.error("Transaction error:", transactionError);
      throw transactionError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
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
