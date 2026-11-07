# Conexiones e inspeccion real — 2026-11-02

**Registro histórico supersedido por [USO](../USO.md) y [ESTADO](../../ESTADO.md).** Ambas bases conectan, PASSWORD_HASH existe y el administrador de aplicación ya está inicializado con Argon2id. Pasaron pruebas reales de login, permisos, CRUD y auditoría; no hay pasos de corrección pendientes. Los fallos y bloqueos de los párrafos siguientes describen capturas anteriores.

En la captura inicial, el desarrollo de login, migraciones, CRUD y cambios de esquema estaba detenido y el adaptador de auditoría bloqueado, mientras se verificaban esquemas y grants.

## Comandos

La conexión y las correcciones de base ya están verificadas; la API y las pantallas están integradas. Consulte [USO](../USO.md) para los comandos actuales. Se conserva el resto de este documento como evidencia histórica de los problemas ya resueltos.

Actualización 2026-11-03: SQL Server tiene TCP habilitado en puerto dinámico 60636, SQL Browser detenido y registro LoginMode=2. Puerto configurado en `.env` sin cambiar credenciales. La conexión SQL responde `ELOGIN`; Windows por TCP falla con SSPI. Los diagnósticos ahora respetan `SQLSERVER_AUTH` y la conexión del `.env`; el texto Windows fijo de esta captura anterior queda supersedido por [avance de implementación](../architecture/avance-implementacion.md). No hay inspección SQL exitosa.

Oracle: metadatos renovados y consultas reales de once objetos verificadas con `db:verify:oracle`. Secuencia `SEQ_LOG_AUDITORIA_ODC` no visible para CRUD_PROVEEDORES; las escrituras siguen bloqueadas. Evidencia del propietario: `database/oracle/validation/002_audit_owner.sql` (solo lectura).

Desde la raiz del proyecto:

```powershell
npm.cmd run db:health:oracle
npm.cmd run db:health:sqlserver
npm.cmd run db:inspect:oracle
npm.cmd run db:inspect:sqlserver
npm.cmd run db:inspect
```

Los diagnosticos son independientes. Oracle carga .env; SQL Server usa la identidad Windows del proceso contra localhost\SQLEXPRESS, base CuentasPorPagarDB, sin usuario ni password SQL. No se cambia ExecutionPolicy. Los scripts devuelven codigo de salida distinto de cero ante fallos. No se imprimen excepciones completas, cadenas de conexion ni passwords. Los JSON de docs/evidence contienen fecha de captura y metadatos; estan excluidos del control de versiones. Un archivo anterior no prueba que la ultima ejecucion funciono: revisar fecha y codigo de salida.

.env contiene la configuracion Oracle suministrada y esta ignorado. El espacio despues de = sin comillas es separador para dotenv, no parte del password. .env.example mantiene el password vacio. No copiar .env a documentacion ni registros.

## Oracle: verificado

Conexion localhost:1521/FREEPDB1 exitosa mediante node-oracledb. SELECT USER FROM DUAL devolvio CRUD_PROVEEDORES y SYS_CONTEXT('USERENV','CON_NAME') devolvio FREEPDB1.

Tablas visibles de ADMIN_CU_PROVEEDORES (11): ASIENTO_CONTABLE, CENTRO_COSTO, CONTRASENA_PAGO, DETALLE_DOCUMENTO_COMPRA, DOCUMENTO_COMPRA, DOCUMENTO_POR_LIQUIDAR, LOG_AUDITORIA_ODC, PAGO_BANCARIO, PROVEEDOR, RETENCION_ISR, USUARIO.

USER_TRIGGERS = 0 para CRUD_PROVEEDORES. ALL_TRIGGERS = 0 visibles para ADMIN_CU_PROVEEDORES. Este segundo resultado no certifica ausencia global en el propietario; requiere visibilidad completa o consulta como propietario. No se han solicitado ni modificado privilegios.

Se capturaron columnas, restricciones, columnas de restricciones y grants visibles en docs/evidence/oracle.json. ALL_SEQUENCES no devolvio secuencias visibles: no afirmar que no existen ni usar una secuencia supuesta. No se ejecuta NEXTVAL, DML ni DDL.

## SQL Server: pendiente de conexion Windows

sqlcmd con -E -C fallo durante negociacion de conexion/cifrado. System.Data.SqlClient con seguridad integrada y cifrado desactivado exclusivamente para este diagnostico local fallo con codigo SQL 0. Un intento por protocolo local lpc devolvio: 'El nombre principal no es correcto. No se puede generar contexto SSPI.' No se cambiaron servicios, protocolos, certificados, SPN ni configuracion de autenticacion.

Ejecutar los comandos desde una terminal Windows bajo la identidad administrativa que ya funciona en SSMS. Si persiste SSPI, comprobar esa identidad y la conexion Windows en SSMS antes de cambiar configuracion del servidor. El fallo no demuestra Windows-only ni Mixed Mode. No hay evidencia para confirmar columnas de SQL Server USUARIO ni almacenamiento de hash.

La inspeccion preparada consulta SERVERPROPERTY('IsIntegratedSecurityOnly'): 1 = Windows only; 0 = Mixed Mode; NULL = desconocido. Inspecciona las siete tablas solicitadas, tipos, longitudes, nulabilidad, identity, defaults, columnas calculadas, PK/UK, FK con columnas y acciones, indices con columnas incluidas y filtros, checks, roles, membresias, permisos explicitos y efectivos del ejecutor y triggers de base/servidor. No consulta filas ni valores de password. VIEW DEFINITION y visibilidad de servidor condicionan la integridad de la evidencia; los permisos fijos de roles no se enumeran como grants explicitos.

El pool SQL de la API no intenta autenticacion SQL de forma implicita: con SQLSERVER_AUTH=windows indica que debe utilizarse el diagnostico. La API definitiva sigue pendiente; estos comandos de salud no afirman que su pool Windows este implementado.

## Puerta de avance

Falta obtener evidencia SQL Server y verificar su alcance. Hasta entonces el diagnostico es parcial y no autoriza migraciones, login ni CRUD. El diagnostico inicial se conserva como registro historico y queda supersedido por este documento para conectividad y estructura verificada.
