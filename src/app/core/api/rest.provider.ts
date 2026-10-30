import { Provider } from '@angular/core';
import { DATA_REST_SERVICE, DataRestService } from '../../platform/data/data-source.service';
import { RestService } from '../services/rest.service';

export const dataRestProvider: Provider = {
  provide: DATA_REST_SERVICE,
  deps: [RestService],
  useFactory: (restService: RestService): DataRestService => ({
    get: (endpoint: string) => restService.get(endpoint),
    post: (endpoint: string, payload: unknown) => restService.post(endpoint, payload),
    put: (endpoint: string, payload: unknown, ifMatch?: string) => restService.put(endpoint, payload, { ifMatch }),
    patch: (endpoint: string, payload: unknown, ifMatch?: string) => restService.patch(endpoint, payload, ifMatch),
    delete: (endpoint: string, ifMatch?: string) => restService.delete(endpoint, { ifMatch })
  })
};
