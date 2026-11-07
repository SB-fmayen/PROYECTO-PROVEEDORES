# Revertir 040_security_schema

Con API detenida y desde la sesión administradora, abrir `database/sqlserver/schema/040_security_schema.sql`. Usar primero `@Apply=0, @Reverse=1` para revisar el plan. Luego establecer `@Apply=1, @Reverse=1` y ejecutar el archivo completo. Se trasladan las mismas siete tablas a dbo, conservando IDs, datos, PK/FK y permisos explícitos capturados. Los casos de permisos de columna, dependencias SQL o permisos heredables de schema detienen la operación para revisión particular.

Después configurar `SQLSERVER_SCHEMA=dbo` localmente y reiniciar API/web. Verificar conexión, login y lectura. No ejecutar bootstrap ni volver a inicializar cuentas.

El rollback conserva el schema vacío y su usuario dueño sin login. No borra usuarios, logins ni objetos que puedan haberse agregado después. Una limpieza posterior requiere revisión separada de dependencias y permisos. Ante error SQL, la transacción se revierte completa.
