import { describe,it,expect,vi } from 'vitest';
import { UnsavedChangesService } from './unsaved-changes.service';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
describe('Shared navigation protection',()=>{
 it('allows unchanged pages, blocks pending writes and protects changed pages across every wrapper',async()=>{
  const confirm=vi.fn().mockResolvedValue(false),service=new UnsavedChangesService({confirm} as unknown as ConfirmationService),owner={};
  let changed=false,saving=false;service.register(owner,{changed:()=>changed,saving:()=>saving});
  expect(await service.canLeave()).toBe(true);expect(confirm).not.toHaveBeenCalled();
  saving=true;expect(await service.canLeave()).toBe(false);expect(confirm).not.toHaveBeenCalled();
  saving=false;changed=true;expect(await service.canLeave()).toBe(false);expect(confirm).toHaveBeenCalledOnce();
  confirm.mockResolvedValue(true);expect(await service.canLeave()).toBe(true);service.release(owner);expect(await service.canLeave()).toBe(true);
 });
});
