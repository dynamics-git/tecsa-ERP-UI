import { FactBoxHostService } from '../../shared/ui/fact-box-toggle/fact-box-host.service';
import { FactBoxToggle } from '../../shared/ui/fact-box-toggle/fact-box-toggle';
import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, Output, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, asapScheduler, filter, observeOn } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import {
  ActionDispatcherService,
  CommandConfig,
  DataSourceConfig,
  PageContext,
  StandardListActionsService,
  StandardCommandConfig,
  StandardCommandStateConfig,
  PageToolsConfig
} from '../../platform/public-api';

type ActionPageContext = {
  pageId?: string;
  title: string;
  module: string;
  company: string;
  viewSuffix: string;
  views?: Array<{ id: string; label: string; filter?: string }>;
  activeViewId?: string;
  tools?: PageToolsConfig;
  standardActions?: StandardCommandConfig;
  dataSource?: Pick<DataSourceConfig, 'supportsCreate' | 'supportsUpdate' | 'supportsDelete' | 'permissions'>;
};

@Component({
  selector: 'app-page-actions',
  imports: [FactBoxToggle],
  templateUrl: './page-actions.html',
  styleUrl: './page-actions.scss'
})
export class PageActions implements OnDestroy {
  readonly factBoxHost = inject(FactBoxHostService);
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
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly standardActions = inject(StandardListActionsService);

  constructor(
    private readonly actionDispatcher: ActionDispatcherService,
    private readonly router: Router,
    private readonly session: SessionService
  ) {
    this.refreshPageContext(this.router.url);

    this.subscriptions.add(this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.refreshPageContext(event.urlAfterRedirects);
      }));

    this.subscriptions.add(this.actionDispatcher.pageCommands$.pipe(observeOn(asapScheduler)).subscribe((commands) => {
      this.pageCommands = commands.filter((command) => !command.hidden);
      this.changeDetector.markForCheck();
    }));

// Routed pages publish their context during initialization, after the shell
    // was checked. Deliver it on the next turn and notify zoneless rendering.
    this.subscriptions.add(this.actionDispatcher.pageContext$.pipe(observeOn(asapScheduler)).subscribe((context) => {
      this.configuredPageContext = context ?? undefined;
      this.refreshPageContext(this.router.url);
      this.changeDetector.markForCheck();
    }));
    this.subscriptions.add(this.session.permissionsLoaded$.subscribe(() => this.changeDetector.markForCheck()));
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
    if (!this.pageContext.pageId) return false;
    const tools = this.pageContext.tools;
    if (!tools) {
      return true;
    }

    return tools.filter !== false || tools.advancedFilter !== false;
  }

  get standardActionItems(): Array<StandardCommandStateConfig & { actionKey: 'new' | 'delete' | 'refresh' }> {
    if (!this.pageContext.pageId) return [];
    const resolved = this.standardActions.resolve(this.pageContext);
    return (['new', 'delete', 'refresh'] as const).flatMap(actionKey => {
      const state = resolved[actionKey];
      return typeof state === 'object' && state.visible !== false && !state.hidden ? [{ ...state, actionKey }] : [];
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  runStandardAction(action: StandardCommandStateConfig & { actionKey: 'new' | 'delete' | 'refresh' }): void {
    if (action.disabled) return;
    if (action.actionKey === 'new') this.newClick.emit();
    else if (action.actionKey === 'delete') this.deleteClick.emit();
    else this.refreshClick.emit();
  }

  get showExportTool(): boolean {
    if (!this.pageContext.pageId) return false;
    return this.pageContext.tools?.export !== false;
  }

  get showColumnsTool(): boolean {
    if (!this.pageContext.pageId) return false;
    return this.pageContext.tools?.columns !== false;
  }

  get visibleCommands(): CommandConfig[] {
    return this.pageCommands;
  }

  private allowed(operation: string): boolean {
    return this.session.SuperAdmin || this.session.Permissions.some(value => {
      const grant = value as Record<string, unknown>;
      return grant?.['pageId'] === this.pageContext.pageId && grant[operation] === true;
    });
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
      pageId: configContext?.pageId,
      title: configContext?.title ?? pageContext.title,
      module: configContext?.module ?? pageContext.module,
      company: configContext?.company ?? pageContext.company,
      viewSuffix: configContext?.viewSuffix ?? pageContext.viewSuffix,
      views: configContext?.views ?? pageContext.views,
      activeViewId: configContext?.activeViewId ?? pageContext.activeViewId,
      tools: configContext?.tools ?? pageContext.tools,
      standardActions: configContext?.standardActions,
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
