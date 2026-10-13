import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideErpRest } from './core/api/erp-rest.provider';
import { HttpInterceptorService } from './core/interceptors/http-interceptor';
import { EntrySaveService } from './core/services/entry-save.service';
import { ENTRY_SAVE_PORT } from './platform/public-api';
import { providePlatformGovernance } from './core/providers/platform-governance.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpInterceptorService,
      multi: true
    },
    {
      provide: ENTRY_SAVE_PORT,
      useClass: EntrySaveService
    },
    ...providePlatformGovernance(),
    provideErpRest(),
    provideRouter(routes)
  ]
};
