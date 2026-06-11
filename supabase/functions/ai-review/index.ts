import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReviewRequest = {
  day?: number;
  title?: string;
  assignmentPrompt?: string;
  submissionText?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const stripCodeFence = (value: string) => {
  let cleaned = value.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "");
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
};

const getGeminiErrorMessage = (status: number, details?: string) => {
  switch (status) {
    case 400:
      return "Gemini rejected the request. Check the model name and request payload.";
    case 401:
    case 403:
      return "Gemini authentication failed. Check the GEMINI_API_KEY secret in Supabase.";
    case 429:
      return "Gemini rate limit was reached for the configured API key. Try again later or replace the key.";
    default:
      return details || `Gemini API returned status code ${status}.`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Supabase environment variables are missing." }, 500);
    }

    if (!geminiApiKey) {
      return json({ error: "GEMINI_API_KEY secret is not configured." }, 500);
    }

    if (!authHeader) {
      return json({ error: "Missing authorization header." }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized request." }, 401);
    }

    const body = (await req.json()) as ReviewRequest;
    const day = body.day;
    const title = body.title?.trim();
    const assignmentPrompt = body.assignmentPrompt?.trim();
    const submissionText = body.submissionText?.trim();

    if (
      typeof day !== "number" ||
      !title ||
      !assignmentPrompt ||
      !submissionText ||
      submissionText.length < 25
    ) {
      return json(
        {
          error:
            "Invalid request body. day, title, assignmentPrompt, and submissionText (25+ chars) are required.",
        },
        400,
      );
    }

    const prompt = `You are an expert Product Discovery Mentor helping a candidate prepare for Product Manager interviews.

## CONTEXT
- This is Day ${day} of a 21-Day Product Discovery Challenge
- Topic: ${title}
- Assignment: ${assignmentPrompt}
- User's Submission: ${submissionText}

## YOUR TASK
Act as a senior PM who conducts product interviews. Provide a comprehensive review that:
1. Identifies STRENGTHS in their answer (what they got right)
2. Identifies AREAS FOR IMPROVEMENT (what's missing or could be better)
3. Provides a SAMPLE EXCELLENT ANSWER they could use as a reference
4. Gives 2-3 SPECIFIC TIPS for interview success on this topic
5. Rates their PM thinking on a scale of 1-10

## IMPORTANT
- Be specific and constructive, not generic
- Connect your feedback to actual PM interview scenarios
- Use examples from top tech companies (Google, Amazon, Meta, Netflix, Airbnb, etc.)
- Focus on structured thinking, user-centricity, and business impact

## OUTPUT FORMAT (JSON only, no markdown)
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["improvement 1", "improvement 2", "improvement 3"],
  "sampleAnswer": "A detailed example excellent answer...",
  "interviewTips": ["tip 1", "tip 2", "tip 3"],
  "score": number (1-10),
  "overallFeedback": "A concise 2-3 sentence summary"
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return json(
        { error: getGeminiErrorMessage(geminiResponse.status, errorText) },
        geminiResponse.status,
      );
    }

    const geminiJson = await geminiResponse.json();
    const responseText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof responseText !== "string" || responseText.trim() === "") {
      return json({ error: "Gemini returned an empty response." }, 502);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(stripCodeFence(responseText));
    } catch (_error) {
      return json({ error: "Gemini returned invalid JSON." }, 502);
    }

    return json({
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : [],
      sampleAnswer: typeof parsed.sampleAnswer === "string" ? parsed.sampleAnswer : "",
      interviewTips: Array.isArray(parsed.interviewTips) ? parsed.interviewTips : [],
      score: Math.max(1, Math.min(10, Number(parsed.score) || 7)),
      overallFeedback:
        typeof parsed.overallFeedback === "string"
          ? parsed.overallFeedback
          : "Good effort! Keep practicing.",
      reviewerUserId: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return json({ error: message }, 500);
  }
});
