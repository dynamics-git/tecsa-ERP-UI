import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RunModalBindingStateService } from './run-modal-binding-state.service';
import { RunModalStackService } from './run-modal-stack.service';
import { RunModalStackPolicy } from './run-modal-stack-policy.token';

describe('RunModal binding and autosave lifecycle', () => {
  const setup = (policy: RunModalStackPolicy = { maxDepth: 50, onOverflow: 'replace-top' }) => {
    const stack = new RunModalStackService(policy);
    const state = new RunModalBindingStateService(stack);
    return { stack, state };
  };
  const track = (state: RunModalBindingStateService, id: string, callback = vi.fn()) => {
    const binding = { id, unsavedHeader: 'Local unsaved change', lineRows: [{ description: 'Unsaved line' }] };
    state.bindings.set(id, binding);
    state.autosaveTimers.set(id, setTimeout(callback, 350));
    return { binding, callback };
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('retains parent binding, unsaved data and autosave while a nested child opens and closes', () => {
    const { stack, state } = setup();
    stack.open({ id: 'parent', allowNested: true });
    const parent = track(state, 'parent');
    stack.open({ id: 'child', allowNested: true });
    const child = track(state, 'child');
    stack.close('child');

    expect(state.bindings.get('parent')).toBe(parent.binding);
    expect(parent.binding.unsavedHeader).toBe('Local unsaved change');
    expect(parent.binding.lineRows[0].description).toBe('Unsaved line');
    expect(state.autosaveTimers.has('parent')).toBe(true);
    expect(state.bindings.has('child')).toBe(false);
    expect(state.autosaveTimers.has('child')).toBe(false);
    vi.advanceTimersByTime(350);
    expect(parent.callback).toHaveBeenCalledOnce();
    expect(child.callback).not.toHaveBeenCalled();
  });

  it('releases orphaned bindings and cancels autosaves for direct closeTop and closeAll', () => {
    const { stack, state } = setup();
    stack.open({ id: 'first', allowNested: true });
    const first = track(state, 'first');
    stack.open({ id: 'second', allowNested: true });
    const second = track(state, 'second');
    stack.closeTop();
    expect(state.bindings.has('second')).toBe(false);
    expect(state.bindings.get('first')).toBe(first.binding);
    stack.closeAll();
    expect(state.bindings.size).toBe(0);
    expect(state.autosaveTimers.size).toBe(0);
    vi.advanceTimersByTime(350);
    expect(first.callback).not.toHaveBeenCalled();
    expect(second.callback).not.toHaveBeenCalled();
  });

  it('cancels evicted autosaves when a non-nested window replaces the stack', () => {
    const { stack, state } = setup();
    stack.open({ id: 'parent', allowNested: true });
    const parent = track(state, 'parent');
    stack.open({ id: 'child', allowNested: true });
    const child = track(state, 'child');
    expect(stack.open({ id: 'replacement', allowNested: false })).toBe(true);
    expect(state.bindings.size).toBe(0);
    expect(state.autosaveTimers.size).toBe(0);
    vi.advanceTimersByTime(350);
    expect(parent.callback).not.toHaveBeenCalled();
    expect(child.callback).not.toHaveBeenCalled();
  });

  it('releases only evicted top-window state under the approved depth policy', () => {
    const { stack, state } = setup({ maxDepth: 2, onOverflow: 'replace-top' });
    stack.open({ id: 'root', allowNested: true });
    const root = track(state, 'root');
    stack.open({ id: 'top', allowNested: true });
    const top = track(state, 'top');
    expect(stack.open({ id: 'overflow', allowNested: true })).toBe(true);
    expect(state.bindings.get('root')).toBe(root.binding);
    expect(state.autosaveTimers.has('root')).toBe(true);
    expect(state.bindings.has('top')).toBe(false);
    vi.advanceTimersByTime(350);
    expect(root.callback).toHaveBeenCalledOnce();
    expect(top.callback).not.toHaveBeenCalled();
  });

  it('preserves bindings during same-ID popup refresh and removes orphaned timers without bindings', () => {
    const { stack, state } = setup();
    stack.open({ id: 'list', allowNested: true });
    const tracked = track(state, 'list');
    stack.open({ id: 'list', allowNested: true });
    expect(state.bindings.get('list')).toBe(tracked.binding);
    expect(state.autosaveTimers.has('list')).toBe(true);
    stack.open({ id: 'temporary', allowNested: true });
    const stray = vi.fn();
    state.autosaveTimers.set('temporary', setTimeout(stray, 350));
    stack.close('temporary');
    vi.advanceTimersByTime(350);
    expect(tracked.callback).toHaveBeenCalledOnce();
    expect(stray).not.toHaveBeenCalled();
    expect(state.autosaveTimers.has('temporary')).toBe(false);
  });
});
