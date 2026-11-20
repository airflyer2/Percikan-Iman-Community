/**
 * Validates that a user-supplied URL uses an explicit http:// or https:// scheme
 * with a valid non-empty hostname and no embedded credentials, rejecting dangerous
 * schemes (javascript:, data:, vbscript:, file:), C0/C1 control characters,
 * leading/trailing non-ASCII whitespace, malformed slash/backslash authorities,
 * protocol-relative URLs, and relative paths.
 */
export function isSafeHttpUrl(url: string): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  const trimmed = url.replace(/^[ \t\r\n\f\v]+|[ \t\r\n\f\v]+$/g, '');
  // Reject empty strings or leading/trailing non-ASCII whitespace (e.g. U+00A0, U+FEFF, U+3000)
  if (!trimmed || trimmed !== url.trim()) {
    return false;
  }
  // Reject C0 (U+0000..U+001F), DEL (U+007F), C1 (U+0080..U+009F), internal whitespace, and zero-width format chars
  if (/[\u0000-\u001F\u007F-\u009F\s\u200B-\u200D\uFEFF]/.test(trimmed)) {
    return false;
  }
  // Require explicit http(s):// followed by a non-slash, non-backslash, non-whitespace, non-@ authority
  if (!/^https?:\/\/[^/\\\s@]+(?:[/?#]|$)/i.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    if (!parsed.hostname || parsed.hostname === '.' || parsed.hostname === '..') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
