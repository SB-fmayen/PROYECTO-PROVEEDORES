# Carga académica del 07-11-2026

El usuario autorizó completar las cuatro tablas vacías. Se insertaron 50 registros y 50 eventos INSERT de auditoría en una transacción Oracle: 10 retenciones, 10 solicitudes/contraseñas de pago, 10 aplicaciones parciales y 20 líneas contables. No se modificaron proveedores, documentos, pagos o responsables originales ni la seguridad de aplicación.

## Criterios del ejercicio

Se eligieron hasta diez documentos pendientes con un pago aplicado del mismo proveedor, fecha de pago posterior o igual a la emisión e importe suficiente. No se reutiliza un mismo documento o pago dentro de la carga. Se usa un responsable funcional activo, sin asumir que corresponde a una cuenta de login SQL Server.

Cada retención tiene importe ilustrativo fijo de 25 y constancia ACAD261107-nn. No se infiere tasa, régimen ni obligación fiscal. Las solicitudes llevan estado DEMO-PENDIENTE y fechas del pago seleccionado. Las liquidaciones aplican aproximadamente la mitad del neto después de esa retención; el saldo es el neto restante. Se comprueba que retención + aplicación + saldo = total del documento y que la aplicación no excede el pago. Se conserva el estado original de los documentos y pagos: la herramienta no implementa un cierre automático del ciclo contable.

Por cada aplicación se registran dos líneas con cuentas DEMO-CXP y DEMO-BANCOS, con debe y haber iguales en conjunto. Son ejemplos de pago parcial, no un catálogo contable aprobado ni asientos de reconocimiento completos. El actor de auditoría `academic-seed-2026-11-07` identifica mantenimiento por script; no suplanta una cuenta humana de aplicación.

## Archivos y ejecución

- Los cuatro INSERT con binds y RETURNING están en database/oracle/seed/030 a 033. Los IDs los genera Oracle.
- `npm.cmd run db:seed:academic` muestra el plan sin escribir cuando las tablas aún están vacías.
- `npm.cmd run db:seed:academic -- --apply` confirma la carga. Ya se ejecutó en este entorno; no repetir. Rechaza un manifiesto previo o tablas destino con datos.
- `database/oracle/validation/030_academic_load.sql` comprueba conteos, referencias, balance y auditoría mediante consultas de solo lectura.
- [Rollback](../database/oracle/rollback/030_academic_load.md): requiere el manifiesto local, compara snapshots y elimina únicamente registros propios no modificados, con nueva auditoría transaccional. No eliminar ni publicar el manifiesto para repetir la carga.

La herramienta guarda los IDs y snapshots en `.local/academic-load-2026-11-07.json` antes de confirmar y marca committed después del commit. Ante interrupción o estado prepared, verificar primero el estado real de la base; no reintentar ni fabricar un manifiesto. No se publican IDs, snapshots ni datos originales.

## Alcance académico pendiente

Esta carga completa las tablas vacías. El usuario confirma que el Excel ya fue realizado como tarea anterior y pide omitirlo. Los scripts originales completos y la reproducción en VM aún no se han verificado en esta carpeta.