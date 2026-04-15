/**
 * [INPUT]: 依赖 types 与 logger
 * [OUTPUT]: 对外提供会话管理、状态机能力、复杂工作流缓存与实时 trace 事件总线
 * [POS]: agents 会话存储与生命周期管理入口，也是编排调试流的单一事实源
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { randomUUID } from 'crypto';
import {
  AgentSession,
  AgentTraceEvent,
  AgentTraceEventInput,
  AgentTraceListener,
  CachedComplexWorkflow,
  ConversationTurn,
  DialogueModeSessionState,
  WorkflowDefinition,
} from './types';
import { logger } from '../utils/logger';

export interface SessionServiceOptions {
  ttlMs?: number;
  maxTurns?: number;
}

export class SessionService {
  private sessions = new Map<string, AgentSession>();
  private traceListeners = new Map<string, Set<AgentTraceListener>>();
  private ttlMs: number;
  private maxTurns: number;

  constructor(options: SessionServiceOptions = {}) {
    this.ttlMs = options.ttlMs ?? 30 * 60 * 1000;
    this.maxTurns = options.maxTurns ?? 6;
  }

  getOrCreate(sessionId?: string): AgentSession {
    if (sessionId) {
      const existing = this.sessions.get(sessionId);
      if (existing) {
        this.refresh(existing);
        return existing;
      }
    }

    const now = new Date().toISOString();
    const id = sessionId || randomUUID();
    const session: AgentSession = {
      id,
      phase: 'understanding',
      history: [],
      confirmedEntities: {},
      traceEvents: [],
      traceSequence: 0,
      confirmed: false,
      userTurns: 0,
      lastSummaryTurn: 0,
      dialogueModeState: undefined,
      createdAt: now,
      updatedAt: now,
      expiresAt: this.getExpiryIso(),
    };
    this.sessions.set(id, session);
    logger.debug('SessionService: created session', { sessionId: id });
    return session;
  }

  appendTurn(sessionId: string, role: ConversationTurn['role'], content: string): AgentSession {
    const session = this.getOrCreate(sessionId);
    session.history.push({ role, content });
    if (role === 'user') {
      session.userTurns += 1;
    }

    if (session.history.length > this.maxTurns * 2) {
      session.history.splice(0, session.history.length - this.maxTurns * 2);
    }

    this.refresh(session);
    logger.debug('SessionService: appended turn', {
      sessionId,
      role,
      totalTurns: session.history.length,
    });
    return session;
  }

  getHistory(sessionId: string): ConversationTurn[] {
    const session = this.getSession(sessionId);
    return session ? [...session.history] : [];
  }

  getUserTurnCount(sessionId: string): number {
    return this.getSession(sessionId)?.userTurns ?? 0;
  }

  markSummary(sessionId: string): void {
    const session = this.getOrCreate(sessionId);
    session.lastSummaryTurn = session.userTurns;
    this.refresh(session);
  }

  shouldSummarize(sessionId: string, cadence: number): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }
    return session.userTurns > 0 && session.userTurns % cadence === 0 && session.lastSummaryTurn !== session.userTurns;
  }

  setWorkflow(sessionId: string, workflow: AgentSession['workflow']): void {
    const session = this.getOrCreate(sessionId);
    session.workflow = workflow;
    this.refresh(session);
    logger.debug('SessionService: stored workflow', { sessionId, workflowName: workflow?.name });
  }

  getWorkflow(sessionId: string): AgentSession['workflow'] | null {
    const session = this.getSession(sessionId);
    return session?.workflow ?? null;
  }

  clearWorkflow(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.workflow = undefined;
    this.refresh(session);
    logger.debug('SessionService: cleared workflow', { sessionId });
  }

  setLastComplexWorkflow(
    sessionId: string,
    workflow: WorkflowDefinition,
    metadata: {
      capabilityIds: string[];
      userIntent: string;
      topologyHint?: string;
    }
  ): void {
    const session = this.getOrCreate(sessionId);
    session.lastComplexWorkflow = {
      workflow: this.cloneWorkflow(workflow),
      capabilityIds: [...new Set(metadata.capabilityIds)],
      userIntent: metadata.userIntent,
      topologyHint: metadata.topologyHint,
      savedAt: new Date().toISOString(),
    };
    this.refresh(session);
    logger.debug('SessionService: stored last complex workflow', {
      sessionId,
      workflowName: workflow.name,
      capabilityCount: metadata.capabilityIds.length,
    });
  }

  getLastComplexWorkflow(sessionId: string): CachedComplexWorkflow | null {
    const session = this.getSession(sessionId);
    const cached = session?.lastComplexWorkflow;
    if (!cached) {
      return null;
    }

    return {
      ...cached,
      capabilityIds: [...cached.capabilityIds],
      workflow: this.cloneWorkflow(cached.workflow),
    };
  }

  clearLastComplexWorkflow(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }

    session.lastComplexWorkflow = undefined;
    this.refresh(session);
    logger.debug('SessionService: cleared last complex workflow', { sessionId });
  }

  setConfigAgentState(sessionId: string, state: AgentSession['configAgentState']): void {
    const session = this.getOrCreate(sessionId);
    session.configAgentState = state;
    this.refresh(session);
    logger.debug('SessionService: stored config agent state', { sessionId });
  }

  getConfigAgentState(sessionId: string): AgentSession['configAgentState'] | undefined {
    const session = this.getSession(sessionId);
    return session?.configAgentState;
  }

  clearConfigAgentState(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.configAgentState = undefined;
    this.refresh(session);
    logger.debug('SessionService: cleared config agent state', { sessionId });
  }

  getConfigState(sessionId: string): NonNullable<AgentSession['configAgentState']> | null {
    const session = this.getSession(sessionId);
    return (session?.configAgentState ?? null) as NonNullable<AgentSession['configAgentState']> | null;
  }

  setPhase(sessionId: string, phase: AgentSession['phase']): void {
    const session = this.getOrCreate(sessionId);
    session.phase = phase;
    this.refresh(session);
    logger.debug('SessionService: updated phase', { sessionId, phase });
  }

  getPhase(sessionId: string): AgentSession['phase'] | null {
    const session = this.getSession(sessionId);
    return session?.phase ?? null;
  }

  setIntent(sessionId: string, intent: AgentSession['intent']): void {
    const session = this.getOrCreate(sessionId);
    session.intent = intent;
    this.refresh(session);
    logger.debug('SessionService: stored intent', { sessionId, category: intent?.category });
  }

  getIntent(sessionId: string): AgentSession['intent'] | null {
    const session = this.getSession(sessionId);
    return session?.intent ?? null;
  }

  clearIntent(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.intent = undefined;
    this.refresh(session);
    logger.debug('SessionService: cleared intent', { sessionId });
  }

  mergeConfirmedEntities(sessionId: string, entities: Record<string, string>): Record<string, string> {
    const session = this.getOrCreate(sessionId);
    Object.entries(entities).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      if (!session.confirmedEntities[key]) {
        session.confirmedEntities[key] = value;
      }
    });
    this.refresh(session);
    logger.debug('SessionService: merged confirmed entities', {
      sessionId,
      keys: Object.keys(entities),
      total: Object.keys(session.confirmedEntities).length,
    });
    return { ...session.confirmedEntities };
  }

  updateConfirmedEntities(sessionId: string, entities: Record<string, string>): Record<string, string> {
    const session = this.getOrCreate(sessionId);
    Object.entries(entities).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      session.confirmedEntities[key] = value;
    });
    this.refresh(session);
    logger.debug('SessionService: updated confirmed entities', {
      sessionId,
      keys: Object.keys(entities),
      total: Object.keys(session.confirmedEntities).length,
    });
    return { ...session.confirmedEntities };
  }

  getConfirmedEntities(sessionId: string): Record<string, string> {
    const session = this.getSession(sessionId);
    return session ? { ...session.confirmedEntities } : {};
  }

  clearConfirmedEntities(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.confirmedEntities = {};
    this.refresh(session);
    logger.debug('SessionService: cleared confirmed entities', { sessionId });
  }

  setBlueprint(sessionId: string, blueprint: AgentSession['blueprint']): void {
    const session = this.getOrCreate(sessionId);
    session.blueprint = blueprint;
    this.refresh(session);
    logger.debug('SessionService: stored blueprint', { sessionId });
  }

  getBlueprint(sessionId: string): AgentSession['blueprint'] | null {
    const session = this.getSession(sessionId);
    return session?.blueprint ?? null;
  }

  clearBlueprint(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.blueprint = undefined;
    this.refresh(session);
    logger.debug('SessionService: cleared blueprint', { sessionId });
  }

  setWorkflowSummary(sessionId: string, summary: string | undefined): void {
    const session = this.getOrCreate(sessionId);
    session.workflowSummary = summary;
    this.refresh(session);
    logger.debug('SessionService: stored workflow summary', { sessionId, length: summary?.length ?? 0 });
  }

  setDialogueModeState(sessionId: string, state: DialogueModeSessionState): void {
    const session = this.getOrCreate(sessionId);
    session.dialogueModeState = state;
    this.refresh(session);
    logger.debug('SessionService: stored dialogue mode state', {
      sessionId,
      branch: state.branch,
      phase: state.phase,
    });
  }

  getDialogueModeState(sessionId: string): DialogueModeSessionState | null {
    const session = this.getSession(sessionId);
    return session?.dialogueModeState ?? null;
  }

  getConfirmFailureCount(sessionId: string): number {
    const session = this.getSession(sessionId);
    return session?.confirmFailureCount ?? 0;
  }

  incrementConfirmFailureCount(sessionId: string): number {
    const session = this.getOrCreate(sessionId);
    session.confirmFailureCount = (session.confirmFailureCount ?? 0) + 1;
    this.refresh(session);
    logger.debug('SessionService: incremented confirm failure count', {
      sessionId,
      count: session.confirmFailureCount,
    });
    return session.confirmFailureCount;
  }

  clearDialogueModeState(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.dialogueModeState = undefined;
    this.refresh(session);
    logger.debug('SessionService: cleared dialogue mode state', { sessionId });
  }

  getWorkflowSummary(sessionId: string): string | null {
    const session = this.getSession(sessionId);
    return session?.workflowSummary ?? null;
  }

  setConfirmed(sessionId: string, confirmed: boolean): void {
    const session = this.getOrCreate(sessionId);
    session.confirmed = confirmed;
    this.refresh(session);
    logger.debug('SessionService: updated confirmation', { sessionId, confirmed });
  }

  setOrchestratorState(sessionId: string, state: AgentSession['orchestratorState']): void {
    const session = this.getOrCreate(sessionId);
    session.orchestratorState = state;
    this.refresh(session);
    logger.debug('SessionService: stored orchestrator state', {
      sessionId,
      phase: state?.phase ?? null,
      capabilityCount: state?.capabilityIds.length ?? 0,
      missingFields: state?.missingFields ?? [],
    });
  }

  getOrchestratorState(sessionId: string): AgentSession['orchestratorState'] | null {
    const session = this.getSession(sessionId);
    return session?.orchestratorState ?? null;
  }

  clearOrchestratorState(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.orchestratorState = undefined;
    this.refresh(session);
    logger.debug('SessionService: cleared orchestrator state', { sessionId });
  }

  isConfirmed(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    return session?.confirmed ?? false;
  }

  appendTrace(sessionId: string, input: AgentTraceEventInput): AgentTraceEvent {
    const session = this.getOrCreate(sessionId);
    const sequence = session.traceSequence + 1;
    const event: AgentTraceEvent = {
      id: `${sessionId}:${sequence}`,
      sessionId,
      sequence,
      timestamp: new Date().toISOString(),
      ...input,
    };

    session.traceSequence = sequence;
    session.traceEvents = [...session.traceEvents, event].slice(-200);
    this.refresh(session);

    logger.info('SessionService: appended trace event', {
      sessionId,
      sequence,
      source: event.source,
      phase: event.phase,
      kind: event.kind,
      status: event.status,
      title: event.title,
      detail: event.detail ?? null,
    });

    const listeners = this.traceListeners.get(sessionId);
    listeners?.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.warn('SessionService: trace listener failed', error);
      }
    });

    return event;
  }

  getTraceEvents(sessionId: string): AgentTraceEvent[] {
    const session = this.getSession(sessionId);
    return session ? [...session.traceEvents] : [];
  }

  clearTraceEvents(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }

    session.traceEvents = [];
    this.refresh(session);
    logger.debug('SessionService: cleared trace events', { sessionId });
  }

  subscribeTrace(sessionId: string, listener: AgentTraceListener): () => void {
    const listeners = this.traceListeners.get(sessionId) ?? new Set<AgentTraceListener>();
    listeners.add(listener);
    this.traceListeners.set(sessionId, listeners);

    return () => {
      const current = this.traceListeners.get(sessionId);
      if (!current) {
        return;
      }

      current.delete(listener);
      if (current.size === 0) {
        this.traceListeners.delete(sessionId);
      }
    };
  }

  resetSession(sessionId: string): void {
    const now = new Date().toISOString();
    const session: AgentSession = {
      id: sessionId,
      phase: 'understanding',
      history: [],
      workflow: undefined,
      lastComplexWorkflow: undefined,
      blueprint: undefined,
      intent: undefined,
      orchestratorState: undefined,
      confirmedEntities: {},
      workflowSummary: undefined,
      configAgentState: undefined,
      traceEvents: [],
      traceSequence: 0,
      confirmed: false,
      userTurns: 0,
      lastSummaryTurn: 0,
      dialogueModeState: undefined,
      createdAt: now,
      updatedAt: now,
      expiresAt: this.getExpiryIso(),
    };
    this.sessions.set(sessionId, session);
    this.traceListeners.delete(sessionId);
    logger.info('SessionService: session reset', { sessionId });
  }

  getSession(sessionId: string): AgentSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (this.isExpired(session)) {
      this.sessions.delete(sessionId);
      this.traceListeners.delete(sessionId);
      return null;
    }

    return session;
  }

  pruneExpired(): void {
    this.sessions.forEach((session, id) => {
      if (this.isExpired(session)) {
        this.sessions.delete(id);
        this.traceListeners.delete(id);
        logger.debug('SessionService: pruned expired session', { sessionId: id });
      }
    });
  }

  private refresh(session: AgentSession): void {
    const now = new Date().toISOString();
    session.updatedAt = now;
    session.expiresAt = this.getExpiryIso();
  }

  private getExpiryIso(): string {
    return new Date(Date.now() + this.ttlMs).toISOString();
  }

  private isExpired(session: AgentSession): boolean {
    return session.expiresAt ? new Date(session.expiresAt).getTime() <= Date.now() : false;
  }

  private cloneWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
    return JSON.parse(JSON.stringify(workflow)) as WorkflowDefinition;
  }
}
