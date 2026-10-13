import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import {
  ActionDispatcherService,
  CommandConfig,
  DataSourceConfig,
  PageContext,
  PageToolsConfig
} from '../../platform/public-api';

type ActionPageContext = {
  title: string;
  module: string;
  company: string;
  viewSuffix: string;
  views?: Array<{ id: string; label: string; filter?: string }>;
  activeViewId?: string;
  tools?: PageToolsConfig;
  dataSource?: Pick<DataSourceConfig, 'supportsCreate' | 'supportsUpdate' | 'supportsDelete'>;
};

@Component({
  selector: 'app-page-actions',
  templateUrl: './page-actions.html',
  styleUrl: './page-actions.scss'
})
export class PageActions implements OnDestroy {
  @Output() newClick = new EventEmitter<void>();
  @Output() deleteClick = new EventEmitter<void>();
  @Output() refreshClick = new EventEmitter<void>();
  @Output() filterClick = new EventEmitter<void>();
  @Output() exportClick = new EventEmitter<void>();

  pageContext: ActionPageContext = this.getEmptyPageContext();
  activeViewId = '';
  pageCommands: CommandConfig[] = [];
  private configuredPageContext?: Partial<PageContext>;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly actionDispatcher: ActionDispatcherService,
    private readonly router: Router
  ) {
    this.refreshPageContext(this.router.url);

    this.subscriptions.add(this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.refreshPageContext(event.urlAfterRedirects);
      }));

    this.subscriptions.add(this.actionDispatcher.pageCommands$.subscribe((commands) => {
      this.pageCommands = commands.filter((command) => !command.hidden);
    }));

    this.subscriptions.add(this.actionDispatcher.pageContext$.subscribe((context) => {
      this.configuredPageContext = context ?? undefined;
      this.refreshPageContext(this.router.url);
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get activeViewLabel(): string {
    return this.pageContext.viewSuffix;
  }

  get pageViews(): Array<{ id: string; label: string; filter?: string }> {
    return this.pageContext.views ?? [];
  }

  get showFilterTool(): boolean {
    const tools = this.pageContext.tools;
    if (!tools) {
      return true;
    }

    return tools.filter !== false || tools.advancedFilter !== false;
  }

  get showNewAction(): boolean {
    return this.pageContext.dataSource?.supportsCreate !== false;
  }

  get showDeleteAction(): boolean {
    return this.pageContext.dataSource?.supportsDelete !== false;
  }

  get showRefreshAction(): boolean {
    return this.pageContext.tools?.refresh !== false;
  }

  get showExportTool(): boolean {
    return this.pageContext.tools?.export !== false;
  }

  get showColumnsTool(): boolean {
    return this.pageContext.tools?.columns !== false;
  }

  get visibleCommands(): CommandConfig[] {
    return this.pageCommands;
  }

  runCommand(command: CommandConfig): void {
    if (command.disabled) {
      return;
    }

    this.actionDispatcher.dispatch(command.actionKey);
  }

  setView(view: { id: string; label: string; filter?: string }): void {
    this.activeViewId = view.id;
    this.actionDispatcher.dispatch('viewChanged', {
      viewId: view.id,
      viewFilter: view.filter
    });
  }

  isViewActive(viewId: string): boolean {
    return this.activeViewId === viewId;
  }

  private refreshPageContext(url: string): void {
    const configContext = this.configuredPageContext;
    const pageContext = this.getEmptyPageContext();

    this.pageContext = {
      title: configContext?.title ?? pageContext.title,
      module: configContext?.module ?? pageContext.module,
      company: configContext?.company ?? pageContext.company,
      viewSuffix: configContext?.viewSuffix ?? pageContext.viewSuffix,
      views: configContext?.views ?? pageContext.views,
      activeViewId: configContext?.activeViewId ?? pageContext.activeViewId,
      tools: configContext?.tools ?? pageContext.tools,
      dataSource: configContext?.dataSource ?? pageContext.dataSource
    };

    const configuredActiveView = this.pageContext.activeViewId ?? this.pageContext.views?.[0]?.id ?? '';
    if (!this.activeViewId || !this.pageContext.views?.some((view) => view.id === this.activeViewId)) {
      this.activeViewId = configuredActiveView;
    }
  }

  private getEmptyPageContext(): ActionPageContext {
    return {
      title: '',
      module: '',
      company: '',
      viewSuffix: '',
      views: [],
      activeViewId: ''
    };
  }
}
