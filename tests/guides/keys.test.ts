import { describe, expect, it } from "vitest";
import { KeyTokenError, formatKeycaps, parseKeys } from "@/lib/guides/keys";
import { model } from "../engines/dsc-powerseries/helpers";

describe("parseKeys", () => {
  it("expands {installer} to 5 5 5 5", () => {
    expect(parseKeys("* 8 {installer}", model)).toEqual(["*", "8", "5", "5", "5", "5"]);
  });

  it("expands {master} to the model's master code", () => {
    expect(parseKeys("* 5 {master} #", model)).toEqual(["*", "5", "1", "2", "3", "4", "#"]);
  });

  it("accepts every plain token and extra whitespace", () => {
    expect(parseKeys("  0 1 2 3 4 5 6 7 8 9 * # < >  ", model)).toHaveLength(14);
    expect(parseKeys("", model)).toEqual([]);
  });

  it("throws KeyTokenError on 'F'", () => {
    expect(() => parseKeys("* F #", model)).toThrow(KeyTokenError);
    try {
      parseKeys("* F #", model);
    } catch (err) {
      expect((err as KeyTokenError).token).toBe("F");
    }
  });

  it("rejects IDS-only keys and placeholders on a DSC model", () => {
    expect(() => parseKeys("mode", model)).toThrow(KeyTokenError);
    expect(() => parseKeys("{user-code}", model)).toThrow(KeyTokenError);
  });

  it("throws on glued digits and unknown placeholders", () => {
    expect(() => parseKeys("201 #", model)).toThrow(KeyTokenError);
    expect(() => parseKeys("{user}", model)).toThrow(KeyTokenError);
  });
});

describe("prototype keys are not tokens", () => {
  it.each(["constructor", "__proto__", "toString", "hasOwnProperty"])("parseKeys and formatKeycaps reject %s", (token) => {
    for (const run of [() => parseKeys(token, model), () => formatKeycaps(token, "dsc-powerseries")]) {
      let caught: unknown = null;
      try {
        run();
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(KeyTokenError);
      expect((caught as KeyTokenError).token).toBe(token);
    }
  });
});

describe("formatKeycaps", () => {
  it("labels placeholders and keeps plain keys", () => {
    expect(formatKeycaps("* 8 {installer}", "dsc-powerseries")).toEqual([
      { label: "*", placeholder: false },
      { label: "8", placeholder: false },
      { label: "installer code", placeholder: true },
    ]);
    expect(formatKeycaps("{master}", "dsc-powerseries")).toEqual([{ label: "master code", placeholder: true }]);
  });

  it("throws KeyTokenError on an invalid token", () => {
    expect(() => formatKeycaps("F1", "dsc-powerseries")).toThrow(KeyTokenError);
  });
});

describe("IDS X-Series keys", async () => {
  const { getPanelModel } = await import("@/lib/content/repo");
  const x64 = (await getPanelModel("x64"))!;

  it("replays {master} and {new-code} for the X64", () => {
    expect(parseKeys("hold* {master} * {new-code} *", x64)).toEqual(["hold*", "1", "2", "3", "4", "*", "4", "3", "2", "1", "*"]);
    expect(parseKeys("{user-code}", x64)).toEqual(["1", "2", "3", "4"]);
  });

  it("rejects F and < on the X64", () => {
    expect(() => parseKeys("f", x64)).toThrow(KeyTokenError);
    expect(() => parseKeys("<", x64)).toThrow(KeyTokenError);
  });

  it("labels the IDS placeholders", () => {
    expect(formatKeycaps("{user-code} {new-code}", "ids-xseries")).toEqual([
      { label: "the code to change", placeholder: true },
      { label: "the new code", placeholder: true },
    ]);
  });
});
