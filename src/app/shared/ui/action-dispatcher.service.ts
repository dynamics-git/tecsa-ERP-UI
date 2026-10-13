import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { CommandConfig } from '../../platform/models/command-config.model';
import { DataSourceConfig } from '../../platform/models/data-source-config.model';
import { PageToolsConfig } from '../../platform/models/page-config.model';

export interface PageAction {
  actionKey: string;
  payload?: unknown;
}

export interface PageContext {
  title: string;
  module: string;
  company: string;
  viewSuffix: string;
  views?: Array<{ id: string; label: string; filter?: string }>;
  activeViewId?: string;
  tools?: PageToolsConfig;
  dataSource?: Pick<DataSourceConfig, 'supportsCreate' | 'supportsUpdate' | 'supportsDelete'>;
}

@Injectable({
  providedIn: 'root'
})
export class ActionDispatcherService {
  private readonly actionSubject = new Subject<PageAction>();
  private readonly pageCommandsSubject = new BehaviorSubject<CommandConfig[]>([]);
  private readonly pageContextSubject = new BehaviorSubject<Partial<PageContext> | null>(null);

  readonly action$ = this.actionSubject.asObservable();
  readonly pageCommands$ = this.pageCommandsSubject.asObservable();
  readonly pageContext$ = this.pageContextSubject.asObservable();

  dispatch(actionKey: string, payload?: unknown): void {
    this.actionSubject.next({ actionKey, payload });
  }

  setPageCommands(commands: CommandConfig[]): void {
    this.pageCommandsSubject.next(commands);
  }

  clearPageCommands(): void {
    this.pageCommandsSubject.next([]);
  }

  setPageContext(context: Partial<PageContext>): void {
    this.pageContextSubject.next(context);
  }

  clearPageContext(): void {
    this.pageContextSubject.next(null);
  }
}
