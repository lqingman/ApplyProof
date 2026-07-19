import { candidateProfileSchema } from "@applyproof/shared-types";

export const mayaProfile = candidateProfileSchema.parse({
  id: "maya-chen-demo",
  displayName: "Maya Chen",
  headline: "New-grad software engineer · Vancouver, BC",
  identity: {
    firstName: "Maya",
    lastName: "Chen",
    email: "maya.chen@example.com",
    phone: "+1 604 555 0142",
    location: "Vancouver, BC",
  },
  links: {
    portfolio: "https://github.com/mayachen-demo",
  },
  education: {
    school: "University of British Columbia",
    degree: "BSc in Computer Science",
    graduationDate: "2026-05-15",
  },
  availability: {
    startDate: "2026-08-03",
    relocation: "yes",
  },
  evidence: [
    {
      id: "education-ubc",
      category: "education",
      text: "Bachelor of Science in Computer Science, graduating May 2026.",
      source: "Demo resume · Education",
    },
    {
      id: "project-campus-map",
      category: "project",
      text: "Built an accessible campus navigation app with React, TypeScript, and FastAPI.",
      source: "Demo resume · Projects",
    },
    {
      id: "experience-coop",
      category: "experience",
      text: "Shipped tested product improvements during a software engineering co-op.",
      source: "Demo resume · Experience",
    },
    {
      id: "skills-stack",
      category: "skill",
      text: "Uses TypeScript, React, Python, FastAPI, Git, and automated testing.",
      source: "Demo resume · Skills",
    },
    {
      id: "interest-accessible-products",
      category: "profile",
      text: "Interested in building accessible, user-focused software products.",
      source: "Demo profile · Interests",
    },
  ],
});
