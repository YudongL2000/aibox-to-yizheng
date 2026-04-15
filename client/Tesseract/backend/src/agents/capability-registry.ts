/**
 * [INPUT]: 依赖 hardware-components.ts 的规范硬件表，依赖 hardware-component-aliases.ts 的旧能力别名边界
 * [OUTPUT]: 对外提供 CapabilityRegistry（query/canCompose/getCapability/listCapabilities）
 * [POS]: agents 的能力边界与查询核心，为 Refactor-3 提供基础设施
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  HARDWARE_COMPONENTS,
  HardwareCapabilityDetail,
  HardwareComponent,
} from './hardware-components';
import {
  HARDWARE_CAPABILITY_ALIASES,
  LEGACY_CAPABILITY_ALIAS_GROUPS,
} from './hardware-component-aliases';
import { HardwareCapability, HardwareCapabilityEndpoint } from './types';

type CompositionCheck = {
  valid: boolean;
  missing: string[];
  suggestions: string[];
};

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, HardwareCapability>();
  private readonly keywordIndex = new Map<string, Set<string>>();
  private readonly capabilityAliases = new Map<string, string>();

  constructor(
    components: HardwareComponent[] = HARDWARE_COMPONENTS,
    aliases: Record<string, string> = HARDWARE_CAPABILITY_ALIASES
  ) {
    this.buildAliases(aliases);
    this.buildRegistry(components);
    this.buildKeywordIndex();
  }

  query(query: string | string[], limit = 20): HardwareCapability[] {
    const searchTerms = this.buildSearchTerms(query);
    if (searchTerms.length === 0) {
      return [];
    }

    const scoreMap = new Map<string, number>();
    searchTerms.forEach((term) => {
      this.applyExactMatches(term, scoreMap);
      this.applyFuzzyMatches(term, scoreMap);
    });

    return Array.from(scoreMap.entries())
      .sort((left, right) => {
        const scoreDiff = right[1] - left[1];
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        const rightConfidence = this.capabilities.get(right[0])?.confidence ?? 0;
        const leftConfidence = this.capabilities.get(left[0])?.confidence ?? 0;
        return rightConfidence - leftConfidence;
      })
      .map(([capabilityId]) => this.capabilities.get(capabilityId))
      .filter((capability): capability is HardwareCapability => capability !== undefined)
      .slice(0, limit);
  }

  canCompose(capabilityIds: string[]): CompositionCheck {
    const selected = new Set(
      capabilityIds
        .map((capabilityId) => this.resolveCapabilityId(capabilityId))
        .filter(Boolean)
    );
    const missing = new Set<string>();

    selected.forEach((capabilityId) => {
      this.collectMissingDependencies(capabilityId, selected, missing, new Set<string>());
    });

    const missingList = Array.from(missing).sort();
    return {
      valid: missingList.length === 0,
      missing: missingList,
      suggestions: missingList.map((capabilityId) => {
        const capability = this.capabilities.get(capabilityId);
        return capability ? capability.displayName : capabilityId;
      }),
    };
  }

  getCapability(capabilityId: string): HardwareCapability | undefined {
    return this.capabilities.get(this.resolveCapabilityId(capabilityId));
  }

  getByIds(capabilityIds: string[]): HardwareCapability[] {
    return Array.from(new Set(capabilityIds))
      .map((capabilityId) => this.capabilities.get(this.resolveCapabilityId(capabilityId)))
      .filter((capability): capability is HardwareCapability => capability !== undefined);
  }

  listCapabilities(): HardwareCapability[] {
    return Array.from(this.capabilities.values());
  }

  private buildAliases(aliases: Record<string, string>): void {
    Object.entries(aliases).forEach(([alias, canonicalId]) => {
      this.capabilityAliases.set(alias, canonicalId);
    });
  }

  private buildRegistry(components: HardwareComponent[]): void {
    components.forEach((component) => {
      component.capabilities.forEach((capabilityName) => {
        const detail = component.capabilityDetails[capabilityName] ?? {};
        const displayName = detail.displayName ?? this.getDisplayName(capabilityName);
        const id = `${component.id}.${capabilityName}`;

        const capability: HardwareCapability = {
          id,
          component: component.id,
          capability: capabilityName,
          displayName,
          keywords: this.extractKeywords(
            component,
            capabilityName,
            displayName,
            detail
          ),
          nodeType: detail.nodeType ?? component.nodeType,
          category: component.category,
          apiEndpoint: this.resolveApiEndpoint(component, capabilityName, detail),
          dependencies: [...(detail.dependencies ?? [])],
          confidence: 1,
          aliases: [
            ...(LEGACY_CAPABILITY_ALIAS_GROUPS[id as keyof typeof LEGACY_CAPABILITY_ALIAS_GROUPS] ?? []),
          ],
        };

        this.capabilities.set(id, capability);
      });
    });
  }

  private buildKeywordIndex(): void {
    this.capabilities.forEach((capability, capabilityId) => {
      capability.keywords.forEach((keyword) => {
        this.indexKeyword(keyword, capabilityId);
      });

      capability.aliases?.forEach((alias) => {
        this.indexKeyword(alias, capabilityId);
        alias
          .split(/[._-]+/)
          .filter((token) => token.length > 1)
          .forEach((token) => this.indexKeyword(token, capabilityId));
      });
    });
  }

  private indexKeyword(rawKeyword: string, capabilityId: string): void {
    const normalized = this.normalizeKeyword(rawKeyword);
    if (!normalized) {
      return;
    }

    this.addIndexEntry(normalized, capabilityId);
    normalized
      .split(' ')
      .filter((token) => token.length > 1)
      .forEach((token) => this.addIndexEntry(token, capabilityId));
  }

  private addIndexEntry(keyword: string, capabilityId: string): void {
    if (!this.keywordIndex.has(keyword)) {
      this.keywordIndex.set(keyword, new Set<string>());
    }
    this.keywordIndex.get(keyword)?.add(capabilityId);
  }

  private buildSearchTerms(query: string | string[]): string[] {
    const source = Array.isArray(query) ? query : [query];
    const terms = new Set<string>();

    source.forEach((keyword) => {
      const normalized = this.normalizeKeyword(keyword);
      if (!normalized) {
        return;
      }

      terms.add(normalized);
      normalized
        .split(' ')
        .filter((token) => token.length > 1)
        .forEach((token) => terms.add(token));
    });

    return Array.from(terms);
  }

  private applyExactMatches(term: string, scoreMap: Map<string, number>): void {
    this.keywordIndex.get(term)?.forEach((capabilityId) => {
      scoreMap.set(capabilityId, (scoreMap.get(capabilityId) ?? 0) + 3);
    });
  }

  private applyFuzzyMatches(term: string, scoreMap: Map<string, number>): void {
    if (term.length < 2) {
      return;
    }

    this.keywordIndex.forEach((capabilityIds, indexedKeyword) => {
      if (indexedKeyword === term) {
        return;
      }
      if (!this.isFuzzyMatch(term, indexedKeyword)) {
        return;
      }

      capabilityIds.forEach((capabilityId) => {
        scoreMap.set(capabilityId, (scoreMap.get(capabilityId) ?? 0) + 1);
      });
    });
  }

  private isFuzzyMatch(left: string, right: string): boolean {
    if (left.includes(right) || right.includes(left)) {
      return true;
    }

    if (!this.isAscii(left) || !this.isAscii(right)) {
      return false;
    }

    return this.editDistanceAtMostOne(left, right);
  }

  private isAscii(value: string): boolean {
    return /^[a-z0-9 ]+$/.test(value);
  }

  private editDistanceAtMostOne(left: string, right: string): boolean {
    if (Math.abs(left.length - right.length) > 1) {
      return false;
    }

    let leftIndex = 0;
    let rightIndex = 0;
    let differences = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      if (left[leftIndex] === right[rightIndex]) {
        leftIndex += 1;
        rightIndex += 1;
        continue;
      }

      differences += 1;
      if (differences > 1) {
        return false;
      }

      if (left.length > right.length) {
        leftIndex += 1;
      } else if (left.length < right.length) {
        rightIndex += 1;
      } else {
        leftIndex += 1;
        rightIndex += 1;
      }
    }

    if (leftIndex < left.length || rightIndex < right.length) {
      differences += 1;
    }

    return differences <= 1;
  }

  private collectMissingDependencies(
    capabilityId: string,
    selected: Set<string>,
    missing: Set<string>,
    stack: Set<string>
  ): void {
    if (stack.has(capabilityId)) {
      return;
    }

    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      missing.add(capabilityId);
      return;
    }

    stack.add(capabilityId);
    capability.dependencies.forEach((dependency) => {
      if (!selected.has(dependency)) {
        missing.add(dependency);
        return;
      }
      this.collectMissingDependencies(dependency, selected, missing, stack);
    });
    stack.delete(capabilityId);
  }

  private getDisplayName(capability: string): string {
    return capability
      .split('_')
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }

  private extractKeywords(
    component: HardwareComponent,
    capability: string,
    displayName: string,
    detail: HardwareCapabilityDetail
  ): string[] {
    const keywordSet = new Set<string>();
    const rawKeywords = [
      capability,
      displayName,
      component.id,
      component.displayName,
      ...(component.lookupNames ?? []),
      ...(detail.keywords ?? []),
    ];

    rawKeywords.forEach((rawKeyword) => {
      const normalized = this.normalizeKeyword(rawKeyword);
      if (!normalized) {
        return;
      }

      keywordSet.add(normalized);
      normalized
        .split(' ')
        .filter((token) => token.length > 1)
        .forEach((token) => keywordSet.add(token));
    });

    return Array.from(keywordSet);
  }

  private resolveApiEndpoint(
    component: HardwareComponent,
    capabilityName: string,
    detail: HardwareCapabilityDetail
  ): HardwareCapabilityEndpoint {
    return detail.apiEndpoint ?? {
      url: `http://hardware-api/${component.id}/${capabilityName}`,
      method: 'POST',
    };
  }

  private normalizeKeyword(keyword: string): string {
    return keyword
      .toLowerCase()
      .replace(/[._-]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveCapabilityId(capabilityId: string): string {
    return this.capabilityAliases.get(capabilityId) ?? capabilityId;
  }
}
