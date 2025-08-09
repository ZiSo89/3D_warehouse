// Lightweight panel showing last RackBuilder stats (instanced incremental reuse)
export class RackBuilderStatsPanel {
  constructor({ parent = document.body } = {}) {
    this.el = document.createElement('div');
    this.el.style.cssText = 'position:fixed;bottom:8px;right:8px;background:#1b263b;color:#fff;font:12px monospace;padding:6px 8px;border:1px solid #415a77;border-radius:4px;z-index:9999;pointer-events:none;opacity:.9;';
    this.el.textContent = 'RackBuilder: —';
    parent.appendChild(this.el);
    this._onStats = (e) => this.update(e.detail);
    if (typeof window !== 'undefined') window.addEventListener('rackbuilder:stats', this._onStats);
  }
  update(stats) {
    if (!stats) return;
    if (stats.mode === 'instanced') {
      const dur = stats.durationMs != null ? ` ${stats.durationMs}ms` : '';
      this.el.textContent = `RB inst: reused ${stats.reused}/${stats.bucketCount} buckets rebuilt ${stats.rebuilt} inst:${stats.totalInstances}${dur}`;
    } else {
      const dur = stats.durationMs != null ? ` ${stats.durationMs}ms` : '';
      this.el.textContent = `RB regular: changed ${stats.changed}/${stats.totalModules} (${stats.changedPercent}%)${dur}`;
    }
  }
  dispose() {
    if (typeof window !== 'undefined') window.removeEventListener('rackbuilder:stats', this._onStats);
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
  }
}
