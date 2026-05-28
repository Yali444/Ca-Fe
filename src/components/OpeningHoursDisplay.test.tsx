// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { OpeningHoursDisplay } from "./OpeningHoursDisplay";

describe("<OpeningHoursDisplay />", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Anchor "now" to 2024-01-08 Monday 10:00 local time. Most tests want
    // a weekday inside typical café hours; tests that need a different
    // time override with vi.setSystemTime.
    vi.setSystemTime(new Date(2024, 0, 8, 10, 0, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders nothing when openingHours is null", () => {
    const { container } = render(<OpeningHoursDisplay openingHours={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when openingHours is undefined", () => {
    const { container } = render(<OpeningHoursDisplay />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an unparseable string", () => {
    const { container } = render(
      <OpeningHoursDisplay openingHours="גיבריש לחלוטין" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'open now' badge when currently inside the day's hours", () => {
    // Monday 10:00 vs Monday 08:00-18:00 → open
    render(
      <OpeningHoursDisplay openingHours={{ monday: "08:00-18:00" }} />,
    );
    expect(screen.getByText("פתוח עכשיו")).toBeInTheDocument();
    expect(screen.queryByText("סגור עכשיו")).not.toBeInTheDocument();
  });

  it("shows 'closed now' badge when outside the day's hours", () => {
    // Move time to 22:00 Monday — outside 08:00-18:00.
    vi.setSystemTime(new Date(2024, 0, 8, 22, 0, 0));
    render(
      <OpeningHoursDisplay openingHours={{ monday: "08:00-18:00" }} />,
    );
    expect(screen.getByText("סגור עכשיו")).toBeInTheDocument();
  });

  it("collapses consecutive days with identical hours into one row", () => {
    render(
      <OpeningHoursDisplay
        openingHours={{
          sunday: "08:00-18:00",
          monday: "08:00-18:00",
          tuesday: "08:00-18:00",
          wednesday: "08:00-18:00",
          thursday: "08:00-18:00",
          friday: "08:00-15:00",
        }}
      />,
    );
    // Sun-Thu merged into "ראשון - חמישי"
    expect(screen.getByText("ראשון - חמישי:")).toBeInTheDocument();
    // Friday on its own
    expect(screen.getByText("שישי:")).toBeInTheDocument();
    // Saturday absent — no row
    expect(screen.queryByText("שבת:")).not.toBeInTheDocument();
  });

  it("parses a Hebrew string and renders rows from it", () => {
    render(
      <OpeningHoursDisplay openingHours="א'-ה': 08:00-18:00, ו': 08:00-15:00" />,
    );
    expect(screen.getByText("ראשון - חמישי:")).toBeInTheDocument();
    expect(screen.getByText("שישי:")).toBeInTheDocument();
  });

  it("renders each day's hours alongside its label", () => {
    render(
      <OpeningHoursDisplay
        openingHours={{ monday: "08:00-18:00", friday: "08:00-15:00" }}
      />,
    );
    expect(screen.getByText("08:00-18:00")).toBeInTheDocument();
    expect(screen.getByText("08:00-15:00")).toBeInTheDocument();
  });
});
