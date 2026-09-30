import { z } from "zod";
import { ALLOWED_TOPIC_PARAMS, SCOPE_BY_TOPIC_PARAM } from "@/data/vocabulary";

export const extractRequestSchema = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(5000),
  })
  .strict();

export const extractedClaimSchema = z
  .object({
    topic_param: z.string().refine((v) => ALLOWED_TOPIC_PARAMS.includes(v), {
      message: "unknown topic_param",
    }),
    scope: z.string(),
    value: z.string().min(1).max(60),
    quote: z.string().min(1).max(400),
  })
  .refine((c) => SCOPE_BY_TOPIC_PARAM[c.topic_param] === c.scope, {
    message: "scope not allowed for this topic_param",
  });

export const extractResponseSchema = z.object({
  claims: z.array(extractedClaimSchema).max(30),
  dropped: z.number().int().min(0),
});

export type ExtractedClaim = z.infer<typeof extractedClaimSchema>;
export type ExtractResponse = z.infer<typeof extractResponseSchema>;

/** Collapse whitespace and normalise quote characters for verification. */
export function normalizeForQuoteMatch(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteIsVerbatim(quote: string, content: string): boolean {
  return normalizeForQuoteMatch(content).includes(normalizeForQuoteMatch(quote));
}
