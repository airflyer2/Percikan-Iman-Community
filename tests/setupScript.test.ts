import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TRACKED_ENV_KEYS,
  checkNodeVersion,
  detectJava,
  inspectEnvFile,
  parseEnvContent,
  parseJavaVersion,
  runSetup,
} from '../scripts/setup.mjs';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'percikan-setup-test-'));
  tempDirs.push(dir);
  return dir;
}

function createMockLogger() {
  const lines: string[] = [];
  const capture = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  return {
    lines,
    logger: {
      log: vi.fn(capture),
      warn: vi.fn(capture),
      error: vi.fn(capture),
    },
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('scripts/setup.mjs', () => {
  it('parseJavaVersion parses modern, legacy 1.8, early-access, and invalid outputs', () => {
    expect(
      parseJavaVersion(
        'openjdk version "21.0.5" 2024-10-15 LTS\nOpenJDK Runtime Environment Temurin-21.0.5+11',
      ),
    ).toEqual({ raw: '21.0.5', major: 21 });

    expect(parseJavaVersion('java version "11.0.24" 2024-07-16')).toEqual({
      raw: '11.0.24',
      major: 11,
    });

    expect(parseJavaVersion('java version "1.8.0_412"')).toEqual({
      raw: '1.8.0_412',
      major: 8,
    });

    expect(parseJavaVersion('openjdk version "23-ea" 2024-09-17')).toEqual({
      raw: '23-ea',
      major: 23,
    });

    expect(parseJavaVersion('openjdk 17.0.9 2023-10-17')).toEqual({
      raw: '17.0.9',
      major: 17,
    });

    expect(
      parseJavaVersion(
        'The operation couldn’t be completed. Unable to locate a Java Runtime.',
      ),
    ).toBeNull();
    expect(parseJavaVersion('')).toBeNull();
  });

  it('checkNodeVersion validates major >= 22', () => {
    expect(checkNodeVersion({ nodeVersion: '22.14.0' })).toEqual({
      raw: '22.14.0',
      major: 22,
      satisfied: true,
      requiredMajor: 22,
    });
    expect(checkNodeVersion({ nodeVersion: 'v26.0.0' })).toEqual({
      raw: '26.0.0',
      major: 26,
      satisfied: true,
      requiredMajor: 22,
    });
    expect(checkNodeVersion({ nodeVersion: '20.18.1' })).toEqual({
      raw: '20.18.1',
      major: 20,
      satisfied: false,
      requiredMajor: 22,
    });
  });

  it('detectJava probes macOS Homebrew OpenJDK paths when PATH java stub fails', () => {
    const brewJava21 = '/opt/homebrew/opt/openjdk@21/bin/java';
    const result = detectJava({
      platform: 'darwin',
      env: {},
      existsSyncFn: (filePath) => filePath === brewJava21,
      spawnSyncFn: (cmd) => {
        if (cmd === 'java') {
          return {
            status: 1,
            stdout: '',
            stderr: 'Unable to locate a Java Runtime.',
          };
        }
        if (cmd === brewJava21) {
          return {
            status: 0,
            stdout: '',
            stderr: 'openjdk version "21.0.5" 2024-10-15',
          };
        }
        return { status: 1, stdout: '', stderr: '' };
      },
    });

    expect(result).toEqual({
      available: true,
      satisfied: true,
      executable: brewJava21,
      version: '21.0.5',
      major: 21,
      requiredMajor: 11,
    });

    const missingResult = detectJava({
      platform: 'darwin',
      env: {},
      existsSyncFn: () => false,
      spawnSyncFn: () => ({ status: 1, stdout: '', stderr: '' }),
    });
    expect(missingResult).toEqual({
      available: false,
      satisfied: false,
      executable: null,
      version: null,
      major: null,
      requiredMajor: 11,
    });
  });

  it('parseEnvContent handles quotes, exports, and inline comments', () => {
    const parsed = parseEnvContent(`
      # Comment line
      export VITE_FIREBASE_API_KEY="abc-123"
      VITE_FIREBASE_DATABASE_ID='(default)'
      GEMINI_API_KEY=MY_GEMINI_API_KEY # default placeholder
      EMPTY_KEY=""
    `);

    expect(parsed).toEqual({
      VITE_FIREBASE_API_KEY: 'abc-123',
      VITE_FIREBASE_DATABASE_ID: '(default)',
      GEMINI_API_KEY: 'MY_GEMINI_API_KEY',
      EMPTY_KEY: '',
    });
  });

  it('inspectEnvFile handles missing .env and classifies configured vs empty/placeholder keys without exposing values', () => {
    const emptyDir = createTempDir();
    fs.writeFileSync(path.join(emptyDir, '.env.example'), 'GEMINI_API_KEY="MY_GEMINI_API_KEY"\n');

    const missingReport = inspectEnvFile(emptyDir);
    expect(missingReport.exists).toBe(false);
    expect(missingReport.exampleExists).toBe(true);
    expect(missingReport.configured).toEqual([]);
    expect(missingReport.missing).toEqual([...TRACKED_ENV_KEYS]);

    const configuredDir = createTempDir();
    const secretSentinel = 'SENTINEL_SECRET_DO_NOT_LEAK_9911';
    fs.writeFileSync(
      path.join(configuredDir, '.env'),
      [
        `VITE_FIREBASE_API_KEY="${secretSentinel}"`,
        'VITE_FIREBASE_AUTH_DOMAIN="percikan-iman-724ae.firebaseapp.com"',
        'VITE_FIREBASE_PROJECT_ID="percikan-iman-724ae"',
        'VITE_FIREBASE_DATABASE_ID="(default)"',
        'VITE_FIREBASE_STORAGE_BUCKET=""',
        'VITE_FIREBASE_MESSAGING_SENDER_ID="   "',
        'GEMINI_API_KEY="MY_GEMINI_API_KEY"',
        'VITE_RECAPTCHA_PROVIDER="enterprise"',
      ].join('\n'),
    );

    const report = inspectEnvFile(configuredDir);
    expect(report.exists).toBe(true);
    expect(report.configured).toEqual([
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_DATABASE_ID',
      'VITE_RECAPTCHA_PROVIDER',
    ]);
    expect(report.empty).toEqual([
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
    ]);
    expect(report.placeholder).toEqual(['GEMINI_API_KEY']);
    expect(report.missing).toEqual([
      'VITE_FIREBASE_APP_ID',
      'VITE_FIREBASE_MEASUREMENT_ID',
      'VITE_RECAPTCHA_SITE_KEY',
    ]);
    expect(report.statuses.GEMINI_API_KEY).toBe('placeholder');
    expect(report.statuses.VITE_FIREBASE_API_KEY).toBe('configured');
    expect(JSON.stringify(report)).not.toContain(secretSentinel);
  });

  it('runSetup({ rootDir, checkOnly: true }) checks without mutating .env or running npm ci and never logs secret values', () => {
    const tempDir = createTempDir();
    const secretSentinel = 'TOP_SECRET_VALUE_ABC_777';
    fs.writeFileSync(
      path.join(tempDir, '.env.example'),
      `GEMINI_API_KEY="${secretSentinel}"\n`,
    );

    const npmRunner = vi.fn(() => ({ status: 0 }));
    const { lines, logger } = createMockLogger();

    const result = runSetup({
      rootDir: tempDir,
      checkOnly: true,
      nodeVersion: '22.14.0',
      javaDetector: () => ({
        available: false,
        satisfied: false,
        executable: null,
        version: null,
        major: null,
        requiredMajor: 11,
      }),
      npmRunner,
      logger,
    });

    expect(result.ok).toBe(true);
    expect(result.env.exists).toBe(false);
    expect(result.env.createdFromExample).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.env'))).toBe(false);
    expect(npmRunner).not.toHaveBeenCalled();
    expect(result.warnings.some((w) => w.includes('brew install openjdk@21'))).toBe(
      true,
    );

    // Now test with an existing .env containing a real secret sentinel
    fs.copyFileSync(
      path.join(tempDir, '.env.example'),
      path.join(tempDir, '.env'),
    );
    const secondRun = runSetup({
      rootDir: tempDir,
      checkOnly: true,
      nodeVersion: '22.14.0',
      javaDetector: () => ({
        available: true,
        satisfied: true,
        executable: '/opt/homebrew/opt/openjdk@21/bin/java',
        version: '21.0.5',
        major: 21,
        requiredMajor: 11,
      }),
      npmRunner,
      logger,
    });

    expect(secondRun.ok).toBe(true);
    expect(secondRun.env.configured).toEqual(['GEMINI_API_KEY']);
    expect(lines.join('\n')).not.toContain(secretSentinel);
  });

  it('runSetup fails clearly on Node < 22 or missing Java when requireJava is true', () => {
    const tempDir = createTempDir();
    const npmRunner = vi.fn(() => ({ status: 0 }));
    const { logger } = createMockLogger();

    const oldNodeResult = runSetup({
      rootDir: tempDir,
      checkOnly: true,
      nodeVersion: '20.11.0',
      javaDetector: () => ({
        available: true,
        satisfied: true,
        executable: 'java',
        version: '21.0.5',
        major: 21,
        requiredMajor: 11,
      }),
      npmRunner,
      logger,
    });
    expect(oldNodeResult.ok).toBe(false);
    expect(oldNodeResult.errors[0]).toContain('Node.js >= 22');

    const missingJavaRequiredResult = runSetup({
      rootDir: tempDir,
      checkOnly: true,
      requireJava: true,
      nodeVersion: '22.14.0',
      javaDetector: () => ({
        available: false,
        satisfied: false,
        executable: null,
        version: null,
        major: null,
        requiredMajor: 11,
      }),
      npmRunner,
      logger,
    });
    expect(missingJavaRequiredResult.ok).toBe(false);
    expect(missingJavaRequiredResult.errors[0]).toContain('brew install openjdk@21');
  });

  it('runSetup copies .env.example to .env and runs npm ci when checkOnly is false', () => {
    const tempDir = createTempDir();
    fs.writeFileSync(
      path.join(tempDir, '.env.example'),
      'GEMINI_API_KEY="MY_GEMINI_API_KEY"\nVITE_FIREBASE_PROJECT_ID="percikan-iman-724ae"\n',
    );
    const npmRunner = vi.fn(() => ({ status: 0 }));
    const { logger } = createMockLogger();

    const result = runSetup({
      rootDir: tempDir,
      checkOnly: false,
      nodeVersion: '22.14.0',
      javaDetector: () => ({
        available: true,
        satisfied: true,
        executable: 'java',
        version: '21.0.5',
        major: 21,
        requiredMajor: 11,
      }),
      npmRunner,
      logger,
    });

    expect(result.ok).toBe(true);
    expect(result.env.createdFromExample).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.env'))).toBe(true);
    expect(result.env.configured).toEqual(['VITE_FIREBASE_PROJECT_ID']);
    expect(result.env.placeholder).toEqual(['GEMINI_API_KEY']);
    expect(npmRunner).toHaveBeenCalledTimes(1);
    expect(npmRunner).toHaveBeenCalledWith(path.resolve(tempDir));

    const failedNpmResult = runSetup({
      rootDir: tempDir,
      checkOnly: false,
      nodeVersion: '22.14.0',
      javaDetector: () => ({
        available: true,
        satisfied: true,
        executable: 'java',
        version: '21.0.5',
        major: 21,
        requiredMajor: 11,
      }),
      npmRunner: () => ({ status: 1 }),
      logger,
    });
    expect(failedNpmResult.ok).toBe(false);
    expect(failedNpmResult.npmCi).toEqual({ ran: true, ok: false, status: 1 });
  });

  it('spawns node scripts/setup.mjs --check cleanly without failing or mutating repo root', () => {
    const repoRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
    );
    const setupScriptPath = path.join(repoRoot, 'scripts', 'setup.mjs');
    const envExistedBefore = fs.existsSync(path.join(repoRoot, '.env'));

    const stdout = execFileSync(process.execPath, [setupScriptPath, '--check'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(stdout).toContain('[setup] Node.js v');
    expect(stdout).toContain('>= 22 required): OK');
    expect(fs.existsSync(path.join(repoRoot, '.env'))).toBe(envExistedBefore);
  });
});
