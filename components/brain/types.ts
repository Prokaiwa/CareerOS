/** Shared shapes passed from the server component into brain client components. */

export type Link = { label: string; url: string };

export type Profile = {
  id: number;
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: Link[];
  summary: string;
};

export type Goals = {
  id: number;
  targetRoles: string[];
  targetIndustries: string[];
  targetLocations: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  priorities: string;
  narrative: string;
};

export type Skill = {
  id: number;
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number | null;
  sortOrder: number;
};

export type Achievement = {
  id: number;
  experienceId: number | null;
  projectId: number | null;
  text: string;
  impactMetric: string;
  sortOrder: number;
  skillIds: number[];
};

export type Experience = {
  id: number;
  company: string;
  title: string;
  employmentType: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  sortOrder: number;
};

export type Project = {
  id: number;
  name: string;
  role: string;
  url: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
};

export type Education = {
  id: number;
  institution: string;
  degree: string;
  field: string;
  startDate: string | null;
  endDate: string | null;
  honors: string;
  sortOrder: number;
};

export type Certification = {
  id: number;
  name: string;
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
  credentialUrl: string;
  sortOrder: number;
};
