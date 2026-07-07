import type { SiteProfile } from "./types";

/**
 * Built-in site profiles: field-selector hints for the ATSes CareerOS
 * users hit most. AutofillProviders try these selectors first and fall
 * back to alias matching from the FieldMap. Extend by appending — future
 * plugins may contribute additional profiles (see docs/MASTER_ARCHITECTURE.md).
 */
export const SITE_PROFILES: SiteProfile[] = [
  {
    id: "greenhouse",
    hostPatterns: ["boards.greenhouse.io", "job-boards.greenhouse.io"],
    fieldSelectors: {
      first_name: "#first_name",
      last_name: "#last_name",
      email: "#email",
      phone: "#phone",
    },
    questionBlockSelector: ".application--questions, #custom_fields",
  },
  {
    id: "lever",
    hostPatterns: ["jobs.lever.co"],
    fieldSelectors: {
      full_name: "input[name='name']",
      email: "input[name='email']",
      phone: "input[name='phone']",
      current_company: "input[name='org']",
    },
    questionBlockSelector: ".application-question",
  },
  {
    id: "ashby",
    hostPatterns: ["jobs.ashbyhq.com"],
    notes: "Heavy client-side rendering; rely on alias matching.",
  },
  {
    id: "workday",
    hostPatterns: ["myworkdayjobs.com"],
    notes: "Multi-step wizard; fill per step, alias matching with data-automation-id attributes.",
  },
  {
    id: "linkedin-easy-apply",
    hostPatterns: ["www.linkedin.com"],
    notes: "Modal wizard; most fields prefilled by LinkedIn — focus on screening questions.",
  },
];
