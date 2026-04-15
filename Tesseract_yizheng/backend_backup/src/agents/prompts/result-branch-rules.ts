/**
 * [INPUT]: 依赖猜拳场景 IF 节点命名与分支语义
 * [OUTPUT]: 对外提供胜负分支配置表与 IF->分支映射解析
 * [POS]: prompts 层的结果分支规则源，供 workflow-architect 统一构建 SCREEN/TTS/SPEAKER 链路
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type ResultBranchType = 'empty' | 'draw' | 'win' | 'lose';

export interface ResultBranchConfig {
  type: ResultBranchType;
  screen: {
    nodeName: string;
    emoji: 'Angry' | 'Happy' | 'Sad';
  };
  tts: {
    nodeName: string;
    audioName: string;
    defaultInput: string;
  };
  speaker: {
    nodeName: string;
    audioName: string;
  };
}

export interface ResultBranchIfNode {
  name?: string;
  parameters?: unknown;
}

export const RESULT_BRANCH_CONFIGS: Record<ResultBranchType, ResultBranchConfig> = {
  empty: {
    type: 'empty',
    screen: { nodeName: 'code_screen_execute_empty_angry', emoji: 'Angry' },
    tts: {
      nodeName: 'set_audio_generate_empty',
      audioName: 'user_cheat_audio',
      defaultInput: '你怎么能耍赖呢！',
    },
    speaker: { nodeName: 'code_speaker_execute_empty', audioName: 'user_cheat_audio' },
  },
  draw: {
    type: 'draw',
    screen: { nodeName: 'code_screen_execute_draw_angry', emoji: 'Angry' },
    tts: {
      nodeName: 'set_audio_generate_draw',
      audioName: 'draw_audio',
      defaultInput: '平局，再来',
    },
    speaker: { nodeName: 'code_speaker_execute_draw', audioName: 'draw_audio' },
  },
  win: {
    type: 'win',
    screen: { nodeName: 'code_screen_execute_win_happy', emoji: 'Happy' },
    tts: {
      nodeName: 'set_audio_generate_win',
      audioName: 'win_audio',
      defaultInput: '我赢啦！',
    },
    speaker: { nodeName: 'code_speaker_execute_win', audioName: 'win_audio' },
  },
  lose: {
    type: 'lose',
    screen: { nodeName: 'code_screen_execute_lose_sad', emoji: 'Sad' },
    tts: {
      nodeName: 'set_audio_generate_lose',
      audioName: 'lose_audio',
      defaultInput: '算你厉害。',
    },
    speaker: { nodeName: 'code_speaker_execute_lose', audioName: 'lose_audio' },
  },
};

export const IF_TO_BRANCH_MAP: Record<string, ResultBranchType> = {
  if_gesture_empty: 'empty',
  if_user_gesture_empty: 'empty',

  if_draw: 'draw',
  if_draw_game: 'draw',

  if_rock_vs_scissors: 'win',
  if_scissors_vs_paper: 'win',
  if_paper_vs_rock: 'win',
  if_robot_rock_user_scissors_win: 'win',
  if_robot_scissors_user_paper_win: 'win',
  if_robot_paper_user_rock_win: 'win',

  if_rock_vs_paper: 'lose',
  if_scissors_vs_rock: 'lose',
  if_paper_vs_scissors: 'lose',
  if_robot_rock_user_paper_lose: 'lose',
  if_robot_scissors_user_rock_lose: 'lose',
  if_robot_paper_user_scissors_lose: 'lose',
};

const RPS_RELATION_WINNERS = new Set([
  'rock_vs_scissors',
  'scissors_vs_paper',
  'paper_vs_rock',
]);

const RPS_RELATION_LOSERS = new Set([
  'rock_vs_paper',
  'scissors_vs_rock',
  'paper_vs_scissors',
]);

const BRANCH_KEYWORD_HINTS: Record<ResultBranchType, string[]> = {
  empty: ['gesture_empty', 'user_gesture_empty', 'empty', '空'],
  draw: ['draw', '平局'],
  win: ['_win', 'win', '赢', 'happy'],
  lose: ['_lose', 'lose', '输', 'sad'],
};

/**
 * 解析 IF 节点所属分支类型
 * 先走显式映射，再走名称语义兜底。
 */
export function resolveResultBranchType(ifNodeName: string): ResultBranchType | null {
  const normalizedName = ifNodeName.trim().toLowerCase();
  if (!normalizedName) {
    return null;
  }

  if (IF_TO_BRANCH_MAP[normalizedName]) {
    return IF_TO_BRANCH_MAP[normalizedName];
  }

  const keywordBranch = inferBranchByKeywords([normalizedName], { allowWinLose: false });
  if (keywordBranch) {
    return keywordBranch;
  }

  const relation = normalizedName.replace(/^if_/, '');
  if (RPS_RELATION_WINNERS.has(relation)) {
    return 'win';
  }
  if (RPS_RELATION_LOSERS.has(relation)) {
    return 'lose';
  }

  return null;
}

