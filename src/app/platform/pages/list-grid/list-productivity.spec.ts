import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListGrid } from './list-grid';
import { ListPageConfig } from '../../models/page-config.model';
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});
const config:ListPageConfig={pageId:'productivity-list',personalization:{enabled:false},tools:{export:true},factBox:{enabled:false},dataSource:{endpoint:'/fixtures',keyField:'id'},dataSurface:{columns:[{field:'code',label:'Code',width:'120px'},{field:'description',label:'Description',width:'200px'},{field:'secret',label:'Private',hidden:true}]}};
function fixture(pageConfig:ListPageConfig=config){TestBed.configureTestingModule({imports:[ListGrid],providers:[provideRouter([])]});const f=TestBed.createComponent(ListGrid);f.componentRef.setInput('config',pageConfig);f.componentRef.setInput('data',[{id:'a',code:'A',description:'First',secret:'SECRET'},{id:'b',code:'B',description:'=unsafe()',secret:'SECRET'}]);f.detectChanges();return f;}
describe('Shared list productivity controls',()=>{
 it('dismisses View and Export on outside pointer clicks but preserves inside interactions',()=>{
  const f=fixture();
  const menus=f.nativeElement.querySelectorAll('.dataset-tools details') as NodeListOf<HTMLDetailsElement>;
  expect(menus.length).toBe(2);
  for(const menu of menus){
   menu.open=true;
   menu.querySelector('.list-export-options')!.dispatchEvent(new Event('pointerdown',{bubbles:true}));
   expect(menu.open).toBe(true);
   f.nativeElement.querySelector('tbody td')!.dispatchEvent(new Event('pointerdown',{bubbles:true}));
   expect(menu.open).toBe(false);
   menu.open=true;document.body.dispatchEvent(new Event('pointerdown',{bubbles:true}));
   expect(menu.open).toBe(false);
  }
  f.destroy();
 });
 it('keeps Columns and Save view open inside their panel or trigger and dismisses them outside',()=>{
  const f=fixture({...config,personalization:{enabled:true}}),grid=f.componentInstance;
  for(const [state,panel,label] of [['showColumns','.list-column-panel','Columns'],['showSaveView','.list-save-view','Save view']] as const){
   const trigger=Array.from(f.nativeElement.querySelectorAll('.dataset-tools button') as NodeListOf<HTMLButtonElement>).find(button=>button.textContent?.trim()===label)!;
   trigger.click();f.detectChanges();
   trigger.dispatchEvent(new Event('pointerdown',{bubbles:true}));expect(grid[state]).toBe(true);
   f.nativeElement.querySelector(panel)!.dispatchEvent(new Event('pointerdown',{bubbles:true}));expect(grid[state]).toBe(true);
   f.nativeElement.querySelector('tbody td')!.dispatchEvent(new Event('pointerdown',{bubbles:true}));expect(grid[state]).toBe(false);
   f.detectChanges();
  }
  f.destroy();
 });
 it('closes toolbar menus with Escape without intercepting outside actions',()=>{
  const f=fixture();const menu=f.nativeElement.querySelector('.list-view-menu') as HTMLDetailsElement;
  menu.open=true;
  menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(menu.open).toBe(false);
  menu.open=true;const outside=new Event('pointerdown',{bubbles:true,cancelable:true});
  document.body.dispatchEvent(outside);expect(outside.defaultPrevented).toBe(false);
  f.destroy();
 });
 it('copies selected loaded rows and visible columns only, with Excel formula protection',async()=>{
  const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
  const f=fixture();f.componentInstance.selectedNos=new Set(['b']);await f.componentInstance.copyRows();
  expect(writeText).toHaveBeenCalledExactlyOnceWith("B\t'=unsafe()");expect(writeText.mock.calls[0][0]).not.toContain('SECRET');f.destroy();
 });
 it('freezes a prefix with correct offsets and restores or resets through existing personalization',()=>{
  const f=fixture(),grid=f.componentInstance;grid.freezeThrough(grid.columns[1]);
  expect(grid.frozenLeft(grid.columns[0])).toBe(60);expect(grid.frozenLeft(grid.columns[1])).toBe(180);
  const saved=grid.currentPersonalization;expect(saved.frozenThrough).toBe('description');
  grid.frozenThrough='';grid.restorePersonalization(saved);expect(grid.isFrozen(grid.columns[1])).toBe(true);
  grid.resetColumns();expect(grid.frozenLeft(grid.columns[0])).toBeNull();f.destroy();
 });
 it('auto-fits using loaded values only and keeps the width bounded',()=>{
  const measureText=vi.fn((text:string)=>({width:text.length*100}));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({measureText,font:''} as unknown as CanvasRenderingContext2D);
  const f=fixture(),grid=f.componentInstance;grid.autoFitColumn(grid.columns[1]);
  expect(grid.columnWidthNumber(grid.columns[1])).toBe(480);expect(measureText).toHaveBeenCalledTimes(3);f.destroy();
 });
});
