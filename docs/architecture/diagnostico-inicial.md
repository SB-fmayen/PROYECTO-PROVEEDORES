# Diagnóstico inicial — 2026-11-02

## Evidencia disponible
El único archivo recibido fue CODEX_CONTEXT_PROYECTO_PROVEEDORES.md (13 651 bytes), leído completo. Se conserva intacto y se copia a CODEX_CONTEXT.md. No existían código, .git, scripts SQL, MER, PDF, XLSX ni archivos de configuración. Los nombres de tablas y objetos provienen del contexto, no de una inspección exitosa de metadatos.

El enlace histórico de ChatGPT no pudo recuperarse (Cache miss). La conversación actual solo está disponible mediante los mensajes incluidos en esta sesión. No se infieren decisiones adicionales.

## Bases y limitaciones verificadas
OracleServiceFREE y su listener aparecen Running; sqlplus local con autenticación del sistema devolvió ORA-12241. No se modificaron servicios ni usuarios. localhost:1521/FREEPDB1, ADMIN_CU_PROVEEDORES, CRUD_PROVEEDORES y cero triggers son datos documentados, todavía sin verificación en vivo.

MSSQL$SQLEXPRESS aparece Running; SQLBrowser está Stopped. sqlcmd con autenticación Windows, tanto por instancia como por protocolo local, devolvió errores de cifrado/conexión. CuentasPorPagarDB y sus siete tablas son datos documentados. No se pudo verificar USUARIO ni PASSWORD_HASH. No hay credenciales aportadas ni .env. No se han ejecutado cambios de esquema o datos.

Node 24.18.0, npm 11.16.0, Git, sqlcmd y sqlplus disponibles. No se encontró dotnet en PATH. Las referencias a triggers eran exclusivamente documentación, incluida la lista histórica de once triggers eliminados. No se recibió ningún script histórico ejecutable.

## Stack y árbol definitivo
Node.js 24, npm workspaces, TypeScript estricto, Fastify con logs estructurados, React/Vite, Zod, node-oracledb, node-mssql y Argon2id. El frontend consume exclusivamente la API. Se usará un mismo origen mediante proxy para API/cookies en despliegue.

```text
apps/
  api/src/               HTTP, validación, composición y guards
  web/src/               Interfaz React
packages/
  domain/src/            Entidades, errores y contratos independientes
  application/src/       Casos de uso y contrato transaccional
  db-oracle/src/         Pool, transacciones y futuros repositorios de negocio
  db-sqlserver/src/      Pool y futuros repositorios de seguridad
  auth/src/              Hash, sesión y autorización
  audit/src/             Inserción explícita en Oracle
  shared/src/            Contratos públicos
  config/src/            Entorno validado
  (cada módulo tiene manifiesto workspace y exportación propia)
database/{oracle,sqlserver}/
  validation/            Inspección de solo lectura ya disponible
  schema/                Futuras migraciones verificadas
  grants/                Grants mínimos documentados
  seed/                  Sin contraseñas ni datos destructivos
  rollback/              Reversión explícita cuando aplique
docs/{architecture,database,mer,evidence}/
scripts/                 Inspección local reproducible
tests/                   Pruebas de seguridad y transacciones
```

## Autenticación y hash
Buscar usuario en SQL Server mediante parámetro, verificar activo y PASSWORD_HASH con Argon2id. La consulta concreta depende de nombres y tipos reales. Mensaje común: «Usuario o contraseña incorrectos.». Verificar un hash ficticio de coste equivalente para usuarios inexistentes, limitar intentos y nunca registrar cuerpos con contraseñas. Alta: validar contraseña en backend, hash Argon2id (64 MiB, 3 iteraciones, paralelismo 1, salt aleatorio), persistir solamente hash. El helper de hash está implementado; el login HTTP sigue pendiente.

Sesión prevista: token aleatorio de 256 bits, almacenar únicamente digest SHA-256 en almacén servidor, cookie HttpOnly, SameSite=Lax, Path=/, Secure bajo HTTPS, expiración absoluta inicial de 30 minutos. Regenerar token al autenticar; logout elimina cookie y revoca sesión. Para persistencia entre reinicios se propondrá tabla de sesiones separada después de inspección; no se ha creado. Validar Origin en mutaciones como defensa CSRF. No enviar roles sensibles ni contraseñas en token. API volverá a comprobar usuario activo y permisos en cada operación; cambios de permisos se aplican sin esperar expiración.

