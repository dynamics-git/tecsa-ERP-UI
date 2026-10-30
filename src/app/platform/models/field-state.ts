import type { FieldCondition } from './field-config.model';
export function matchesFieldCondition(condition: FieldCondition | undefined, record: Record<string, unknown>): boolean {
 if (!condition) return false;
 const value = condition.field.split('.').reduce<unknown>((value,key)=>value && typeof value==='object' ? (value as Record<string,unknown>)[key] : undefined,record);
 const match = condition.values.some(expected=>Object.is(value,expected));
 return condition.negate ? !match : match;
}
export function fieldIsRequired(field: {required?:boolean;requiredWhen?:FieldCondition;readonly?:boolean;readonlyAfterCreate?:boolean;readonlyWhen?:FieldCondition},record:Record<string,unknown>):boolean {
 return !fieldIsReadonly(field, record) && (field.required === true || matchesFieldCondition(field.requiredWhen,record));
}
export function fieldIsHidden(field: {hidden?:boolean;hiddenWhen?:FieldCondition},record:Record<string,unknown>):boolean {
 return field.hidden === true || matchesFieldCondition(field.hiddenWhen,record);
}
export function fieldIsReadonly(field: {readonly?:boolean;readonlyAfterCreate?:boolean;readonlyWhen?:FieldCondition},record:Record<string,unknown>):boolean {
 return field.readonly === true || (field.readonlyAfterCreate === true && !!(record['systemId'] ?? record['id'])) || matchesFieldCondition(field.readonlyWhen,record);
}
