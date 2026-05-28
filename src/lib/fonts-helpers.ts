/**
 * Font selection helpers — Hebrew vs Latin text needs different families
 * for proper rendering (Inter for Latin, Aran for Hebrew).
 */

/** True if `text` contains any A-Z / a-z character. */
export const hasLatinCharacters = (text: string): boolean => {
  return /[A-Za-z]/.test(text);
};

/**
 * Returns a CSS font-family string appropriate for the language of `text`.
 *   - Latin characters present → Inter family
 *   - Pure Hebrew (or other non-Latin) → Aran family
 */
export const getFontFamily = (text: string): string => {
  if (hasLatinCharacters(text)) {
    return 'var(--font-inter), "Inter", "Arial", "Helvetica", sans-serif';
  }
  return "var(--font-aran), sans-serif";
};
