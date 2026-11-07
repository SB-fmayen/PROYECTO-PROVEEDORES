# Schema y usuario dueño de seguridad

## Estado real

La cuenta de conexión de la aplicación no tiene CREATE SCHEMA, ALTER ANY USER, CONTROL sobre dbo, db_owner ni sysadmin. La conexión administrativa integrada de Windows no estuvo disponible desde el entorno del agente. La migración **está preparada, pero no se ha aplicado**. Las siete tablas siguen en dbo, las cuentas y perfiles siguen intactos, y la aplicación conserva dbo como valor predeterminado.

El PDF, actividad 2 de la primera página, pide un schema que contenga las tablas del módulo de seguridad y un usuario dueño/administrador. Se propone SEGURIDAD_PROVEEDORES con propietario ADMIN_SEGURIDAD_PROVEEDORES. APP_PROVEEDORES conserva su función CRUD y sus roles existentes. El dueño propuesto es un usuario de base WITHOUT LOGIN: puede ser propietario y administrador de su schema mediante contexto de ejecución, sin introducir una nueva contraseña o acceso de red. No es una cuenta para iniciar sesión en SSMS ni en la aplicación. Si el docente exige además un acceso interactivo independiente, se debe asociar a un login administrativo aprobado en un paso separado; esta migración no crea ni cambia logins.

## Aplicar desde SSMS

1. Detener API/web y realizar una copia de seguridad desde la sesión administradora que ya utilizas en SSMS.
2. Abrir `database/sqlserver/schema/040_security_schema.sql` completo en esa sesión. Verificar que la base sea CuentasPorPagarDB. Con `@Apply=0, @Reverse=0` solo muestra el plan: siete tablas de dbo a SEGURIDAD_PROVEEDORES.
3. Cambiar únicamente `@Apply=1` y ejecutar el archivo completo. Requiere sysadmin o db_owner, sin dar esos privilegios al login de la aplicación. No ejecutar instrucciones sueltas ni cambiar usuarios/credenciales.
4. El resultado debe ser CONFIRMADO. Ante cualquier error, el script revierte su transacción. No continuar con el cambio de configuración hasta confirmar el resultado.
5. Ejecutar `database/sqlserver/validation/040_security_schema.sql` como administrador. Deben verse el schema y su dueño, siete tablas con el mismo propietario efectivo, siete PK, seis FK y cero triggers. La prueba EXECUTE AS del dueño debe devolver controla_schema=1 y volver al contexto original con REVERT. Los permisos y membresías previos deben conservarse.
6. Solo después, añadir o cambiar `SQLSERVER_SCHEMA=SEGURIDAD_PROVEEDORES` en el `.env` local. No cambiar otras variables ni publicar el archivo. Reiniciar la API y el frontend.
7. Ejecutar `npm.cmd run db:inspect` y `npm.cmd run db:verify:oracle`; comprobar login, `/api/health/ready`, lectura y administración de los módulos con las cuentas existentes. Para el flujo integral con contraseña vigente: `npm.cmd run test:integral -- --prompt`. No ejecutar bootstrap de nuevo.
8. Renovar los MER después de capturar los nuevos metadatos según docs/mer/README.md. Los PDF actuales representan correctamente dbo y no se alteran para fingir una migración aún no aplicada.

## Qué conserva y cómo se protege

El script usa ALTER SCHEMA TRANSFER sobre las tablas existentes: no crea copias ni altera PK/FK, identidades, campos o datos. Bloquea las tablas durante la transacción, captura permisos explícitos y los restaura porque SQL Server los elimina al trasladar un objeto. Comprueba los mismos object_id, conteos, claves y permisos antes de confirmar. No concede CONTROL al usuario de la API, no cambia las asignaciones de roles y no añade triggers.

Los casos complejos se detienen: permisos de columna, delegaciones con grantor distinto de dbo, permisos explícitos heredables del schema origen, propietarios explícitos de tablas, triggers, dependencias SQL registradas u objetos de destino existentes. Así no se inventan reglas para una instalación distinta. La implementación no usa sinónimos, vistas de compatibilidad ni tablas duplicadas.

La API, sus comprobaciones de hash, CRUD, bootstrap e integral aceptan únicamente dbo o SEGURIDAD_PROVEEDORES mediante configuración validada. Los valores de usuarios siguen siendo parámetros; el schema no se toma de peticiones HTTP. Las migraciones antiguas de PASSWORD_HASH se aplican antes de este traslado, en dbo, y no se vuelven a ejecutar después. Para consultar perfiles después del traslado, actualizar el prefijo del script 030_app_permissions.sql o usar su detección de schema.

## Reversión y evidencia

Ver `database/sqlserver/rollback/040_security_schema.md`. El mismo script con @Reverse=1 traslada de vuelta las tablas y conserva el schema vacío y el usuario sin login. Luego configurar SQLSERVER_SCHEMA=dbo. No se borran cuentas, contraseñas o estructuras ajenas.

Hasta tener la ejecución y validación de SSMS, el requisito permanece pendiente. Preparar scripts y pasar pruebas de código no equivale a aplicar DDL con una sesión administradora.

Referencias oficiales: [ALTER SCHEMA y permisos al trasladar](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-schema-transact-sql?view=sql-server-ver17), [usuarios WITHOUT LOGIN](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql?view=sql-server-ver17).
