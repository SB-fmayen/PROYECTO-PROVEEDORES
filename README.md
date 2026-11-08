# Cuentas por Pagar de Proveedores

Prototipo universitario funcional con bases reales. Oracle contiene negocio y SQL Server seguridad. La API es el único punto de acceso. Auditoría explícita en la misma transacción Oracle; cero triggers y PK/FK existentes conservadas.

Incluye administrador inicial con Argon2id, login, sesión, logout, permisos por roles/perfiles/acciones, resumen con datos registrados y 18 módulos: diez tablas funcionales Oracle, auditoría de consulta y siete tablas de seguridad SQL Server. La interfaz tiene formularios, búsqueda, paginación y detalle de auditoría. [Guía de uso](docs/USO.md), [estado verificado](ESTADO.md), [validación por perfiles](docs/VALIDACION_POR_PERFILES.md) y [seguridad](SECURITY.md).

## Entrega del 7 de noviembre de 2026

[Cuentas y matriz de perfiles de prueba](docs/PERFILES_DE_PRUEBA.md): Consulta, Operador, Tesorería y Auditor, con accesos distintos. Se verificaron 288 combinaciones de rutas y los cuatro logins por red; las contraseñas no se publican en el repositorio.

Actualización: [migración de schema y usuario dueño SQL](docs/SQLSERVER_SCHEMA.md) aplicada y verificada. Las siete tablas están en SEGURIDAD_PROVEEDORES y `.env` local ya usa el nuevo schema. No repetir la migración ni el bootstrap en este entorno.

- [MER finales](docs/mer/README.md): Oracle y SQL Server en PDF vectorial, SVG y fuentes editables, con tipos, PK/FK y catálogo de relaciones contrastados con los metadatos.
- [Carga académica](docs/CARGA_ACADEMICA.md): 10 retenciones, 10 solicitudes, 10 liquidaciones y 20 líneas contables, identificadas como ejercicio. SQL parametrizado, una transacción y 50 eventos de auditoría. No representa cálculo fiscal real.
- Pruebas unitarias, compilación, revisión de publicación y npm audit de producción correctos. GitHub Actions repite estas comprobaciones sin credenciales ni acceso a las bases.
- La validación visual y con los perfiles existentes se reserva para la sesión con el usuario. El Excel se considera realizado por confirmación del usuario. Los DDL originales completos y la reproducción en VM aún no se han verificado en esta carpeta; no se declara cumplimiento académico total.

La interfaz ofrece listas buscables de referencias, sugerencias de clasificación, estado Activo/Inactivo e interruptores de permisos con booleanos reales. Cada módulo tiene un botón (i) de información. Driver.js 1.10.2 presenta una bienvenida por usuario/navegador y un recorrido completo que visita únicamente módulos permitidos; siempre se puede omitir, cerrar con Escape o repetir desde la barra superior. No modifica la base ni crea registros de demostración.

## Desarrollo

Ambas bases, la columna de hash y las identidades Oracle quedaron verificadas. Pasaron las pruebas transaccionales y el flujo HTTP integral contra las bases reales. No hay pasos de administrador pendientes para usar este entorno.

Requiere Node.js 24 y acceso a ambas bases.

```powershell
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Completar .env localmente; no versionar credenciales.
npm.cmd run db:inspect
npm.cmd run dev:api
# En otra terminal:
npm.cmd run dev:web
```

La API no inicia con configuración inválida. `/api/health/live` confirma proceso; `/api/health/ready` comprueba ambas bases, acceso a la secuencia y esquema de hash, y responde 503 si falta alguna dependencia. No hay fallback de datos: la UI lee las bases, que incluyen la carga académica expresamente identificada. La evidencia local en docs/evidence se excluye de Git. El frontend local se sirve compilado para evitar restricciones de esbuild en este equipo; después de editarlo, reinicie dev:web.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run db:verify:oracle
npm.cmd run db:verify:core
npm.cmd run db:verify:transactions
npm.cmd run test:integral
```

Las consultas de database/*/validation son de solo lectura. Ejecutar la de Oracle como propietario o con visibilidad suficiente y la de SQL Server con VIEW DEFINITION para obtener evidencia completa. No ejecutar scripts históricos de triggers. Ningún comando de instalación aplica migraciones automáticamente.

El administrador ya está inicializado. Para consultar el primer acceso en su terminal local: `npm.cmd run auth:credential -- --show`. La contraseña no está en `.env`: SQL Server conserva solo Argon2id y `.local/initial-admin.enc.json` conserva el acceso inicial cifrado con AES-256-GCM, usando una clave derivada del secreto de conexión SQL mediante scrypt. `.local/` no se versiona ni se sirve por HTTP. Cambiar la contraseña desde Administración > Usuarios revoca sus sesiones; el archivo inicial no recupera contraseñas posteriores.

`auth:bootstrap` es solo para una instalación con seguridad vacía. Rechaza cuentas existentes y no reemplaza hashes. Los SQL parametrizados están en database/sqlserver/seed. Las pruebas transaccionales crean datos temporales y ejecutan rollback; la prueba integral confirma CRUD por HTTP, retira sus fixtures y conserva sus eventos de auditoría. Las secuencias consumen valores incluso con rollback.

Después de cambiar la contraseña inicial, ejecutar la prueba integral con entrada oculta: `npm.cmd run test:integral -- --prompt`. No guardar contraseñas de aplicación en archivos de texto o variables del proyecto.

## Diagnostico de conexiones actual

Ejecutar `npm.cmd run db:health:oracle`, `npm.cmd run db:health:sqlserver` o `npm.cmd run db:inspect`. Los diagnósticos respetan el modo del `.env`; la API actual usa SQLSERVER_AUTH=sql. Detalles actuales y limitaciones en [la guía](docs/USO.md). Los diagnósticos anteriores se conservan como historial.

Limitaciones: sesiones en memoria (reiniciar la API cierra sesiones), mantenimiento de registros sin automatización contable/tributaria no especificada, y verificación visual en navegador pendiente por restricciones del entorno. El frontend compila y el proxy y flujo HTTP real pasaron; no se declara una prueba visual que no pudo ejecutarse.
