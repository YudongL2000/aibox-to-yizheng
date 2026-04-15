#!/usr/bin/env node
/* [INPUT]: Repository-wide hardcoded style-value guard used by Flutter + aily-blockly.
 * [OUTPUT]: Exits non-zero when disallowed hard-coded style values are found.
 * [POS]: scripts root, used by module validation and CI hooks.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const moduleArg = Array.from(args).find((arg) => arg.startsWith('--module='));
const requestedModule = moduleArg?.replace('--module=', '') || 'all';

function toCanonicalModule(input) {
  const aliases = {
    frontend: 'frontend',
    aily: 'aily-blockly',
    'aily-blockly': 'aily-blockly',
    all: 'all',
  };
  return aliases[input] || input;
}

const canonicalModule = toCanonicalModule(requestedModule);
const moduleName = ['frontend', 'aily-blockly', 'all'].includes(canonicalModule)
  ? canonicalModule
  : 'all';

if (moduleName === 'all' && requestedModule !== 'all') {
  console.warn(`[warn] unknown module "${requestedModule}", defaulting to all`);
}

const repoRoot = process.cwd();
const reportPath = path.join(repoRoot, 'scripts/no-hardcodes-report.json');
const exceptionPath = path.join(repoRoot, 'scripts/no-hardcodes-exceptions.json');

const now = new Date();

function readExceptions() {
  const defaults = [
    {
      file: 'frontend/lib/utils/colorUtils/color_util.dart',
      reason:
        'Legacy non-UI style utility for color conversion; migrate and remove in the next pass.',
      cleanupBy: '2026-06-30',
    },
    {
      file: 'frontend/lib/module/home/controller/digital_twin_console_controller.dart',
      reason: 'Runtime hex color parsing for scene data contract.',
      cleanupBy: '2026-06-30',
    },
  ];

  try {
    const raw = fs.readFileSync(exceptionPath, 'utf8').trim();
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return defaults;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[gate] exception list parse failed, fallback defaults used: ${err.message}`);
    }
    return defaults;
  }
}

const exceptionEntries = readExceptions();
const exceptionMap = new Map(
  exceptionEntries.map((item) => [path.resolve(repoRoot, item.file), item]),
);

function isActiveException(filePath) {
  const entry = exceptionMap.get(filePath);
  if (!entry) return null;
  if (!entry.cleanupBy) return entry;
  const limit = new Date(`${entry.cleanupBy}T23:59:59.999Z`);
  if (Number.isNaN(limit.valueOf())) return entry;
  return limit >= now ? entry : null;
}

const fileRules = {
  frontend: {
    root: path.join(repoRoot, 'frontend/lib'),
    patterns: [/\.dart$/],
    checks: {
      default: [
        /\bColor\(/g,
        /\bColors\./g,
        /\b0x[0-9a-fA-F]{6,8}\b/g,
      ],
    },
  allowlist: new Set([
      path.join(repoRoot, 'frontend/lib/utils/spatial_design_ref.dart'),
    ]),
  },
  'aily-blockly': {
    root: path.join(repoRoot, 'aily-blockly/src'),
    patterns: [/\.ts$/, /\.scss$/, /\.html$/, /\.css$/],
    checks: {
      default: [/#(?:[0-9a-fA-F]{3,8})\b/g, /\brgba?\(/g],
    },
    allowlist: new Set([
      path.join(repoRoot, 'aily-blockly/src/spatial-design-ref.scss'),
    ]),
  },
};

const checks = [
  ...(moduleName === 'frontend' || moduleName === 'all' ? [fileRules.frontend] : []),
  ...(moduleName === 'aily-blockly' || moduleName === 'all'
    ? [fileRules['aily-blockly']]
    : []),
];

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') {
      continue;
    }
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else if (entry.isFile()) {
      yield p;
    }
  }
}

function collectFiles(rule) {
  const out = [];
  for (const file of walk(rule.root)) {
    if (rule.patterns.some((rx) => rx.test(file))) {
      out.push(file);
    }
  }
  return out;
}

function getCheckers(filePath, rule) {
  if (rule.checks[filePath]) return rule.checks[filePath];
  const ext = path.extname(filePath).slice(1);
  if (rule.checks[ext]) return rule.checks[ext];
  return rule.checks.default || [];
}

function stripComments(line, scanState) {
  let output = '';
  let i = 0;
  while (i < line.length) {
    if (scanState.inBlockComment) {
      const end = line.indexOf('*/', i);
      if (end === -1) return '';
      scanState.inBlockComment = false;
      i = end + 2;
      continue;
    }

    const lineComment = line.indexOf('//', i);
    const blockComment = line.indexOf('/*', i);
    const nextComment =
      lineComment === -1
        ? blockComment
        : blockComment === -1
        ? lineComment
        : Math.min(lineComment, blockComment);

    if (nextComment === -1) {
      output += line.slice(i);
      break;
    }

    output += line.slice(i, nextComment);
    if (nextComment === lineComment) {
      break;
    }

    const end = line.indexOf('*/', nextComment + 2);
    if (end === -1) {
      scanState.inBlockComment = true;
      break;
    }
    i = end + 2;
  }
  return output;
}

function matchLine(line, regexes) {
  return regexes.flatMap((rx) => {
    const pattern = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : `${rx.flags}g`);
    const hits = [];
    let hit = null;
    while ((hit = pattern.exec(line)) !== null) {
      hits.push(hit[0]);
      if (hit[0].length === 0) break;
    }
    return hits;
  });
}

let hasViolation = false;
const moduleReports = [];

for (const rule of checks) {
  const files = collectFiles(rule);
  const fileReports = [];
  const bypassed = [];
  for (const file of files) {
    if (rule.allowlist.has(file)) continue;
    const exception = isActiveException(file);
    if (exception) {
      bypassed.push({
        file: path.relative(repoRoot, file),
        reason: exception.reason,
        cleanupBy: exception.cleanupBy || null,
      });
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const violations = [];
    const checkers = getCheckers(file, rule);
    const scanState = { inBlockComment: false };

    lines.forEach((line, i) => {
      const safeLine = stripComments(line, scanState);
      const matches = matchLine(safeLine, checkers);
      if (matches.length > 0) {
        violations.push({
          line: i + 1,
          text: line.trim(),
          matches,
        });
      }
    });

    if (violations.length > 0) {
      fileReports.push({ file, violations });
    }
  }

  if (bypassed.length > 0) {
    for (const entry of bypassed) {
      console.log(
        `[${path.basename(rule.root)}] allowlist active: ${entry.file} (cleanup ${entry.cleanupBy || 'untracked'}) -> ${entry.reason}`,
      );
    }
  }

  if (fileReports.length > 0) {
    hasViolation = true;
    const moduleLabel = path.basename(rule.root);
    console.error(`[${moduleLabel}] hardcoded style scan failed (${fileReports.length} files):`);
    for (const report of fileReports) {
      const relative = path.relative(repoRoot, report.file);
      for (const entry of report.violations) {
        console.error(`  ${relative}:${entry.line}: ${entry.text}`);
      }
    }
    console.error();
  }

  moduleReports.push({
    module: path.basename(rule.root),
    scanned: files.length,
    violations: fileReports.length,
    bypassed: bypassed.length,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  module: moduleName,
  modules: moduleReports,
};

try {
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
} catch (err) {
  console.warn(`[warn] unable to write report: ${err.message}`);
}

if (hasViolation) {
  process.exit(1);
}

console.log(`No disallowed hardcoded style tokens found. Report: ${path.relative(repoRoot, reportPath)}`);
