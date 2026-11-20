#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_REPO = 'airflyer2/Percikan-Iman-Community';
export const DEFAULT_GH_BIN = '/opt/homebrew/bin/gh';

export const PRODUCTION_SECRET_KEYS = [
  'GEMINI_API_KEY',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_FIREBASE_DATABASE_ID',
  'VITE_RECAPTCHA_SITE_KEY',
  'VITE_RECAPTCHA_PROVIDER',
];

export const SKIPPED_LOCAL_KEYS = new Set([
  'VITE_USE_FIREBASE_EMULATOR',
  'VITE_FIREBASE_APPCHECK_DEBUG_TOKEN',
]);

export const PLACEHOLDER_VALUES = new Set(['MY_GEMINI_API_KEY']);

function parseEnvValue(rawValue) {
  if (!rawValue) {
    return '';
  }

  const quote = rawValue[0];
  if (quote === '"') {
    let out = '';
    for (let i = 1; i < rawValue.length; i++) {
      const ch = rawValue[i];
      if (ch === '\\' && i + 1 < rawValue.length) {
        const next = rawValue[i + 1];
        i++;
        if (next === 'n') {
          out += '\n';
        } else if (next === 'r') {
          out += '\r';
        } else if (next === 't') {
          out += '\t';
        } else {
          out += next;
        }
      } else if (ch === '"') {
        return out;
      } else {
        out += ch;
      }
    }
    return rawValue.slice(1);
  }

  if (quote === "'" || quote === '`') {
    const closeIdx = rawValue.indexOf(quote, 1);
    if (closeIdx !== -1) {
      return rawValue.slice(1, closeIdx);
    }
    return rawValue.slice(1);
  }

  if (rawValue.startsWith('#')) {
    return '';
  }

  const inlineCommentIdx = rawValue.search(/\s+#/);
  const cleaned = inlineCommentIdx >= 0 ? rawValue.slice(0, inlineCommentIdx) : rawValue;
  return cleaned.trim();
}

/**
 * Parse a `.env` file string into key/value pairs without relying on `dotenv`.
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseEnvContent(content) {
  /** @type {Record<string, string>} */
  const entries = {};
  if (typeof content !== 'string' || !content) {
    return entries;
  }

  const normalized = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  for (const rawLine of normalized.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const withoutExport = trimmed.startsWith('export ')
      ? trimmed.slice(7).trimStart()
      : trimmed;

    const eqIndex = withoutExport.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = withoutExport.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    const rawValue = withoutExport.slice(eqIndex + 1).trim();
    entries[key] = parseEnvValue(rawValue);
  }

  return entries;
}

/**
 * Classify production secret keys and App Check status without exposing secret values.
 * @param {Record<string, string>} envMap
 */
export function inspectProductionSecrets(envMap) {
  const keys = PRODUCTION_SECRET_KEYS.map((key) => {
    const rawValue = envMap[key] ?? '';
    const trimmed = rawValue.trim();

    /** @type {'set' | 'placeholder' | 'empty'} */
    let status = 'set';
    if (!trimmed) {
      status = 'empty';
    } else if (PLACEHOLDER_VALUES.has(trimmed)) {
      status = 'placeholder';
    }

    return { key, status };
  });

  const skippedLocalKeys = [...SKIPPED_LOCAL_KEYS].filter((key) =>
    Object.prototype.hasOwnProperty.call(envMap, key),
  );

  const hasSiteKey = Boolean((envMap.VITE_RECAPTCHA_SITE_KEY ?? '').trim());
  const providerRaw = (envMap.VITE_RECAPTCHA_PROVIDER ?? '').trim().toLowerCase();
  const appCheckProvider =
    providerRaw === 'enterprise'
      ? 'enterprise (ReCaptchaEnterpriseProvider)'
      : 'v3 (ReCaptchaV3Provider)';

  return {
    keys,
    skippedLocalKeys,
    appCheck: {
      configured: hasSiteKey,
      provider: appCheckProvider,
      hasDebugToken: Boolean((envMap.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN ?? '').trim()),
    },
  };
}

