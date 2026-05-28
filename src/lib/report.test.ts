import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildReportPlaceIssueMailto,
  buildSuggestMissingPlaceMailto,
  REPORT_EMAIL,
  reportPlaceIssue,
  suggestMissingPlace,
} from "./report";

describe("REPORT_EMAIL", () => {
  it("is a plausible email address (not empty)", () => {
    expect(REPORT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});

describe("buildReportPlaceIssueMailto", () => {
  it("targets the mailto: scheme and the report email", () => {
    const url = buildReportPlaceIssueMailto({ name: "Cafe X" }, "to@example.com");
    expect(url.startsWith("mailto:")).toBe(true);
    expect(url).toContain(encodeURIComponent("to@example.com"));
  });

  it("URL-encodes the subject so spaces and Hebrew don't break the link", () => {
    const url = buildReportPlaceIssueMailto({ name: "קפה X" }, "to@example.com");
    // The Hebrew + space + special chars must be percent-encoded inside
    // the subject param, never raw in the URL.
    const params = new URL(url).searchParams;
    const subject = params.get("subject");
    expect(subject).toBe("דיווח על טעות - קפה X");
    // And the raw URL string must not contain a raw space (would split).
    expect(url).not.toContain(" ");
  });

  it("includes the shop name inside the body", () => {
    const url = buildReportPlaceIssueMailto(
      { name: "Cafe Levinsky" },
      "to@example.com",
    );
    const body = new URL(url).searchParams.get("body");
    expect(body).toContain("Cafe Levinsky");
  });

  it("URL-encodes the body, including newlines", () => {
    const url = buildReportPlaceIssueMailto({ name: "X" }, "to@example.com");
    // Raw newlines would break the mailto URL — must be %0A.
    expect(url).toContain("%0A");
    expect(url).not.toContain("\n");
  });

  it("escapes ampersands inside subject/body so they don't split the URL", () => {
    const url = buildReportPlaceIssueMailto(
      { name: "Tom & Jerry" },
      "to@example.com",
    );
    const params = new URL(url).searchParams;
    expect(params.get("subject")).toContain("Tom & Jerry");
    // The raw `&` from the name must be encoded, not raw — otherwise
    // it would start a new query param.
    expect(url).toContain("Tom%20%26%20Jerry");
  });

  it("defaults to REPORT_EMAIL when no email argument is given", () => {
    const url = buildReportPlaceIssueMailto({ name: "X" });
    expect(url).toContain(encodeURIComponent(REPORT_EMAIL));
  });
});

describe("buildSuggestMissingPlaceMailto", () => {
  it("uses the documented Hebrew subject and no body", () => {
    const url = buildSuggestMissingPlaceMailto("to@example.com");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("subject")).toBe("הצעת מקום חדש ל-Ca Fe");
    expect(parsed.searchParams.get("body")).toBeNull();
  });

  it("defaults to REPORT_EMAIL when no email argument is given", () => {
    const url = buildSuggestMissingPlaceMailto();
    expect(url).toContain(encodeURIComponent(REPORT_EMAIL));
  });
});

describe("reportPlaceIssue / suggestMissingPlace (side effects)", () => {
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    openSpy = vi.fn();
    vi.stubGlobal("window", { open: openSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reportPlaceIssue opens in the current window (_self)", () => {
    reportPlaceIssue({ name: "X" });
    expect(openSpy).toHaveBeenCalledOnce();
    const [, target] = openSpy.mock.calls[0];
    expect(target).toBe("_self");
  });

  it("suggestMissingPlace opens in a new tab (_blank)", () => {
    suggestMissingPlace();
    expect(openSpy).toHaveBeenCalledOnce();
    const [, target] = openSpy.mock.calls[0];
    expect(target).toBe("_blank");
  });

  it("both pass a mailto: URL through to window.open", () => {
    reportPlaceIssue({ name: "X" });
    suggestMissingPlace();
    const firstUrl = openSpy.mock.calls[0][0] as string;
    const secondUrl = openSpy.mock.calls[1][0] as string;
    expect(firstUrl.startsWith("mailto:")).toBe(true);
    expect(secondUrl.startsWith("mailto:")).toBe(true);
  });
});
