import type { ResourceField } from '../../../packages/shared/src/resources.js';
export type FormRow = Record<string, string | number | boolean | null>;

export function buildRecordPayload(fields: ResourceField[], form: FormData, original: FormRow | null): FormRow {
  const body: FormRow = {};
  for (const field of fields) {
    const raw = String(form.get(field.name) ?? '').trim();
    if (field.type === 'boolean') body[field.name] = field.name === 'ESTADO' ? raw === 'true' : form.has(field.name);
    else if (!raw) { if (original && field.nullable) body[field.name] = null; }
    else body[field.name] = field.type === 'number' ? Number(raw) : raw;
    if (original) {
      const value = original[field.name] ?? null;
      const comparable = field.type === 'date' && typeof value === 'string' ? value.slice(0, 10) : value;
      if (body[field.name] === comparable) delete body[field.name];
    }
  }
  const password = String(form.get('PASSWORD') ?? '');
  if (password) body.PASSWORD = password;
  return body;
}
