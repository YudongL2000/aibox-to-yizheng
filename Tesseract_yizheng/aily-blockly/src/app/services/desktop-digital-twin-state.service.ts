/**
 * [INPUT]: 依赖 renderer 侧数字孪生 scene/preview envelope 与 Electron runtime flag。
 * [OUTPUT]: 对外提供 DesktopDigitalTwinStateService，统一承接桌面单窗口数字孪生的 scene/preview/viewer 状态，并在 runtime scene 刷新时保住 `config_complete` 这类可下发态 metadata，避免嵌入数字孪生 CTA 被心跳覆盖。
 * [POS]: services 层的 renderer-side digital twin 真相源，被聊天/硬件运行时/嵌入式数字孪生面板共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type DigitalTwinEnvelope = Record<string, unknown> | null;

@Injectable({
  providedIn: 'root',
})
export class DesktopDigitalTwinStateService {
  private readonly sceneSubject = new BehaviorSubject<DigitalTwinEnvelope>(null);
  private readonly previewStateSubject = new BehaviorSubject<DigitalTwinEnvelope>(null);
  private readonly viewerReadySubject = new BehaviorSubject<Record<string, unknown> | null>(null);
  private readonly consumedAckSubject = new BehaviorSubject<Record<string, unknown> | null>(null);
  private readonly viewerEventSubject = new BehaviorSubject<Record<string, unknown> | null>(null);
  private readonly visibleSubject = new BehaviorSubject<boolean>(false);
  private sceneRevision = 0;
  private previewRevision = 0;

  readonly scene$ = this.sceneSubject.asObservable();
  readonly previewState$ = this.previewStateSubject.asObservable();
  readonly viewerReady$ = this.viewerReadySubject.asObservable();
  readonly consumedAck$ = this.consumedAckSubject.asObservable();
  readonly viewerEvent$ = this.viewerEventSubject.asObservable();
  readonly visible$ = this.visibleSubject.asObservable();

  get scene() {
    return this.sceneSubject.value;
  }

  get previewState() {
    return this.previewStateSubject.value;
  }

  get isVisible() {
    return this.visibleSubject.value;
  }

  applyScene(payload: unknown): DigitalTwinEnvelope {
    const envelope = this.normalizeEnvelope(payload, 'scene');
    this.sceneSubject.next(envelope);
    this.mirrorLegacyScene(envelope);
    return envelope;
  }

  applyPreviewState(payload: unknown): DigitalTwinEnvelope {
    const envelope = this.normalizeEnvelope(payload, 'previewState');
    this.previewStateSubject.next(envelope);
    this.mirrorLegacyPreviewState(envelope);
    return envelope;
  }

  handleViewerReady(payload: Record<string, unknown>): void {
    this.viewerReadySubject.next(payload);
  }

  handleConsumedAck(payload: Record<string, unknown>): void {
    this.consumedAckSubject.next(payload);
  }

  handleViewerEvent(payload: Record<string, unknown>): void {
    this.viewerEventSubject.next(payload);
    const messageType = String(payload['type'] ?? '');
    if (messageType === 'tesseract-digital-twin-preview-state') {
      this.applyPreviewState(payload);
    }
  }

  setVisibility(visible: boolean): void {
    this.visibleSubject.next(visible);
  }

  private normalizeEnvelope(
    payload: unknown,
    kind: 'scene' | 'previewState',
  ): DigitalTwinEnvelope {
    const record =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? { ...(payload as Record<string, unknown>) }
        : {};

    if (kind === 'scene') {
      this.preserveActionableSceneMetadata(record);
    }

    const currentRevision = Number(record['revision'] ?? 0);
    if (!Number.isFinite(currentRevision) || currentRevision <= 0) {
      if (kind === 'scene') {
        this.sceneRevision += 1;
        record['revision'] = this.sceneRevision;
      } else {
        this.previewRevision += 1;
        record['revision'] = this.previewRevision;
      }
    } else if (kind === 'scene') {
      this.sceneRevision = Math.max(this.sceneRevision, currentRevision);
    } else {
      this.previewRevision = Math.max(this.previewRevision, currentRevision);
    }

    if (!Object.prototype.hasOwnProperty.call(record, kind)) {
      record[kind] = payload ?? null;
    }

    if (!Object.prototype.hasOwnProperty.call(record, 'sourcePhase')) {
      record['sourcePhase'] = 'renderer';
    }

    return record;
  }

  private preserveActionableSceneMetadata(record: Record<string, unknown>): void {
    const current =
      this.sceneSubject.value && typeof this.sceneSubject.value === 'object'
        ? (this.sceneSubject.value as Record<string, unknown>)
        : null;
    if (!current) {
      return;
    }

    const incomingResponseType = this.normalizeResponseType(record['responseType']);
    const currentResponseType = this.normalizeResponseType(current['responseType']);
    const incomingSessionId = this.normalizeSessionId(record['sessionId']);
    const currentSessionId = this.normalizeSessionId(current['sessionId']);

    const shouldPreserveConfigComplete =
      currentResponseType === 'config_complete' &&
      currentSessionId !== '' &&
      incomingResponseType === 'hardware_status' &&
      incomingSessionId === '' &&
      this.isSameSceneIdentity(record['scene'], current['scene']);

    if (!shouldPreserveConfigComplete) {
      return;
    }

    record['responseType'] = currentResponseType;
    record['sessionId'] = currentSessionId;
    if (!Object.prototype.hasOwnProperty.call(record, 'projectPath')) {
      record['projectPath'] = current['projectPath'] ?? null;
    }
  }

  private normalizeResponseType(raw: unknown): string {
    return String(raw ?? '').trim().toLowerCase();
  }

  private normalizeSessionId(raw: unknown): string {
    return String(raw ?? '').trim();
  }

  private isSameSceneIdentity(left: unknown, right: unknown): boolean {
    return JSON.stringify(this.buildSceneIdentity(left)) === JSON.stringify(this.buildSceneIdentity(right));
  }

  private buildSceneIdentity(raw: unknown): Record<string, unknown> {
    const record =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const rawModels = Array.isArray(record['models']) ? record['models'] : [];
    const models = rawModels
      .map((entry) =>
        entry && typeof entry === 'object' && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : null
      )
      .filter((entry): entry is Record<string, unknown> => entry !== null)
      .map((entry) => ({
        id: entry['id'] ?? null,
        interfaceId: entry['interfaceId'] ?? entry['interface_id'] ?? null,
      }))
      .sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
      );

    return {
      baseModelId: record['baseModelId'] ?? record['base_model_id'] ?? null,
      displayMode: record['displayMode'] ?? record['display_mode'] ?? null,
      models,
    };
  }

  private mirrorLegacyScene(payload: DigitalTwinEnvelope): void {
    if (!this.shouldMirrorLegacyState()) {
      return;
    }

    void window.electronAPI?.digitalTwin?.setScene?.(payload).catch((error: unknown) => {
      console.warn('[DesktopDigitalTwinState] legacy setScene failed:', error);
    });
  }

  private mirrorLegacyPreviewState(payload: DigitalTwinEnvelope): void {
    if (!this.shouldMirrorLegacyState()) {
      return;
    }

    void window.electronAPI?.digitalTwin?.setPreviewState?.(payload).catch((error: unknown) => {
      console.warn('[DesktopDigitalTwinState] legacy setPreviewState failed:', error);
    });
  }

  private shouldMirrorLegacyState(): boolean {
    const mode = window.electronAPI?.runtimeFlags?.desktopTwinMode || 'embedded-panel';
    return mode === 'legacy-window';
  }
}
