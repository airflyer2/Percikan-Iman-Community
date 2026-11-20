#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DISPOSABLE_TARGETS = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.antigravity',
  '.firebase',
  'playwright-report',
  'test-results',
  'firestore-debug.log',
  'firebase-debug.log',
  'ui-debug.log',
  'graphify-out/obsidian',
  'graphify-out/cache',
  'graphify-out/.graphify_build.json',
  'graphify-out/.graphify_labels.json',
  'graphify-out/.graphify_python',
  'graphify-out/.graphify_root',
  'graphify-out/cost.json',
  'graphify-out/manifest.json',
];

/**
 * Measure total workspace disk footprint with `du -sh`.
 * @param {string} rootDir
 * @returns {string | null}
 */
export function measureWorkspaceSize(rootDir) {
  try {
    const out = execFileSync('du', ['-sh', rootDir], { encoding: 'utf8' }).trim();
    return out.split(/\s+/)[0] || null;
  } catch {
    return null;
  }
}

/**
 * Remove disposable build, test, and dependency artifacts while preserving `.git/` and `.env`.
 * @param {{ rootDir?: string; dryRun?: boolean; logger?: Pick<Console, 'log'> }} [options]
 * @returns {{ rootDir: string; dryRun: boolean; found: string[]; removed: string[]; envPresent: boolean; sizeLabel: string | null }}
 */
export function runSlim(options = {}) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(options.rootDir ?? path.resolve(scriptDir, '..'));
  const dryRun = Boolean(options.dryRun);
  const logger = options.logger ?? console;

  const found = DISPOSABLE_TARGETS.filter((relPath) =>
    fs.existsSync(path.join(rootDir, relPath)),
  );

  const removed = [];
  if (found.length === 0) {
    logger.log('[slim] Already slim — no disposable directories or caches found.');
  } else if (dryRun) {
    logger.log(`[slim] Dry run — found ${found.length} disposable target(s):`);
    for (const relPath of found) {
      logger.log(`  - ${relPath}`);
    }
  } else {
    for (const relPath of found) {
      fs.rmSync(path.join(rootDir, relPath), { recursive: true, force: true });
      removed.push(relPath);
      logger.log(`[slim] Removed ${relPath}`);
    }
  }

  const envPresent = fs.existsSync(path.join(rootDir, '.env'));
  const gitPresent = fs.existsSync(path.join(rootDir, '.git'));
  logger.log(
    `[slim] Preserved ${envPresent ? '.env' : '(no .env)'} and ${gitPresent ? '.git/' : '(no .git/)'}`,
  );

  const sizeLabel = measureWorkspaceSize(rootDir);
  if (sizeLabel) {
    logger.log(`[slim] Workspace disk footprint: ${sizeLabel}`);
  }

  return { rootDir, dryRun, found, removed, envPresent, sizeLabel };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run') || args.has('--check');
  runSlim({ dryRun });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
