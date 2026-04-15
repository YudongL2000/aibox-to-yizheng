export function HardwareTwinPlaceholder() {
  return (
    <section className="sp-panel sp-panel--muted relative flex h-full flex-col overflow-hidden rounded-3xl p-6">
      <div className="neural-grid" />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="sp-mono-tag text-[11px]">Hardware Twin</p>
          <p className="sp-caption text-xs">数字孪生可视化占位</p>
        </div>
        <span className="sp-mono-tag text-[10px]">COMING SOON</span>
      </div>

      <div className="relative z-10 mt-6 flex flex-1 items-center justify-center">
        <div className="sp-data-block flex h-40 w-40 items-center justify-center rounded-[32px]">
          <div className="pulse-dot h-3 w-3 rounded-full bg-[var(--sem-info)]" />
        </div>
      </div>
      <div className="sp-caption relative z-10 mt-4 text-xs">
        机械手 · 摄像头 · 喇叭 · 底盘 · 屏幕
      </div>
    </section>
  );
}
