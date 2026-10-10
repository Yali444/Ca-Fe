/**
 * Dataset descriptions occasionally contain simple Markdown bold markers.
 * Render only that known inline syntax, as React text (never raw HTML).
 */
export function FormattedDescription({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Keep Markdown markers out of Open Graph and Twitter descriptions. */
export function plainDescription(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}
