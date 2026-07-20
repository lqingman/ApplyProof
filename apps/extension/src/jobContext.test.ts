import { beforeEach, describe, expect, it } from "vitest";

import { extractJobContext } from "./jobContext";

describe("job context extraction", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("prefers bounded JobPosting structured data", () => {
    document.head.innerHTML = `
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Platform Engineer",
          "hiringOrganization": { "name": "Example Labs" },
          "description": "<p>Build accessible TypeScript products.</p>"
        }
      </script>
    `;

    expect(extractJobContext(document)).toEqual({
      company: "Example Labs",
      role: "Platform Engineer",
      description: "Build accessible TypeScript products.",
    });
  });

  it("uses explicit visible job containers without collecting the whole form", () => {
    document.body.innerHTML = `
      <header><img alt="Acme Software"></header>
      <main>
        <h1>Frontend Developer</h1>
        <section class="job-description">Work with React and automated testing.</section>
        <label>Government ID <input value="private-value"></label>
      </main>
    `;

    const context = extractJobContext(document);
    expect(context).toEqual({
      company: "Acme Software",
      role: "Frontend Developer",
      description: "Work with React and automated testing.",
    });
    expect(JSON.stringify(context)).not.toContain("private-value");
  });
});
