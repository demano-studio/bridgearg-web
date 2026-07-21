import { describe, it, expect } from "vitest";
import { getWorkImageUrl } from "@/lib/work-images";

describe("app", () => {
  it("getWorkImageUrl returns string for known slug", () => {
    expect(typeof getWorkImageUrl("bridgearg-work1.jpg")).toBe("string");
  });
});
