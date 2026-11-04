/** Metadata identity only. Never a record key, route or permission grant. */
export type ObjectType = 'table' | 'page' | 'codeunit' | 'report' | 'query' | 'enum' | 'permission';

export interface ObjectIdentity<T extends ObjectType = ObjectType> {
  readonly objectType: T;
  readonly objectId: number;
  readonly objectName: string;
}

export interface PageObjectDefinition extends ObjectIdentity<'page'> {
  readonly sourceTable: ObjectIdentity<'table'>;
  readonly codeunit?: ObjectIdentity<'codeunit'>;
}

function assertIdentity(value: unknown, type: ObjectType): asserts value is ObjectIdentity {
  const identity = value as Partial<ObjectIdentity> | undefined;
  if (!identity || identity.objectType !== type || !Number.isInteger(identity.objectId)
    || identity.objectId! < 1 || identity.objectId! > 2147483647
    || typeof identity.objectName !== 'string' || !identity.objectName
    || identity.objectName.trim() !== identity.objectName || /[\x00-\x1f]/.test(identity.objectName)) {
    throw new Error(`Invalid ${type} object identity`);
  }
}

/** Validates the optional metadata of a normally discovered config page. */
export function pageObjectDefinition(value: unknown): PageObjectDefinition {
  assertIdentity(value, 'page');
  const page = value as PageObjectDefinition;
  assertIdentity(page.sourceTable, 'table');
  if (page.codeunit !== undefined) assertIdentity(page.codeunit, 'codeunit');
  return page;
}
