/**
 * Simple synchronous pub/sub event bus.
 * Lightweight; can be replaced later with more advanced system.
 */
export class EventBus {
  constructor() {
    this.listeners = new Map(); // type -> Set<fn>
  }
  /** @param {string} type @param {(payload:any)=>void} handler */
  subscribe(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
    return () => this.unsubscribe(type, handler);
  }
  unsubscribe(type, handler) {
    const set = this.listeners.get(type);
    if (set) set.delete(handler);
  }
  /** @param {{type:string,payload?:any}} evt */
  publish(evt) {
    const set = this.listeners.get(evt.type);
    if (set) {
      for (const fn of set) {
        try { fn(evt.payload); } catch (e) { console.error('Event handler error', e); }
      }
    }
  }
}
