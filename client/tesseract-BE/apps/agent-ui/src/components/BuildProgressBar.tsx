/**
 * [INPUT]: 依赖构建阶段状态码
 * [OUTPUT]: 对外提供 Refactor-3 三阶段进度条组件
 * [POS]: agent-ui 的流程反馈组件，映射前端状态到后端编排阶段
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

interface BuildProgressBarProps {
  status: number;
}

const STEPS = [
  { id: 1, label: '需求收敛' },
  { id: 2, label: '工作流生成' },
  { id: 3, label: '设备配置' },
];

function resolveHint(status: number): string | null {
  if (status <= 1) {
    return '正在理解需求并组合工作流…';
  }
  if (status === 2) {
    return '工作流已生成，可继续创建并配置设备。';
  }
  return null;
}

export function BuildProgressBar({ status }: BuildProgressBarProps) {
  const hint = resolveHint(status);

  return (
    <div className="rounded-2xl border border-cyan-500/10 bg-black/40 px-4 py-3 text-xs text-cyan-100/70">
      <div className="flex items-center justify-between gap-3">
        {STEPS.map((step, index) => {
          const active = status >= step.id;
          return (
            <div key={step.id} className="flex flex-1 items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  active ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-cyan-500/20 text-cyan-200/50'
                }`}
              >
                {step.id}
              </div>
              <span className={active ? 'text-cyan-100' : 'text-cyan-200/40'}>{step.label}</span>
              {index < STEPS.length - 1 ? (
                <div className={`mx-2 h-px flex-1 ${active ? 'bg-cyan-400/40' : 'bg-cyan-500/10'}`} />
              ) : null}
            </div>
          );
        })}
      </div>
      {hint ? (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-cyan-300/60">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400/70" />
          {hint}
        </div>
      ) : null}
    </div>
  );
}
