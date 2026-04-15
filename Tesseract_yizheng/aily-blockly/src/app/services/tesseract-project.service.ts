/**
 * [INPUT]: 依赖浏览器 `fs/path` 桥与本地 `.tesseract` 项目目录结构。
 * [OUTPUT]: 对外提供 TesseractProjectService、项目模式识别、manifest/workflow 快照持久化与 workflow 视图同步目标广播。
 * [POS]: services/ 的 Tesseract 项目真相源，被聊天动作层与 `tesseract-studio` 共同消费，负责把项目级 workflow 引用收口到一处。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ProjectWorkspaceMode = 'tesseract' | 'blockly' | 'code';

export interface TesseractManifest {
  schemaVersion: 1;
  projectName: string;
  preferredChatMode: 'tesseract';
  createdAt: string;
  updatedAt: string;
  runtime: {
    agentPort: number;
    n8nPort: number;
  };
  board?: {
    name: string;
    nickname: string;
    version: string;
  };
  devmode?: string;
}

export interface TesseractAssemblyComponent {
  componentId: string;
  displayName: string;
}

export interface TesseractAssemblyResumeState {
  nodeName?: string | null;
  components: TesseractAssemblyComponent[];
  allPendingHardwareNodeNames?: string[];
}

export interface TesseractHardwareDispatchState {
  lastAction: 'upload' | 'stop';
  receiptStatus?: string | null;
  responseStatus?: string | null;
  workflowFile?: string | null;
  message?: string | null;
  successful?: boolean;
  updatedAt: string;
}

export interface TesseractWorkflowMetadata extends Record<string, unknown> {
  phase?: string;
  assemblyResume?: TesseractAssemblyResumeState | null;
  hardwareDispatch?: TesseractHardwareDispatchState | null;
}

export interface TesseractWorkflowSnapshot {
  schemaVersion: 1;
  projectName: string;
  updatedAt: string;
  sessionId?: string | null;
  workflowId?: string | null;
  workflowUrl?: string | null;
  workflow?: any | null;
  blueprint?: any | null;
  metadata?: TesseractWorkflowMetadata;
}

export interface TesseractWorkflowViewTarget {
  workspaceKey: string;
  projectPath: string | null;
  workflowId: string | null;
  workflowUrl: string | null;
  source: 'snapshot' | 'chat-create' | 'chat-open' | 'agent-envelope' | 'chat-confirm' | 'skill-card';
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class TesseractProjectService {
  readonly markerDir = '.tesseract';
  readonly manifestFile = 'manifest.json';
  readonly workflowFile = 'workflow.json';
  readonly globalWorkspaceKey = '__global_tesseract_workspace__';

  private readonly workflowViewTargetSubject =
    new BehaviorSubject<TesseractWorkflowViewTarget | null>(null);

  readonly workflowViewTarget$ = this.workflowViewTargetSubject.asObservable();

  getProjectMode(projectPath: string): ProjectWorkspaceMode {
    if (!projectPath) {
      return 'code';
    }

    if (this.hasTesseractManifest(projectPath)) {
      return 'tesseract';
    }

    if (window['fs'].existsSync(window['path'].join(projectPath, 'project.abi'))) {
      return 'blockly';
    }

    return 'code';
  }

  getWorkspaceKey(projectPath?: string | null): string {
    const normalizedProjectPath = this.normalizeProjectPath(projectPath);
    return normalizedProjectPath || this.globalWorkspaceKey;
  }

  hasTesseractManifest(projectPath: string): boolean {
    return window['fs'].existsSync(this.getManifestPath(projectPath));
  }

  ensureProjectScaffold(
    projectPath: string,
    options: {
      projectName: string;
      board?: { name: string; nickname: string; version: string };
      devmode?: string;
    }
  ): { manifest: TesseractManifest; workflow: TesseractWorkflowSnapshot } {
    const dirPath = this.getMarkerDirPath(projectPath);
    if (!window['fs'].existsSync(dirPath)) {
      window['fs'].mkdirSync(dirPath);
    }

    const now = new Date().toISOString();
    const manifest: TesseractManifest = {
      schemaVersion: 1,
      projectName: options.projectName,
      preferredChatMode: 'tesseract',
      createdAt: now,
      updatedAt: now,
      runtime: {
        agentPort: 3005,
        n8nPort: 5678,
      },
      board: options.board,
      devmode: options.devmode,
    };

    const workflow: TesseractWorkflowSnapshot = {
      schemaVersion: 1,
      projectName: options.projectName,
      updatedAt: now,
      sessionId: null,
      workflowId: null,
      workflowUrl: null,
      workflow: null,
      blueprint: null,
      metadata: {
        createdBy: 'aily-blockly',
      },
    };

    window['fs'].writeFileSync(this.getManifestPath(projectPath), JSON.stringify(manifest, null, 2));
    window['fs'].writeFileSync(this.getWorkflowSnapshotPath(projectPath), JSON.stringify(workflow, null, 2));

    return { manifest, workflow };
  }

  readManifest(projectPath: string): TesseractManifest | null {
    return this.readJsonFile<TesseractManifest>(this.getManifestPath(projectPath));
  }

  readWorkflowSnapshot(projectPath: string): TesseractWorkflowSnapshot | null {
    return this.readJsonFile<TesseractWorkflowSnapshot>(this.getWorkflowSnapshotPath(projectPath));
  }

  persistWorkflowSnapshot(
    projectPath: string,
    snapshot: Partial<TesseractWorkflowSnapshot>
  ): TesseractWorkflowSnapshot {
    const previous = this.readWorkflowSnapshot(projectPath);
    const nextMetadata = this.mergeMetadata(previous?.metadata, snapshot.metadata);
    const nextSnapshot: TesseractWorkflowSnapshot = {
      schemaVersion: 1,
      projectName: previous?.projectName || snapshot.projectName || window['path'].basename(projectPath),
      sessionId: previous?.sessionId ?? null,
      workflowId: previous?.workflowId ?? null,
      workflowUrl: previous?.workflowUrl ?? null,
      workflow: previous?.workflow ?? null,
      blueprint: previous?.blueprint ?? null,
      ...snapshot,
      updatedAt: new Date().toISOString(),
      metadata: nextMetadata,
    };

    window['fs'].writeFileSync(
      this.getWorkflowSnapshotPath(projectPath),
      JSON.stringify(nextSnapshot, null, 2)
    );

    return nextSnapshot;
  }

  persistHardwareDispatch(
    projectPath: string,
    hardwareDispatch: TesseractHardwareDispatchState | null
  ): TesseractWorkflowSnapshot {
    return this.persistWorkflowSnapshot(projectPath, {
      metadata: {
        hardwareDispatch,
      },
    });
  }

  syncWorkflowSnapshotAndView(
    projectPath: string,
    snapshot: Partial<TesseractWorkflowSnapshot>,
    source: TesseractWorkflowViewTarget['source'] = 'snapshot'
  ): TesseractWorkflowSnapshot {
    const nextSnapshot = this.persistWorkflowSnapshot(projectPath, snapshot);
    this.publishWorkflowViewTarget({
      projectPath,
      workflowId: nextSnapshot.workflowId,
      workflowUrl: nextSnapshot.workflowUrl,
      source,
    });
    return nextSnapshot;
  }

  publishWorkflowViewTarget(payload: {
    projectPath?: string | null;
    workflowId?: string | null;
    workflowUrl?: string | null;
    source?: TesseractWorkflowViewTarget['source'];
  }): TesseractWorkflowViewTarget | null {
    const workflowId = this.normalizeText(payload.workflowId);
    const workflowUrl = this.normalizeText(payload.workflowUrl);
    if (!workflowId && !workflowUrl) {
      return null;
    }

    const projectPath = this.normalizeProjectPath(payload.projectPath);
    const nextTarget: TesseractWorkflowViewTarget = {
      workspaceKey: this.getWorkspaceKey(projectPath),
      projectPath,
      workflowId: workflowId || null,
      workflowUrl: workflowUrl || null,
      source: payload.source || 'snapshot',
      updatedAt: new Date().toISOString(),
    };
    const previous = this.workflowViewTargetSubject.value;
    if (
      previous
      && previous.workspaceKey === nextTarget.workspaceKey
      && previous.workflowId === nextTarget.workflowId
      && previous.workflowUrl === nextTarget.workflowUrl
    ) {
      return previous;
    }

    this.workflowViewTargetSubject.next(nextTarget);
    return nextTarget;
  }

  clearWorkflowViewTarget(projectPath?: string | null): void {
    const currentTarget = this.workflowViewTargetSubject.value;
    if (!currentTarget) {
      return;
    }

    const workspaceKey = this.getWorkspaceKey(projectPath);
    if (workspaceKey !== currentTarget.workspaceKey) {
      return;
    }

    this.workflowViewTargetSubject.next(null);
  }

  peekWorkflowViewTarget(projectPath?: string | null): TesseractWorkflowViewTarget | null {
    const currentTarget = this.workflowViewTargetSubject.value;
    if (!currentTarget) {
      return null;
    }

    const workspaceKey = this.getWorkspaceKey(projectPath);
    return workspaceKey === currentTarget.workspaceKey
      ? currentTarget
      : null;
  }

  acknowledgeWorkflowViewTarget(projectPath?: string | null, workflowId?: string | null): void {
    const currentTarget = this.peekWorkflowViewTarget(projectPath);
    if (!currentTarget) {
      return;
    }

    const normalizedWorkflowId = this.normalizeText(workflowId);
    if (normalizedWorkflowId && normalizedWorkflowId !== this.normalizeText(currentTarget.workflowId)) {
      return;
    }

    this.workflowViewTargetSubject.next(null);
  }

  getManifestPath(projectPath: string): string {
    return window['path'].join(this.getMarkerDirPath(projectPath), this.manifestFile);
  }

  getWorkflowSnapshotPath(projectPath: string): string {
    return window['path'].join(this.getMarkerDirPath(projectPath), this.workflowFile);
  }

  private getMarkerDirPath(projectPath: string): string {
    return window['path'].join(projectPath, this.markerDir);
  }

  private normalizeProjectPath(projectPath?: string | null): string | null {
    const normalizedPath = this.normalizeText(projectPath);
    return normalizedPath || null;
  }

  private normalizeText(value?: string | null): string {
    return String(value || '').trim();
  }

  private mergeMetadata(
    previous?: TesseractWorkflowMetadata | null,
    next?: TesseractWorkflowMetadata | null
  ): TesseractWorkflowMetadata {
    return {
      ...(previous ?? {}),
      ...(next ?? {}),
    };
  }

  private readJsonFile<T>(filePath: string): T | null {
    try {
      if (!window['fs'].existsSync(filePath)) {
        return null;
      }
      return JSON.parse(window['fs'].readFileSync(filePath, 'utf8')) as T;
    } catch (error) {
      console.warn('[TesseractProjectService] Failed to read JSON:', filePath, error);
      return null;
    }
  }
}
