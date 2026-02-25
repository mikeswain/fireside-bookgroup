import { describe, it, expect } from "vitest";
import { emailFromCfJwt } from "../auth";

/** Create a fake JWT with the given payload. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "RS256" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

describe("emailFromCfJwt", () => {
  it("returns undefined for undefined input", () => {
    expect(emailFromCfJwt(undefined)).toBeUndefined();
  });

  it("extracts email from a valid JWT", () => {
    const jwt = fakeJwt({ email: "mike@example.com", sub: "abc" });
    expect(emailFromCfJwt(jwt)).toBe("mike@example.com");
  });

  it("returns undefined when JWT has no email", () => {
    const jwt = fakeJwt({ sub: "abc" });
    expect(emailFromCfJwt(jwt)).toBeUndefined();
  });

  it("returns undefined for malformed JWT", () => {
    expect(emailFromCfJwt("not.a.jwt")).toBeUndefined();
    expect(emailFromCfJwt("garbage")).toBeUndefined();
  });
});
