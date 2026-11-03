import { DeferBlockState, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { DrawerHost, NotificationClient, RunModalStackService } from '../../../platform/public-api';
import { AuthService } from '../../../core/services/auth.service';
import { SessionService } from '../../../core/services/session.service';

afterEach(()=>TestBed.resetTestingModule());
describe('Company drawer integration',()=>{
  it('renders company selection, protects an in-flight switch and closes without removing its parent document',async()=>{
    TestBed.configureTestingModule({imports:[DrawerHost],providers:[
      {provide:AuthService,useValue:{authorizedCompanies:()=>of([{systemId:'current',name:'Tecsa',code:'TEC'}])}},
      {provide:SessionService,useValue:{Company:'current',CompanyName:'Tecsa'}}
    ]});
    const stack=TestBed.inject(RunModalStackService);
    stack.open({id:'document',mode:'page'});
    const popup={id:'company-switcher',title:'Change company',mode:'drawer' as const,allowNested:true,data:{drawerViewId:'company-switcher'}};
    stack.open(popup);
    await TestBed.compileComponents();
    const f=TestBed.createComponent(DrawerHost);f.detectChanges();
    const [block]=await f.getDeferBlocks();await block.render(DeferBlockState.Complete);await f.whenStable();
    expect(f.nativeElement.querySelector('app-company-switcher')).not.toBeNull();
    f.componentInstance.setCompanyBusy(popup.id,true);f.componentInstance.onBackdropClick(popup);
    let ids:string[]=[];const sub=stack.stack$.subscribe(popups=>ids=popups.map(item=>item.id));
    expect(ids).toEqual(['document','company-switcher']);
    f.componentInstance.setCompanyBusy(popup.id,false);f.componentInstance.close(popup.id);
    expect(ids).toEqual(['document']);sub.unsubscribe();f.destroy();
  });
  it('keeps existing profile and notification drawers available when loaded on opening',async()=>{
    const list=vi.fn().mockResolvedValue({data:[],meta:{hasMore:false}});
    TestBed.configureTestingModule({imports:[DrawerHost],providers:[
      {provide:SessionService,useValue:{Company:'current',CompanyName:'Tecsa',UserName:'Admin'}},
      {provide:NotificationClient,useValue:{scope:()=> 'test-company',list}}
    ]});
    await TestBed.compileComponents();
    const stack=TestBed.inject(RunModalStackService);
    for(const [view,selector] of [['profile','app-profile-drawer'],['notifications','app-notification-inbox']]){
      stack.open({id:view,mode:'drawer',data:{drawerViewId:view}});
      const f=TestBed.createComponent(DrawerHost);f.detectChanges();
      const [block]=await f.getDeferBlocks();await block.render(DeferBlockState.Complete);await f.whenStable();
      expect(f.nativeElement.querySelector(selector)).not.toBeNull();f.destroy();stack.close(view);
    }
    expect(list).toHaveBeenCalledOnce();
  });
});
