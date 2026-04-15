import { describe, expect, it } from 'vitest';
import { SessionService } from '../../../src/agents/session-service';
import type { ConfigAgentState, Intent } from '../../../src/agents/types';

describe('SessionService', () => {
  it('stores and retrieves workflow in session', () => {
    const service = new SessionService({ maxTurns: 2 });
    const session = service.getOrCreate();
    const workflow = { name: 'WF', nodes: [], connections: {} };

    service.setWorkflow(session.id, workflow);

    expect(service.getWorkflow(session.id)).toEqual(workflow);
    service.clearWorkflow(session.id);
    expect(service.getWorkflow(session.id)).toBeNull();
  });

  it('keeps last complex workflow cache separate from current workflow', () => {
    const service = new SessionService();
    const session = service.getOrCreate();
    const currentWorkflow = { name: 'WF', nodes: [], connections: {} };
    const complexWorkflow = {
      name: 'Complex WF',
      nodes: [{ id: '1', name: 'trigger', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} }],
      connections: {},
    };

    service.setWorkflow(session.id, currentWorkflow);
    service.setLastComplexWorkflow(session.id, complexWorkflow, {
      capabilityIds: ['camera.snapshot', 'speaker.playback'],
      userIntent: '检测到人脸后播报欢迎词',
      topologyHint: 'linear',
    });
    service.clearWorkflow(session.id);

    expect(service.getWorkflow(session.id)).toBeNull();
    expect(service.getLastComplexWorkflow(session.id)).toEqual(
      expect.objectContaining({
        workflow: complexWorkflow,
        capabilityIds: ['camera.snapshot', 'speaker.playback'],
        userIntent: '检测到人脸后播报欢迎词',
        topologyHint: 'linear',
      })
    );
  });

  it('stores and retrieves intent and confirmation state', () => {
    const service = new SessionService();
    const session = service.getOrCreate();
    const intent: Intent = { category: 'custom', entities: {}, confidence: 0.8 };

    service.setIntent(session.id, intent);
    expect(service.getIntent(session.id)).toEqual(intent);
    expect(service.getPhase(session.id)).toBe('understanding');
    expect(service.isConfirmed(session.id)).toBe(false);

    service.setConfirmed(session.id, true);
    expect(service.isConfirmed(session.id)).toBe(true);

    service.clearIntent(session.id);
    expect(service.getIntent(session.id)).toBeNull();
  });

  it('merges confirmed entities without overwriting', () => {
    const service = new SessionService();
    const session = service.getOrCreate();

    service.mergeConfirmedEntities(session.id, { person_name: '老刘', gesture: '中指' });
    const merged = service.mergeConfirmedEntities(session.id, { gesture: '比V', tts_voice: 'a' });

    expect(merged.person_name).toBe('老刘');
    expect(merged.gesture).toBe('中指');
    expect(merged.tts_voice).toBe('a');
  });

  it('updates confirmed entities when explicitly overwritten', () => {
    const service = new SessionService();
    const session = service.getOrCreate();

    service.mergeConfirmedEntities(session.id, { person_name: '老刘', gesture: '中指' });
    const updated = service.updateConfirmedEntities(session.id, { gesture: '比V' });

    expect(updated.gesture).toBe('比V');
    expect(updated.person_name).toBe('老刘');
  });

  it('resets session state', () => {
    const service = new SessionService();
    const session = service.getOrCreate();
    service.appendTurn(session.id, 'user', 'hello');
    service.setPhase(session.id, 'generating');
    service.mergeConfirmedEntities(session.id, { person_name: '老刘' });
    service.setLastComplexWorkflow(session.id, { name: 'WF', nodes: [], connections: {} }, {
      capabilityIds: ['demo.capability'],
      userIntent: 'demo',
    });

    service.resetSession(session.id);
    const resetSession = service.getSession(session.id);

    expect(resetSession?.phase).toBe('understanding');
    expect(resetSession?.history.length).toBe(0);
    expect(resetSession?.confirmedEntities).toEqual({});
    expect(resetSession?.lastComplexWorkflow).toBeUndefined();
  });

  it('stores and retrieves blueprint in session', () => {
    const service = new SessionService();
    const session = service.getOrCreate();
    const blueprint = {
      intentSummary: 'demo',
      triggers: [],
      logic: [],
      executors: [],
      missingFields: ['gesture'],
    };

    service.setBlueprint(session.id, blueprint);
    expect(service.getBlueprint(session.id)).toEqual(blueprint);
    service.clearBlueprint(session.id);
    expect(service.getBlueprint(session.id)).toBeNull();
  });

  it('tracks user turn cadence for summaries', () => {
    const service = new SessionService();
    const session = service.getOrCreate();

    service.appendTurn(session.id, 'user', 'one');
    service.appendTurn(session.id, 'assistant', 'a');
    service.appendTurn(session.id, 'user', 'two');
    service.appendTurn(session.id, 'assistant', 'b');
    service.appendTurn(session.id, 'user', 'three');

    expect(service.getUserTurnCount(session.id)).toBe(3);
    expect(service.shouldSummarize(session.id, 3)).toBe(true);
    service.markSummary(session.id);
    expect(service.shouldSummarize(session.id, 3)).toBe(false);
  });

  it('appends history and keeps max turns', () => {
    const service = new SessionService({ maxTurns: 1 });
    const session = service.getOrCreate();

    service.appendTurn(session.id, 'user', 'hello');
    service.appendTurn(session.id, 'assistant', 'hi');
    service.appendTurn(session.id, 'user', 'again');

    const history = service.getHistory(session.id);
    expect(history.length).toBe(2);
    expect(history[0].content).toBe('hi');
  });

  it('stores and retrieves config agent state', () => {
    const service = new SessionService();
    const session = service.getOrCreate();
    const state: ConfigAgentState = {
      workflowId: 'wf_cfg',
      workflowSnapshot: { name: 'WF', nodes: [], connections: {} },
      configurableNodes: [],
      currentNodeIndex: 0,
      completed: false,
      progress: { total: 0, completed: 0, percentage: 100 },
    };

    service.setConfigAgentState(session.id, state);
    expect(service.getConfigState(session.id)?.workflowId).toBe('wf_cfg');
    service.clearConfigAgentState(session.id);
    expect(service.getConfigState(session.id)).toBeNull();
  });
});
