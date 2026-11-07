# Estado verificado — 2026-11-07

## Actualización de entrega

- Schema SQL: migración 040 preparada para SEGURIDAD_PROVEEDORES con dueño ADMIN_SEGURIDAD_PROVEEDORES sin login. Incluye vista previa, transacción, conservación de permisos, validación y reversión. La API admite dbo o el schema nuevo por configuración fija. No aplicada: la cuenta CRUD carece de permisos DDL y la sesión integrada Windows no conecta desde este entorno. Ejecutar desde SSMS como administrador según docs/SQLSERVER_SCHEMA.md; no elevar la cuenta de la API. Los MER actuales siguen representando dbo.

- Carga académica autorizada confirmada: RETENCION_ISR 10, CONTRASENA_PAGO 10, DOCUMENTO_POR_LIQUIDAR 10 y ASIENTO_CONTABLE 20. Los 50 registros tienen auditoría de INSERT en la misma transacción. Documentos y pagos del mismo proveedor; asientos DEMO balanceados. Manifiesto y snapshots solo en .local, fuera de Git. Sin cambios en tablas originales, PK/FK, usuarios o permisos.
- SQL de inserción y validación en database/oracle; herramienta db:seed:academic con vista previa, rechazo de recarga y rollback limitado a filas propias no modificadas. Detalles en docs/CARGA_ACADEMICA.md.
- MER finales generados y revisados visualmente en PDF/SVG: 11 tablas y 11 FK Oracle; 7 tablas y 6 FK SQL Server. Fuentes DOT/Mermaid y catálogo de estructura incluidos en docs/mer/final.
- Validación de hoy: 24 pruebas aprobadas, build correcto, conexiones e inspecciones correctas, once módulos Oracle consultados y secuencia accesible, escáner de publicación aprobado, npm audit de producción con cero vulnerabilidades reportadas.
- Guía docs/VALIDACION_POR_PERFILES.md preparada. La prueba visual de la UI y la demostración con los perfiles existentes quedan para la siguiente sesión solicitada por el usuario. Las pruebas integrales históricas del 04-11 no se presentan como repetidas hoy.
- El esquema SQL actual es dbo. Sigue pendiente acreditar el schema y dueño solicitados por el PDF; no se movieron tablas ni se cambiaron grants.
- Siguen pendientes los DDL originales completos, Excel con INSERT dinámicos, reproducción en VM y evidencia de Canvas. La carga nueva no sustituye esos entregables.

## Historial del 04-11-2026

Prototipo local funcional con bases reales. Se completaron las prioridades de login, sesiones, permisos, CRUD y auditoría. No hay pasos de corrección de base de datos pendientes en este entorno.

## Terminado
- Oracle y SQL Server conectan con la configuración local; PASSWORD_HASH varchar(255) verificado. Diez identities Oracle realineadas por el propietario y probadas con escrituras reales.
- Administrador de aplicación inicializado con Argon2id, rol/perfil activos y permisos por acción para 18 módulos. No se crearon logins de BD ni se modificaron cuentas previas.
- Sin password de administrador en texto plano en .env. Acceso inicial aleatorio cifrado en .local/initial-admin.enc.json con AES-256-GCM; clave derivada con scrypt del secreto de conexión SQL. SQL Server conserva solo hash. .local/ está excluido del control de versiones y no se sirve por HTTP.
- Login, cookie HttpOnly/SameSite, sesión opaca de 30 minutos por defecto, rotación de token, logout, expiración y revocación por cambio de contraseña o baja.
- Cadena real USUARIO -> USUARIO_ROL -> ROL -> ROL_PERFIL -> PERFIL -> PERFIL_MENU -> MENU. Todos los estados y acciones se consultan en cada petición; denegación por defecto y sin joins entre bases.
- CRUD real de diez tablas funcionales Oracle; auditoría exclusivamente de lectura. Diez IDs generados por la BD; FK y reglas de entrada validadas.
- Administración de siete tablas SQL, incluidas relaciones con claves compuestas y permisos por acción. Hashes/contraseñas fuera de respuestas y logs.
- Auditoría explícita en la misma conexión/transacción Oracle. Antes/después, actor de aplicación y usuario de BD. Fallo de auditoría revierte negocio y log.
- Frontend: login, resumen con datos reales, menús por permisos, 18 módulos, búsqueda, paginación, formularios, referencias, detalle de auditoría y logout móvil. Modales con teclado/foco. Edición parcial conserva campos sin cambios.
- MER Oracle/SQL Server, migraciones/validaciones/rollback y SQL parametrizados de inicialización preservados. README y docs/USO.md actualizados.

