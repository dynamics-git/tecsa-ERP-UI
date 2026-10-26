import { Injectable } from '@angular/core';

export interface ListCommandEvent {
  actionKey: string;
  payload?: unknown;
}

export interface ListCommandHandlers {
  refresh?: (payload: unknown) => void;
  createNew?: (payload: unknown) => void;
  delete?: (payload: unknown) => void;
  command?: (actionKey: string, payload: unknown) => void;
}

@Injectable({
  providedIn: 'root'
})
export class PageCommandService {
  handleListCommand(event: ListCommandEvent, handlers: ListCommandHandlers): boolean {
    switch (event.actionKey) {
      case 'refresh':
        handlers.refresh?.(event.payload);
        return handlers.refresh !== undefined;
      case 'new':
        handlers.createNew?.(event.payload);
        return handlers.createNew !== undefined;
      case 'delete':
        handlers.delete?.(event.payload);
        return handlers.delete !== undefined;
      default:
        handlers.command?.(event.actionKey, event.payload);
        return handlers.command !== undefined;
    }
  }
}
