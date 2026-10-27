// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWorksheet, saveWorksheet } from "@/lib/worksheet";

const EMPTY = { values: {}, toggles: {} };

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("worksheet storage", () => {
  it("loadWorksheet returns empty on corrupt JSON", () => {
    window.localStorage.setItem("pc1864-menu-map-v1", "{not json");
    expect(loadWorksheet("pc1864")).toEqual(EMPTY);
  });

  it("loadWorksheet returns empty when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadWorksheet("pc1864")).toEqual(EMPTY);
  });

  it("loadWorksheet returns empty for the wrong shape", () => {
    window.localStorage.setItem("pc1864-menu-map-v1", JSON.stringify({ values: [1], toggles: { 13: "x" } }));
    expect(loadWorksheet("pc1864")).toEqual(EMPTY);
  });

  it("reads data saved by the legacy app under pc1864-menu-map-v1", () => {
    const legacy = { values: { "5|02|0": "030" }, toggles: { 13: [1, 4] } };
    window.localStorage.setItem("pc1864-menu-map-v1", JSON.stringify(legacy));
    expect(loadWorksheet("pc1864")).toEqual({ values: { "5|02|0": "030" }, toggles: { 13: [1, 4] } });
  });

  it("saveWorksheet writes a copy that loadWorksheet reads back", () => {
    const ws = { values: { "1|null|0": "03" }, toggles: { 13: [2] } };
    saveWorksheet("pc1864", ws);
    ws.toggles[13].push(9);
    expect(JSON.parse(window.localStorage.getItem("pc1864-menu-map-v1")!)).toEqual({ values: { "1|null|0": "03" }, toggles: { 13: [2] } });
    expect(loadWorksheet("pc1864").toggles[13]).toEqual([2]);
  });

  it("saveWorksheet swallows storage errors", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveWorksheet("pc1864", { values: {}, toggles: {} })).not.toThrow();
  });
});
