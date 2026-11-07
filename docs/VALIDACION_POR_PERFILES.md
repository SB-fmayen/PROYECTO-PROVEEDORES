# Validar el proyecto con los perfiles existentes

## Qué usuario y perfil usa cada parte

Los roles Oracle/SQL Server son permisos de las cuentas de conexión de la API. Los roles y perfiles de las tablas de seguridad SQL Server controlan lo que puede hacer cada persona en la aplicación. Los responsables de la tabla USUARIO de Oracle son datos funcionales y no sirven para iniciar sesión. No asumir que comparten IDs con las cuentas SQL.

La aplicación autoriza mediante USUARIO -> USUARIO_ROL -> ROL -> ROL_PERFIL -> PERFIL -> PERFIL_MENU -> MENU. Todos los estados deben estar activos. PUEDE_VER, PUEDE_CREAR, PUEDE_EDITAR y PUEDE_ELIMINAR conceden cada acción por separado. Si una cuenta tiene varios roles/perfiles activos, se combinan los permisos concedidos: un perfil de consulta no cancela permisos CRUD concedidos por otro perfil.

Ejecutar localmente `database/sqlserver/validation/030_app_permissions.sql` para identificar la cadena y sus estados. No pide ni muestra contraseñas o hashes. No subir el resultado con cuentas reales a GitHub. Los nombres de perfiles no otorgan permisos por sí mismos.

## Iniciar y comprobar dependencias

En dos terminales de la raíz: `npm.cmd run dev:api` y `npm.cmd run dev:web`. Abrir http://localhost:5173 y usar la contraseña vigente de aplicación. No usar contraseñas de conexión ni el archivo del primer acceso si ya cambió la contraseña. No ejecutar bootstrap otra vez.

`npm.cmd run db:inspect` y `npm.cmd run db:verify:oracle` comprueban conexión y lecturas. `npm.cmd test` y `npm.cmd run build` verifican el código sin introducir datos en las bases.

## Matriz manual

| Cuenta o condición | Operación | Resultado esperado |
| --- | --- | --- |
| Sin sesión | Abrir módulo o consultar /api/proveedores | Login requerido; API 401 |
| Perfil con PUEDE_VER=1 y otras acciones=0 | Listar, buscar, paginar y abrir detalle | Permitido en los módulos asignados |
| Ese mismo perfil de consulta | Crear, editar o eliminar | Botones ausentes y API 403 |
| Perfil con cada acción concedida | Crear un registro propio, editarlo y retirarlo | Permitido; FK y validaciones siguen aplicando |
| Sin permiso de un módulo | Navegar directamente a su ruta/API | Sin acceso, aunque se escriba la URL |
| Varios perfiles | Comparar permisos efectivos de /api/auth/me | Unión de concesiones activas |
| Usuario/rol/perfil/relación/menú inactivo | Intentar la operación con sesión abierta | Acceso revocado en la siguiente solicitud; no depende de refrescar los botones |
| Auditoría | Consultar historial y detalle | Lectura permitida con permiso; crear/editar/eliminar siempre rechazado |
| Logout | Volver a consultar API | 401 |

Usar ventanas privadas separadas para dos cuentas. No cambiar permisos de la cuenta administradora propia ni su contraseña durante esta comprobación. Para probar bajas, usar una cuenta de prueba y restaurar su configuración desde otra cuenta administradora. No cambiar ni eliminar registros originales para una demostración.

## Comprobar el rechazo en la API

Con la sesión de consulta abierta, ejecutar en la consola del navegador del proyecto:

```javascript
fetch('/api/proveedores', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
}).then(async r => console.log(r.status, await r.json()));
```

Debe devolver 403 por falta de permiso antes de validar el cuerpo. El cuerpo vacío no crea filas, incluso si se ejecuta por error con una cuenta administradora: esa cuenta recibirá 400. No copiar cookies ni tokens a capturas o comandos externos. En una ventana sin sesión, consultar `/api/proveedores` debe devolver 401.

## Comprobar integridad y auditoría

Crear únicamente un proveedor de prueba identificado, editar su razón social y retirarlo sin documentos relacionados. Buscar sus tres eventos INSERT/UPDATE/DELETE en Auditoría: mismo ID, usuario de aplicación y snapshots antes/después. Una FK inválida debe rechazar la operación. Un registro con dependencias no debe poder eliminarse.

`npm.cmd run db:verify:transactions` ejecuta escrituras temporales y rollback real de negocio y auditoría, incluso ante fallo de auditoría. Consume valores de secuencias. `npm.cmd run test:integral -- --prompt` requiere la contraseña vigente por entrada oculta y prueba HTTP con bases reales; retira sus fixtures y conserva eventos de auditoría. Estas pruebas no sustituyen la demostración con tus perfiles existentes.

## Revisión visual pendiente para la sesión con el usuario

Comprobar login/logout, las 18 pantallas según permisos, búsquedas y paginación, referencias por nombre, formularios, estados apagados, mensajes de error, foco y Escape en modales, bienvenida y recorrido repetible, y navegación móvil. Los MER finales sí fueron renderizados y revisados; la interfaz no se certifica visualmente en esta entrega. Esta validación se reserva para la siguiente sesión, conforme a lo solicitado.

## Aclaración del schema SQL Server

Un schema es un contenedor dentro de la base: `dbo.USUARIO` significa tabla USUARIO dentro de dbo. Un perfil es un conjunto de permisos de la aplicación: son conceptos distintos. Las tablas actuales usan dbo y la aplicación funciona con ese diseño. El PDF pide crear un schema y un usuario dueño para el módulo. Falta acreditar ese paso con scripts/evidencia del administrador o confirmar que el docente acepta dbo. No se movieron tablas, se crearon usuarios o se alteraron grants; hacerlo sin revisar los scripts originales podría afectar el código y los permisos existentes.
