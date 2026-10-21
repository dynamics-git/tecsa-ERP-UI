import { Component, inject } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';

type ActivityCard = {
  title: string;
  value: string;
  tone: 'neutral' | 'positive' | 'attention' | 'critical';
  note: string;
  badge?: { text: string; type: 'urgent' | 'new' | 'info' };
  trend?: { direction: 'up' | 'down'; value: string };
  comparison?: { label: string; value: string };
  linkText?: string;
  quickAction?: string;
};

type ActionGroup = {
  key: string;
  title: string;
  actions: Array<{ title: string; module: string; icon: string }>;
};

type RecentAction = {
  title: string;
  icon: string;
  starred?: boolean;
  lastUsed?: string;
};

type WorkQueueItem = {
  task: string;
  owner: string;
  due: string;
  module: string;
  priority: 'High' | 'Medium' | 'Low';
};

type SignalItem = {
  metric: string;
  value: string;
  change: string;
  tone: 'neutral' | 'positive' | 'negative' | 'warning';
  alert?: boolean;
  sparkline?: string;
};

type KPIItem = {
  label: string;
  value: string;
  target: string;
  progress: number;
  status: 'on-target' | 'off-target' | 'at-risk';
};

type ApprovalItem = {
  label: string;
  count: string;
  urgent?: boolean;
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss'
})
export class DashboardPage {
  readonly roleTitle = 'Finance Controller Role Center';
  readonly workingDate = '03 Jul 2026';
  private readonly session = inject(SessionService);
  get activeCompany(): string { return this.session.CompanyName || 'Company'; }
  readonly roleScope = 'Malaysia Group';

  activeActionView = 'all';

  readonly activities: ActivityCard[] = [
    { 
      title: 'Open journals', 
      value: '08', 
      tone: 'attention', 
      note: '2 require release before posting',
      badge: { text: 'Action needed', type: 'urgent' },
      trend: { direction: 'up', value: '+2 from yesterday' },
      linkText: 'View journals',
      quickAction: 'New Journal'
    },
    { 
      title: 'Pending Approvals', 
      value: '14', 
      tone: 'critical', 
      note: '5 over due threshold',
      badge: { text: '5 overdue', type: 'urgent' },
      comparison: { label: 'Avg response time', value: '2.5h' },
      linkText: 'Approve now'
    },
    { 
      title: 'Bank Reconciliation', 
      value: '03', 
      tone: 'neutral', 
      note: 'All statements imported',
      trend: { direction: 'down', value: '-1 from last week' },
      linkText: 'Reconcile',
      quickAction: 'Import Statement'
    },
    { 
      title: 'Payments To Process', 
      value: '27', 
      tone: 'positive', 
      note: 'Cut-off today 16:30',
      trend: { direction: 'up', value: 'RM 1.2M total' },
      comparison: { label: 'Scheduled', value: 'Today 14:30' },
      linkText: 'Review batch'
    },
    { 
      title: 'Cash Position', 
      value: 'RM 2.48M', 
      tone: 'positive', 
      note: 'Improved vs prior day',
      trend: { direction: 'up', value: '+12.3%' },
      comparison: { label: 'Weekly avg', value: 'RM 2.1M' },
      linkText: 'Cash forecast'
    },
    { 
      title: 'Blocked Transactions', 
      value: '02', 
      tone: 'attention', 
      note: 'Need compliance review',
      badge: { text: 'Review required', type: 'info' },
      linkText: 'Review blocks',
      quickAction: 'Release'
    },
    {
      title: 'Invoices to post',
      value: '22',
      tone: 'neutral',
      note: 'Sales invoices ready',
      comparison: { label: 'Total value', value: 'RM 456K' },
      linkText: 'Post batch',
      quickAction: 'New Invoice'
    },
    {
      title: 'Credit memos pending',
      value: '06',
      tone: 'attention',
      note: 'Customer exceptions',
      trend: { direction: 'down', value: '-2 resolved today' },
      linkText: 'Process'
    },
    {
      title: 'Overdue collections',
      value: 'RM 82,206',
      tone: 'critical',
      note: '>30 days outstanding',
      badge: { text: 'High priority', type: 'urgent' },
      trend: { direction: 'up', value: '+8.5% vs last week' },
      linkText: 'Collection report'
    }
  ];

  readonly recentActions: RecentAction[] = [
    { title: 'General Journal', icon: 'journal-text', starred: true, lastUsed: '2 hours ago' },
    { title: 'Payment Journal', icon: 'cash-coin', starred: true, lastUsed: 'Today 09:15' },
    { title: 'Sales Invoice', icon: 'receipt', lastUsed: 'Yesterday' },
    { title: 'Bank Reconciliation', icon: 'bank', starred: true, lastUsed: 'Today 08:30' }
  ];

