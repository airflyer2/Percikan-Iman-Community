#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_TARGET_URL = 'https://percikan-iman-724ae.web.app';
export const DEFAULT_MAX_ATTEMPTS = 4;
export const DEFAULT_RETRY_DELAY_MS = 3000;
export const MIN_BUNDLE_BYTES = 100;

/**
 * @typedef {{
 *   ok?: boolean;
 *   status?: number;
 *   text: () => Promise<string>;
 * }} SmokeResponse
 *
 * @typedef {(url: string) => Promise<SmokeResponse>} FetchLike
 *
 * @typedef {{
 *   maxAttempts?: number;
 *   retryDelayMs?: number;
 *   fetchImpl?: FetchLike;
 *   sleepImpl?: (ms: number) => Promise<void>;
 * }} FetchRetryOptions
 *
 * @typedef {{
 *   targetUrl?: string;
 *   maxAttempts?: number;
 *   retryDelayMs?: number;
 *   fetchImpl?: FetchLike;
 *   sleepImpl?: (ms: number) => Promise<void>;
 * }} SmokeCheckOptions
 */

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize and validate a smoke-check target URL, stripping trailing slashes.
 * @param {string} [rawUrl]
 * @returns {{ targetUrl: string; origin: string; htmlUrl: string }}
 */
