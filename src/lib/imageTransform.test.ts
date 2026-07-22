import { describe, it, expect } from "vitest";
import { buildSrcSet, isSupabaseStorageObjectUrl, transformUrl } from "@/lib/imageTransform";

const OBJECT_URL =
  "https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/ui-assets/fondo_jose_2.jpg";

describe("transformUrl", () => {
  it("converts object/public to render/image/public with width and quality", () => {
    const out = transformUrl(OBJECT_URL, { width: 800, quality: 75 });
    expect(out).toContain("/storage/v1/render/image/public/ui-assets/fondo_jose_2.jpg");
    expect(out).not.toContain("/object/public/");
    expect(out).toContain("width=800");
    expect(out).toContain("quality=75");
  });

  it("defaults quality to 75", () => {
    const out = transformUrl(OBJECT_URL, { width: 1200 });
    expect(out).toContain("quality=75");
    expect(out).toContain("width=1200");
  });

  it("returns non-Supabase URLs intact", () => {
    expect(transformUrl("/assets/local.jpg", { width: 800 })).toBe("/assets/local.jpg");
    expect(transformUrl("https://cdn.example.com/a.jpg", { width: 800 })).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });
});

describe("buildSrcSet", () => {
  it("builds srcset entries for each width", () => {
    const srcset = buildSrcSet(OBJECT_URL, [480, 800]);
    expect(srcset).toContain("480w");
    expect(srcset).toContain("800w");
    expect(srcset.split(", ")).toHaveLength(2);
    expect(srcset).toContain("/render/image/public/");
  });

  it("returns empty string for non-Supabase URLs", () => {
    expect(buildSrcSet("/local.jpg")).toBe("");
  });
});

describe("isSupabaseStorageObjectUrl", () => {
  it("detects object/public URLs", () => {
    expect(isSupabaseStorageObjectUrl(OBJECT_URL)).toBe(true);
    expect(isSupabaseStorageObjectUrl("https://example.com/x.jpg")).toBe(false);
  });
});