  readonly actionGroups: ActionGroup[] = [
    {
      key: 'finance',
      title: 'Finance Operations',
      actions: [
        { title: 'General Journal', module: 'Finance', icon: 'journal-text' },
        { title: 'Payment Journal', module: 'Treasury', icon: 'cash-coin' },
        { title: 'Bank Reconciliation', module: 'Banking', icon: 'bank' },
        { title: 'Recurring Journals', module: 'Finance', icon: 'arrow-repeat' },
        { title: 'Fixed Assets', module: 'Assets', icon: 'building' },
        { title: 'Period Close', module: 'Controls', icon: 'calendar-check' }
      ]
    },
    {
      key: 'sales',
      title: 'Sales & AR',
      actions: [
        { title: 'Sales Invoice', module: 'Sales', icon: 'receipt' },
        { title: 'Credit Memo', module: 'Sales', icon: 'file-minus' },
        { title: 'Customer Ledger', module: 'AR', icon: 'person-lines-fill' },
        { title: 'Receipts', module: 'AR', icon: 'cash-stack' },
        { title: 'Aging Report', module: 'Analytics', icon: 'graph-up-arrow' }
      ]
    },
    {
      key: 'purchase',
      title: 'Purchase & AP',
      actions: [
        { title: 'Purchase Invoice', module: 'Purchase', icon: 'file-earmark-text' },
        { title: 'Vendor Ledger', module: 'AP', icon: 'briefcase' },
        { title: 'Payment Proposal', module: 'AP', icon: 'file-earmark-check' },
        { title: 'Match Invoices', module: 'Purchase', icon: 'files' },
        { title: 'Vendor Analysis', module: 'Analytics', icon: 'bar-chart' }
      ]
    },
    {
      key: 'reports',
      title: 'Reports & Analysis',
      actions: [
        { title: 'Trial Balance', module: 'Finance', icon: 'table' },
        { title: 'Cash Flow', module: 'Treasury', icon: 'cash' },
        { title: 'P&L Statement', module: 'Finance', icon: 'file-earmark-spreadsheet' },
        { title: 'Balance Sheet', module: 'Finance', icon: 'file-text' },
        { title: 'Budget Variance', module: 'Analytics', icon: 'clipboard-data' }
      ]
    }
  ];

  readonly workQueue: WorkQueueItem[] = [
    { task: 'Release weekly vendor payment batch', owner: 'A. Rahman', due: 'Today 14:00', module: 'Purchase', priority: 'High' },
    { task: 'Validate tax lines for June invoices', owner: 'N. Chong', due: 'Today 17:00', module: 'Finance', priority: 'High' },
    { task: 'Review unmatched bank statement lines', owner: 'H. Lim', due: 'Tomorrow', module: 'Finance', priority: 'Medium' },
    { task: 'Resolve customer credit memo mismatch', owner: 'J. Lee', due: 'Tomorrow', module: 'Sales', priority: 'Medium' },
    { task: 'Close petty cash variance case', owner: 'S. Devi', due: '08 Jul', module: 'Controls', priority: 'Low' }
  ];

  readonly signals: SignalItem[] = [
    { metric: 'Today postings value', value: 'RM 418,200', change: '+5.8% vs yesterday', tone: 'positive', sparkline: '▁▃▂▅▄▇' },
    { metric: 'Unapplied receipts', value: 'RM 62,300', change: '-2.1% improvement', tone: 'positive' },
    { metric: 'Approval turnaround', value: '3h 12m', change: 'SLA target: 4h', tone: 'positive', sparkline: '▅▄▃▃▂▁' },
    { metric: 'Docs waiting > 24h', value: '9', change: '+3 since morning', tone: 'negative', alert: true },
    { metric: 'Exception rate', value: '2.4%', change: 'Target: <3%', tone: 'positive' },
    { metric: 'Auto-post success', value: '97.4%', change: 'Last 7 days avg', tone: 'positive', sparkline: '▆▇▆▇▇▇' }
  ];

  readonly periodKPIs: KPIItem[] = [
    { label: 'Revenue posted (MTD)', value: 'RM 8.2M', target: 'RM 12M', progress: 68, status: 'on-target' },
    { label: 'AR collections', value: 'RM 5.1M', target: 'RM 6M', progress: 85, status: 'on-target' },
    { label: 'AP disbursements', value: 'RM 4.8M', target: 'RM 5.5M', progress: 87, status: 'on-target' },
    { label: 'Posting accuracy', value: '98.2%', target: '> 95%', progress: 98, status: 'on-target' },
    { label: 'Period close days', value: '4.5', target: '< 5 days', progress: 75, status: 'at-risk' },
    { label: 'Variance to budget', value: '2.1%', target: '< 5%', progress: 92, status: 'on-target' }
  ];

  readonly approvals: ApprovalItem[] = [
    { label: 'Waiting my approval', count: '7', urgent: true },
    { label: 'Delegated by me', count: '3' },
    { label: 'Escalated', count: '2', urgent: true },
    { label: 'Completed today', count: '19' }
  ];

  get activitiesCount(): number {
    return this.activities.filter(a => a.tone === 'attention' || a.tone === 'critical').length;
  }

  setActionView(view: string): void {
    this.activeActionView = view;
  }

  get activeGroup(): ActionGroup {
    return this.actionGroups[0];
  }
}
