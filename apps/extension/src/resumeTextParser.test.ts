import { describe, expect, it } from "vitest";

import { parseResumeText } from "./resumeTextParser";

describe("resume text parser", () => {
  it("extracts editable profile facts and evidence from resume text", () => {
    const result = parseResumeText(`
      Maya Chen
      New-grad Software Engineer
      Vancouver, BC | maya.chen@example.com | +1 604 555 0142
      github.com/mayachen-demo | linkedin.com/in/mayachen-demo

      EDUCATION
      University of British Columbia
      Bachelor of Science in Computer Science
      September 2022 - May 2026
      Langara College
      Diploma in Web Development
      September 2021 - May 2023

      WORK EXPERIENCE
      Software Engineering Co-op
      Harbour Systems
      May 2025 - August 2025
      Shipped tested product improvements during a software engineering co-op.
      Product Developer at Northstar Labs
      January 2024 - April 2024
      Built internal tools with React and TypeScript.

      PROJECTS
      Built an accessible campus navigation app with React, TypeScript, and FastAPI.
    `);

    expect(result).toMatchObject({
      firstName: "Maya",
      lastName: "Chen",
      email: "maya.chen@example.com",
      phone: "+1 604 555 0142",
      location: "Vancouver, BC",
      portfolio: "https://github.com/mayachen-demo",
      linkedin: "https://linkedin.com/in/mayachen-demo",
    });
    expect(result.education).toEqual([
      {
        school: "University of British Columbia",
        degree: "Bachelor of Science in Computer Science",
        startDate: "2022-09-01",
        graduationDate: "2026-05-01",
      },
      {
        school: "Langara College",
        degree: "Diploma in Web Development",
        startDate: "2021-09-01",
        graduationDate: "2023-05-01",
      },
    ]);
    expect(result.experience).toEqual([
      {
        company: "Harbour Systems",
        title: "Software Engineering Co-op",
        startDate: "May 2025",
        endDate: "August 2025",
        description:
          "Shipped tested product improvements during a software engineering co-op.",
      },
      {
        company: "Northstar Labs",
        title: "Product Developer",
        startDate: "January 2024",
        endDate: "April 2024",
        description: "Built internal tools with React and TypeScript.",
      },
    ]);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        "Built an accessible campus navigation app with React, TypeScript, and FastAPI.",
        "Shipped tested product improvements during a software engineering co-op.",
      ]),
    );
  });

  it("rejects files whose extraction produced no readable text", () => {
    expect(() => parseResumeText(" \n \n ")).toThrow("No readable text");
  });

  it("does not infer explicit application choices", () => {
    const result = parseResumeText(`
      Jordan Lee
      Software Developer
      jordan@example.com
      Authorized to work in Canada
      Gender: non-binary
    `);

    expect(result).not.toHaveProperty("workAuthorization");
    expect(result).not.toHaveProperty("genderIdentity");
    expect(result).not.toHaveProperty("relocation");
  });

  it("extracts city and full province names without keeping a street address", () => {
    const result = parseResumeText(`
      Avery Singh
      123 Main Street, Burnaby, British Columbia
      avery@example.com
    `);

    expect(result.location).toBe("Burnaby, British Columbia");
  });
});
