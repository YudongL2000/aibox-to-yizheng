/**
 * [INPUT]: 依赖节点 notes 原始值
 * [OUTPUT]: 对外提供标准化的结构化 notes
 * [POS]: utils 的节点备注规范化工具
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

export interface StructuredNodeNotes {
  title: string;
  subtitle: string;
  category: string;
  session_ID: string;
  extra: string;
  topology: string | null;
  device_ID: string | null;
  sub: Record<string, unknown>;
}

export const DEFAULT_STRUCTURED_NOTES: StructuredNodeNotes = {
  title: '',
  subtitle: '',
  category: 'BASE',
  session_ID: '',
  extra: 'pending',
  topology: null,
  device_ID: null,
  sub: {},
};

export function normalizeNodeNotes(value: unknown): StructuredNodeNotes {
  const normalizeFromRecord = (record: Record<string, unknown>): StructuredNodeNotes => {
    const rawSub = record.sub;
    let normalizedSub: Record<string, unknown> = {};

    if (rawSub && typeof rawSub === 'object' && !Array.isArray(rawSub)) {
      normalizedSub = rawSub as Record<string, unknown>;
    } else if (typeof rawSub === 'string' && rawSub.trim().startsWith('{')) {
      try {
        const parsedSub = JSON.parse(rawSub) as unknown;
        if (parsedSub && typeof parsedSub === 'object' && !Array.isArray(parsedSub)) {
          normalizedSub = parsedSub as Record<string, unknown>;
        }
      } catch {
        normalizedSub = {};
      }
    }

    return {
      title: typeof record.title === 'string' ? record.title : '',
      subtitle: typeof record.subtitle === 'string' ? record.subtitle : '',
      category:
        typeof record.category === 'string'
          ? record.category
          : typeof record.type === 'string'
            ? record.type
            : 'BASE',
      session_ID: typeof record.session_ID === 'string' ? record.session_ID : '',
      extra: typeof record.extra === 'string' ? record.extra : 'pending',
      topology: typeof record.topology === 'string' ? record.topology : null,
      device_ID:
        typeof record.device_ID === 'string'
          ? record.device_ID
          : typeof record.device === 'string'
            ? record.device
            : null,
      sub: normalizedSub,
    };
  };

  if (value && typeof value === 'object') {
    return normalizeFromRecord(value as Record<string, unknown>);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return normalizeFromRecord(JSON.parse(trimmed) as Record<string, unknown>);
      } catch {
        // Fall back to plain string handling
      }
    }
    return {
      ...DEFAULT_STRUCTURED_NOTES,
      extra: value,
    };
  }

  return { ...DEFAULT_STRUCTURED_NOTES };
}
