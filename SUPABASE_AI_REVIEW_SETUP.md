# Supabase AI Review Setup

This project now supports server-side AI review through a Supabase Edge Function named `ai-review`.
It also includes a lightweight health function named `ai-review-status`.

## What changed

- The frontend calls `supabase.functions.invoke("ai-review")` when Supabase is configured.
- Gemini API access moves to Supabase secrets instead of the browser.
- The browser-side Gemini key field is only used as a fallback when Supabase is not configured.

## Files added or updated

- `supabase/functions/ai-review/index.ts`
- `supabase/functions/ai-review-status/index.ts`
- `supabase/migrations/001_setup_schema.sql`
- `src/App.tsx`

## 1) Run the SQL policy fix

If you have already created the tables, run this in the Supabase SQL Editor:

```sql
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
```

If you are setting up from scratch, run the migration file:

- `supabase/migrations/001_setup_schema.sql`

## 2) Set the Gemini secret in Supabase

In Supabase Dashboard:

1. Open your project
2. Go to Edge Functions
3. Open Secrets
4. Add this secret:

```text
GEMINI_API_KEY=your_real_gemini_api_key
```

## 3) Deploy the Edge Function

### Option A: Supabase CLI

Run these commands manually from the project root:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy ai-review-status
supabase functions deploy ai-review
```

### Option B: Dashboard upload flow

If you prefer the Dashboard, create Edge Functions named `ai-review-status` and `ai-review` and paste the contents of:

- `supabase/functions/ai-review-status/index.ts`
- `supabase/functions/ai-review/index.ts`

## 4) Confirm frontend environment variables

Your local `.env.local` should include:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

You do not need `VITE_GEMINI_API_KEY` for Supabase backend mode.

## 5) Authentication expectation

The Edge Function requires a valid logged-in Supabase user.

That means:

- magic link login must complete successfully
- the browser must have a valid Supabase session
- the `profiles` insert policy must exist for first-time users

## 6) Manual test flow

1. Start the app locally
2. Sign in with Supabase magic link
3. Confirm the UI shows `Backend Mode` in the AI Review Service box
4. Write a submission longer than 25 characters
5. Click `Get AI Review`

Expected result:

- the app calls the `ai-review` Edge Function
- Supabase verifies the user session
- Gemini runs on the server
- the review is stored in `submissions`

## 7) If it fails

Check these areas:

- **401 Unauthorized**
  - user is not logged in
  - expired or missing Supabase session

- **500 GEMINI_API_KEY secret is not configured**
  - add the secret in Supabase Edge Function secrets

- **429 rate limit**
  - the Gemini key has exhausted quota

- **Profile insert fails**
  - run the missing `profiles` insert policy SQL

## 8) Optional health test

After deployment, you can test the backend health first:

```text
https://your-project-ref.supabase.co/functions/v1/ai-review-status
```

Expected JSON:

```json
{
  "ok": true,
  "function": "ai-review-status",
  "geminiConfigured": true,
  "timestamp": "2026-06-11T00:00:00.000Z"
}
```

Then test the full flow from the app by submitting a real answer.