## Pruebas que pasaron
- npm.cmd test: 24 pruebas, 0 fallos.
- npm.cmd run build: TypeScript y frontend correctos.
- db:inspect y health checks: ambas conexiones correctas; cero triggers visibles. El usuario confirmó ausencia global como propietario.
- db:verify:oracle: once consultas y secuencia correctas.
- db:verify:transactions: diez tablas, FK real, auditoría y rollback completo ante fallo SQL real de auditoría. Datos temporales revertidos.
- test:integral: 15 grupos de comprobación HTTP con pools reales, sin mocks. CRUD de diez tablas Oracle y siete SQL; permisos, sesiones, CSRF, límite de intentos y auditoría. Fixtures retirados. Dos ejecuciones confirmadas conservan 60 eventos de prueba en auditoría.
- Red real a través del proxy: live 200, ready 200, login 200, 18 módulos, resumen con once objetos, logout 204 y sesión posterior 401.
- Evidencia sin secretos en docs/evidence; informe en docs/PRUEBAS.md.

## Experiencia de usuario actualizada
- Driver.js 1.10.2 instalado por el usuario y empaquetado localmente, con sus estilos oficiales.
- Cada módulo y el resumen tienen botón (i) en navegación y encabezado, con explicación específica de función, campos y flujo según el esquema real.
- Bienvenida automática la primera vez por usuario/navegador. Recorrido completo visita solo módulos permitidos, espera render de React y ofrece Anterior, Siguiente, Omitir y Escape. Puede repetirse desde la barra superior.
- Terminar u omitir se recuerda en localStorage por usuario y versión; si no hay almacenamiento se conserva en memoria de la página. Sin columnas ni escrituras de BD.
- Referencias en listas buscables por nombre y código, conservando selección actual. Estado booleano Activo/Inactivo y permisos con interruptores Permitido/No permitido; se envían true/false reales.
- Tipos, estados de texto, bancos, rol funcional y cuentas contables usan listas con sugerencias/valores reales y Otro valor. Rutas de menú se eligen por módulo y período usa selector de mes cuando corresponde.
- Endpoint GET /api/form-options consulta categorías del módulo solo con permiso de lectura; nombres de tablas/columnas provienen del catálogo verificado. Se comprobaron consultas reales en diez módulos Oracle.
- El usuario ya confirmó el acceso y el cambio de contraseña inicial. Para nuevas entradas usar su contraseña actual; no volver a usar el acceso inicial ni ejecutar bootstrap.
- Estas mejoras no modifican datos, tipos, PK/FK ni triggers. Las comprobaciones nuevas cubren serialización, controles renderizados, ayuda, planes de recorrido y omisión por usuario; no equivalen a una prueba visual en navegador.

## Cómo levantar
Desde la raíz, dos terminales: npm.cmd run dev:api y npm.cmd run dev:web. Frontend http://localhost:5173; API http://127.0.0.1:3001. WEB_ORIGIN debe coincidir exactamente con la URL del navegador.
Consultar acceso inicial en una terminal local: npm.cmd run auth:credential -- --show. No ejecutar mostrando secretos en el chat. Cambiar password desde Administración > Usuarios; esto cierra las sesiones. No volver a ejecutar auth:bootstrap: rechaza usuarios existentes.
Después de cambiar el password inicial, repetir integral con entrada oculta: npm.cmd run test:integral -- --prompt.

## Límites y pendientes explícitos
- Revisión visual/DOM en navegador del usuario pendiente: el navegador automatizado aislado no logra cargar en este entorno. No se afirma validación visual; sí compilación y funcionamiento HTTP real.
- Sesiones en memoria: reiniciar cierra sesiones; múltiples procesos requieren almacén compartido (no incluido en el prototipo).
- Mantenimiento de registros; no genera asientos, reparte pagos ni aplica normativa tributaria automáticamente sin requisitos adicionales. Los originales de carga masiva/XLSX no fueron proporcionados; no se inventó una carga de negocio.
- SQL Server usa puerto dinámico; verificar SQLSERVER_PORT si cambia al reiniciar el servicio.

No se crearon ni habilitaron triggers. No se modificaron PK/FK, IDs existentes, tipos existentes ni credenciales de conexión. Sin datos simulados en funcionalidad final. Los cambios temporales de integración se retiraron; la cuenta inicial y su configuración son datos reales persistentes.
