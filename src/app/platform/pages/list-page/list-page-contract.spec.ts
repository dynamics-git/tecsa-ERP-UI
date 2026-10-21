import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe,it,expect } from 'vitest';
import { ListPage } from './list-page';
import { ListPageConfig } from '../../models/page-config.model';

describe('Shared list workspace with synthetic records',()=>{
 const config:ListPageConfig={pageId:'fixture-list',title:'Fixture records',dataSource:{endpoint:'/fixtures',keyField:'id'},factBox:{enabled:false},personalization:{enabled:false},dataSurface:{columns:[{field:'code',label:'Code'},{field:'status',label:'Status'}]}};
 function create(rows:unknown[]){TestBed.configureTestingModule({imports:[ListPage],providers:[provideRouter([])]});const f=TestBed.createComponent(ListPage);f.componentRef.setInput('config',config);f.componentRef.setInput('data',rows);f.detectChanges();return f;}
 it('bounds DOM rows for 10,000 records and supports scrollback without removing data',()=>{
  const rows=Array.from({length:10000},(_,id)=>({id:String(id),code:'ROW-'+id,status:'Open'}));const f=create(rows),page=f.componentInstance;
  expect(f.nativeElement.querySelectorAll('tbody tr[data-record-row]').length).toBeLessThanOrEqual(80);
  const scroll=f.nativeElement.querySelector('.grid-scroll');scroll.scrollTop=5000*36;scroll.dispatchEvent(new Event('scroll'));f.detectChanges();
  expect(f.nativeElement.textContent).toContain('ROW-5000');expect(page.rows.length).toBe(10000);
  scroll.scrollTop=0;scroll.dispatchEvent(new Event('scroll'));f.detectChanges();expect(f.nativeElement.textContent).toContain('ROW-0');
  f.destroy();
 });
 it('supports keyboard navigation across the virtual window while retaining the full row count',()=>{
  const rows=Array.from({length:1000},(_,id)=>({id:String(id),code:'ROW-'+id}));const f=create(rows);
  const first=f.nativeElement.querySelector('tr[data-record-row]');first.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));f.detectChanges();
  expect(document.activeElement?.textContent).toContain('ROW-999');
  expect(f.nativeElement.querySelector('table').getAttribute('aria-rowcount')).toBe('1001');f.destroy();
 });
 it('keeps grouping, collapsed groups and selected records while rendering a bounded window',()=>{
  const rows=Array.from({length:1000},(_,id)=>({id:String(id),code:'ROW-'+id,status:id<500?'Open':'Closed'}));const f=create(rows),page=f.componentInstance;
  page.setGrouping('status');f.changeDetectorRef.markForCheck();f.detectChanges();expect(f.nativeElement.textContent).toContain('Open');
  page.toggleGroup('string:Open');f.changeDetectorRef.markForCheck();f.detectChanges();expect(f.nativeElement.textContent).not.toContain('ROW-0');expect(f.nativeElement.textContent).toContain('ROW-500');
  expect(f.nativeElement.querySelectorAll('tbody tr').length).toBeLessThanOrEqual(82);f.destroy();
 });
 it('retains rows during refresh and shows errors separately from a successful empty result',()=>{
  const f=create([{id:'1',code:'PR',status:'Open'}]);f.componentRef.setInput('loading',true);f.detectChanges();
  expect(f.nativeElement.textContent).toContain('PR');expect(f.componentInstance.isInitialLoading).toBe(false);
  f.componentRef.setInput('loading',false);f.componentRef.setInput('errorMessage','Connection unavailable');f.detectChanges();expect(f.nativeElement.textContent).toContain('Connection unavailable');
  f.componentRef.setInput('errorMessage',undefined);f.componentRef.setInput('data',[]);f.detectChanges();expect(f.nativeElement.textContent).toContain('No records');f.destroy();
 });
});
