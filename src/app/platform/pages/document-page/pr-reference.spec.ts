import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { SessionService } from '../../../core/services/session.service';
import { MenuService } from '../../../core/services/menu.service';
import { resolveRunModalConfigModule, resolvePageType } from '../../../core/services/run-modal-config-registry';
import { DocumentPageCommandAssemblerService } from '../document-page-command-assembler.service';
import { DocumentHydrationOrchestratorService } from '../../data/document-hydration-orchestrator.service';
import { DataSourceService, DATA_REST_SERVICE } from '../../data/data-source.service';
import { LineCalculationService } from '../../document/line-calculation.service';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig, purchaseRequisitionListConfig } from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';

afterEach(() => TestBed.resetTestingModule());

describe('PR reference page acceptance', () => {
  it('uses its stable page ID for RunModal and its title for the permission-filtered menu', () => {
    const session = {SuperAdmin:false,Permissions:[{pageId:'purchase-requisition',ReadPermission:true}]};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:SessionService,useValue:session}]});
    expect(resolvePageType('purchase-requisition')).toBe('document');
    expect(Object.values(resolveRunModalConfigModule('purchase-requisition')!)).toContain(purchaseRequisitionListConfig);
    const menu=TestBed.inject(MenuService);
    expect(menu.getModules().flatMap(module=>module.children ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({pageId:'purchase-requisition',label:purchaseRequisitionListConfig.title}),
    ]));
    session.Permissions=[];
    expect(menu.getModules()).toEqual([]);
  });

  it('provides standard line commands without an empty toolbar declaration and uses the authorized API contract without PR permission aliases', () => {
    const permission={pageId:'purchase-requisition',ReadPermission:true,InsertPermission:false,ModifyPermission:false,DeletePermission:false,PostPermission:false};
    const apiPermission={apiPath:'/purchaseRequisitionLines',canRead:true,canCreate:false,canUpdate:false,canDelete:false};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:SessionService,useValue:{SuperAdmin:false,Permissions:[permission,apiPermission]}}]});
    const assembler=TestBed.inject(DocumentPageCommandAssemblerService);
    const commands=()=>assembler.resolveLineToolbarButtons({pageId:'purchase-requisition',lineConfig:purchaseRequisitionLineConfig});
    expect(purchaseRequisitionLineConfig.toolbarButtons).toBeUndefined();
    for(const action of ['cmd:line-new','cmd:line-delete']) expect(commands().find(command=>command.actionKey===action)?.disabled).toBe(true);
    expect(commands().find(command=>command.actionKey==='cmd:line-refresh')?.disabled).not.toBe(true);
    apiPermission.canCreate=true;
    apiPermission.canDelete=true;
    TestBed.inject(DataSourceService).getReadGeneration();
    expect(purchaseRequisitionLineConfig.dataSource.permissions).toBeUndefined();
    for(const action of ['cmd:line-new','cmd:line-delete']) expect(commands().find(command=>command.actionKey===action)?.disabled).not.toBe(true);
    const header=assembler.resolveHeaderToolbarButtons({pageId:'purchase-requisition',dataSource:purchaseRequisitionListConfig.dataSource,toolbarButtons:purchaseRequisitionHeaderConfig.toolbarButtons});
    expect(header.find(command=>command.actionKey==='cmd:new')?.disabled).toBe(true);
    expect(header.find(command=>command.actionKey==='cmd:submit')?.disabled).toBe(true);
    expect(header.find(command=>command.actionKey==='cmd:delete')?.disabled).toBe(true);
  });

  it('loads every line page before totaling and scopes the flat line API by document number and document type', async () => {
    const records=Array.from({length:125},(_,index)=>({systemId:'line-'+index,lineNo:(index+1)*10000,estimatedAmount:'1.25'}));
    const get=vi.fn((url:string)=>{
      const parsed=new URL(url,'http://test');
      expect(parsed.pathname).toBe('/purchaseRequisitionLines');
      expect(parsed.searchParams.get('$filter')).toContain("documentNumber eq 'PR-DIFFERENT'");
      expect(parsed.searchParams.get('$filter')).toContain("documentType eq 'purchase_requisition'");
      const skip=Number(parsed.searchParams.get('$skip') ?? 0),top=Number(parsed.searchParams.get('$top'));
      return of({data:records.slice(skip,skip+top),meta:{total:records.length}});
    });
    TestBed.configureTestingModule({providers:[{provide:DATA_REST_SERVICE,useValue:{get}}]});
    const rows=await TestBed.inject(DocumentHydrationOrchestratorService).loadLineRowsForHeader(purchaseRequisitionLineConfig.dataSource,{systemId:'header-id',number:'PR-DIFFERENT',documentType:'purchase_requisition'}, {defaultTop:100});
    expect(get).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(125);
    const totals=TestBed.inject(LineCalculationService).calculateLineTotals(rows,purchaseRequisitionLineConfig.totalsCalculation!);
    expect(totals).toMatchObject({subtotal:'156.25',sst:'0.00',total:'156.25'});
  });
});
