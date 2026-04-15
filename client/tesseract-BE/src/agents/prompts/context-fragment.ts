/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 ContextFragment 类型与 fragment 组装/增量更新工具
 * [POS]: prompts/ 的基础上下文层，被 architect-system 与 WorkflowArchitect 多轮 prompt 复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface ContextFragment {
  id: string;
  startMarker: string;
  endMarker: string;
  content: string;
  version: number;
}

export function createFragment(
  id: string,
  content: string,
  version: number = 1
): ContextFragment {
  const tag = id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return {
    id,
    startMarker: `<${tag}>`,
    endMarker: `</${tag}>`,
    content,
    version,
  };
}

export function assembleFragments(fragments: ContextFragment[]): string {
  return fragments
    .map((fragment) => `${fragment.startMarker}\n${fragment.content}\n${fragment.endMarker}`)
    .join('\n\n');
}

export function assembleChangedFragments(
  current: ContextFragment[],
  referenceVersions: Map<string, number>
): string {
  const changed = current.filter(
    (fragment) => fragment.version !== referenceVersions.get(fragment.id)
  );

  return assembleFragments(changed.length > 0 ? changed : current);
}

export function updateFragmentInList(
  fragments: ContextFragment[],
  updated: ContextFragment
): void {
  const index = fragments.findIndex((fragment) => fragment.id === updated.id);
  if (index >= 0) {
    fragments[index] = updated;
    return;
  }
  fragments.push(updated);
}