function resolveGhBinary(explicitGhBin) {
  if (explicitGhBin) {
    return explicitGhBin;
  }
  return fs.existsSync(DEFAULT_GH_BIN) ? DEFAULT_GH_BIN : 'gh';
}

/**
 * Inspect or sync production secrets from `.env` to GitHub repository secrets.
 * NEVER logs or prints secret values.
 * @param {{
 *   rootDir?: string;
 *   checkOnly?: boolean;
 *   repo?: string;
 *   ghBin?: string;
 *   execFileSyncImpl?: typeof execFileSync;
 *   logger?: { log: (...args: unknown[]) => void; warn?: (...args: unknown[]) => void };
 * }} [options]
 */
export function runSecretSync(options = {}) {
  const rootDir =
    options.rootDir ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const checkOnly = options.checkOnly ?? false;
  const repo = options.repo ?? DEFAULT_REPO;
  const logger = options.logger ?? console;
  const envPath = path.join(rootDir, '.env');

  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}. Run "npm run setup" first.`);
  }

  const envMap = parseEnvContent(fs.readFileSync(envPath, 'utf8'));
  const report = inspectProductionSecrets(envMap);

  if (checkOnly) {
    logger.log('[sync-secrets] Production secret status (--check, no network calls):');
    for (const item of report.keys) {
      const label =
        item.status === 'set'
          ? 'SET'
          : item.status === 'placeholder'
            ? 'PLACEHOLDER'
            : 'EMPTY';
      logger.log(`  [${label}] ${item.key}`);
    }

    if (report.appCheck.configured) {
      logger.log(
        `[sync-secrets] App Check: configured (provider: ${report.appCheck.provider})`,
      );
    } else {
      logger.log(
        '[sync-secrets] App Check: not configured (VITE_RECAPTCHA_SITE_KEY is empty)',
      );
    }

    if (report.appCheck.hasDebugToken) {
      logger.log(
        '[sync-secrets] Note: VITE_FIREBASE_APPCHECK_DEBUG_TOKEN is local-only and skipped during sync.',
      );
    }

    return {
      mode: 'check',
      report,
      syncedKeys: [],
      skippedKeys: report.keys.filter((k) => k.status !== 'set').map((k) => k.key),
    };
  }

  const ghBin = resolveGhBinary(options.ghBin);
  const runExecFileSync = options.execFileSyncImpl ?? execFileSync;
  const syncedKeys = [];
  const skippedKeys = [];

  for (const item of report.keys) {
    if (item.status !== 'set') {
      skippedKeys.push(item.key);
      logger.log(`[sync-secrets] Skipping ${item.key} (${item.status})`);
      continue;
    }

    const secretValue = envMap[item.key].trim();
    try {
      runExecFileSync(
        ghBin,
        ['secret', 'set', item.key, '--repo', repo],
        {
          input: secretValue,
          stdio: ['pipe', 'inherit', 'inherit'],
        },
      );
      syncedKeys.push(item.key);
      logger.log(`[sync-secrets] Synced ${item.key}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to set GitHub secret ${item.key}: ${reason}`);
    }
  }

  for (const localKey of report.skippedLocalKeys) {
    logger.log(`[sync-secrets] Skipping local-only key ${localKey}`);
  }

  logger.log(
    `[sync-secrets] Done. Synced ${syncedKeys.length} secret(s), skipped ${skippedKeys.length} empty/placeholder key(s).`,
  );

  return {
    mode: 'sync',
    report,
    syncedKeys,
    skippedKeys,
  };
}

/**
 * CLI entrypoint.
 * @param {string[]} [argv]
 */
export function main(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes('--check');

  try {
    runSecretSync({ checkOnly });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sync-secrets] ERROR: ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
