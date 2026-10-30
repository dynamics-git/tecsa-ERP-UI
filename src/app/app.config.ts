import { APP_BASE_HREF } from '@angular/common';
import { WorkspaceContext } from './core/services/workspace-context';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { dataRestProvider } from './core/api/rest.provider';
import { HttpInterceptorService } from './core/interceptors/http-interceptor';
import { DocumentSaveService } from './core/services/document-save.service';
import { DOCUMENT_SAVE_PORT } from './platform/public-api';
import { providePlatformGovernance } from './core/providers/platform-governance.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {provide:APP_BASE_HREF,useFactory:(workspace:WorkspaceContext)=>workspace.baseHref,deps:[WorkspaceContext]},
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpInterceptorService,
      multi: true
    },
    {
      provide: DOCUMENT_SAVE_PORT,
      useClass: DocumentSaveService
    },
    ...providePlatformGovernance(),
    dataRestProvider,
    provideRouter(routes)
  ]
};
