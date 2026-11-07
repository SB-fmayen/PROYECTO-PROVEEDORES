export type Row = Record<string, string | number | boolean | null>;
export interface Page { rows: Row[]; total: number; page: number; pageSize: number; }
export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }); }
  catch { throw new ApiError('No se pudo conectar con el servidor. Inténtelo nuevamente.', 0); }
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(result?.message ?? 'El servicio no está disponible. Inténtelo nuevamente.', response.status);
  return result as T;
}
