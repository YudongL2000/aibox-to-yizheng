/**
 * [INPUT]: 依赖 agentApi 的 InteractionRequest 与外部提交回调
 * [OUTPUT]: 对外提供 InteractionCard 组件，渲染带 AI 推荐理由的结构化单选/多选/上传交互卡片
 * [POS]: agent-ui 的结构化交互渲染器，被 ChatInterface 复用于澄清动作与配置选项场景，并遵循统一 shell option/list 语法
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useMemo, useState } from 'react';
import type { InteractionRequest } from '../lib/agentApi';

interface InteractionCardProps {
  interaction: InteractionRequest;
  onSubmit: (payload: { selected: string[]; file?: File | null }) => void | Promise<void>;
  disabled?: boolean;
}

const FIELD_LABELS: Record<InteractionRequest['field'], string> = {
  clarification_action: '下一步补充',
  tts_voice: '音色选择',
  screen_emoji: '屏幕表情',
  chassis_action: '底盘动作',
  hand_gestures: '机械手手势',
  yolo_gestures: '手势识别',
  emotion_labels: '情绪分类',
  arm_actions: '机械臂动作',
  face_profiles: '人脸样本',
};

export function InteractionCard({ interaction, onSubmit, disabled }: InteractionCardProps) {
  const initialSelected = useMemo(() => {
    if (Array.isArray(interaction.selected)) {
      return interaction.selected;
    }
    if (interaction.selected) {
      return [interaction.selected];
    }
    return [];
  }, [interaction.selected]);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [file, setFile] = useState<File | null>(null);

  const isMulti = interaction.mode === 'multi';
  const isImage = interaction.mode === 'image';
  const minSelections = interaction.minSelections ?? 1;
  const maxSelections = interaction.maxSelections ?? (isMulti ? interaction.options.length : 1);
  const selectionCount = selected.length;

  const toggleOption = (value: string) => {
    if (isMulti) {
      setSelected((prev) => {
        if (prev.includes(value)) {
          return prev.filter((item) => item !== value);
        }
        if (prev.length >= maxSelections) {
          return prev;
        }
        return [...prev, value];
      });
      return;
    }
    setSelected([value]);
  };

  const canSubmit = selectionCount >= minSelections && (!isImage || Boolean(file));

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    await onSubmit({ selected, file });
  };

  return (
    <div className="sp-data-block mt-3 p-4 text-xs sp-text-primary">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sp-mono-tag">{FIELD_LABELS[interaction.field]}</p>
          <p className="mt-1 text-sm sp-text-primary">{interaction.title}</p>
          {interaction.description ? (
            <p className="mt-1 text-xs sp-text-muted">{interaction.description}</p>
          ) : null}
        </div>
        <div className="sp-shell-chip sp-tone--neutral">
          {interaction.mode === 'multi' ? '多选' : interaction.mode === 'image' ? '上传' : '单选'}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {interaction.options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleOption(option.value)}
              className={`sp-option-card flex items-start justify-between gap-3 px-3 py-2 text-left text-xs ${
                active
                  ? 'is-active'
                  : 'sp-text-muted'
              }`}
            >
              <span className="min-w-0">
                <span className="block">{option.label}</span>
                {option.reason ? (
                  <span className="mt-1 block text-[11px] sp-text-muted">{option.reason}</span>
                ) : null}
              </span>
              <span className={active ? 'sp-status-dot sp-tone--info' : 'sp-status-dot sp-tone--neutral'} />
            </button>
          );
        })}
      </div>

      {isImage ? (
        <div className="sp-list-item mt-4 border-dashed p-3">
          <p className="text-[11px] sp-text-muted">{interaction.uploadHint ?? '上传清晰的人脸照片'}</p>
          <label className="sp-input-shell mt-2 flex cursor-pointer items-center justify-between px-3 py-2 text-[11px] sp-text-primary">
            <span>{file ? file.name : '选择图片文件'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
              }}
            />
          </label>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-[10px] sp-text-muted">
        <span className="sp-mono-tag !tracking-[0.16em] !text-[10px] !normal-case">
          已选 {selectionCount}/{maxSelections}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !canSubmit}
          className="sp-button sp-button--primary"
        >
          确认
        </button>
      </div>
    </div>
  );
}
