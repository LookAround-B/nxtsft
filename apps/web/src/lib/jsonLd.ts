/**
 * Serialize a JSON-LD object for embedding in a <script type="application/ld+json">
 * tag. JSON.stringify alone does not escape characters that can break out of the
 * script element - most importantly </script> - so a value containing such a
 * sequence could inject markup. Escape <, >, & and the U+2028 / U+2029 line
 * terminators (invalid raw in a JS string context).
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
