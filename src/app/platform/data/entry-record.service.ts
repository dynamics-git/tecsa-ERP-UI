import { Injectable } from '@angular/core';
import { DataSourceConfig } from '../models/data-source-config.model';
import { EntityContractService } from './entity-contract.service';

@Injectable({
  providedIn: 'root'
})
export class EntryRecordService {
  constructor(private readonly contractService: EntityContractService) {}

  resolvePersistedRecordId(record: Record<string, unknown>, config?: DataSourceConfig): unknown {
    const keyCandidates: string[] = [];

    if (config?.keyField) {
      keyCandidates.push(config.keyField);
    }

    keyCandidates.push('systemId', 'SystemId', 'id', 'Id');

    for (const key of [...new Set(keyCandidates)]) {
      if (!(key in record)) {
        continue;
      }

      const value = record[key];
      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }

    return null;
  }

  resolveRecordId(record: Record<string, unknown>, config?: DataSourceConfig): unknown {
    const keyCandidates: string[] = [];

    if (config?.keyField) {
      keyCandidates.push(config.keyField);
    }

    keyCandidates.push('systemId', 'SystemId', 'id', 'Id');

    keyCandidates.push(...this.contractService.getDeleteKeyCandidates(config));

    if (config?.documentNoField) {
      keyCandidates.push(config.documentNoField);
    }

    for (const key of [...new Set(keyCandidates)]) {
      if (!(key in record)) {
        continue;
      }

      const value = record[key];
      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }

    return null;
  }
}
