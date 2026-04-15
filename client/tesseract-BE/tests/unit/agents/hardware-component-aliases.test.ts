/**
 * [INPUT]: 依赖硬件真相层、兼容别名边界与 CapabilityRegistry
 * [OUTPUT]: 验证旧 capability alias 的归一化完整性与源码边界约束
 * [POS]: tests/unit/agents 的兼容层护栏测试，防止旧硬件 id 回流业务源码
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HARDWARE_CAPABILITY_ALIASES,
  LEGACY_CAPABILITY_ALIAS_GROUPS,
} from '../../../src/agents/hardware-component-aliases';
import { CapabilityRegistry } from '../../../src/agents/capability-registry';
import { HARDWARE_COMPONENTS } from '../../../src/agents/hardware-components';

const AGENTS_DIR = path.resolve(process.cwd(), 'src/agents');
const ALIAS_FILE = path.resolve(AGENTS_DIR, 'hardware-component-aliases.ts');

function listTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return listTypeScriptFiles(fullPath);
    }

    if (!fullPath.endsWith('.ts')) {
      return [];
    }

    return [fullPath];
  });
}

describe('hardware-component aliases', () => {
  const registry = new CapabilityRegistry(HARDWARE_COMPONENTS);

  it('maps every legacy alias to an existing canonical capability', () => {
    Object.entries(HARDWARE_CAPABILITY_ALIASES).forEach(([alias, canonicalId]) => {
      const canonical = registry.getCapability(canonicalId);
      const resolved = registry.getCapability(alias);

      expect(canonical, `missing canonical capability for ${alias}`).toBeDefined();
      expect(resolved?.id, `alias ${alias} should resolve to ${canonicalId}`).toBe(canonicalId);
    });
  });

  it('keeps alias keys globally unique', () => {
    const aliases = Object.keys(HARDWARE_CAPABILITY_ALIASES);
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it('keeps alias groups and flat alias map in sync', () => {
    const expectedCount = Object.values(LEGACY_CAPABILITY_ALIAS_GROUPS)
      .reduce((count, aliases) => count + aliases.length, 0);

    expect(Object.keys(HARDWARE_CAPABILITY_ALIASES)).toHaveLength(expectedCount);
  });

  it('prevents legacy capability ids from leaking back into src/agents business code', () => {
    const legacyIds = Object.keys(HARDWARE_CAPABILITY_ALIASES);
    const files = listTypeScriptFiles(AGENTS_DIR).filter((filePath) => filePath !== ALIAS_FILE);

    const leaks = files.flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf8');
      return legacyIds
        .filter((legacyId) => content.includes(legacyId))
        .map((legacyId) => `${path.relative(process.cwd(), filePath)} -> ${legacyId}`);
    });

    expect(leaks).toEqual([]);
  });
});
