

## Problem Analysis

The edge function logs reveal the **deployed version is outdated** — it still uses the old prompt text (`"Use the URL as the instagram_url..."`) and lacks the content-fallback parsing added in the latest diff. The 422 error occurs because:

1. **Firecrawl can't scrape LinkedIn** (blocked site) → falls back to AI-only mode
2. **Gemini 2.5 Flash ignores `tool_choice`** when given no scraped content — it returns conversational text instead of calling the tool function
3. **The old deployed code has no fallback** for when the model returns content instead of a tool call → immediate 422

Even after redeployment, the current code has a reliability issue: Gemini models sometimes ignore forced `tool_choice` and return text asking for clarification instead.

## Plan

### 1. Fix the system prompt to be more forceful (ai-populate-profile/index.ts)

Update the expert system prompt to explicitly instruct: "You MUST call the function. Do not ask clarifying questions. Fill in all fields with your best guesses."

### 2. Change model fallback order

Put `openai/gpt-5-mini` first in the models array — OpenAI models are significantly more reliable with `tool_choice` enforcement. Keep Gemini as fallback.

```text
Current:  ["google/gemini-2.5-flash", "openai/gpt-5-mini", "google/gemini-2.5-flash-lite"]
Proposed: ["openai/gpt-5-mini", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"]
```

### 3. Redeploy the edge function

Use the deploy tool to push the updated code so the latest version (with content fallback + forced tool_choice + improved prompt) is live.

### 4. Test the function

Invoke the edge function with the same test data (Bryan Dunn + LinkedIn URL) and verify it returns extracted profile data instead of 422.

### Files Modified
- `supabase/functions/ai-populate-profile/index.ts` — prompt update + model order change

