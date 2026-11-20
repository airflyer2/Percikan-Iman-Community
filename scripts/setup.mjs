#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_NODE_MAJOR = 22;
export const REQUIRED_JAVA_MAJOR = 11;

export const MACOS_JAVA_CANDIDATES = [
  '/opt/homebrew/opt/openjdk/bin/java',
  '/opt/homebrew/opt/openjdk@21/bin/java',
  '/opt/homebrew/opt/openjdk@17/bin/java',
  '/opt/homebrew/opt/openjdk@11/bin/java',
];

export const TRACKED_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_FIREBASE_DATABASE_ID',
  'GEMINI_API_KEY',
  'VITE_RECAPTCHA_SITE_KEY',
  'VITE_RECAPTCHA_PROVIDER',
];

export const PLACEHOLDER_VALUES = new Set(['MY_GEMINI_API_KEY']);

/**
 * Parse a Node.js version string (e.g. `22.14.0` or `v26.0.0`).
 * @param {string} versionString
 * @returns {{ raw: string; major: number } | null}
 */
export function parseNodeVersion(versionString) {
  if (typeof versionString !== 'string') {
    return null;
  }
  const cleaned = versionString.trim().replace(/^v/i, '');
  const match = cleaned.match(/^(\d+)(?:\.\d+)?(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const major = Number.parseInt(match[1], 10);
  if (!Number.isFinite(major)) {
    return null;
  }
  return { raw: cleaned, major };
}

/**
 * Verify that the active Node.js runtime meets the minimum major version.
 * @param {{ nodeVersion?: string; minMajor?: number }} [options]
 * @returns {{ raw: string; major: number | null; satisfied: boolean; requiredMajor: number }}
 */
export function checkNodeVersion(options = {}) {
  const minMajor = options.minMajor ?? REQUIRED_NODE_MAJOR;
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const parsed = parseNodeVersion(nodeVersion);
  if (!parsed) {
    return {
      raw: String(nodeVersion ?? ''),
      major: null,
      satisfied: false,
      requiredMajor: minMajor,
    };
  }
  return {
    raw: parsed.raw,
    major: parsed.major,
    satisfied: parsed.major >= minMajor,
    requiredMajor: minMajor,
  };
}

/**
 * Parse `java -version` (or `java --version`) output into `{ raw, major }`.
 * Handles modern (`"21.0.5"`, `"17-ea"`) and legacy (`"1.8.0_412"`) JDK version strings.
 * @param {string} output
 * @returns {{ raw: string; major: number } | null}
 */
export function parseJavaVersion(output) {
  if (typeof output !== 'string' || !output.trim()) {
    return null;
  }

  const quotedMatch = output.match(/\bversion\s+"([^"]+)"/i);
  const unquotedMatch = !quotedMatch
    ? output.match(/\b(?:openjdk|java)\s+(\d+(?:\.\d+)*(?:-[A-Za-z0-9.]+)?)/i)
    : null;

  const raw = (quotedMatch?.[1] ?? unquotedMatch?.[1] ?? '').trim();
  if (!raw) {
    return null;
  }

  const numericParts = raw.match(/^(\d+)(?:\.(\d+))?/);
  if (!numericParts) {
    return null;
  }

  const first = Number.parseInt(numericParts[1], 10);
  const second = numericParts[2] ? Number.parseInt(numericParts[2], 10) : null;
  const major = first === 1 && second !== null ? second : first;

  if (!Number.isFinite(major) || major <= 0) {
    return null;
  }

  return { raw, major };
}

/**
 * Probe available Java executables (`java`, `JAVA_HOME`, and macOS Homebrew OpenJDK paths).
 * @param {{
 *   platform?: string;
 *   env?: Record<string, string | undefined>;
 *   existsSyncFn?: (filePath: string) => boolean;
 *   spawnSyncFn?: (
 *     command: string,
 *     args: string[],
 *     options: Record<string, unknown>,
 *   ) => { status?: number | null; stdout?: string | null; stderr?: string | null; error?: Error };
 *   minMajor?: number;
 * }} [options]
 * @returns {{
 *   available: boolean;
 *   satisfied: boolean;
 *   executable: string | null;
 *   version: string | null;
 *   major: number | null;
 *   requiredMajor: number;
 * }}
 */
export function detectJava(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const existsSyncFn = options.existsSyncFn ?? fs.existsSync;
  const spawnSyncFn = options.spawnSyncFn ?? spawnSync;
  const minMajor = options.minMajor ?? REQUIRED_JAVA_MAJOR;

  const candidates = ['java'];
  if (env.JAVA_HOME) {
    const javaBin = platform === 'win32' ? 'java.exe' : 'java';
    candidates.push(path.join(env.JAVA_HOME, 'bin', javaBin));
  }
  if (platform === 'darwin') {
    candidates.push(...MACOS_JAVA_CANDIDATES);
  }

  const uniqueCandidates = [...new Set(candidates)];
  /** @type {{ available: boolean; satisfied: boolean; executable: string; version: string; major: number; requiredMajor: number } | null} */
  let fallback = null;

  for (const candidate of uniqueCandidates) {
    if (candidate !== 'java' && !existsSyncFn(candidate)) {
      continue;
    }

    const result = spawnSyncFn(candidate, ['-version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!result || result.error || result.status !== 0) {
      continue;
    }

    const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
    const parsed = parseJavaVersion(combinedOutput);
    if (!parsed) {
      continue;
    }

    if (parsed.major >= minMajor) {
      return {
        available: true,
        satisfied: true,
        executable: candidate,
        version: parsed.raw,
        major: parsed.major,
        requiredMajor: minMajor,
      };
    }

    if (!fallback) {
      fallback = {
        available: true,
        satisfied: false,
        executable: candidate,
        version: parsed.raw,
        major: parsed.major,
        requiredMajor: minMajor,
      };
    }
  }

  return (
    fallback ?? {
      available: false,
      satisfied: false,
      executable: null,
      version: null,
      major: null,
      requiredMajor: minMajor,
    }
  );
}

/**
 * Parse a single `.env` value token, stripping outer quotes and unquoted inline comments.
 * @param {string} rawValue
 * @returns {string}
 */
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
    return closeIdx !== -1 ? rawValue.slice(1, closeIdx) : rawValue.slice(1);
  }

  if (rawValue.startsWith('#')) {
    return '';
  }

  const inlineCommentIdx = rawValue.search(/\s+#/);
  const cleaned = inlineCommentIdx >= 0 ? rawValue.slice(0, inlineCommentIdx) : rawValue;
  return cleaned.trim();
}

/**
 * Parse `.env` file text into key/value pairs using only Node.js built-ins.
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
 * Inspect `.env` and `.env.example` in `rootDir` and classify tracked keys WITHOUT exposing secret values.
 * @param {string} rootDir
 * @param {readonly string[]} [keys]
 * @returns {{
 *   envPath: string;
 *   examplePath: string;
 *   exists: boolean;
 *   exampleExists: boolean;
 *   configured: string[];
 *   empty: string[];
 *   placeholder: string[];
 *   missing: string[];
 *   unconfigured: string[];
 *   statuses: Record<string, 'configured' | 'empty' | 'placeholder' | 'missing'>;
 * }}
 */
export function inspectEnvFile(rootDir, keys = TRACKED_ENV_KEYS) {
  const envPath = path.join(rootDir, '.env');
  const examplePath = path.join(rootDir, '.env.example');
  const exists = fs.existsSync(envPath);
  const exampleExists = fs.existsSync(examplePath);

  /** @type {Record<string, 'configured' | 'empty' | 'placeholder' | 'missing'>} */
  const statuses = {};

  if (!exists) {
    for (const key of keys) {
      statuses[key] = 'missing';
    }
    return {
      envPath,
      examplePath,
      exists: false,
      exampleExists,
      configured: [],
      empty: [],
      placeholder: [],
      missing: [...keys],
      unconfigured: [...keys],
      statuses,
    };
  }

  const entries = parseEnvContent(fs.readFileSync(envPath, 'utf8'));
  /** @type {string[]} */
  const configured = [];
  /** @type {string[]} */
  const empty = [];
  /** @type {string[]} */
  const placeholder = [];
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const unconfigured = [];

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) {
      statuses[key] = 'missing';
      missing.push(key);
      unconfigured.push(key);
      continue;
    }

    const trimmedValue = entries[key].trim();
    if (!trimmedValue) {
      statuses[key] = 'empty';
      empty.push(key);
      unconfigured.push(key);
      continue;
    }

    if (PLACEHOLDER_VALUES.has(trimmedValue)) {
      statuses[key] = 'placeholder';
      placeholder.push(key);
      unconfigured.push(key);
      continue;
    }

    statuses[key] = 'configured';
    configured.push(key);
  }

  return {
    envPath,
    examplePath,
    exists: true,
    exampleExists,
    configured,
    empty,
    placeholder,
    missing,
    unconfigured,
    statuses,
  };
}

