#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const BLOCKED_PATH_RULES = [
  {
    name: 'Environment secret file (.env)',
    test: (filePath) => /(^|\/)\.env(\..+)?$/i.test(filePath) && !/(^|\/)\.env\.example$/i.test(filePath),
  },
  {
    name: 'Private key / certificate (.pem, .key, .p12)',
    test: (filePath) => /\.(pem|key|p12)$/i.test(filePath),
  },
  {
    name: 'Service account / credentials JSON',
    test: (filePath) => /(?:^|\/)[^/]*(?:service-account|credentials)[^/]*\.json$/i.test(filePath),
  },
  {
    name: 'Local agent state (.antigravity/)',
    test: (filePath) => /^\.antigravity\//.test(filePath),
  },
  {
    name: 'Local Firebase cache (.firebase/)',
    test: (filePath) => /^\.firebase\//.test(filePath),
  },
];

const SECRET_LINE_RULES = [
  {
    name: 'Private key block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?KEY-----/,
  },
  {
    name: 'Google service account JSON payload',
    regex: /"type"\s*:\s*"service_account"|"private_key"\s*:\s*"-----BEGIN/,
  },
  {
    name: 'GitHub token',
    regex: /\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/,
  },
  {
    name: 'Cloud / API secret key',
    regex: /\b(?:AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,})\b/,
  },
  {
    name: 'Hardcoded GEMINI_API_KEY value',
    regex: /^\+.*GEMINI_API_KEY\s*=\s*["']?(?!MY_GEMINI_API_KEY|\$\{\{|["']?\s*$)[^\s"']{16,}/,
  },
];

function runGit(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options });
}

function defaultCommitMessage() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `chore: sync workspace changes (${stamp})`;
}

function getStagedFiles() {
  const raw = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']);
  return raw
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

function checkStagedGuard(repoRoot, stagedFiles) {
  const violations = [];

  for (const filePath of stagedFiles) {
    for (const rule of BLOCKED_PATH_RULES) {
      if (rule.test(filePath)) {
        violations.push(`${filePath}: blocked by "${rule.name}"`);
      }
    }

    const fullPath = path.join(repoRoot, filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isFile() && stats.size > MAX_FILE_SIZE_BYTES) {
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        violations.push(`${filePath}: file size ${sizeMb} MB exceeds the 10 MB limit`);
      }
    }
  }

  const diffText = execFileSync('git', ['diff', '--cached', '-U0', '--no-color'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  let currentFile = '';
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
      continue;
    }
    if (line.startsWith('+++ ') || !line.startsWith('+')) {
      continue;
    }
    if (/(^|\/)\.env\.example$/i.test(currentFile)) {
      continue;
    }
    for (const rule of SECRET_LINE_RULES) {
      if (rule.regex.test(line)) {
        violations.push(`${currentFile || '(staged diff)'}: potential ${rule.name} detected in added line`);
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n[git-save] Pre-Sync Secret & Size Guard blocked this commit:\n');
    for (const item of violations) {
      console.error(`  - ${item}`);
    }
    console.error('\n[git-save] Unstaging changes safely...');
    execFileSync('git', ['reset'], { stdio: 'inherit' });
    process.exit(1);
  }
}

function main() {
  const repoRoot = runGit(['rev-parse', '--show-toplevel']).trim();
  const message = process.argv.slice(2).join(' ').trim() || defaultCommitMessage();

  console.log('[git-save] Staging workspace changes...');
  execFileSync('git', ['add', '-A'], { cwd: repoRoot, stdio: 'inherit' });

  const stagedFiles = getStagedFiles();
  if (stagedFiles.length > 0) {
    console.log(`[git-save] Checking ${stagedFiles.length} staged file(s) against Secret & Size Guard...`);
    checkStagedGuard(repoRoot, stagedFiles);

    const localTsc = path.join(repoRoot, 'node_modules', '.bin', 'tsc');
    if (fs.existsSync(localTsc)) {
      console.log('[git-save] Running TypeScript check (npm run lint)...');
      execFileSync('npm', ['run', 'lint'], { cwd: repoRoot, stdio: 'inherit' });
    } else {
      console.log('[git-save] node_modules not present locally; skipping local lint (GitHub Actions will run lint & tests on push).');
    }

    console.log(`[git-save] Committing: ${message}`);
    execFileSync('git', ['commit', '-m', message], { cwd: repoRoot, stdio: 'inherit' });
  } else {
    console.log('[git-save] No local changes to commit; checking remote sync...');
  }

  console.log('[git-save] Rebasing on origin/main...');
  execFileSync('git', ['pull', '--rebase', 'origin', 'main'], { cwd: repoRoot, stdio: 'inherit' });

  console.log('[git-save] Pushing to origin/main...');
  execFileSync('git', ['push', 'origin', 'main'], { cwd: repoRoot, stdio: 'inherit' });

  console.log('[git-save] Done! Workspace is synced with GitHub.');
}

main();
