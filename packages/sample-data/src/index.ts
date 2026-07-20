import { candidateProfileSchema } from "@applyproof/shared-types";

export const mayaProfile = candidateProfileSchema.parse({
  id: "maya-chen-demo",
  displayName: "Maya Chen",
  identity: {
    firstName: "Maya",
    lastName: "Chen",
    email: "maya.chen@example.com",
    phone: "+1 604 555 0142",
    location: "Vancouver, BC",
  },
  links: {
    portfolio: "https://github.com/mayachen-demo",
    linkedin: "https://www.linkedin.com/in/mayachen-demo",
  },
  education: [
    {
      id: "education-ubc",
      school: "University of British Columbia",
      degree: "BSc in Computer Science",
      startDate: "2022-09-01",
      graduationDate: "2026-05-15",
    },
  ],
  experience: [
    {
      id: "experience-coop",
      company: "Harbour Systems",
      title: "Software Engineering Co-op",
      location: "Vancouver, BC",
      startDate: "2025-05-01",
      endDate: "2025-08-31",
      description:
        "Shipped tested product improvements during a software engineering co-op.",
    },
  ],
  availability: {
    startDate: "2026-08-03",
    relocation: "yes",
  },
  workAuthorization: {
    canada: { authorized: "yes", sponsorship: "no" },
  },
  demographics: {
    genderIdentity: "woman",
    raceEthnicity: "asian",
    disabilityStatus: "no",
    lgbtqIdentity: "decline",
    veteranStatus: "no",
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
