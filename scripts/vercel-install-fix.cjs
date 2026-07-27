#!/usr/bin/env node
/**
 * IPO KING - Cross-platform fixer for node_modules/.bin executable permissions.
 *
 * Why this exists:
 *   When you run `npm install` on Windows and then deploy the node_modules
 *   (or git cache / lockfile artifacts) to Vercel's Linux build containers,
 *   the wrapper scripts in node_modules/.bin (like `vite`, `rollup`, etc.)
 *   lose their Unix execute permission (chmod +x). Running them then fails
 *   with: "Permission denied" (shell exit code 126).
 *
 * This script runs in `install`, `postinstall`, and `prebuild` hooks to
 * guarantee every file in node_modules/.bin is chmod 0755 BEFORE any
 * command tries to execute them. It's tolerant to errors (no-op on
 * Windows, tolerates missing files, never throws).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_ATTEMPTS = 3;

function chmodAllInBin(binDir) {
  if (!binDir || !fs.existsSync(binDir)) return 0;
  const stat = fs.statSync(binDir, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory()) return 0;

  let fixed = 0;
  const entries = fs.readdirSync(binDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(binDir, entry.name);
    if (entry.isDirectory()) continue;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        fs.chmodSync(full, 0o755);
        fixed++;
        break;
      } catch (_) {
        // On Windows, EPERM is normal. On Linux, transient issues sometimes
        // resolve on retry. Always swallow silently: worst case, we just
        // keep going and the original "permission denied" error will still
        // surface downstream, which is better than crashing install.
      }
    }
  }
  return fixed;
}

function main() {
  let cwd = process.cwd();
  try {
    if (__dirname && process.env.INIT_CWD) cwd = process.env.INIT_CWD;
  } catch (_) { /* noop */ }

  const candidates = [];

  // 1. cwd/node_modules/.bin (the normal project case)
  candidates.push(path.join(cwd, 'node_modules', '.bin'));

  // 2. Walk up from __dirname - sometimes invoked from nested workspaces
  try {
    let d = path.resolve(__dirname || cwd);
    for (let i = 0; i < 8; i++) {
      candidates.push(path.join(d, 'node_modules', '.bin'));
      const parent = path.dirname(d);
      if (!parent || parent === d) break;
      d = parent;
    }
  } catch (_) { /* noop */ }

  let total = 0;
  const seen = new Set();
  for (const dir of candidates) {
    const key = path.normalize(dir);
    if (seen.has(key)) continue;
    seen.add(key);
    if (fs.existsSync(dir)) {
      const n = chmodAllInBin(dir);
      total += n;
      if (n > 0) {
        process.stdout.write(
          `[vercel-install] chmod +x ${n} bin script(s) in ${dir}\n`
        );
      }
    }
  }

  // Also try to chmod vite directly by its package path as a last resort
  try {
    const viteMain = require.resolve('vite', { paths: [cwd, process.cwd(), __dirname || cwd] });
    // vite entry is .../vite/bin/vite.js typically; walk up to package root
    let maybe = viteMain;
    for (let i = 0; i < 5; i++) {
      const parent = path.dirname(maybe);
      const binDir2 = path.join(parent, 'node_modules', '.bin');
      if (!seen.has(binDir2) && fs.existsSync(binDir2)) {
        const n = chmodAllInBin(binDir2);
        total += n;
        if (n > 0) process.stdout.write(`[vercel-install] chmod +x ${n} in ${binDir2}\n`);
        seen.add(binDir2);
      }
      const viteBin = path.join(parent, '.bin');
      if (!seen.has(viteBin) && fs.existsSync(viteBin)) {
        const n = chmodAllInBin(viteBin);
        total += n;
        if (n > 0) process.stdout.write(`[vercel-install] chmod +x ${n} in ${viteBin}\n`);
        seen.add(viteBin);
      }
      if (parent === maybe) break;
      maybe = parent;
    }
  } catch (_) { /* vite not yet installed - fine */ }

  process.stdout.write(`[vercel-install] done. fixed total=${total}\n`);
  process.exit(0);
}

try {
  main();
} catch (_) {
  process.exit(0);
}
