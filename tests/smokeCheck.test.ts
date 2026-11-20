import { describe, expect, it, vi } from 'vitest';
import {
  extractEntryScriptPath,
  runSmokeCheck,
} from '../scripts/smoke-check.mjs';

const VALID_JS_BUNDLE =
  'console.log("Percikan Iman Community App Bootstrapped");' +
  '/* padding to exceed 100 bytes threshold for live smoke check verification */';

describe('smoke-check helpers and live probe runner', () => {
  it('extractEntryScriptPath extracts Vite module script src regardless of attribute order or quotes', () => {
    const standardHtml = `
      <!doctype html>
      <html>
        <head><title>Percikan Iman</title></head>
        <body>
          <div id="root"></div>
          <script type="module" crossorigin src="/assets/index-D1a2B3c4.js"></script>
        </body>
      </html>
    `;
    expect(extractEntryScriptPath(standardHtml)).toBe('/assets/index-D1a2B3c4.js');

    const reorderedSingleQuoteHtml = `
      <html>
        <body>
          <div id="root"></div>
          <script async src="https://cdn.example.com/analytics.js"></script>
          <script crossorigin src='/assets/index-XYZ987.js' type='module'></script>
        </body>
      </html>
    `;
    expect(extractEntryScriptPath(reorderedSingleQuoteHtml)).toBe('/assets/index-XYZ987.js');

    const genericModuleHtml = `
      <html>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/main.tsx"></script>
        </body>
      </html>
    `;
    expect(extractEntryScriptPath(genericModuleHtml)).toBe('/src/main.tsx');
    expect(extractEntryScriptPath('<html><body><script src="/legacy.js"></script></body></html>')).toBeNull();
  });

  it('runSmokeCheck succeeds on happy path and normalizes trailing slashes', async () => {
    const html = `
      <!doctype html>
      <html>
        <body>
          <div id="root"></div>
          <script type="module" crossorigin src="/assets/index-abc123.js"></script>
        </body>
      </html>
    `;

    const fetchImpl = vi.fn(async (url: string) => {
      if (url === 'https://percikan-iman-724ae--pr-42.web.app/') {
        return {
          ok: true,
          status: 200,
          text: async () => html,
        };
      }
      if (url === 'https://percikan-iman-724ae--pr-42.web.app/assets/index-abc123.js') {
        return {
          ok: true,
          status: 200,
          text: async () => VALID_JS_BUNDLE,
        };
      }
      throw new Error(`Unexpected URL requested: ${url}`);
    });

    const result = await runSmokeCheck({
      targetUrl: 'https://percikan-iman-724ae--pr-42.web.app///',
      retryDelayMs: 0,
      fetchImpl,
    });

    expect(result.targetUrl).toBe('https://percikan-iman-724ae--pr-42.web.app');
    expect(result.scriptPath).toBe('/assets/index-abc123.js');
    expect(result.bundleUrl).toBe(
      'https://percikan-iman-724ae--pr-42.web.app/assets/index-abc123.js',
    );
    expect(result.bundleBytes).toBeGreaterThan(100);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('runSmokeCheck retries transient HTTP/network failures and recovers', async () => {
    const html = `
      <html>
        <body>
          <div id="root"></div>
          <script type="module" src="/assets/index-retry99.js"></script>
        </body>
      </html>
    `;

    let htmlCalls = 0;
    let jsCalls = 0;

    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/')) {
        htmlCalls += 1;
        if (htmlCalls === 1) {
          throw new Error('ECONNRESET');
        }
        if (htmlCalls === 2) {
          return { ok: false, status: 503, text: async () => 'Service Unavailable' };
        }
        return { ok: true, status: 200, text: async () => html };
      }

      jsCalls += 1;
      if (jsCalls === 1) {
        return { ok: false, status: 404, text: async () => 'Not propagated yet' };
      }
      return { ok: true, status: 200, text: async () => VALID_JS_BUNDLE };
    });

    const result = await runSmokeCheck({
      targetUrl: 'https://percikan-iman-724ae.web.app',
      retryDelayMs: 0,
      fetchImpl,
    });

    expect(result.htmlAttempts).toBe(3);
    expect(result.bundleAttempts).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it('runSmokeCheck fails when #root mount element or module script tag is missing', async () => {
    const missingRootFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        '<html><body><div id="other"></div><script type="module" src="/assets/index-a.js"></script></body></html>',
    }));

    await expect(
      runSmokeCheck({
        targetUrl: 'https://percikan-iman-724ae.web.app',
        retryDelayMs: 0,
        fetchImpl: missingRootFetch,
      }),
    ).rejects.toThrow('<div id="root">');

    const missingScriptFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '<html><body><div id="root"></div></body></html>',
    }));

    await expect(
      runSmokeCheck({
        targetUrl: 'https://percikan-iman-724ae.web.app',
        retryDelayMs: 0,
        fetchImpl: missingScriptFetch,
      }),
    ).rejects.toThrow('module script');
  });

  it('runSmokeCheck fails on persistent non-200 HTTP status or tiny JS bundle body', async () => {
    const always500Fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));

    await expect(
      runSmokeCheck({
        targetUrl: 'https://percikan-iman-724ae.web.app',
        retryDelayMs: 0,
        fetchImpl: always500Fetch,
      }),
    ).rejects.toThrow('HTTP 500');
    expect(always500Fetch).toHaveBeenCalledTimes(4);

    const tinyBundleFetch = vi.fn(async (url: string) => {
      if (url.endsWith('/')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            '<html><body><div id="root"></div><script type="module" src="/assets/index-tiny.js"></script></body></html>',
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => 'console.log("tiny");',
      };
    });

    await expect(
      runSmokeCheck({
        targetUrl: 'https://percikan-iman-724ae.web.app',
        retryDelayMs: 0,
        fetchImpl: tinyBundleFetch,
      }),
    ).rejects.toThrow('too small or empty');
  });
});