function defaultNpmCiRunner(rootDir) {
  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmBin, ['ci'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return {
    status: result.status,
    error: result.error,
  };
}

/**
 * Run workspace setup checks and (unless `checkOnly` is true) `.env` bootstrap + `npm ci`.
 * @param {{
 *   rootDir?: string;
 *   checkOnly?: boolean;
 *   requireJava?: boolean;
 *   nodeVersion?: string;
 *   javaDetector?: () => {
 *     available: boolean;
 *     satisfied: boolean;
 *     executable: string | null;
 *     version: string | null;
 *     major: number | null;
 *     requiredMajor?: number;
 *   };
 *   npmRunner?: (rootDir: string) => { status: number | null; error?: Error };
 *   logger?: {
 *     log: (...args: unknown[]) => void;
 *     warn: (...args: unknown[]) => void;
 *     error: (...args: unknown[]) => void;
 *   };
 * }} [options]
 */
export function runSetup(options = {}) {
  const rootDir = path.resolve(
    options.rootDir ??
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  );
  const checkOnly = options.checkOnly ?? false;
  const requireJava = options.requireJava ?? false;
  const logger = options.logger ?? console;
  const javaDetector = options.javaDetector ?? (() => detectJava());
  const npmRunner = options.npmRunner ?? defaultNpmCiRunner;

  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const errors = [];

  // 1. Node.js >= 22 check
  const nodeCheck = checkNodeVersion({ nodeVersion: options.nodeVersion });
  if (nodeCheck.satisfied) {
    logger.log(
      `[setup] Node.js v${nodeCheck.raw} (>= ${REQUIRED_NODE_MAJOR} required): OK`,
    );
  } else {
    const msg = `Node.js >= ${REQUIRED_NODE_MAJOR} is required (detected v${nodeCheck.raw || 'unknown'}).`;
    errors.push(msg);
    logger.error(`[setup] ERROR: ${msg}`);
  }

  // 2. Java >= 11 check (required for local Firestore Rules Emulator)
  const javaCheck = javaDetector();
  if (javaCheck.satisfied) {
    logger.log(
      `[setup] Java ${javaCheck.version} (${javaCheck.executable}, >= ${REQUIRED_JAVA_MAJOR} required): OK`,
    );
  } else {
    const javaMsg = javaCheck.available
      ? `Java >= ${REQUIRED_JAVA_MAJOR} is required for local Firestore Rules Emulator tests (found Java ${javaCheck.version} at ${javaCheck.executable}). Install hint: brew install openjdk@21`
      : `Java >= ${REQUIRED_JAVA_MAJOR} was not found (needed for local Firestore Rules Emulator tests). Install hint: brew install openjdk@21`;

    if (requireJava) {
      errors.push(javaMsg);
      logger.error(`[setup] ERROR: ${javaMsg}`);
    } else {
      warnings.push(javaMsg);
      logger.warn(`[setup] WARN: ${javaMsg}`);
    }
  }

  // 3. .env presence & key status (NEVER print secret values)
  const envPath = path.join(rootDir, '.env');
  const examplePath = path.join(rootDir, '.env.example');
  let createdFromExample = false;

  if (!fs.existsSync(envPath) && fs.existsSync(examplePath) && !checkOnly) {
    fs.copyFileSync(examplePath, envPath);
    createdFromExample = true;
    logger.log(
      '[setup] Created .env from .env.example (populate required secrets before build/deploy).',
    );
  }

  const envReport = inspectEnvFile(rootDir);
  if (!envReport.exists) {
    const missingEnvMsg = envReport.exampleExists
      ? '.env is missing (.env.example is present; run "npm run setup" to create .env).'
      : '.env is missing and no .env.example template was found.';
    warnings.push(missingEnvMsg);
    logger.warn(`[setup] WARN: ${missingEnvMsg}`);
  } else {
    logger.log(
      `[setup] .env present: ${envReport.configured.length}/${TRACKED_ENV_KEYS.length} tracked keys configured.`,
    );
    if (envReport.configured.length > 0) {
      logger.log(`[setup]   Configured: ${envReport.configured.join(', ')}`);
    }
    if (envReport.unconfigured.length > 0) {
      const detail = envReport.unconfigured
        .map((key) => `${key} (${envReport.statuses[key]})`)
        .join(', ');
      logger.warn(`[setup]   Empty/placeholder/missing: ${detail}`);
      warnings.push(
        `Unconfigured .env keys: ${envReport.unconfigured.join(', ')}`,
      );
    }
  }

  // 4. Rehydrate node_modules via npm ci unless --check
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  let nodeModulesExists = fs.existsSync(nodeModulesPath);
  let npmCi = { ran: false, ok: true, status: /** @type {number | null} */ (null) };

  if (checkOnly) {
    if (nodeModulesExists) {
      logger.log('[setup] node_modules/ present: OK');
    } else {
      const msg =
        'node_modules/ is absent (slimmed mode). Run "npm run setup" or "npm ci" to rehydrate.';
      warnings.push(msg);
      logger.warn(`[setup] WARN: ${msg}`);
    }
  } else if (errors.length > 0) {
    npmCi = { ran: false, ok: false, status: null };
  } else {
    logger.log('[setup] Running npm ci to rehydrate dependencies...');
    const result = npmRunner(rootDir);
    const status = result.status ?? 1;
    if (result.error || status !== 0) {
      const reason = result.error
        ? result.error.message
        : `exit code ${status}`;
      const msg = `npm ci failed (${reason}).`;
      errors.push(msg);
      logger.error(`[setup] ERROR: ${msg}`);
      npmCi = { ran: true, ok: false, status };
    } else {
      npmCi = { ran: true, ok: true, status: 0 };
      nodeModulesExists = fs.existsSync(nodeModulesPath);
      logger.log('[setup] Dependencies rehydrated via npm ci: OK');
    }
  }

  return {
    ok: errors.length === 0,
    checkOnly,
    requireJava,
    rootDir,
    node: nodeCheck,
    java: javaCheck,
    env: {
      ...envReport,
      createdFromExample,
    },
    nodeModulesExists,
    npmCi,
    warnings,
    errors,
  };
}

/**
 * Parse CLI flags for `scripts/setup.mjs`.
 * @param {string[]} argv
 */
export function parseCliArgs(argv) {
  let checkOnly = false;
  let requireJava = false;
  let help = false;

  for (const arg of argv) {
    if (arg === '--check') {
      checkOnly = true;
    } else if (arg === '--require-java') {
      requireJava = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { checkOnly, requireJava, help };
}

/**
 * CLI entrypoint.
 * @param {string[]} [argv]
 */
export function main(argv = process.argv.slice(2)) {
  try {
    const { checkOnly, requireJava, help } = parseCliArgs(argv);
    if (help) {
      console.log(
        'Usage: node scripts/setup.mjs [--check] [--require-java]\n' +
          '  --check         Run diagnostics without writing .env or running npm ci\n' +
          '  --require-java  Exit non-zero if Java >= 11 is not installed',
      );
      return;
    }

    const result = runSetup({ checkOnly, requireJava });
    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[setup] ERROR: ${message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
