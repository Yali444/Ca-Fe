// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LocationDiagnostics } from "./LocationDiagnostics";
import { createLocationDiagnostics } from "@/lib/geolocation-diagnostics";

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

afterEach(() => {
  cleanup();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

function renderDiagnostics(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: writeText ? { writeText } : undefined, configurable: true });
  const diagnostics = createLocationDiagnostics({ source: "exception", code: 18, name: "SecurityError", message: "Access blocked" }, []);
  const view = render(<LocationDiagnostics diagnostics={diagnostics} />);
  const details = screen.getByText("פרטי תקלה").closest("details")!;
  expect(details.open).toBe(false);
  fireEvent.click(screen.getByText("פרטי תקלה"));
  return { diagnostics, ...view };
}

describe("location diagnostic sharing", () => {
  it("copies the complete report and resets confirmation when late permission data changes it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { diagnostics, rerender } = renderDiagnostics(writeText);
    fireEvent.click(screen.getByRole("button", { name: "העתקת פרטי התקלה" }));
    await screen.findByRole("button", { name: "הועתק" });
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual(diagnostics);
    rerender(<LocationDiagnostics diagnostics={{ ...diagnostics, permission: { state: "denied" } }} />);
    expect(screen.getByRole("button", { name: "העתקת פרטי התקלה" })).toBeInTheDocument();
  });

  it.each([false, true])("keeps a selectable report when clipboard is missing or rejected (rejected: %s)", async (rejects) => {
    const { diagnostics } = renderDiagnostics(rejects ? () => Promise.reject(new DOMException("Blocked", "NotAllowedError")) : undefined);
    fireEvent.click(screen.getByRole("button", { name: "העתקת פרטי התקלה" }));
    const report = screen.getByRole("textbox", { name: "דוח טכני להעתקה" }) as HTMLTextAreaElement;
    await waitFor(() => expect(report).toHaveFocus());
    expect(report.selectionStart).toBe(0);
    expect(report.selectionEnd).toBe(report.value.length);
    expect(JSON.parse(report.value)).toEqual(diagnostics);
    expect(screen.getByText(/הטקסט מסומן להעתקה ידנית/)).toBeInTheDocument();
  });
});
