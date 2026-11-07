# Implementación y bloqueos — 2026-11-03

Esta es una captura histórica anterior, supersedida por [USO](../USO.md) y [ESTADO](../../ESTADO.md). Ya se aplicaron y verificaron la columna de hash y las diez identidades Oracle. El administrador Argon2id está inicializado y pasaron login, permisos, CRUD de todos los módulos y auditoría con bases reales. Los bloqueos descritos abajo pertenecen exclusivamente al estado anterior.

La solicitud de completar el proyecto autoriza continuar el desarrollo con estructuras verificadas. No se ejecutaron migraciones ni modificaciones persistentes de datos.

## Implementado

- Diagnóstico SQL Server respeta autenticación, host, puerto, instancia, cifrado y certificado del `.env`. Antes siempre usaba Windows y una instancia fija.
- Puerto TCP 60636 detectado en registro/listener y guardado en `.env`, sin cambiar credenciales. Es dinámico: puede cambiar al reiniciar SQL Server.
- Catálogo de once objetos Oracle a partir de evidencia real, incluyendo columnas, tipos, longitudes en bytes, escala, identidad, claves y referencias. MER en `docs/mer/oracle.md`.
- Repositorios parametrizados con búsqueda escapada, paginación, lectura individual, bloqueo previo y escrituras sin autocommit.
- Casos de uso con autorización previa, validación de campos, importes no negativos, decimales, fechas y coherencia de totales de documentos/detalles.
- Auditoría transaccional exige secuencia visible antes de mutar. Usuario de aplicación dentro del sobre JSON; `USUARIO_DB` conserva al usuario de conexión. Snapshots de más de 4000 bytes se rechazan sin truncarlos.
- Sesiones en memoria: tokens opacos, solo digest almacenado, expiración absoluta, revocación y renovación. Reconsulta actividad/permisos en cada petición. Reiniciar cierra sesiones; varios procesos requerirán almacén compartido.
- Registro de rutas con cookie HttpOnly/SameSite, validación Origin, límite de intentos y autorización por acción. **No conectado en `main.ts`**: falta repositorio SQL Server basado en esquema verificado. Dobles de prueba nunca se usan en producción.

## Verificación

- 13 pruebas correctas: protección HTTP, sesiones y rollback del caso de uso. El fallo de auditoría se simula con un doble; no certifica transacciones Oracle reales.
- `db:verify:oracle`: once listados, lectura por clave cuando existen filas y búsqueda escapada pasan contra Oracle real, sin imprimir registros. Devuelve fallo por `AUDIT_UNAVAILABLE`: secuencia no visible.
- SQL Server devuelve `ELOGIN` al puerto correcto, sin timeout. No se obtuvo su esquema ni se validó autenticación de aplicación.
- Registro `LoginMode=2`: modo mixto configurado; falta confirmación con SERVERPROPERTY tras conectar. Windows por TCP falla por SSPI.

## Accesos pendientes

1. Login SQL válido con acceso a CuentasPorPagarDB en `.env`. Comprobar en SSMS contra `tcp:127.0.0.1,60636`, autenticación SQL Server. Un usuario de base documentado no demuestra que exista como login de servidor.
2. Evidencia del propietario Oracle sobre secuencia, grants y cero triggers. Ejecutar `database/oracle/validation/002_audit_owner.sql`. No crear secuencia ni usar MAX(ID)+1 para eludir el bloqueo.

Después: inspeccionar SQL Server, crear MER real, implementar seguridad y administración, integrar rutas, construir pantallas y completar carga reproducible y pruebas integradas. Si faltan hashes o permisos por acción, preparar migraciones verificadas con validación/rollback. Visibilidad de menú no equivale a escritura.

Frontend aún informativo. Proyecto incompleto. No se crearon usuarios/logins ni triggers; no se cambiaron contraseñas, esquemas o grants.