## Autorización
Resolver USUARIO -> USUARIO_ROL -> ROL -> ROL_PERFIL -> PERFIL -> PERFIL_MENU -> MENU. Se deben inspeccionar PK/FK, campos de actividad, jerarquía y cómo se representan las acciones. No asumir que acceso a menú implica permiso de escritura. Si solo existe visibilidad de menú, proponer matriz explícita de acciones y su migración antes de habilitar cambios. Denegación por defecto, HTTP 401 sin sesión y 403 sin permiso. Menú web derivado de permisos del servidor.

## Auditoría sin triggers
Una misma conexión Oracle y autoCommit=false: SELECT previo con bloqueo para UPDATE/DELETE, mutación, lectura del estado persistido, INSERT en LOG_AUDITORIA_ODC usando SEQ_LOG_AUDITORIA_ODC.NEXTVAL, COMMIT. Cualquier fallo implica ROLLBACK. Registrar tabla, operación, PK, antes/después, usuario DB, fecha, IP y host. Falta verificar tipos y tamaños antes de habilitar adaptador. La identidad del usuario de aplicación debe quedar vinculada explícitamente; no sobrecargar USUARIO_DB sin confirmar su semántica y longitud. Redactar datos sensibles en snapshots. No hay mutaciones HTTP habilitadas.

## Migraciones necesarias (pendientes de evidencia)
1. Inspeccionar esquema USUARIO real y cualquier campo legado de contraseña.
2. Si no existe PASSWORD_HASH: proponer ALTER TABLE del esquema verificado, columna VARCHAR(255) nullable inicialmente, sin default, sin convertir contraseñas existentes; verificar espacio para formato PHC Argon2id. Usuarios sin hash requieren alta/restablecimiento seguro. No borrar campos o datos legados automáticamente.
3. Añadir aplicación idempotente, validación de tipo/longitud y rollback que se niegue a eliminar hashes existentes. No generar DDL activo sobre una tabla no inspeccionada.
4. Verificar almacenamiento de sesiones y permisos por acción; proponer cambios únicamente ante carencias confirmadas.
5. Verificar grants del rol CRUD sobre auditoría y secuencia. Nunca conectar la aplicación como administrador.
6. Confirmar cero triggers con el propietario Oracle y metadatos completos de SQL Server; vistas de objetos visibles no bastan para certificarlo.

## Entorno
.env.example enumera host/puerto/servicio/usuario/contraseña Oracle; host/instancia o puerto/base/usuario/contraseña/cifrado/certificado SQL Server; host/puerto API, origen web, TTL y bandera Secure. .env se ignora. No imprimir ni enviar contraseñas por chat. El driver SQL Server inicial usa autenticación SQL; la conexión Windows de diagnóstico no configura credenciales de aplicación.

## Orden de trabajo
Completado inicialmente: estructura, configuración, pools, endpoint de vida, comprobación de disponibilidad real, hashing, guard de permisos, transacción y adaptador de auditoría no expuesto; scripts de inspección y frontend informativo sin datos falsos.
Siguiente: configurar conectividad con usuarios mínimos; obtener metadatos y scripts históricos; documentar MER real; preparar migraciones verificadas; implementar repositorio de seguridad, sesión y login; guards y menú; proveedores con auditoría atómica; continuar módulos en el orden solicitado. Las pruebas actuales son unitarias, no certifican integración con bases reales.

Verificación de esta entrega: npm run build correcto, seis pruebas correctas, instalación sin vulnerabilidades reportadas. El runner tsx falló por uv_os_get_passwd/ENOMEM en este entorno; se sustituyeron los comandos de ejecución por compilación TypeScript y Node. dev:api observa JavaScript compilado; después de editar TypeScript ejecutar compile:api o mantener tsc --watch en otra terminal. No se ejecutaron pruebas de integración DB.
