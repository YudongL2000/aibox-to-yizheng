/**
 * [INPUT]: 依赖 CommonModule、backend 输出的 config-guide payload 与 DialogueHardwareBridgeService 的实时硬件快照。
 * [OUTPUT]: 对外提供 x-aily-config-guide-viewer，渲染当前配置节点说明、热插拔状态与交互提示。
 * [POS]: x-dialog 的配置阶段说明卡片，被 hot_plugging/config_input/select_* 响应复用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  DialogueBridgeState,
  DialogueHardwareBridgeService,
} from '../../../services/dialogue-hardware-bridge.service';
import { DialogueHardwareComponent } from '../../../services/tesseract-dialogue.models';

type HotplugRequirement = {
  componentId: string;
  displayName: string;
};

type HardwareIdentity = {
  componentId?: string | null;
  deviceId?: string | null;
  displayName?: string | null;
  modelId?: string | null;
};

const HOTPLUG_TIMEOUT_MS = 30000;

const CATEGORY_COMPONENT_MAP: Record<string, HotplugRequirement> = {
  BASE: { componentId: 'base', displayName: '底盘' },
  CAM: { componentId: 'camera', displayName: '摄像头' },
  MIC: { componentId: 'microphone', displayName: '麦克风' },
  WHEEL: { componentId: 'chassis', displayName: '底盘' },
  'FACE-NET': { componentId: 'face_net', displayName: '人脸识别' },
  'YOLO-HAND': { componentId: 'yolo_hand', displayName: '手势识别' },
  'YOLO-RPS': { componentId: 'yolo_rps', displayName: '石头剪刀布识别' },
  ASR: { componentId: 'asr', displayName: '语音识别' },
  LLM: { componentId: 'llm', displayName: '大语言模型' },
  'LLM-EMO': { componentId: 'llm_emo', displayName: '情绪模型' },
  TTS: { componentId: 'tts', displayName: '语音合成' },
  RAM: { componentId: 'ram', displayName: '随机决策器' },
  ASSIGN: { componentId: 'assign', displayName: '动作分配器' },
  HAND: { componentId: 'mechanical_hand', displayName: '机械手' },
  SPEAKER: { componentId: 'speaker', displayName: '扬声器' },
  SCREEN: { componentId: 'screen', displayName: '屏幕' },
};

@Component({
  selector: 'x-aily-config-guide-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="guide-card">
      <div class="header">
        <div>
          <h4>{{ data?.currentNode?.displayName || data?.currentNode?.title || '配置引导' }}</h4>
          <p>{{ data?.currentNode?.subtitle || data?.interaction?.title || data?.type }}</p>
        </div>
        @if (data?.progress) {
          <span>{{ data.progress.completed }}/{{ data.progress.total }}</span>
        }
      </div>

      @if (data?.interaction?.description) {
        <p class="desc">{{ data.interaction.description }}</p>
      }

      @if (isHotPlugging) {
        <div class="hotplug-status-card">
          <div class="hotplug-status">
            <span class="hotplug-dot"></span>
            <span>等待硬件接入，系统将自动检测…</span>
            <span class="hotplug-counter">{{ hotplugConnectedCount }}/{{ requiredComponents.length }}</span>
          </div>

          @if (requiredComponents.length > 0) {
            <div class="hotplug-checklist">
              @for (component of requiredComponents; track component.componentId) {
                <div class="hotplug-item" [class.ready]="isComponentDetected(component)">
                  <span class="hotplug-item-indicator"></span>
                  <div class="hotplug-item-copy">
                    <strong>{{ component.displayName }}</strong>
                    <span>{{ getComponentStatusText(component) }}</span>
                  </div>
                </div>
              }
            </div>
          }

          @if (hotplugTimedOut && !allRequiredDetected) {
            <div class="hotplug-timeout">
              等待超过 30 秒。请检查硬件连接，或点击下方“标记节点已处理”先跳过当前步骤。
            </div>
          }
        </div>
      }

      @if (showSelectOptions) {
        <div class="options">
          @for (option of asArray(data?.interaction?.options); track option.value) {
            <button
              class="option option--interactive"
              type="button"
              [class.option--active]="isSelected(option.value)"
              (click)="toggleOption(option.value)"
            >
              <strong>{{ option.label }}</strong>
              @if (resolveOptionMeta(option)) {
                <span>{{ resolveOptionMeta(option) }}</span>
              }
            </button>
          }
        </div>
      }

      @if (isConfigInput) {
        <div class="input-card">
          <textarea
            class="text-input"
            rows="3"
            [value]="textValue"
            [placeholder]="inputPlaceholder"
            (input)="onTextInput($event)"
          ></textarea>
        </div>
      }

      @if (isImageUpload) {
        <div class="upload-card">
          @if (asArray(data?.interaction?.options).length) {
            <div class="upload-group">
              <span class="upload-label">人物档案</span>
              <div class="options options--compact">
                @for (option of asArray(data?.interaction?.options); track option.value) {
                  <button
                    class="option option--interactive"
                    type="button"
                    [class.option--active]="selectedProfile === option.value"
                    (click)="selectProfile(option.value)"
                  >
                    <strong>{{ option.label }}</strong>
                    <span>{{ option.value }}</span>
                  </button>
                }
              </div>
            </div>
          }

          <div class="upload-group">
            <span class="upload-label">人脸图片</span>
            <label class="file-picker">
              <input type="file" accept="image/*" (change)="onFileSelected($event)" />
              <span>{{ selectedFileName || '选择图片文件' }}</span>
            </label>
            @if (selectedFileName) {
              <p class="upload-hint">{{ selectedFileName }}</p>
            }
          </div>
        </div>
      }

      @if (showInlineSubmit) {
        <div class="actions">
          <button
            class="submit-button"
            type="button"
            [disabled]="!canSubmit"
            (click)="submit()"
          >
            {{ submitLabel }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .guide-card {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(176, 110, 255, 0.22);
      background: linear-gradient(180deg, rgba(24, 20, 38, 0.98), rgba(20, 16, 32, 0.95));
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    .header h4 { margin: 0 0 4px; color: #d4b8ff; }
    .header p, .header span { margin: 0; color: #9370cc; }
    .desc { margin: 12px 0 0; color: #b899ec; }
    .desc--muted { color: #8a66bb; }
    .hotplug-status {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 2px;
      color: #9370cc;
      font-size: 13px;
    }
    .hotplug-status-card {
      display: grid;
      gap: 12px;
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid rgba(176, 110, 255, 0.16);
      border-radius: 12px;
      background: rgba(31, 24, 48, 0.72);
    }
    .hotplug-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #b06eff;
      flex-shrink: 0;
      animation: hotplug-pulse 1.4s ease-in-out infinite;
    }
    .hotplug-counter {
      margin-left: auto;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(176, 110, 255, 0.14);
      color: #d9c0ff;
      font-size: 11px;
      font-weight: 700;
    }
    .hotplug-checklist {
      display: grid;
      gap: 8px;
    }
    .hotplug-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(176, 110, 255, 0.05);
      border: 1px solid rgba(176, 110, 255, 0.12);
    }
    .hotplug-item.ready {
      border-color: rgba(86, 223, 153, 0.34);
      background: rgba(86, 223, 153, 0.08);
    }
    .hotplug-item-indicator {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: #6d6681;
      box-shadow: 0 0 0 4px rgba(109, 102, 129, 0.12);
      flex-shrink: 0;
    }
    .hotplug-item.ready .hotplug-item-indicator {
      background: #56df99;
      box-shadow: 0 0 0 4px rgba(86, 223, 153, 0.12);
    }
    .hotplug-item-copy {
      display: grid;
      gap: 2px;
    }
    .hotplug-item-copy strong {
      color: #e7d6ff;
      font-size: 13px;
    }
    .hotplug-item-copy span {
      color: #9f84cf;
      font-size: 12px;
    }
    .hotplug-timeout {
      color: #ffd48c;
      font-size: 12px;
      line-height: 1.5;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(250, 173, 20, 0.24);
      background: rgba(250, 173, 20, 0.08);
    }
    @keyframes hotplug-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.35; transform: scale(0.7); }
    }
    .options { display: grid; gap: 8px; margin-top: 12px; }
    .option {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(176, 110, 255, 0.06);
      color: #c8a8ff;
      border: 1px solid transparent;
    }
    .option--interactive {
      cursor: pointer;
      text-align: left;
      transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
    }
    .option--interactive:hover {
      transform: translateY(-1px);
      border-color: rgba(176, 110, 255, 0.28);
    }
    .option--active {
      border-color: rgba(176, 110, 255, 0.42);
      background: rgba(176, 110, 255, 0.14);
    }
    .options--compact {
      margin-top: 8px;
    }
    .input-card,
    .upload-card {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }
    .upload-group {
      display: grid;
      gap: 8px;
    }
    .upload-label {
      color: #b899ec;
      font-size: 12px;
      font-weight: 700;
    }
    .text-input {
      width: 100%;
      min-height: 92px;
      resize: vertical;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(176, 110, 255, 0.22);
      background: rgba(30, 22, 48, 0.72);
      color: #e0d0ff;
      font: inherit;
      box-sizing: border-box;
    }
    .text-input:focus {
      outline: none;
      border-color: rgba(176, 110, 255, 0.5);
      box-shadow: 0 0 0 3px rgba(176, 110, 255, 0.1);
    }
    .file-picker {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 10px 12px;
      border: 1px dashed rgba(176, 110, 255, 0.35);
      border-radius: 12px;
      background: rgba(30, 22, 48, 0.52);
      color: #c8a8ff;
      cursor: pointer;
      overflow: hidden;
      text-align: center;
      font-weight: 600;
    }
    .file-picker input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .upload-hint {
      margin: 0;
      color: #8a66bb;
      font-size: 12px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
    }
    .submit-button {
      border: none;
      border-radius: 999px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #6b35c2, #b06eff);
      color: #f5eeff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.16s ease, transform 0.16s ease;
    }
    .submit-button:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    .submit-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `],
})
export class XAilyConfigGuideViewerComponent implements OnChanges, OnDestroy {
  @Input() data: any = null;

  selectedValues = new Set<string>();
  textValue = '';
  selectedProfile = '';
  selectedFileName = '';
  selectedFileBase64 = '';
  detectedComponents: DialogueHardwareComponent[] = [];
  hotplugTimedOut = false;

  private hotplugTimer: ReturnType<typeof setTimeout> | null = null;
  private hotplugSubscription: Subscription;
  private autoConfirmedNodeName: string | null = null;

  constructor(private readonly dialogueHardwareBridgeService: DialogueHardwareBridgeService) {
    this.hotplugSubscription = this.dialogueHardwareBridgeService.state$.subscribe((state) => {
      this.applyBridgeState(state);
    });
  }

  ngOnDestroy(): void {
    this.clearHotplugTimer();
    this.hotplugSubscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.resetStateFromData();
      this.detectedComponents = this.dialogueHardwareBridgeService.snapshot.components;
      if (this.isHotPlugging) {
        this.hotplugTimedOut = false;
        this.autoConfirmedNodeName = null;
        this.restartHotplugTimer();
        this.maybeAutoConfirmHotplug();
      } else {
        this.clearHotplugTimer();
      }
    }
  }

  get isHotPlugging(): boolean {
    return this.data?.type === 'hot_plugging';
  }

  get requiredComponents(): HotplugRequirement[] {
    if (!this.isHotPlugging) {
      return [];
    }

    const metadataRequirements = Array.isArray(this.data?.metadata?.requiredHardware)
      ? this.data.metadata.requiredHardware
      : [];
    if (metadataRequirements.length > 0) {
      return metadataRequirements
        .filter((item: any) => item && typeof item.componentId === 'string')
        .map((item: any) => ({
          componentId: item.componentId,
          displayName: item.displayName || item.componentId,
        }));
    }

    const category = String(this.data?.currentNode?.category || '').trim();
    const mapped = category ? CATEGORY_COMPONENT_MAP[category] : null;
    if (mapped) {
      return [mapped];
    }

    const fallbackName = this.data?.currentNode?.displayName || this.data?.currentNode?.title || '当前硬件';
    return [{
      componentId: String(fallbackName).trim().toLowerCase().replace(/\s+/g, '_'),
      displayName: fallbackName,
    }];
  }

  get hotplugConnectedCount(): number {
    return this.requiredComponents.filter((component) => this.isComponentDetected(component)).length;
  }

  get allRequiredDetected(): boolean {
    return this.requiredComponents.length > 0
      && this.requiredComponents.every((component) => this.isComponentDetected(component));
  }

  get showSelectOptions(): boolean {
    if (this.isHotPlugging) {
      return false;
    }

    const hasSelectableInteraction = this.asArray(this.data?.interaction?.options).length > 0
      && (this.data?.interaction?.mode === 'single' || this.data?.interaction?.mode === 'multi');

    return hasSelectableInteraction
      || this.data?.type === 'select_single'
      || this.data?.type === 'select_multi';
  }

  get isConfigInput(): boolean {
    return this.data?.type === 'config_input';
  }

  get isImageUpload(): boolean {
    return this.data?.type === 'image_upload';
  }

  get showInlineSubmit(): boolean {
    return this.showSelectOptions || this.isConfigInput || this.isImageUpload;
  }

  get canSubmit(): boolean {
    if (this.showSelectOptions) {
      return this.selectedValues.size > 0;
    }
    if (this.isConfigInput) {
      return this.textValue.trim().length > 0;
    }
    if (this.isImageUpload) {
      return Boolean(this.selectedProfile && this.selectedFileName && this.selectedFileBase64);
    }
    return false;
  }

  get submitLabel(): string {
    if (this.isImageUpload) {
      return '上传并继续';
    }
    if (this.isConfigInput) {
      return '提交配置';
    }
    return '提交选择';
  }

  get inputPlaceholder(): string {
    return this.data?.currentNode?.subtitle || this.data?.interaction?.description || '输入配置内容';
  }

  isComponentDetected(requirement: HotplugRequirement): boolean {
    return this.detectedComponents.some((component) => {
      if (!component || component.status === 'removed' || component.status === 'error') {
        return false;
      }

      return this.matchesHardwareRequirement(requirement, component);
    });
  }

  getComponentStatusText(requirement: HotplugRequirement): string {
    return this.isComponentDetected(requirement) ? '已接入' : '等待接入';
  }

  asArray(value: unknown): Array<{ label: string; value: string }> {
    return Array.isArray(value) ? value as Array<{ label: string; value: string }> : [];
  }

  isSelected(value: string): boolean {
    return this.selectedValues.has(value);
  }

  toggleOption(value: string): void {
    if (!value) {
      return;
    }

    if (this.data?.type === 'select_multi' || this.data?.interaction?.mode === 'multi') {
      if (this.selectedValues.has(value)) {
        this.selectedValues.delete(value);
      } else {
        this.selectedValues.add(value);
      }
      return;
    }

    this.selectedValues = new Set([value]);
  }

  onTextInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.textValue = target?.value || '';
  }

  selectProfile(value: string): void {
    this.selectedProfile = value;
  }

  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (!file) {
      return;
    }

    this.selectedFileName = file.name;
    this.selectedFileBase64 = await this.readFileAsBase64(file);
  }

  submit(): void {
    if (!this.canSubmit) {
      return;
    }

    if (this.showSelectOptions) {
      const selectedValues = Array.from(this.selectedValues);
      const displayValue = this.resolveDisplayValue(selectedValues);
      const message = this.isClarificationInteraction
        ? displayValue
        : selectedValues.join(',');

      this.dispatchAction('tesseract-submit-config-interaction', {
        sessionId: this.data?.sessionId,
        type: this.data?.type,
        message,
        displayValue,
      });
      return;
    }

    if (this.isConfigInput) {
      this.dispatchAction('tesseract-submit-config-interaction', {
        sessionId: this.data?.sessionId,
        type: this.data?.type,
        message: this.textValue.trim(),
      });
      return;
    }

    if (this.isImageUpload) {
      this.dispatchAction('tesseract-submit-config-interaction', {
        sessionId: this.data?.sessionId,
        type: this.data?.type,
        nodeName: this.data?.currentNode?.name || null,
        profile: this.selectedProfile,
        fileName: this.selectedFileName,
        contentBase64: this.selectedFileBase64,
      });
    }
  }

  private resetStateFromData(): void {
    const selected = this.data?.interaction?.selected;
    const nextSelectedValues = new Set<string>();
    if (Array.isArray(selected)) {
      selected.forEach((value) => {
        if (typeof value === 'string' && value.length > 0) {
          nextSelectedValues.add(value);
        }
      });
    } else if (typeof selected === 'string' && selected.length > 0) {
      nextSelectedValues.add(selected);
    }

    this.selectedValues = nextSelectedValues;
    this.textValue = '';
    this.selectedProfile = typeof selected === 'string' ? selected : this.asArray(this.data?.interaction?.options)[0]?.value || '';
    this.selectedFileName = '';
    this.selectedFileBase64 = '';
  }

  private matchesHardwareRequirement(
    requirement: HotplugRequirement,
    component: HardwareIdentity
  ): boolean {
    const requiredTokens = this.collectIdentityTokens(requirement);
    const detectedTokens = this.collectIdentityTokens(component);

    for (const token of requiredTokens) {
      if (detectedTokens.has(token)) {
        return true;
      }
    }

    return false;
  }

  private collectIdentityTokens(identity: HardwareIdentity): Set<string> {
    const tokens = new Set<string>();
    const rawValues = [
      identity.componentId,
      identity.deviceId,
      identity.displayName,
      identity.modelId,
    ];

    for (const value of rawValues) {
      const normalized = this.normalizeIdentityToken(value);
      if (!normalized) {
        continue;
      }

      tokens.add(normalized);
      for (const alias of this.expandHardwareAliases(normalized)) {
        tokens.add(alias);
      }
    }

    return tokens;
  }

  private normalizeIdentityToken(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  private expandHardwareAliases(token: string): string[] {
    switch (token) {
      case 'cam':
      case 'camera':
      case 'webcam':
      case 'usb_camera':
      case '摄像头':
      case '镜头':
      case 'cam_001':
        return ['cam', 'camera', 'webcam', 'usb_camera', '摄像头', '镜头', 'cam_001'];
      case 'mic':
      case 'microphone':
      case '麦克风':
      case 'mic_001':
        return ['mic', 'microphone', '麦克风', 'mic_001'];
      case 'wheel':
      case 'chassis':
      case 'base':
      case '底盘':
        return ['wheel', 'chassis', 'base', '底盘'];
      case 'mechanical_hand':
      case 'hand':
      case 'claw':
      case '机械手':
      case '夹爪':
        return ['mechanical_hand', 'hand', 'claw', '机械手', '夹爪'];
      case 'speaker':
      case '扬声器':
      case '喇叭':
        return ['speaker', '扬声器', '喇叭'];
      default:
        return [token];
    }
  }

  private resolveDisplayValue(values: string[]): string {
    const options = this.asArray(this.data?.interaction?.options);
    return values
      .map((value) => options.find((option) => option.value === value)?.label || value)
      .join(' / ');
  }

  resolveOptionMeta(option: { label: string; value: string; reason?: string }): string {
    if (this.isClarificationInteraction) {
      return option.reason || '';
    }
    return option.value;
  }

  get isClarificationInteraction(): boolean {
    return this.data?.interaction?.field === 'clarification_action';
  }

  private dispatchAction(action: string, payload: Record<string, unknown>): void {
    document.dispatchEvent(new CustomEvent('aily-chat-action', {
      detail: {
        action,
        data: payload,
      },
    }));
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const separatorIndex = result.indexOf(',');
        resolve(separatorIndex >= 0 ? result.slice(separatorIndex + 1) : result);
      };
      reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
      reader.readAsDataURL(file);
    });
  }

  private applyBridgeState(state: DialogueBridgeState): void {
    this.detectedComponents = state.components || [];
    if (!this.isHotPlugging) {
      return;
    }

    if (this.allRequiredDetected) {
      this.clearHotplugTimer();
      this.hotplugTimedOut = false;
    }

    this.maybeAutoConfirmHotplug();
  }

  private restartHotplugTimer(): void {
    this.clearHotplugTimer();
    this.hotplugTimer = setTimeout(() => {
      this.hotplugTimedOut = true;
      this.dispatchAction('tesseract-hotplug-timeout', {
        sessionId: this.data?.sessionId || null,
        nodeName: this.data?.currentNode?.name || null,
      });
    }, HOTPLUG_TIMEOUT_MS);
  }

  private clearHotplugTimer(): void {
    if (this.hotplugTimer) {
      clearTimeout(this.hotplugTimer);
      this.hotplugTimer = null;
    }
  }

  private maybeAutoConfirmHotplug(): void {
    const nodeName = this.data?.currentNode?.name;
    if (!this.isHotPlugging || !nodeName || !this.allRequiredDetected) {
      return;
    }

    if (this.autoConfirmedNodeName === nodeName) {
      return;
    }

    const portId = this.resolveHotplugPortId();
    this.autoConfirmedNodeName = nodeName;
    this.dispatchAction('tesseract-confirm-node', {
      sessionId: this.data?.sessionId,
      nodeName,
      ...(portId ? { portId, topology: portId } : {}),
    });
  }

  private resolveHotplugPortId(): string | null {
    const selected = this.data?.interaction?.selected;
    if (typeof selected === 'string' && selected.trim().length > 0) {
      return selected;
    }

    const topology = this.data?.currentNode?.configValues?.topology;
    if (typeof topology === 'string' && topology.trim().length > 0) {
      return topology;
    }

    const firstOption = this.asArray(this.data?.interaction?.options)[0]?.value;
    return typeof firstOption === 'string' && firstOption.trim().length > 0
      ? firstOption
      : null;
  }
}
