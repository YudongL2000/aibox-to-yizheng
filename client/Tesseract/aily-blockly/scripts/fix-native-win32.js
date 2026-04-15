#!/usr/bin/env node
/**
 * fix-native-win32.js
 *
 * Runs after `npm install`. When npm is invoked from WSL on a Windows path it
 * compiles native modules as Linux ELF binaries, which Electron (a Win32 process)
 * cannot load. This script detects that situation and replaces any Linux ELF
 * .node files in build/Release/ with the corresponding Win32 prebuilt binary
 * shipped inside the package's prebuilds/win32-x64/ directory.
 *
 * Safe to run on Windows/macOS/Linux – it is a no-op unless a mismatch is
 * detected.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/** Lightweight ELF magic-number check. */
function isELF(filePath) {
  try {
    const buf = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46;
  } catch {
    return false;
  }
}

/**
 * Given a package directory, if build/Release/<name>.node is a Linux ELF and
 * prebuilds/win32-x64/ contains a suitable .node file, replace it.
 */
function fixPackage(pkgDir) {
  const releaseDir = path.join(pkgDir, 'build', 'Release');
  if (!fs.existsSync(releaseDir)) return;

  const prebuiltDir = path.join(pkgDir, 'prebuilds', 'win32-x64');
  if (!fs.existsSync(prebuiltDir)) return;

  const prebuiltCandidates = fs.readdirSync(prebuiltDir).filter(f => f.endsWith('.node'));
  if (prebuiltCandidates.length === 0) return;

  const nodeFiles = fs.readdirSync(releaseDir).filter(f => f.endsWith('.node'));
  for (const nodeFile of nodeFiles) {
    const target = path.join(releaseDir, nodeFile);
    if (!isELF(target)) continue; // already Win32 or macOS – skip

    // Pick the first win32-x64 prebuilt
    const src = path.join(prebuiltDir, prebuiltCandidates[0]);
    fs.copyFileSync(src, target);
    console.log(`[fix-native-win32] Replaced Linux ELF ${path.relative(process.cwd(), target)} with Win32 prebuilt.`);
  }
}

const nodeModules = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModules)) process.exit(0);

// Walk only one level of scopes and packages for speed.
for (const entry of fs.readdirSync(nodeModules)) {
  const entryPath = path.join(nodeModules, entry);
  if (entry.startsWith('@')) {
    // scoped packages
    for (const scoped of fs.readdirSync(entryPath)) {
      fixPackage(path.join(entryPath, scoped));
    }
  } else {
    fixPackage(entryPath);
  }
}
