import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListGrid } from './list-grid';
import { ListPageConfig } from '../../models/page-config.model';
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});
const config:ListPageConfig={pageId:'productivity-list',personalization:{enabled:false},tools:{export:true},factBox:{enabled:false},dataSource:{endpoint:'/fixtures',keyField:'id'},dataSurface:{columns:[{field:'code',label:'Code',width:'120px'},{field:'description',label:'Description',width:'200px'},{field:'secret',label:'Private',hidden:true}]}};
function fixture(){TestBed.configureTestingModule({imports:[ListGrid],providers:[provideRouter([])]});const f=TestBed.createComponent(ListGrid);f.componentRef.setInput('config',config);f.componentRef.setInput('data',[{id:'a',code:'A',description:'First',secret:'SECRET'},{id:'b',code:'B',description:'=unsafe()',secret:'SECRET'}]);f.detectChanges();return f;}
describe('Shared list productivity controls',()=>{
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
