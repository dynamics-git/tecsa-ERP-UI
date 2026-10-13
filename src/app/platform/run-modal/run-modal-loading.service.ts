import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type LoaderScopeState = {
  count: number;
  message: string;
};

@Injectable({
  providedIn: 'root',
})
export class RunModalLoadingService {
  private static readonly DEFAULT_SCOPE = 'run-modal';

  private readonly scopeState = new BehaviorSubject<Record<string, LoaderScopeState>>({
    [RunModalLoadingService.DEFAULT_SCOPE]: {
      count: 0,
      message: '',
    },
  });

  readonly changes$ = this.scopeState.asObservable();

  begin(scope = RunModalLoadingService.DEFAULT_SCOPE, message?: string): void {
    const normalizedScope = this.normalizeScope(scope);
    const next = { ...this.scopeState.value };
    const current = this.resolveScopeState(next, normalizedScope);

    next[normalizedScope] = {
      count: current.count + 1,
      message: typeof message === 'string' && message.trim().length > 0 ? message.trim() : current.message,
    };

    this.scopeState.next(next);
  }

  end(scope = RunModalLoadingService.DEFAULT_SCOPE): void {
    const normalizedScope = this.normalizeScope(scope);
    const next = { ...this.scopeState.value };
    const current = this.resolveScopeState(next, normalizedScope);
    const nextCount = Math.max(0, current.count - 1);

    next[normalizedScope] = {
      count: nextCount,
      message: nextCount === 0 ? '' : current.message,
    };

    this.scopeState.next(next);
  }

  setMessage(scope = RunModalLoadingService.DEFAULT_SCOPE, message = ''): void {
    const normalizedScope = this.normalizeScope(scope);
    const next = { ...this.scopeState.value };
    const current = this.resolveScopeState(next, normalizedScope);

    next[normalizedScope] = {
      ...current,
      message: message.trim(),
    };

    this.scopeState.next(next);
  }

  get isLoading(): boolean {
    return this.isScopeLoading(RunModalLoadingService.DEFAULT_SCOPE);
  }

  isScopeLoading(scope = RunModalLoadingService.DEFAULT_SCOPE): boolean {
    const normalizedScope = this.normalizeScope(scope);
    return this.resolveScopeState(this.scopeState.value, normalizedScope).count > 0;
  }

  getScopeMessage(scope = RunModalLoadingService.DEFAULT_SCOPE): string {
    const normalizedScope = this.normalizeScope(scope);
    return this.resolveScopeState(this.scopeState.value, normalizedScope).message;
  }

  isAnyLoading(scopePrefixes?: string[]): boolean {
    const activePrefixes = (scopePrefixes ?? []).map((prefix) => prefix.trim()).filter((prefix) => prefix.length > 0);
    const states = Object.entries(this.scopeState.value);
    if (!activePrefixes.length) {
      return states.some(([, state]) => state.count > 0);
    }

    return states.some(([scope, state]) =>
      state.count > 0 && activePrefixes.some((prefix) => scope.startsWith(prefix)),
    );
  }

  getAnyMessage(scopePrefixes?: string[]): string {
    const activePrefixes = (scopePrefixes ?? []).map((prefix) => prefix.trim()).filter((prefix) => prefix.length > 0);
    const states = Object.entries(this.scopeState.value)
      .filter(([, state]) => state.count > 0)
      .filter(([scope]) => !activePrefixes.length || activePrefixes.some((prefix) => scope.startsWith(prefix)));

    if (!states.length) {
      return '';
    }

    const withMessage = states
      .map(([, state]) => state.message.trim())
      .find((message) => message.length > 0);

    return withMessage ?? '';
  }

  private normalizeScope(scope: string): string {
    const normalized = scope.trim();
    return normalized.length ? normalized : RunModalLoadingService.DEFAULT_SCOPE;
  }

  private resolveScopeState(
    source: Record<string, LoaderScopeState>,
    scope: string,
  ): LoaderScopeState {
    return source[scope] ?? { count: 0, message: '' };
  }
}
