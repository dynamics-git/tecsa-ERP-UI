import { Injectable, signal } from '@angular/core';
export interface FactBoxHost { readonly factBoxEnabled:boolean; readonly factboxOpen:boolean; toggleFactbox():void; }
@Injectable({providedIn:'root'})
export class FactBoxHostService { readonly host=signal<FactBoxHost | null>(null); }
