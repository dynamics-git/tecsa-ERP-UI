import { Injectable } from '@angular/core';
import { Observable, defer, firstValueFrom, from, of } from 'rxjs';
import { catchError, map, mergeMap, toArray } from 'rxjs/operators';

export interface RecordDeleteResult<T> {
  deleted: T[];
  failures: Array<{target: T; error: unknown}>;
}

/** Settle every request; a failed row must not hide another row's successful deletion. */
@Injectable({ providedIn: 'root' })
export class RecordDeleteService {
  async execute<T>(options: {
    targets: T[];
    resolveId: (target: T) => unknown;
    deleteById: (id: unknown, target: T) => Observable<unknown>;
    allowLocal?: boolean;
    canContinue?: () => boolean;
  }): Promise<RecordDeleteResult<T>> {
    const results = await firstValueFrom(from(options.targets).pipe(
      mergeMap((target, index) => defer(() => {
        if (options.canContinue && !options.canContinue()) throw new Error('Your company or session changed. Reopen the page.');
        const id = options.resolveId(target);
        if (id === undefined || id === null || String(id).trim() === '') {
          if (options.allowLocal) return of(undefined);
          throw new Error('Reload the record before deleting: its identity is missing.');
        }
        return options.deleteById(id, target);
      }).pipe(
        map(() => ({target, index, success: true as const, error: undefined as unknown})),
        catchError((error: unknown) => of({target, index, success: false as const, error})),
      ), 4),
      toArray(),
    ));
    results.sort((a,b) => a.index-b.index);
    return {
      deleted: results.filter(result => result.success).map(result => result.target),
      failures: results.filter(result => !result.success).map(({target,error}) => ({target,error})),
    };
  }
}