/**
 * 从 IF 节点结构推导分支类型：
 * 1. 名称映射
 * 2. 条件关键词
 * 3. robotGesture/userGesture 语义判断
 */
export function resolveResultBranchTypeFromIfNode(ifNode: ResultBranchIfNode): ResultBranchType | null {
  const byName = resolveResultBranchType(String(ifNode.name || ''));
  if (byName) {
    return byName;
  }

  const params =
    ifNode.parameters && typeof ifNode.parameters === 'object'
      ? (ifNode.parameters as Record<string, unknown>)
      : {};
  const conditionsRoot =
    params.conditions && typeof params.conditions === 'object'
      ? (params.conditions as Record<string, unknown>)
      : {};
  const conditionList = Array.isArray(conditionsRoot.conditions)
    ? (conditionsRoot.conditions as Array<Record<string, unknown>>)
    : [];

  if (conditionList.length === 0) {
    return null;
  }

  const hasGestureContext = conditionList.some((condition) => {
    const leftValue = firstNonEmptyString(condition.leftValue);
    const rightValue = firstNonEmptyString(condition.rightValue);
    const conditionId = firstNonEmptyString(condition.id);
    const normalizedLeft = (leftValue || '').toLowerCase();
    const normalizedId = (conditionId || '').toLowerCase();
    return (
      normalizedLeft.includes('gesture') ||
      normalizedId.includes('gesture') ||
      normalizedId.includes('robot') ||
      normalizedId.includes('user') ||
      Boolean(rightValue && parseGestureToken(rightValue))
    );
  });

  let robotGesture: RpsGesture | null = null;
  let userGesture: RpsGesture | null = null;

  for (const condition of conditionList) {
    const leftValue = firstNonEmptyString(condition.leftValue);
    const rightValue = firstNonEmptyString(condition.rightValue);
    const conditionId = firstNonEmptyString(condition.id);

    const keywordBranch = inferBranchByKeywords([leftValue, rightValue, conditionId], {
      allowWinLose: hasGestureContext,
    });
    if (keywordBranch) {
      return keywordBranch;
    }

    const normalizedLeft = (leftValue || '').toLowerCase();
    const normalizedId = (conditionId || '').toLowerCase();

    if (rightValue === '' && (normalizedLeft.includes('usergesture') || normalizedId.includes('empty'))) {
      return 'empty';
    }
    if (!rightValue) {
      continue;
    }

    const gesture = parseGestureToken(rightValue);
    if (!gesture) {
      continue;
    }

    if (
      normalizedLeft.includes('robotgesture') ||
      normalizedLeft.includes('robot_gesture') ||
      normalizedId.includes('robot')
    ) {
      robotGesture = robotGesture ?? gesture;
    }
    if (
      normalizedLeft.includes('usergesture') ||
      normalizedLeft.includes('user_gesture') ||
      normalizedId.includes('user')
    ) {
      userGesture = userGesture ?? gesture;
    }
  }

  if (!robotGesture || !userGesture) {
    return null;
  }
  if (robotGesture === userGesture) {
    return 'draw';
  }

  const relation = `${robotGesture}_vs_${userGesture}`;
  if (RPS_RELATION_WINNERS.has(relation)) {
    return 'win';
  }
  if (RPS_RELATION_LOSERS.has(relation)) {
    return 'lose';
  }

  return null;
}

type RpsGesture = 'rock' | 'scissors' | 'paper';

function parseGestureToken(rawValue: string): RpsGesture | null {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === '1' || normalized === 'rock' || normalized.includes('石头')) {
    return 'rock';
  }
  if (normalized === '2' || normalized === 'scissors' || normalized.includes('剪刀')) {
    return 'scissors';
  }
  if (normalized === '3' || normalized === 'paper' || normalized === '布') {
    return 'paper';
  }
  return null;
}

function inferBranchByKeywords(
  rawValues: Array<string | null>,
  options: { allowWinLose?: boolean } = {}
): ResultBranchType | null {
  const allowWinLose = options.allowWinLose ?? true;
  for (const rawValue of rawValues) {
    const normalized = (rawValue || '').trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    for (const [branch, hints] of Object.entries(BRANCH_KEYWORD_HINTS) as Array<
      [ResultBranchType, string[]]
    >) {
      if (!allowWinLose && (branch === 'win' || branch === 'lose')) {
        continue;
      }
      const matched = hints.some((hint) => normalized.includes(hint));
      if (matched) {
        return branch;
      }
    }
  }
  return null;
}

function firstNonEmptyString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}
