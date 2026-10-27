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

  it("throws on glued digits and unknown placeholders", () => {
    expect(() => parseKeys("201 #", model)).toThrow(KeyTokenError);
    expect(() => parseKeys("{user}", model)).toThrow(KeyTokenError);
  });
});

describe("prototype keys are not tokens", () => {
  it.each(["constructor", "__proto__", "toString", "hasOwnProperty"])("parseKeys and formatKeycaps reject %s", (token) => {
    for (const run of [() => parseKeys(token, model), () => formatKeycaps(token)]) {
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
    expect(formatKeycaps("* 8 {installer}")).toEqual([
      { label: "*", placeholder: false },
      { label: "8", placeholder: false },
      { label: "installer code", placeholder: true },
    ]);
    expect(formatKeycaps("{master}")).toEqual([{ label: "master code", placeholder: true }]);
  });

  it("throws KeyTokenError on an invalid token", () => {
    expect(() => formatKeycaps("F1")).toThrow(KeyTokenError);
  });
});
