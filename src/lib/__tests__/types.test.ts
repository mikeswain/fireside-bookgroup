import { describe, it, expect } from "vitest";
import type { Member } from "../types";
import {
  displayName,
  buildNameAbbreviations,
  abbreviateProposer,
} from "../types";

const member = (given: string, family = ""): Member => ({
  givenName: given,
  familyName: family,
});

describe("displayName", () => {
  it("returns given name only when no family name", () => {
    expect(displayName(member("Annie"))).toBe("Annie");
  });

  it("returns full name when family name present", () => {
    expect(displayName(member("Mike", "Swain"))).toBe("Mike Swain");
  });
});

describe("buildNameAbbreviations", () => {
  it("uses given name only when unique", () => {
    const members = [member("Annie"), member("Bryan"), member("Mike", "Swain")];
    const abbrevs = buildNameAbbreviations(members);

    expect(abbrevs.get("Annie")).toBe("Annie");
    expect(abbrevs.get("Bryan")).toBe("Bryan");
    expect(abbrevs.get("Mike Swain")).toBe("Mike");
  });

  it("uses single initial when clashing given names have different initials", () => {
    const members = [member("Mike", "Swain"), member("Mike", "Brown")];
    const abbrevs = buildNameAbbreviations(members);

    expect(abbrevs.get("Mike Swain")).toBe("Mike S.");
    expect(abbrevs.get("Mike Brown")).toBe("Mike B.");
  });

  it("uses minimum prefix to disambiguate shared initials", () => {
    const members = [member("Mike", "Swain"), member("Mike", "Smith")];
    const abbrevs = buildNameAbbreviations(members);

    expect(abbrevs.get("Mike Swain")).toBe("Mike Sw.");
    expect(abbrevs.get("Mike Smith")).toBe("Mike Sm.");
  });

  it("handles three-way clashes with mixed initials", () => {
    const members = [
      member("Mike", "Swain"),
      member("Mike", "Smith"),
      member("Mike", "Brown"),
    ];
    const abbrevs = buildNameAbbreviations(members);

    expect(abbrevs.get("Mike Swain")).toBe("Mike Sw.");
    expect(abbrevs.get("Mike Smith")).toBe("Mike Sm.");
    expect(abbrevs.get("Mike Brown")).toBe("Mike B.");
  });

  it("handles clashing given name with no family name", () => {
    const members = [member("Mike"), member("Mike", "Swain")];
    const abbrevs = buildNameAbbreviations(members);

    expect(abbrevs.get("Mike")).toBe("Mike");
    expect(abbrevs.get("Mike Swain")).toBe("Mike S.");
  });

  it("is case-insensitive when comparing prefixes", () => {
    const members = [member("Jo", "smith"), member("Jo", "Smythe")];
    const abbrevs = buildNameAbbreviations(members);

    expect(abbrevs.get("Jo smith")).toBe("Jo smi.");
    expect(abbrevs.get("Jo Smythe")).toBe("Jo Smy.");
  });
});

describe("abbreviateProposer", () => {
  const members = [member("Annie"), member("Mike", "Swain"), member("Mike", "Brown")];
  const abbrevs = buildNameAbbreviations(members);

  it("returns abbreviated name from the map", () => {
    expect(abbreviateProposer("Mike Swain", abbrevs)).toBe("Mike S.");
    expect(abbreviateProposer("Annie", abbrevs)).toBe("Annie");
  });

  it("falls back to Given S. for unknown multi-word names", () => {
    expect(abbreviateProposer("John Smith", abbrevs)).toBe("John S.");
  });

  it("returns single-word names unchanged when not in map", () => {
    expect(abbreviateProposer("Judith", abbrevs)).toBe("Judith");
  });
});
