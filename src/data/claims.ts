import type { Claim } from "./types";

export const SEED_CLAIMS: Claim[] = [
  {
    doc_id: "D1",
    topic_param: "indexation.rate",
    scope: "BE-CP200",
    value: "2.0%",
    quote: "The indexation rate applicable from 1 January 2026 is 2.0%.",
  },
  {
    doc_id: "D2",
    topic_param: "indexation.rate",
    scope: "BE-CP200",
    value: "1.6%",
    quote: "For employees under CP 200, the indexation rate is 1.6%.",
  },
  {
    doc_id: "D3",
    topic_param: "dimona.deadline",
    scope: "BE",
    value: "before_start",
    quote: "The Dimona declaration must be submitted before the worker starts.",
  },
  {
    doc_id: "D3",
    topic_param: "meal_voucher.employer_max",
    scope: "BE",
    value: "€7.00",
    quote:
      "Register the employee for meal vouchers; the maximum employer contribution is €7.00 per voucher.",
  },
  {
    doc_id: "D4",
    topic_param: "dimona.deadline",
    scope: "BE",
    value: "within_24h_after_start",
    quote: "The Dimona declaration can be submitted within 24 hours after the first working day.",
  },
  {
    doc_id: "D5",
    topic_param: "payroll_input.deadline",
    scope: "BE",
    value: "5th working day",
    quote:
      "Clients must send their monthly payroll inputs (hours, bonuses, absences, new hires and leavers) no later than the 5th working day of the month.",
  },
  {
    doc_id: "D6",
    topic_param: "payroll_input.deadline",
    scope: "BE",
    value: "3rd working day",
    quote:
      "Quick FYI team: from now on clients can send their payroll inputs until the 3rd working day of the month, not later.",
  },
  {
    doc_id: "D7",
    topic_param: "client_question.response_sla",
    scope: "BE",
    value: "4 business hours",
    quote: "Urgent client questions must receive a first answer within 4 business hours.",
  },
  {
    doc_id: "D8",
    topic_param: "client_question.response_sla",
    scope: "BE",
    value: "24 hours",
    quote:
      "Our commitment is to answer every client question, including urgent ones, within 24 hours.",
  },
  {
    doc_id: "D9",
    topic_param: "holiday_allowance.rate",
    scope: "NL",
    value: "8%",
    quote:
      "In the Netherlands, employees receive a holiday allowance of 8% of their gross annual salary.",
  },
  {
    doc_id: "D9",
    topic_param: "holiday_allowance.payment_month",
    scope: "NL",
    value: "May",
    quote: "It is usually paid in May.",
  },
  {
    doc_id: "D10",
    topic_param: "meal_voucher.employer_max",
    scope: "BE",
    value: "€6.50",
    quote: "The maximum employer contribution is €6.50 per voucher.",
  },
  {
    doc_id: "D11",
    topic_param: "payslip_archive.retention",
    scope: "BE",
    value: "5 years",
    quote: "Payslips must be archived for 5 years after the end of employment.",
  },
  {
    doc_id: "D12",
    topic_param: "indexation.rate",
    scope: "BE-CP200",
    value: "2.0%",
    quote: "Check that the January indexation of 2.0% has been applied for CP 200 employees.",
  },
  {
    doc_id: "D12",
    topic_param: "payslip_archive.retention",
    scope: "BE",
    value: "3 years",
    quote:
      "Verify that all payslips of the year are archived; payslips must be kept for 3 years.",
  },
];
