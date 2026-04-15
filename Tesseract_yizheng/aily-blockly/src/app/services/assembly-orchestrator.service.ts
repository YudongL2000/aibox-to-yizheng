/**
 * [INPUT]: 依赖聊天层发起的组装 session payload 与数字孪生回传的完成/中继事件。
 * [OUTPUT]: 对外提供 AssemblyOrchestratorService，统一持有桌面单窗口硬件组装 session。
 * [POS]: services 层的硬件组装编排器，被 AilyChatComponent 与 DigitalTwinPanelComponent 共享。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AssemblySessionState {
  mode: 'hardware-assembly';
  sessionId: string | null;
  nodeName?: string | null;
  allPendingHardwareNodeNames?: string[];
  components: Array<{ componentId: string; displayName: string }>;
  startedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class AssemblyOrchestratorService {
  private readonly sessionSubject = new BehaviorSubject<AssemblySessionState | null>(null);
  private readonly lastCompletionSubject = new BehaviorSubject<Record<string, unknown> | null>(null);

  readonly session$ = this.sessionSubject.asObservable();
  readonly lastCompletion$ = this.lastCompletionSubject.asObservable();

  get session() {
    return this.sessionSubject.value;
  }

  startSession(payload: Omit<AssemblySessionState, 'startedAt'>): AssemblySessionState {
    const session = {
      ...payload,
      startedAt: new Date().toISOString(),
    };
    this.sessionSubject.next(session);
    return session;
  }

  updateHardwareState(_payload: Record<string, unknown>): void {
    // 首阶段桌面化不在这里复制硬件桥数据，只保留接口供后续细化。
  }

  handleWorkflowAction(_payload: Record<string, unknown>): void {
    // 首阶段由 DigitalTwinPanel / Iframe bridge 直接处理工作流动作。
  }

  completeSession(payload: Record<string, unknown>): void {
    this.lastCompletionSubject.next(payload);
    this.sessionSubject.next(null);
  }

  cancelSession(): void {
    this.sessionSubject.next(null);
  }
}
