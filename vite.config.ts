import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const stripCodeFence = (value: string) => {
  let cleaned = value.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  return cleaned.trim();
};

const createOfflineReview = (day: number, title: string) => ({
  strengths: [
    'You identified that the product likely lacked enough differentiated value to sustain adoption.',
    'You attempted to explain failure in terms of missing inputs and product weakness.',
    'You gave a direct answer instead of avoiding the prompt.'
  ],
  areasForImprovement: [
    'Explain the user problem and why Google Plus did not solve it better than Facebook.',
    'Mention network effects, weak differentiation, and late market entry.',
    'Use a clearer structure: problem, users, competition, distribution, and outcome.'
  ],
  sampleAnswer: `Google Plus failed because it entered a market where Facebook already had strong network effects, and it did not offer enough differentiated value to pull users away. A strong product discovery lens would ask: what unmet user problem was Google Plus solving, for whom, and why would they switch? The product was tightly distributed through Google's ecosystem, but forced adoption is not the same as genuine user pull. In interviews, I would say the main failure was weak problem-solution fit combined with poor retention loops and limited unique value.`,
  interviewTips: [
    'Answer failure questions with a framework: market, user need, differentiation, and retention.',
    'Tie every point back to customer behavior, not just product features.',
    'Name one metric you would inspect, such as retention or active social graph growth.'
  ],
  score: 6,
  overallFeedback: `This is a reasonable starting point for Day ${day}: ${title}, but the answer needs more structure and stronger product reasoning to feel interview-ready.`,
  source: 'offline-fallback'
});

const createPrompt = (day: number, title: string, assignmentPrompt: string, submissionText: string) => `You are an expert Product Discovery Mentor helping a candidate prepare for Product Manager interviews.

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

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const geminiApiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-ai-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url) {
              next();
              return;
            }

            const sendJson = (status: number, payload: unknown) => {
              res.statusCode = status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            };

            if (req.method === 'GET' && req.url === '/api/status') {
              sendJson(200, {
                ok: true,
                mode: 'local-vite-api',
                geminiConfigured: geminiApiKey.trim().length > 0,
                keySource: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY ? 'VITE_GEMINI_API_KEY' : 'missing'
              });
              return;
            }

            if (req.method === 'POST' && req.url === '/api/ai-review') {
              let rawBody = '';
              req.on('data', (chunk) => {
                rawBody += chunk;
              });

              req.on('end', async () => {
                try {
                  const body = JSON.parse(rawBody || '{}') as {
                    day?: number;
                    title?: string;
                    assignmentPrompt?: string;
                    submissionText?: string;
                  };

                  const day = body.day;
                  const title = body.title?.trim() || 'Product Discovery Topic';
                  const assignmentPrompt = body.assignmentPrompt?.trim() || '';
                  const submissionText = body.submissionText?.trim() || '';

                  if (typeof day !== 'number' || !assignmentPrompt || submissionText.length < 25) {
                    sendJson(400, {
                      error: 'day, assignmentPrompt, and submissionText (25+ chars) are required.'
                    });
                    return;
                  }

                  if (!geminiApiKey) {
                    sendJson(200, createOfflineReview(day, title));
                    return;
                  }

                  const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        contents: [{ parts: [{ text: createPrompt(day, title, assignmentPrompt, submissionText) }] }],
                        generationConfig: {
                          responseMimeType: 'application/json',
                          temperature: 0.7,
                          maxOutputTokens: 2048
                        }
                      })
                    }
                  );

                  if (!response.ok) {
                    sendJson(200, {
                      ...createOfflineReview(day, title),
                      source: 'gemini-error-fallback',
                      backendError: `Gemini API returned status code ${response.status}.`
                    });
                    return;
                  }

                  const geminiJson = await response.json();
                  const responseText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  const parsed = JSON.parse(stripCodeFence(responseText));

                  sendJson(200, {
                    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                    areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : [],
                    sampleAnswer: typeof parsed.sampleAnswer === 'string' ? parsed.sampleAnswer : '',
                    interviewTips: Array.isArray(parsed.interviewTips) ? parsed.interviewTips : [],
                    score: Math.max(1, Math.min(10, Number(parsed.score) || 7)),
                    overallFeedback: typeof parsed.overallFeedback === 'string' ? parsed.overallFeedback : 'Good effort! Keep practicing.',
                    source: 'local-vite-api'
                  });
                } catch (error) {
                  sendJson(200, {
                    ...createOfflineReview(1, 'Product Discovery Topic'),
                    source: 'request-error-fallback',
                    backendError: error instanceof Error ? error.message : 'Unexpected local API error.'
                  });
                }
              });
              return;
            }

            next();
          });
        }
      }
    ],
    define: {
      // Inject environment variables from process.env (AI Studio Settings) so they are accessible on client-side
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
