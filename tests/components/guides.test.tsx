// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GuideRunner } from "@/app/(app)/devices/[model]/guides/[slug]/GuideRunner";
import { StepCard } from "@/components/guides/StepCard";
import { StepNav } from "@/components/guides/StepNav";
import type { GuideStep } from "@/lib/content/repo";
import { model, textKeypad } from "../engines/dsc-powerseries/helpers";

afterEach(() => cleanup());

const STEPS: GuideStep[] = [
  { position: 1, title: "Enter installer programming", keys: "* 8 {installer}", note: "Armed light on.", warning: null, sectionRef: null },
  { position: 2, title: "Turn the partition on", keys: "2 0 1 2 #", note: null, warning: "Careful.", sectionRef: 201 },
];

function readLcd(): string {
  const result = screen.getByTestId("lcd").textContent ?? "";
  return result;
}

describe("StepCard", () => {
  it("shows title, keycaps with a labelled placeholder, note; no section link without a ref", () => {
    render(<StepCard step={STEPS[0]} number={1} count={2} modelSlug="pc1864" engineKey="dsc-powerseries" />);
    expect(screen.getByRole("heading", { name: /Enter installer programming/ })).toBeTruthy();
    expect(screen.getByText("installer code")).toBeTruthy();
    expect(screen.getByText("Armed light on.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /View this section/ })).toBeNull();
  });

  it("shows the warning and a section link when sectionRef is set", () => {
    render(<StepCard step={STEPS[1]} number={2} count={2} modelSlug="pc1864" engineKey="dsc-powerseries" />);
    expect(screen.getByRole("note").textContent).toContain("Careful.");
    expect(screen.getByRole("link", { name: /View this section/ }).getAttribute("href")).toBe("/devices/pc1864/map/201");
  });
});

describe("StepNav", () => {
  it("has no Back link on step 1 and a Next link to step 2", () => {
    render(<StepNav number={1} count={2} basePath="/g" doneHref="/d" />);
    expect(screen.queryByRole("link", { name: /Back/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Next/ }).getAttribute("href")).toBe("/g?step=2");
  });

  it("on the last step Back goes to n-1 and Done leaves the guide", () => {
    render(<StepNav number={2} count={2} basePath="/g" doneHref="/d" />);
    expect(screen.getByRole("link", { name: /Back/ }).getAttribute("href")).toBe("/g?step=1");
    expect(screen.getByRole("link", { name: /Done/ }).getAttribute("href")).toBe("/d");
  });
});

describe("GuideRunner", () => {
  it("starts the keypad at the step state; scratch presses can be undone with Back to step", () => {
    render(<GuideRunner model={model} keypad={textKeypad} steps={STEPS} stepIndex={1} />);
    expect(readLcd()).toContain("Enter Section");
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(readLcd()).not.toContain("Enter Section");
    fireEvent.click(screen.getByRole("button", { name: "Back to step 2" }));
    expect(readLcd()).toContain("Enter Section");
  });
});
