import fs from "node:fs";
import path from "node:path";
import { db, tables } from "@/lib/db";
import { config } from "@/lib/config";

/**
 * Full data export: JSON snapshot of every table + a human-readable Markdown
 * Career Brain summary. Lives in lib/ (not the script) so a desktop build
 * can expose it through the UI — `scripts/export.ts` is a thin CLI wrapper.
 *
 * When you add a table to the schema, add it here.
 */
export type ExportResult = { jsonPath: string; mdPath: string };

export function exportAll(): ExportResult {
  const dateStr = new Date().toISOString().split("T")[0];
  const exportsDir = path.join(config.paths.storage, "exports");
  fs.mkdirSync(exportsDir, { recursive: true });

  const profile = db.select().from(tables.profile).all();
  const experiences = db.select().from(tables.experiences).all();
  const projects = db.select().from(tables.projects).all();
  const achievements = db.select().from(tables.achievements).all();
  const education = db.select().from(tables.education).all();
  const skills = db.select().from(tables.skills).all();
  const achievementSkills = db.select().from(tables.achievementSkills).all();
  const certifications = db.select().from(tables.certifications).all();
  const careerGoals = db.select().from(tables.careerGoals).all();
  const companies = db.select().from(tables.companies).all();
  const jobs = db.select().from(tables.jobs).all();
  const jobStageEvents = db.select().from(tables.jobStageEvents).all();
  const contacts = db.select().from(tables.contacts).all();
  const interactions = db.select().from(tables.interactions).all();
  const interviews = db.select().from(tables.interviews).all();
  const applicationAnswers = db.select().from(tables.applicationAnswers).all();
  const resumeVersions = db.select().from(tables.resumeVersions).all();
  const coverLetterVersions = db.select().from(tables.coverLetterVersions).all();
  const brainSuggestions = db.select().from(tables.brainSuggestions).all();
  const coachConversations = db.select().from(tables.coachConversations).all();
  const coachMessages = db.select().from(tables.coachMessages).all();
  const aiGenerations = db.select().from(tables.aiGenerations).all();
  const settings = db.select().from(tables.settings).all();

  const exportData = {
    exportedAt: new Date().toISOString(),
    tables: {
      profile,
      experiences,
      projects,
      achievements,
      education,
      skills,
      achievementSkills,
      certifications,
      careerGoals,
      companies,
      jobs,
      jobStageEvents,
      contacts,
      interactions,
      interviews,
      applicationAnswers,
      resumeVersions,
      coverLetterVersions,
      brainSuggestions,
      coachConversations,
      coachMessages,
      aiGenerations,
      settings,
    },
  };

  const jsonPath = path.join(exportsDir, `careeros-export-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));

  /* ---- human-readable Career Brain summary ---- */
  let md = "";

  if (profile.length > 0) {
    const p = profile[0];
    md += `# ${p.fullName}\n\n`;
    md += `**${p.headline}**\n\n`;
    if (p.location) md += `📍 ${p.location}\n`;
    if (p.email) md += `📧 ${p.email}\n`;
    if (p.phone) md += `📱 ${p.phone}\n`;
    if (p.links && Array.isArray(p.links) && p.links.length > 0) {
      md += `\n**Links:**\n`;
      for (const link of p.links) {
        md += `- [${link.label}](${link.url})\n`;
      }
    }
    if (p.summary) {
      md += `\n**Summary:**\n\n${p.summary}\n`;
    }
  }

  if (experiences.length > 0) {
    md += `\n## Experience\n\n`;
    for (const exp of experiences) {
      const dateRange =
        exp.startDate && exp.endDate
          ? `${exp.startDate} – ${exp.endDate}`
          : exp.startDate
            ? `${exp.startDate} – Present`
            : "Dates unknown";
      md += `### ${exp.title}\n`;
      md += `**${exp.company}** • ${exp.location} • ${dateRange}\n\n`;
      if (exp.description) md += `${exp.description}\n\n`;

      const expAchievements = achievements.filter((a) => a.experienceId === exp.id);
      if (expAchievements.length > 0) {
        for (const ach of expAchievements) {
          let bullet = `- ${ach.text}`;
          if (ach.impactMetric) bullet += ` _(${ach.impactMetric})_`;
          md += bullet + "\n";
        }
        md += "\n";
      }
    }
  }

  if (projects.length > 0) {
    md += `## Projects\n\n`;
    for (const proj of projects) {
      const dateRange =
        proj.startDate && proj.endDate
          ? `${proj.startDate} – ${proj.endDate}`
          : proj.startDate
            ? `${proj.startDate} – Present`
            : "Dates unknown";
      md += `### ${proj.name}\n`;
      md += `**${proj.role}** • ${dateRange}\n`;
      if (proj.url) md += `[${proj.url}](${proj.url})\n`;
      if (proj.description) md += `\n${proj.description}\n\n`;

      const projAchievements = achievements.filter((a) => a.projectId === proj.id);
      if (projAchievements.length > 0) {
        for (const ach of projAchievements) {
          let bullet = `- ${ach.text}`;
          if (ach.impactMetric) bullet += ` _(${ach.impactMetric})_`;
          md += bullet + "\n";
        }
        md += "\n";
      }
    }
  }

  if (education.length > 0) {
    md += `## Education\n\n`;
    for (const edu of education) {
      const degree = edu.degree || "Degree";
      const field = edu.field ? ` in ${edu.field}` : "";
      const dateRange =
        edu.startDate && edu.endDate
          ? `${edu.startDate} – ${edu.endDate}`
          : edu.endDate
            ? `Completed ${edu.endDate}`
            : "Dates unknown";
      md += `**${degree}${field}** • ${edu.institution}\n`;
      md += `${dateRange}`;
      if (edu.honors) md += ` • ${edu.honors}`;
      md += "\n\n";
    }
  }

  if (skills.length > 0) {
    md += `## Skills\n\n`;
    const byCategory = new Map<string, typeof skills>();
    for (const skill of skills) {
      const cat = skill.category || "General";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(skill);
    }

    for (const [cat, catSkills] of byCategory) {
      md += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
      for (const skill of catSkills) {
        const stars = "★".repeat(skill.proficiency) + "☆".repeat(5 - skill.proficiency);
        md += `- **${skill.name}** ${stars}`;
        if (skill.yearsOfExperience) md += ` (${skill.yearsOfExperience}y)`;
        md += "\n";
      }
      md += "\n";
    }
  }

  if (certifications.length > 0) {
    md += `## Certifications\n\n`;
    for (const cert of certifications) {
      md += `- **${cert.name}** • ${cert.issuer}`;
      if (cert.issueDate) md += ` • Issued ${cert.issueDate}`;
      if (cert.expiryDate) md += ` (Expires ${cert.expiryDate})`;
      md += "\n";
    }
    md += "\n";
  }

  if (careerGoals.length > 0) {
    const goals = careerGoals[0];
    md += `## Career Goals\n\n`;
    if (goals.targetRoles && goals.targetRoles.length > 0) {
      md += `**Target Roles:** ${goals.targetRoles.join(", ")}\n`;
    }
    if (goals.targetIndustries && goals.targetIndustries.length > 0) {
      md += `**Target Industries:** ${goals.targetIndustries.join(", ")}\n`;
    }
    if (goals.targetLocations && goals.targetLocations.length > 0) {
      md += `**Target Locations:** ${goals.targetLocations.join(", ")}\n`;
    }
    if (goals.salaryMin || goals.salaryMax) {
      const min = goals.salaryMin ? `$${goals.salaryMin.toLocaleString()}` : "—";
      const max = goals.salaryMax ? `$${goals.salaryMax.toLocaleString()}` : "—";
      md += `**Salary Range:** ${min} – ${max}\n`;
    }
    if (goals.priorities) md += `**Priorities:** ${goals.priorities}\n`;
    if (goals.narrative) md += `\n${goals.narrative}\n`;
  }

  const mdPath = path.join(exportsDir, `careeros-brain-${dateStr}.md`);
  fs.writeFileSync(mdPath, md);

  return { jsonPath, mdPath };
}
