import { describe, expect, it } from "vitest";

import { mayaProfile } from "./index";

describe("Maya Chen demo profile", () => {
  it("contains deterministic autofill data and evidence", () => {
    expect(mayaProfile.displayName).toBe("Maya Chen");
    expect(mayaProfile.identity.email).toBe("maya.chen@example.com");
    expect(mayaProfile.evidence).toHaveLength(5);
    expect(mayaProfile.evidence.map((record) => record.id)).toContain(
      "interest-accessible-products",
    );
    expect(mayaProfile.links.linkedin).toContain("linkedin.com/in/");
    expect(mayaProfile.education).toHaveLength(1);
    expect(mayaProfile.experience).toHaveLength(1);
  });

  it("stores user-confirmed authorization and demographic profile values", () => {
    expect(mayaProfile.workAuthorization.canada).toEqual({
      authorized: "yes",
      sponsorship: "no",
    });
    expect(mayaProfile.demographics?.genderIdentity).toBe("woman");
  });
});
