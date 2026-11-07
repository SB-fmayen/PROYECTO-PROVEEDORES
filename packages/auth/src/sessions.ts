import { AppError, type Principal } from '../../domain/src/index.js';
import { digestSessionToken, hashPassword, newSessionToken, verifyPassword } from './index.js';

export interface SecurityUser { id: string; username: string; passwordHash: string | null; active: boolean; }
export interface SecurityRepository {
  findUser(username: string): Promise<SecurityUser | null>;
  // Se consulta en cada petición para aplicar bajas y permisos inmediatamente.
  getPrincipal(userId: string): Promise<Principal | null>;
}
interface Session { userId: string; expiresAt: number; }
export class Sessions {
  private readonly sessions = new Map<string, Session>();
  private constructor(private readonly security: SecurityRepository, private readonly dummyHash: string, private readonly ttlSeconds: number) {}
  static async create(security: SecurityRepository, ttlSeconds: number) {
    return new Sessions(security, await hashPassword(newSessionToken()), ttlSeconds);
  }
  async login(username: string, password: string, previousToken?: string) {
    const user = await this.security.findUser(username);
    const hasHash = !!user?.passwordHash?.startsWith('$argon2id$');
    const valid = await verifyPassword(hasHash ? user!.passwordHash! : this.dummyHash, password);
    if (!user?.active || !hasHash || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
    const principal = await this.security.getPrincipal(user.id);
    if (!principal) throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
    this.prune();
    if (this.sessions.size >= 10000) throw new AppError(503, 'SESSION_CAPACITY', 'No se pueden abrir más sesiones en este momento.');
    if (previousToken) this.logout(previousToken);
    const token = newSessionToken();
    const expiresAt = Date.now() + this.ttlSeconds * 1000;
    this.sessions.set(digestSessionToken(token), { userId: user.id, expiresAt });
    return { token, expiresAt, principal };
  }
  async authenticate(token: string | undefined): Promise<Principal> {
    const digest = token ? digestSessionToken(token) : '';
    const session = this.sessions.get(digest);
    if (!session || session.expiresAt <= Date.now()) {
      this.sessions.delete(digest);
      throw new AppError(401, 'UNAUTHENTICATED', 'Debe iniciar sesión.');
    }
    const principal = await this.security.getPrincipal(session.userId);
    if (!principal) {
      this.sessions.delete(digest);
      throw new AppError(401, 'UNAUTHENTICATED', 'Debe iniciar sesión.');
    }
    return principal;
  }
  logout(token: string): void { this.sessions.delete(digestSessionToken(token)); }
  revokeUser(userId: string): void {
    for (const [digest, session] of this.sessions) if (session.userId === userId) this.sessions.delete(digest);
  }
  private prune(): void {
    const now = Date.now();
    for (const [digest, session] of this.sessions) if (session.expiresAt <= now) this.sessions.delete(digest);
  }
}
