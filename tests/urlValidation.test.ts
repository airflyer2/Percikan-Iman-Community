import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl } from '../src/lib/urlValidation';

describe('isSafeHttpUrl', () => {
  it('accepts valid https and http URLs including whitespace-trimmed and query/hash forms', () => {
    expect(isSafeHttpUrl('https://zoom.us/j/123456')).toBe(true);
    expect(isSafeHttpUrl('http://localhost:3000/programs')).toBe(true);
    expect(
      isSafeHttpUrl('  https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800  '),
    ).toBe(true);
    expect(isSafeHttpUrl('HTTPS://PERCIKANIMAN.CH/path#section')).toBe(true);
    expect(isSafeHttpUrl('http://127.0.0.1:8080/test')).toBe(true);
    expect(isSafeHttpUrl('https://[::1]:8080/ok')).toBe(true);
    expect(isSafeHttpUrl('https://www.youtube.com/@percikanimanch')).toBe(true);
    expect(isSafeHttpUrl('https://example.com/search?email=info@percikaniman.ch#section')).toBe(true);
    expect(isSafeHttpUrl('https://example.com#@frag')).toBe(true);
  });

  it('rejects dangerous executable and data schemes', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('JAVASCRIPT:alert(document.cookie)')).toBe(false);
    expect(isSafeHttpUrl('  javascript:void(0)  ')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeHttpUrl('data:image/png;base64,iVBOR')).toBe(false);
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpUrl('mailto:info@percikaniman.ch')).toBe(false);
    expect(isSafeHttpUrl('tel:+41791234567')).toBe(false);
    expect(isSafeHttpUrl('ftp://example.com/file')).toBe(false);
  });

  it('rejects control characters (C0, DEL, C1), leading/trailing non-ASCII whitespace, and obfuscated schemes', () => {
    expect(isSafeHttpUrl('java\nscript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('ht\ttp://example.com')).toBe(false);
    expect(isSafeHttpUrl('https://example.com/path\r\ninjected')).toBe(false);
    expect(isSafeHttpUrl('https://example.com/\u0000null')).toBe(false);
    expect(isSafeHttpUrl('https://example.com/\u007fdel')).toBe(false);
    expect(isSafeHttpUrl('https://example.com/\u0085c1')).toBe(false);
    expect(isSafeHttpUrl('https://example.com/\u009fc1')).toBe(false);
    expect(isSafeHttpUrl('\u00A0https://example.com')).toBe(false);
    expect(isSafeHttpUrl('\uFEFFhttps://example.com')).toBe(false);
    expect(isSafeHttpUrl('\u3000https://example.com')).toBe(false);
    expect(isSafeHttpUrl('https://example.com\u00A0')).toBe(false);
  });

  it('rejects internal whitespace and zero-width format characters', () => {
    expect(isSafeHttpUrl('https://example.com/hello world')).toBe(false);
    expect(isSafeHttpUrl('https://example.com/?q=hello world')).toBe(false);
    expect(isSafeHttpUrl('https://example.com/\u00A0path')).toBe(false);
    expect(isSafeHttpUrl('https://ex\u200Bample.com')).toBe(false);
    expect(isSafeHttpUrl('https://ex\u200Cample.com')).toBe(false);
    expect(isSafeHttpUrl('https://ex\u200Dample.com')).toBe(false);
    expect(isSafeHttpUrl('https://ex\uFEFFample.com')).toBe(false);
  });

  it('rejects userinfo spoofing, malformed slash/backslash authorities, dot hosts, and relative paths', () => {
    expect(isSafeHttpUrl('/logo.svg')).toBe(false);
    expect(isSafeHttpUrl('./photo.png')).toBe(false);
    expect(isSafeHttpUrl('../secret')).toBe(false);
    expect(isSafeHttpUrl('example.com/path')).toBe(false);
    expect(isSafeHttpUrl('//evil.com/payload.js')).toBe(false);
    expect(isSafeHttpUrl('https:example.com')).toBe(false);
    expect(isSafeHttpUrl('https://')).toBe(false);
    expect(isSafeHttpUrl('http://')).toBe(false);
    expect(isSafeHttpUrl('http:// ')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
    expect(isSafeHttpUrl('https://zoom.us@evil.com/join')).toBe(false);
    expect(isSafeHttpUrl('http://user:pass@evil.com')).toBe(false);
    expect(isSafeHttpUrl('https://@evil.com')).toBe(false);
    expect(isSafeHttpUrl('https://:@evil.com')).toBe(false);
    expect(isSafeHttpUrl('https://:pass@evil.com')).toBe(false);
    expect(isSafeHttpUrl('https://user@[::1]:8080/ok')).toBe(false);
    expect(isSafeHttpUrl('https:///path')).toBe(false);
    expect(isSafeHttpUrl('https:////evil.com')).toBe(false);
    expect(isSafeHttpUrl('https://\\evil.com')).toBe(false);
    expect(isSafeHttpUrl('https://example.com\\@evil.com')).toBe(false);
    expect(isSafeHttpUrl('https://.')).toBe(false);
    expect(isSafeHttpUrl('https://..')).toBe(false);
  });

  it('rejects empty strings and non-string inputs safely', () => {
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl('   ')).toBe(false);
    expect(isSafeHttpUrl(null as unknown as string)).toBe(false);
    expect(isSafeHttpUrl(undefined as unknown as string)).toBe(false);
    expect(isSafeHttpUrl(123 as unknown as string)).toBe(false);
    expect(isSafeHttpUrl({} as unknown as string)).toBe(false);
  });
});
