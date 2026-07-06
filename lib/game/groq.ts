import "server-only";

// Optional: freshen word pairs with Groq. Best-effort — callers fall back to the
// static list in `words.ts` on any error or when GROQ_API_KEY is absent.

const KEY = process.env.GROQ_API_KEY;

export async function generateWordPair(
  avoid: string[] = [],
): Promise<readonly [string, string] | null> {
  if (!KEY) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 1.1,
        max_tokens: 60,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You generate word pairs for a drawing bluff game. Return JSON " +
              '{"crew":"WORD","imposter":"WORD"}. Both must be simple, concrete, ' +
              "easy-to-draw nouns that are RELATED but clearly different (so an " +
              "imposter given the second word could almost blend in). One or two " +
              "words each, Title Case.",
          },
          {
            role: "user",
            content: `Give one fresh pair. Avoid these crew words: ${avoid.join(", ") || "none"}.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    const crew = String(parsed.crew ?? "").trim();
    const imposter = String(parsed.imposter ?? "").trim();
    if (!crew || !imposter || crew.toLowerCase() === imposter.toLowerCase())
      return null;
    return [crew, imposter] as const;
  } catch {
    return null;
  }
}