export function normalizeTargetUrl(rawUrl = DEFAULT_TARGET_URL) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('Target URL must be a non-empty http(s) URL.');
  }

  const stripped = rawUrl.trim().replace(/\/+$/, '');
  const parsed = new URL(stripped);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported target URL protocol: ${parsed.protocol}`);
  }

  const targetUrl = parsed.href.replace(/\/+$/, '');
  return {
    targetUrl,
    origin: parsed.origin,
    htmlUrl: `${targetUrl}/`,
  };
}

/**
 * Check whether the HTML body contains the React root mount container.
 * @param {string} html
 * @returns {boolean}
 */
export function hasRootMount(html) {
  if (typeof html !== 'string' || !html) {
    return false;
  }
  return /<div\b[^>]*\bid\s*=\s*(?:"root"|'root'|root\b)[^>]*>/i.test(html);
}

/**
 * Extract the compiled Vite module entry script path from HTML.
 * Prefers `/assets/index-*.js`, falling back to any `<script type="module" src="...">`.
 * @param {string} html
 * @returns {string | null}
 */
export function extractEntryScriptPath(html) {
  if (typeof html !== 'string' || !html) {
    return null;
  }

  const moduleSources = [];
  const scriptTagRegex = /<script\b([^>]*)>/gi;

  for (const match of html.matchAll(scriptTagRegex)) {
    const attrs = match[1] ?? '';
    const isModule = /\btype\s*=\s*(?:"module"|'module'|module\b)/i.test(attrs);
    if (!isModule) {
      continue;
    }

    const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const src = (srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? '').trim();
    if (src) {
      moduleSources.push(src);
    }
  }

  if (moduleSources.length === 0) {
    return null;
  }

  const entryMatch = moduleSources.find((src) =>
    /(?:^|\/)assets\/index-[^/?#]+\.m?js(?:[?#].*)?$/i.test(src),
  );
  if (entryMatch) {
    return entryMatch;
  }

  const assetMatch = moduleSources.find((src) =>
    /(?:^|\/)assets\/[^/?#]+\.m?js(?:[?#].*)?$/i.test(src),
  );
  return assetMatch ?? moduleSources[0];
}

/**
 * Fetch a URL with retry on transient network errors or non-200 HTTP status codes.
 * @param {string} url
 * @param {FetchRetryOptions} [options]
 * @returns {Promise<{ status: number; body: string; attempts: number }>}
 */
export async function fetchWithRetry(url, options = {}) {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const sleepImpl = options.sleepImpl ?? defaultSleep;
  const doFetch =
    options.fetchImpl ??
    ((target) => globalThis.fetch(target, { signal: AbortSignal.timeout(15000) }));

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error(`maxAttempts must be a positive integer (received ${maxAttempts}).`);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await doFetch(url);
      const status =
        typeof response?.status === 'number'
          ? response.status
          : response?.ok
            ? 200
            : 0;

      if (status !== 200) {
        throw new Error(`Unexpected HTTP ${status} from ${url}`);
      }

      const body = await response.text();
      return { status, body, attempts: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts && retryDelayMs > 0) {
        await sleepImpl(retryDelayMs);
      }
    }
  }

  throw new Error(
    `Request to ${url} failed after ${maxAttempts} attempt(s): ${lastError?.message ?? 'unknown error'}`,
  );
}

/**
 * Run the live Firebase Hosting / Vite bundle smoke check against a target URL.
 * @param {string | SmokeCheckOptions} [targetUrlOrOptions]
 * @param {SmokeCheckOptions} [maybeOptions]
 * @returns {Promise<{
 *   targetUrl: string;
 *   htmlUrl: string;
 *   scriptPath: string;
 *   bundleUrl: string;
 *   htmlBytes: number;
 *   bundleBytes: number;
 *   htmlAttempts: number;
 *   bundleAttempts: number;
 * }>}
 */
export async function runSmokeCheck(targetUrlOrOptions = {}, maybeOptions = {}) {
  const options =
    typeof targetUrlOrOptions === 'string'
      ? { ...maybeOptions, targetUrl: targetUrlOrOptions }
      : { ...targetUrlOrOptions };

  const { targetUrl, origin, htmlUrl } = normalizeTargetUrl(
    options.targetUrl ?? DEFAULT_TARGET_URL,
  );

  const retryOptions = {
    maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    fetchImpl: options.fetchImpl,
    sleepImpl: options.sleepImpl,
  };

  const htmlResult = await fetchWithRetry(htmlUrl, retryOptions);
  if (!hasRootMount(htmlResult.body)) {
    throw new Error(`Root mount element <div id="root"> not found in HTML from ${htmlUrl}`);
  }

  const scriptPath = extractEntryScriptPath(htmlResult.body);
  if (!scriptPath) {
    throw new Error(
      `Compiled Vite module script (<script type="module" src="...">) not found in HTML from ${htmlUrl}`,
    );
  }

  const bundleUrl = new URL(scriptPath, origin).toString();
  const bundleResult = await fetchWithRetry(bundleUrl, retryOptions);
  const bundleBytes = new TextEncoder().encode(bundleResult.body).byteLength;
  if (bundleResult.body.trim().length === 0 || bundleBytes <= MIN_BUNDLE_BYTES) {
    throw new Error(
      `JS bundle at ${bundleUrl} is too small or empty (${bundleBytes} bytes, expected > ${MIN_BUNDLE_BYTES} bytes)`,
    );
  }

  const htmlBytes = new TextEncoder().encode(htmlResult.body).byteLength;

  return {
    targetUrl,
    htmlUrl,
    scriptPath,
    bundleUrl,
    htmlBytes,
    bundleBytes,
    htmlAttempts: htmlResult.attempts,
    bundleAttempts: bundleResult.attempts,
  };
}

/**
 * CLI entrypoint.
 * @param {string[]} [argv]
 */
export async function main(argv = process.argv.slice(2)) {
  const targetArg = argv.find((arg) => !arg.startsWith('-')) ?? DEFAULT_TARGET_URL;

  try {
    const result = await runSmokeCheck({ targetUrl: targetArg });
    console.log(
      `[smoke-check] OK ${result.htmlUrl} (${result.htmlBytes} bytes, ${result.htmlAttempts} attempt(s))`,
    );
    console.log(
      `[smoke-check] OK ${result.bundleUrl} (${result.bundleBytes} bytes, ${result.bundleAttempts} attempt(s))`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[smoke-check] FAILED: ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
