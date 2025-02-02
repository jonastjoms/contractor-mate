import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log("Warming up Hugging Face endpoint...");

    const response = await fetch(
      "https://kelhfabjfneinfr9.us-east-1.aws.endpoints.huggingface.cloud",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${Deno.env.get("HUGGINGFACE_API_KEY")}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face warm-up failed:", response.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Hugging Face warm-up failed: ${response.status} - ${errorText}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("Hugging Face endpoint is ready.");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Hugging Face endpoint is ready",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Warm-up function error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});