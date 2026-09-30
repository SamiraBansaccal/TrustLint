import type { Person } from "./types";

export const PEOPLE: Person[] = [
  {
    id: "p1",
    name: "Anna Peeters",
    role: "Payroll Expert CP 200",
    status: "active",
    expertise: ["indexation", "meal_voucher"],
  },
  {
    id: "p2",
    name: "Karim El Amrani",
    role: "Payroll Consultant BE",
    status: "active",
    expertise: ["dimona", "payroll_input"],
  },
  {
    id: "p3",
    name: "Sofie Janssens",
    role: "Client Service Lead",
    status: "active",
    expertise: ["payroll_input", "client_question"],
  },
  {
    id: "p4",
    name: "Pieter De Smet",
    role: "Knowledge Manager",
    status: "active",
    expertise: ["payslip_archive"],
  },
  {
    id: "p5",
    name: "Lotte Vermeulen",
    role: "Payroll Consultant NL",
    status: "active",
    expertise: ["holiday_allowance"],
  },
  {
    id: "p6",
    name: "Marc Dubois",
    role: "Legal Advisor BE",
    status: "left",
    left_date: "2025-03-12",
    expertise: ["client_question"],
  },
  {
    id: "p7",
    name: "Julie Martin",
    role: "Onboarding Team Lead",
    status: "left",
    left_date: "2024-11-30",
    expertise: ["dimona"],
  },
];

/** Default fallback contact. */
export const FALLBACK_CONTACT_ID = "p4";
