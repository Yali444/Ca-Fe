/**
 * `mailto:` URL builders for the "report a problem" and "suggest a missing
 * place" actions, plus their thin side-effect wrappers.
 *
 * The pure builders are exported so the URL shape stays under test —
 * a broken encodeURIComponent (or missing one) would silently produce
 * mailto links that get truncated by mail clients at the first unescaped
 * space or ampersand.
 */

/** Email address that receives report/suggestion messages. */
export const REPORT_EMAIL =
  process.env.NEXT_PUBLIC_REPORT_EMAIL || "yalioz77@gmail.com";

/** Pure: build the mailto URL for the "report a problem" flow. */
export const buildReportPlaceIssueMailto = (
  shop: { name: string },
  email: string = REPORT_EMAIL,
): string => {
  const subject = `דיווח על טעות - ${shop.name}`;
  const body = [
    "שלום,",
    `מצאתי טעות בפרטים של בית הקפה: ${shop.name}`,
    "",
    "פירוט הטעות:",
    "[הזן כאן את הטעות שנמצאה]",
    "",
    "הצעה לתיקון:",
    "[הזן כאן את המידע הנכון]",
    "",
    "תודה.",
  ].join("\n");
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
};

/** Pure: build the mailto URL for the "suggest a missing place" flow. */
export const buildSuggestMissingPlaceMailto = (
  email: string = REPORT_EMAIL,
): string => {
  const subject = "הצעת מקום חדש ל-Ca Fe";
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject,
  )}`;
};

/** Open the "report a problem" mailto in the current window. */
export const reportPlaceIssue = (shop: { name: string }): void => {
  window.open(buildReportPlaceIssueMailto(shop), "_self");
};

/** Open the "suggest a missing place" mailto in a new tab. */
export const suggestMissingPlace = (): void => {
  window.open(buildSuggestMissingPlaceMailto(), "_blank");
};
