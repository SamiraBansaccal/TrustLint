import { extractResponseSchema, type ExtractResponse } from "@/lib/claim-schema";

/** Calls the extract-claims backend function and re-validates the response. */
export async function extractClaims(input: {
  title: string;
  content: string;
}): Promise<ExtractResponse> {
  const response = await fetch("/api/extract-claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: input.title.slice(0, 200), content: input.content.slice(0, 5000) }),
  });
  if (!response.ok) throw new Error("Extraction failed");
  return extractResponseSchema.parse(await response.json());
}
