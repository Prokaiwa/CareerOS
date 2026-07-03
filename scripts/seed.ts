/**
 * Seed demo data for a fresh CareerOS install.
 *
 * Inserts a complete sample career brain: profile, experiences with achievements,
 * skills, education, goals, companies, job pipeline with stage history, and contacts.
 *
 * Idempotent: if the database already has data, skips (delete data/careeros.db to reseed).
 */

import { db, tables } from "../lib/db";

async function main() {
  // Check if database already has data.
  const existingJobs = db
    .select()
    .from(tables.jobs)
    .limit(1)
    .all();
  const existingExperiences = db
    .select()
    .from(tables.experiences)
    .limit(1)
    .all();

  if (existingJobs.length > 0 || existingExperiences.length > 0) {
    console.log(
      "Database already has data — skipping seed (delete data/careeros.db to reseed)."
    );
    process.exit(0);
  }

  const now = new Date();
  const counts = {
    profile: 0,
    experiences: 0,
    achievements: 0,
    projects: 0,
    skills: 0,
    education: 0,
    certifications: 0,
    careerGoals: 0,
    companies: 0,
    jobs: 0,
    jobStageEvents: 0,
    contacts: 0,
    interactions: 0,
  };

  // Profile (singleton, id=1)
  db.insert(tables.profile)
    .values({
      id: 1,
      fullName: "Ada Example",
      headline: "Senior Software Engineer",
      email: "ada@example.com",
      phone: "+1-555-0100",
      location: "San Francisco, CA",
      links: [
        { label: "GitHub", url: "https://github.com/example" },
        { label: "LinkedIn", url: "https://linkedin.com/in/example" },
      ],
      summary:
        "Full-stack engineer passionate about scalable systems and developer experience. 8+ years building high-performance distributed systems and leading platform teams.",
      updatedAt: now,
    })
    .run();
  counts.profile += 1;

  // Experiences
  const exp1 = db
    .insert(tables.experiences)
    .values({
      company: "TechCorp Inc.",
      title: "Senior Software Engineer",
      employmentType: "full_time",
      location: "San Francisco, CA",
      startDate: "2022-01-01",
      endDate: null, // Current position
      description:
        "Leading infrastructure and developer tools initiatives on the platform team.",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.experiences.id })
    .get();

  const exp2 = db
    .insert(tables.experiences)
    .values({
      company: "StartupXYZ",
      title: "Backend Engineer",
      employmentType: "full_time",
      location: "Remote",
      startDate: "2020-03-15",
      endDate: "2022-01-01",
      description:
        "Built and scaled backend APIs for mobile and web applications serving 2M+ users.",
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.experiences.id })
    .get();

  counts.experiences += 2;

  // Achievements for current experience
  const ach1_1 = db
    .insert(tables.achievements)
    .values({
      experienceId: exp1.id,
      text: "Redesigned core API gateway architecture using gRPC, reducing latency and enabling 5x throughput increase",
      impactMetric: "35% latency reduction, 5x throughput",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.achievements.id })
    .get();

  const ach1_2 = db
    .insert(tables.achievements)
    .values({
      experienceId: exp1.id,
      text: "Launched internal platform for distributed trace collection, reducing MTTR by 60%",
      impactMetric: "60% MTTR reduction",
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.achievements.id })
    .get();

  const ach1_3 = db
    .insert(tables.achievements)
    .values({
      experienceId: exp1.id,
      text: "Mentored 3 junior engineers to senior promotion within 18 months",
      impactMetric: "3 promotions",
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.achievements.id })
    .get();

  counts.achievements += 3;

  // Achievements for previous experience
  const ach2_1 = db
    .insert(tables.achievements)
    .values({
      experienceId: exp2.id,
      text: "Built real-time notification service handling 50K+ events/second with 99.99% uptime",
      impactMetric: "50K events/sec, 99.99% uptime",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.achievements.id })
    .get();

  const ach2_2 = db
    .insert(tables.achievements)
    .values({
      experienceId: exp2.id,
      text: "Implemented comprehensive database sharding strategy, reducing query times from 500ms to 50ms",
      impactMetric: "10x query time reduction",
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.achievements.id })
    .get();

  const ach2_3 = db
    .insert(tables.achievements)
    .values({
      experienceId: exp2.id,
      text: "Led migration of legacy monolith to microservices, enabling 20% feature velocity increase",
      impactMetric: "20% velocity increase",
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.achievements.id })
    .get();

  counts.achievements += 3;

  // Project
  const proj1 = db
    .insert(tables.projects)
    .values({
      name: "Open Source: DistribuDB",
      role: "Creator & Maintainer",
      url: "https://github.com/example/distribudb",
      description:
        "Distributed database library for Node.js with automatic failover and replication.",
      startDate: "2019-06-01",
      endDate: null,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.projects.id })
    .get();

  const projAch1 = db
    .insert(tables.achievements)
    .values({
      projectId: proj1.id,
      text: "Grew to 3K+ GitHub stars and 50+ external contributors",
      impactMetric: "3K stars",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.achievements.id })
    .get();

  const projAch2 = db
    .insert(tables.achievements)
    .values({
      projectId: proj1.id,
      text: "Published in 5 international tech conferences, establishing thought leadership",
      impactMetric: "5 talks",
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.achievements.id })
    .get();

  counts.projects += 1;
  counts.achievements += 2;

  // Skills
  const skills = [
    { name: "TypeScript", category: "languages", proficiency: 5 },
    { name: "Node.js", category: "frameworks", proficiency: 5 },
    { name: "PostgreSQL", category: "frameworks", proficiency: 4 },
    { name: "Kubernetes", category: "practices", proficiency: 4 },
    { name: "System Design", category: "practices", proficiency: 4 },
    { name: "Python", category: "languages", proficiency: 3 },
    { name: "gRPC", category: "frameworks", proficiency: 4 },
    { name: "Distributed Systems", category: "practices", proficiency: 5 },
  ];

  const skillIds: { [key: string]: number } = {};
  for (const skill of skills) {
    const inserted = db
      .insert(tables.skills)
      .values({
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency,
        yearsOfExperience: 5,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: tables.skills.id })
      .get();
    skillIds[skill.name] = inserted.id;
    counts.skills += 1;
  }

  // Link achievements to skills
  db.insert(tables.achievementSkills)
    .values([
      { achievementId: ach1_1.id, skillId: skillIds["TypeScript"] },
      { achievementId: ach1_1.id, skillId: skillIds["gRPC"] },
      { achievementId: ach1_2.id, skillId: skillIds["System Design"] },
      { achievementId: ach1_2.id, skillId: skillIds["Distributed Systems"] },
      { achievementId: ach2_1.id, skillId: skillIds["Node.js"] },
      { achievementId: ach2_2.id, skillId: skillIds["PostgreSQL"] },
      { achievementId: ach2_2.id, skillId: skillIds["System Design"] },
      { achievementId: ach2_3.id, skillId: skillIds["Kubernetes"] },
      { achievementId: projAch1.id, skillId: skillIds["Distributed Systems"] },
      { achievementId: projAch2.id, skillId: skillIds["System Design"] },
    ])
    .run();

  // Education
  db.insert(tables.education)
    .values({
      institution: "State University",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2012-09-01",
      endDate: "2016-05-15",
      honors: "Summa Cum Laude",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  counts.education += 1;

  // Certification
  db.insert(tables.certifications)
    .values({
      name: "Certified Kubernetes Administrator (CKA)",
      issuer: "Linux Foundation",
      issueDate: "2022-03-10",
      expiryDate: "2025-03-10",
      credentialUrl: "https://example.com/cka-cert",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  counts.certifications += 1;

  // Career Goals (singleton, id=1)
  db.insert(tables.careerGoals)
    .values({
      id: 1,
      targetRoles: [
        "Staff Engineer",
        "VP of Engineering",
        "Founding CTO",
      ],
      targetIndustries: ["FinTech", "Developer Tools", "Infrastructure"],
      targetLocations: ["San Francisco", "Remote", "New York"],
      salaryMin: 250000,
      salaryMax: 500000,
      priorities:
        "Impact on product direction, team leadership, technical depth",
      narrative:
        "Seeking leadership roles at high-growth companies building distributed systems and developer tools where I can drive technical vision and mentor the next generation.",
      updatedAt: now,
    })
    .run();
  counts.careerGoals += 1;

  // Companies
  const comp1 = db
    .insert(tables.companies)
    .values({
      name: "Acme Corp",
      website: "https://acmecorp.example.com",
      industry: "FinTech",
      location: "San Francisco, CA",
      notes: "Series B, 150 employees, strong engineering culture",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.companies.id })
    .get();

  const comp2 = db
    .insert(tables.companies)
    .values({
      name: "DevTools Inc.",
      website: "https://devtools-inc.example.com",
      industry: "Developer Tools",
      location: "Remote",
      notes: "Seed stage, 12 employees, strong founder pedigree",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.companies.id })
    .get();

  counts.companies += 2;

  // Jobs
  const appliedDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const appliedDateStr = appliedDate.toISOString().split("T")[0];

  const job1 = db
    .insert(tables.jobs)
    .values({
      companyId: comp1.id,
      title: "Principal Engineer",
      url: "https://acmecorp.example.com/jobs/principal",
      description:
        "We're looking for a Principal Engineer to lead our infrastructure platform. Must have strong TypeScript and Kubernetes expertise.",
      location: "San Francisco, CA",
      salary: "$300K - $450K",
      source: "linkedin",
      status: "saved",
      notes: "Interesting company, expanding engineering org",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.jobs.id })
    .get();

  db.insert(tables.jobStageEvents)
    .values({
      jobId: job1.id,
      fromStatus: null,
      toStatus: "saved",
      occurredAt: now,
    })
    .run();
  counts.jobStageEvents += 1;

  const job2 = db
    .insert(tables.jobs)
    .values({
      companyId: comp2.id,
      title: "Founding Engineer",
      url: "https://devtools-inc.example.com/jobs/founding",
      description:
        "Early stage opportunity to build a distributed systems debugging platform. Founder has 15 years at Google.",
      location: "Remote",
      salary: "$200K + equity",
      source: "referral",
      status: "applied",
      appliedAt: appliedDateStr,
      notes: "Great founders, high upside potential",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.jobs.id })
    .get();

  db.insert(tables.jobStageEvents)
    .values({
      jobId: job2.id,
      fromStatus: null,
      toStatus: "applied",
      occurredAt: now,
    })
    .run();
  counts.jobStageEvents += 1;

  const job3 = db
    .insert(tables.jobs)
    .values({
      companyId: comp1.id,
      title: "Staff Backend Engineer",
      url: "https://acmecorp.example.com/jobs/staff",
      description:
        "Build the financial transaction processing system. Experience with PostgreSQL, gRPC, and Kubernetes required.",
      location: "San Francisco, CA",
      salary: "$280K - $420K",
      source: "extension",
      status: "interviewing",
      appliedAt: appliedDateStr,
      notes: "Phone screen passed, onsite scheduled for next week",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.jobs.id })
    .get();

  db.insert(tables.jobStageEvents)
    .values({
      jobId: job3.id,
      fromStatus: null,
      toStatus: "interviewing",
      occurredAt: now,
    })
    .run();
  counts.jobStageEvents += 1;

  counts.jobs += 3;

  // Contacts
  const contact1 = db
    .insert(tables.contacts)
    .values({
      name: "Sarah Chen",
      companyId: comp2.id,
      email: "sarah@devtools-inc.example.com",
      phone: "+1-555-0101",
      role: "VP of Engineering",
      linkedinUrl: "https://linkedin.com/in/sarahchen",
      notes: "Met at React conf 2024, discussed company direction",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.contacts.id })
    .get();

  const contact2 = db
    .insert(tables.contacts)
    .values({
      name: "James Wilson",
      email: "james.wilson@example.com",
      phone: "",
      role: "Engineering Manager",
      linkedinUrl: "https://linkedin.com/in/jameswilson",
      notes: "Former colleague at StartupXYZ, now at Big Tech",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tables.contacts.id })
    .get();

  counts.contacts += 2;

  // Interaction with follow-up
  const followUpDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const followUpDateStr = followUpDate.toISOString().split("T")[0];

  db.insert(tables.interactions)
    .values({
      contactId: contact1.id,
      jobId: job2.id,
      type: "coffee",
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      notes: "Discussed open roles and product roadmap",
      followUpAt: followUpDateStr,
      createdAt: now,
    })
    .run();
  counts.interactions += 1;

  // Print summary
  console.log("\n✓ Database seeded successfully!");
  console.log("\nInserted:");
  Object.entries(counts).forEach(([key, count]) => {
    if (count > 0) console.log(`  ${key}: ${count}`);
  });
  console.log("\nNext steps:");
  console.log("  npm run dev           — Start the app");
  console.log("  npm run export        — Export your data");
  console.log("  npm run backup        — Backup your data");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
