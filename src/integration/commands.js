/** Simple command pattern scaffold with undo stack (logic only). */
export class CommandStack {
  constructor() { this.stack = []; this.undoStack = []; }
  execute(cmd) { cmd.execute(); this.stack.push(cmd); this.undoStack = []; }
  undo() { const c = this.stack.pop(); if (c && c.undo) { c.undo(); this.undoStack.push(c); } }
  redo() { const c = this.undoStack.pop(); if (c && c.execute) { c.execute(); this.stack.push(c); } }
}

export class AddMissingLocationCommand {
  constructor(targetArray, rule) { this.target = targetArray; this.rule = rule; this.added = false; }
  execute() { if (!this.added) { this.target.push(this.rule); this.added = true; } }
  undo() { if (this.added) { const idx = this.target.indexOf(this.rule); if (idx>=0) this.target.splice(idx,1); this.added = false; } }
}
