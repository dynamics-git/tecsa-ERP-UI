import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { DocumentPage } from './document-page';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { FieldValidationContext } from '../../models/field-config.model';
import { usersHeaderConfig, usersListConfig } from '../../../features/administration/users/users.config';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig, purchaseRequisitionListConfig } from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';
import { DocumentConfigDataService } from '../../data/document-config-data.service';

afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

describe('Developer field changes use the editor lifecycle', () => {
  it.each([true,false])('validates a Users field and preserves autoSave=%s', async autoSave => {
    const record = {systemId:'user-1',userName:'u1',name:'Before',email:'before@example.com',isActive:true,systemRowVersion:1};
    const contexts: FieldValidationContext[] = [];
    const patch = vi.fn((_path:string,body:Record<string,unknown>) => of({data:{...record,...body,systemRowVersion:2}}));
    TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get:()=>of({data:record}),patch}}]});
    TestBed.inject(SessionService).SuperAdmin=true;
    const f=TestBed.createComponent(DocumentPage);
    f.componentRef.setInput('pageId','users');f.componentRef.setInput('documentOnly',true);
    f.componentRef.setInput('initialRecord',record);f.componentRef.setInput('listConfig',{...usersListConfig,autoSave});
    f.componentRef.setInput('headerConfig',{...usersHeaderConfig,sections:usersHeaderConfig.sections.map(section=>({...section,fields:section.fields.map(field=>field.key==='name'?{...field,validation:{...field.validation,afterValidate:(context:FieldValidationContext)=>{contexts.push(context);return {email:'after@example.com'};}}}:field)}))});
    f.detectChanges();await f.whenStable();
    await vi.waitFor(()=>expect(f.componentInstance.popupLoading).toBe(false));
    expect((await f.componentInstance.validate('name','Edited')).valid).toBe(true);
    expect(contexts[0]).toMatchObject({field:'name',previousValue:'Before',value:'Edited',source:'code',previousRecord:{name:'Before'},record:{name:'Edited'}});
    if (!autoSave) {
      expect(patch).not.toHaveBeenCalled();expect(f.componentInstance.hasUnsavedChanges).toBe(true);
      f.componentInstance.handleInlineAction({actionKey:'cmd:save'});
    }
    await vi.waitFor(()=>expect(patch).toHaveBeenCalledOnce());
    expect(patch.mock.calls[0][1]).toEqual({name:'Edited',email:'after@example.com'});
    expect((await f.componentInstance.validate('password','Changed123!')).valid).toBe(false);
    expect((await f.componentInstance.validate('notAField','x')).valid).toBe(false);
    expect(patch).toHaveBeenCalledOnce();f.destroy();
  });

  async function pr() {
    const header={systemId:'pr-1',number:'PR-1',documentType:'purchase_requisition',status:'open',requestDate:'2026-10-30',purpose:'Before',systemRowVersion:1};
    const line={systemId:'line-1',lineNo:10000,lineType:'item',documentNumber:'PR-1',documentType:'purchase_requisition',description:'Before',quantity:'1',estimatedUnitCost:'0',systemRowVersion:1};
    const get=vi.fn((path:string)=>of({data:path.includes('purchaseRequisitionLines')?[structuredClone(line)]:path.includes('purchaseRequisitions')?structuredClone(header):[]}));
    const patch=vi.fn((path:string,body:Record<string,unknown>)=>{
      const target=path.includes('purchaseRequisitionLines')?line:header;
      Object.assign(target,body,{systemRowVersion:target.systemRowVersion+1});
      if (target===header) { line.description=String(body['purpose']);line.systemRowVersion++; }
      return of({data:structuredClone(target),meta:target===header?{changedResources:['/purchaseRequisitionLines']}:undefined});
    });
    TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get,patch}}]});
    TestBed.inject(SessionService).SuperAdmin=true;
    const f=TestBed.createComponent(DocumentPage);
    f.componentRef.setInput('pageId','purchase-requisition');f.componentRef.setInput('documentOnly',true);
    f.componentRef.setInput('initialRecord',header);f.componentRef.setInput('listConfig',purchaseRequisitionListConfig);
    f.componentRef.setInput('headerConfig',purchaseRequisitionHeaderConfig);f.componentRef.setInput('lineConfig',purchaseRequisitionLineConfig);
    f.detectChanges();await f.whenStable();await vi.waitFor(()=>expect(f.componentInstance.popupLoading).toBe(false));
    return {f,header,line,get,patch};
  }

  it('uses line validation and normal line PATCH for developer edits',async()=>{
    const {f,patch}=await pr(),page=f.componentInstance;
    const row=page.inlineDocumentWindowConfig!.lineRows!.find(row=>row['systemId']==='line-1')!;
    expect((await page.validateLine(row,'description','Edited')).valid).toBe(true);
    await vi.waitFor(()=>expect(patch).toHaveBeenCalledOnce());
    expect(patch.mock.calls[0][0]).toBe('/purchaseRequisitionLines/line-1');
    expect(patch.mock.calls[0][1]).toEqual({description:'Edited'});
    expect((await page.validateLine(row,'lineNo',20000)).valid).toBe(false);
    expect((await page.validateLine(row,'description','x'.repeat(101))).valid).toBe(false);
    expect(patch).toHaveBeenCalledOnce();f.destroy();
  });

  it.each([true,false])('refreshes server-changed lines after a header rule; autoSave=%s',async autoSave=>{
    const {f,patch}=await pr(),page=f.componentInstance;
    f.componentRef.setInput('listConfig',{...purchaseRequisitionListConfig,autoSave});f.detectChanges();
    const row=page.inlineDocumentWindowConfig!.lineRows!.find(row=>row['systemId']==='line-1')!;
    expect((await page.validate('purpose','Copied')).valid).toBe(true);
    if (!autoSave) { expect(patch).not.toHaveBeenCalled();page.handleInlineAction({actionKey:'cmd:save'}); }
    await vi.waitFor(()=>expect(patch).toHaveBeenCalledOnce());
    await vi.waitFor(()=>expect(row['description']).toBe('Copied'));
    expect(row['systemRowVersion']).toBe(2);
    expect(page.hasUnsavedChanges).toBe(false);f.destroy();
  });

  it('keeps a new local line edit when a related-record refresh returns late',async()=>{
    const {f,get,line,patch}=await pr(),page=f.componentInstance;
    const row=page.inlineDocumentWindowConfig!.lineRows!.find(row=>row['systemId']==='line-1')!;
    const pending=new Subject<unknown>();
    let refreshing=false;
    get.mockImplementation((path:string)=>{
      if (path.includes('purchaseRequisitionLines')) { refreshing=true;return pending as never; }
      return of({data:[]}) as never;
    });
    await page.validate('purpose','Server change');
    await vi.waitFor(()=>expect(refreshing).toBe(true));
    f.componentRef.setInput('listConfig',{...purchaseRequisitionListConfig,autoSave:false});f.detectChanges();
    await page.validateLine(row,'description','Local draft');
    pending.next({data:[structuredClone(line)]});pending.complete();await f.whenStable();
    expect(row['description']).toBe('Local draft');expect(page.hasUnsavedChanges).toBe(true);
    expect(patch).toHaveBeenCalledOnce();f.destroy();
  });

  it('evaluates new-record defaults each time and preserves saved values',()=>{
    const service=TestBed.inject(DocumentConfigDataService);
    let value='2026-10-30';
    const sections=[{id:'general',fields:[{key:'date',label:'Date',defaultValue:()=>value}]}];
    expect(service.buildHeaderSeed(sections)['date']).toBe('2026-10-30');value='2026-10-31';
    expect(service.buildHeaderSeed(sections)['date']).toBe('2026-10-31');
    expect(service.buildHeaderData({date:'2026-10-01'},sections)['date']).toBe('2026-10-01');
  });

  it('ignores a related-line response after the page closes',async()=>{
    const {f,get,line}=await pr(),page=f.componentInstance;
    const row=page.inlineDocumentWindowConfig!.lineRows!.find(row=>row['systemId']==='line-1')!;
    const pending=new Subject<unknown>();let refreshing=false;
    get.mockImplementation((path:string)=>{
      if(path.includes('purchaseRequisitionLines')){refreshing=true;return pending as never;}
      return of({data:[]}) as never;
    });
    await page.validate('purpose','Server change');await vi.waitFor(()=>expect(refreshing).toBe(true));
    f.destroy();pending.next({data:[structuredClone(line)]});pending.complete();
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(row['description']).toBe('Before');
  });
});
