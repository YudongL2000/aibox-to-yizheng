/**
 * [INPUT]: 依赖节点 type 查询参数模板，依赖 utils/code-node-parameters.ts 的 code 节点模板
 * [OUTPUT]: 对外提供 getNodeParameterTemplate 节点参数空模板
 * [POS]: prompts 的参数模板中心，统一约束 parameters 只保留结构
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { buildExecutableCodeNodeParameters } from '../../utils/code-node-parameters';

export interface NodeParameterTemplate {
  parameters: Record<string, unknown>;
  typeVersion?: number;
}

export const NODE_PARAMETER_TEMPLATES: Record<string, NodeParameterTemplate> = {
  'n8n-nodes-base.scheduleTrigger': {
    parameters: {
      rule: {
        interval: [
          {
            field: 'seconds',
            secondsInterval: 0.5,
          },
        ],
      },
    },
    typeVersion: 1.1,
  },
  'n8n-nodes-base.httpRequest': {
    parameters: {
      method: 'POST',
      url: 'http://robot.local/api/placeholder',
      options: {},
    },
    typeVersion: 4.3,
  },
  'n8n-nodes-base.set': {
    parameters: {
      assignments: {
        assignments: [],
      },
      options: {},
    },
    typeVersion: 3.4,
  },
  'n8n-nodes-base.code': {
    parameters: buildExecutableCodeNodeParameters(),
    typeVersion: 2,
  },
  'n8n-nodes-base.if': {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 1,
        },
        conditions: [],
        combinator: 'and',
      },
      options: {},
    },
    typeVersion: 2.2,
  },
  'n8n-nodes-base.switch': {
    parameters: {
      rules: {
        rules: [],
      },
      options: {},
    },
    typeVersion: 3.2,
  },
};

export function getNodeParameterTemplate(nodeType: string): NodeParameterTemplate {
  const template = NODE_PARAMETER_TEMPLATES[nodeType];
  if (!template) {
    return { parameters: {} };
  }
  return JSON.parse(JSON.stringify(template)) as NodeParameterTemplate;
}
