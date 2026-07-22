import { describe, it, expect } from "vitest";
import { excerpt } from "@/lib/excerpt";

describe("excerpt", () => {
  it("returns empty for blank input", () => {
    expect(excerpt(null)).toBe("");
    expect(excerpt("")).toBe("");
    expect(excerpt("   ")).toBe("");
  });

  it("returns the first complete sentence when short enough", () => {
    expect(excerpt("First sentence. Second one continues.")).toBe("First sentence.");
  });

  it("truncates at the last space within max and adds ellipsis", () => {
    const text =
      "This is a long bio without sentence punctuation that should be cut around one hundred forty characters carefully";
    const result = excerpt(text, 60);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(61);
    expect(result).not.toMatch(/\s…$/);
  });

  it("returns the full text when shorter than max", () => {
    expect(excerpt("Short bio with no period", 140)).toBe("Short bio with no period");
  });
});
