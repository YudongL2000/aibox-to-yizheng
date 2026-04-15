const LOG_LINES = [
  '[boot] agent kernel warmup',
  '[link] websocket handshake ready',
  '[cache] workflow architect primed',
  '[watch] waiting for new intents',
];

export function SystemLogPlaceholder() {
  return (
    <section className="sp-panel sp-panel--muted flex h-full flex-col overflow-hidden rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="sp-mono-tag text-[11px]">System Log</p>
          <p className="sp-caption text-xs">运行状态与事件占位</p>
        </div>
        <span className="sp-mono-tag text-[10px]">STREAM</span>
      </div>

      <div className="sp-data-block mt-6 flex-1 space-y-3 rounded-2xl p-4">
        {LOG_LINES.map((line) => (
          <div key={line} className="mono text-[11px] text-[var(--text-secondary)]">
            {line}
          </div>
        ))}
      </div>

      <div className="sp-caption mt-4 text-xs">实时日志功能将在后续版本开放。</div>
    </section>
  );
}
