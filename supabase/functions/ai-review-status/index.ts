import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((_req) => {
  return new Response(
    JSON.stringify({
      ok: true,
      function: "ai-review-status",
      geminiConfigured: Boolean(Deno.env.get("GEMINI_API_KEY")),
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
});
