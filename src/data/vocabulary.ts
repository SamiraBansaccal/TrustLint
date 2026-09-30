export interface VocabularyEntry {
  topic_param: string;
  scope: string;
  format: string;
}

/** The only parameters TrustLint knows about. */
export const VOCABULARY: VocabularyEntry[] = [
  { topic_param: "indexation.rate", scope: "BE-CP200", format: 'percentage, e.g. "2.0%"' },
  { topic_param: "meal_voucher.employer_max", scope: "BE", format: 'euro amount, e.g. "€7.00"' },
  {
    topic_param: "dimona.deadline",
    scope: "BE",
    format: 'one of "before_start", "within_24h_after_start", "other"',
  },
  {
    topic_param: "payroll_input.deadline",
    scope: "BE",
    format: 'ordinal working day, e.g. "5th working day"',
  },
  {
    topic_param: "client_question.response_sla",
    scope: "BE",
    format: 'duration, e.g. "4 business hours" or "24 hours"',
  },
  { topic_param: "payslip_archive.retention", scope: "BE", format: 'duration, e.g. "5 years"' },
  { topic_param: "holiday_allowance.rate", scope: "NL", format: 'percentage, e.g. "8%"' },
  {
    topic_param: "holiday_allowance.payment_month",
    scope: "NL",
    format: 'month name, e.g. "May"',
  },
];

export const ALLOWED_TOPIC_PARAMS = VOCABULARY.map((v) => v.topic_param);

export const SCOPE_BY_TOPIC_PARAM: Record<string, string> = Object.fromEntries(
  VOCABULARY.map((v) => [v.topic_param, v.scope]),
);

export const VOCABULARY_PROMPT_LIST = VOCABULARY.map(
  (v) => `- ${v.topic_param} | scope: ${v.scope} | value format: ${v.format}`,
).join("\n");
