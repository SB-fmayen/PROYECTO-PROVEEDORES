export type Operation = 'INSERT' | 'UPDATE' | 'DELETE';
export interface Principal { readonly userId: string; readonly permissions: ReadonlySet<string>; }
export class AppError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) { super(message); }
}
export function requirePermission(principal: Principal | undefined, permission: string): void {
  if (!principal) throw new AppError(401, 'UNAUTHENTICATED', 'Debe iniciar sesión.');
  if (!principal.permissions.has(permission)) throw new AppError(403, 'FORBIDDEN', 'Acceso denegado.');
}
