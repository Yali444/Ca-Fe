// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FormattedDescription, plainDescription } from "./FormattedDescription";

describe("FormattedDescription", () => {
  it("renders bold emphasis without exposing asterisks", () => {
    const { container } = render(
      <p><FormattedDescription text="קפה עד 16:00. **בעיקר בר יין.**" /></p>,
    );
    expect(screen.getByText("בעיקר בר יין.").tagName).toBe("STRONG");
    expect(container.textContent).toBe("קפה עד 16:00. בעיקר בר יין.");
  });

  it("treats HTML in descriptions as ordinary text", () => {
    const { container } = render(
      <FormattedDescription text="**<script>alert(1)</script>**" />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });
});

describe("plainDescription", () => {
  it("removes only bold delimiters for metadata", () => {
    expect(plainDescription("**קפה** ומאפים")).toBe("קפה ומאפים");
  });
});
