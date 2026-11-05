/** Metadata identity only. Never a record key, route or permission grant. */
export type ObjectType = 'table' | 'page' | 'codeunit' | 'report' | 'query' | 'enum' | 'permission';

export interface ObjectIdentity<T extends ObjectType = ObjectType> {
  readonly objectType: T;
  readonly objectId: number;
  readonly objectName: string;
}

/** Page Type/Name already come from pageType/title; relationships stay in backend metadata. */
export function validatePageObjectId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 2147483647) {
    throw new Error('Invalid page objectId');
  }
  return value;
}
