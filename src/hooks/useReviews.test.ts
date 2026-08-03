import { describe, expect, it } from "vitest";

import { describeSaveError } from "@/hooks/useReviews";
import { SUPABASE_NOT_CONFIGURED } from "@/supabaseClient";

describe("describeSaveError", () => {
  it("names a missing Supabase configuration instead of telling the user to retry", () => {
    const message = describeSaveError({
      code: SUPABASE_NOT_CONFIGURED,
      message: "Supabase is not configured",
    });

    expect(message).toContain("Supabase");
    expect(message).not.toContain("נסו שוב");
  });

  it("names an RLS denial by its Postgres code", () => {
    expect(describeSaveError({ code: "42501", message: "permission denied" })).toContain("RLS");
  });

  it("names an RLS denial by its message when no code is present", () => {
    expect(
      describeSaveError({
        message: 'new row violates row-level security policy for table "Cafe Reviews"',
      }),
    ).toContain("RLS");
  });

  it("reports a network failure as a connection problem", () => {
    expect(describeSaveError(new TypeError("Failed to fetch"))).toContain("להתחבר");
  });

  it("surfaces the underlying message for an unrecognised PostgREST error", () => {
    const message = describeSaveError({
      code: "22003",
      message: "value out of range",
      details: "column cafe_id",
    });

    expect(message).toContain("value out of range");
    expect(message).toContain("column cafe_id");
  });

  it("falls back to a generic message when the error carries nothing useful", () => {
    expect(describeSaveError(undefined)).toBe("שגיאה בשמירת הביקורת. נסו שוב.");
    expect(describeSaveError({})).toBe("שגיאה בשמירת הביקורת. נסו שוב.");
  });
});
