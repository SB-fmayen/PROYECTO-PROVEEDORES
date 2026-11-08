# Perfiles y cuentas para la demostración

Se crearon cuatro cuentas de aplicación distintas del administrador existente. Cada una tiene un rol y un perfil propios, con estados activos y permisos explícitos. No son logins nuevos de Oracle o SQL Server: la API conserva sus cuentas de conexión y controla las acciones de cada usuario con las tablas de seguridad.

Las contraseñas aleatorias se almacenan solo como Argon2id en SQL Server. Para el uso local autorizado se conserva una copia AES-256-GCM en `.local/profile-accounts.enc.json`, excluida de Git. No incluirlas en este documento, capturas de entrega, seeds SQL o commits. El administrador existente conserva su contraseña y sus permisos. Las credenciales de prueba fueron comunicadas al usuario en el chat a petición expresa.

| Usuario | Rol | Propósito |
| --- | --- | --- |
| consulta_cpp | Consulta CPP (prueba) | Consulta nueve módulos de negocio; no crea, edita o elimina. |
| operador_cpp | Operador CPP (prueba) | Registra proveedores, centros de costo, documentos, detalles, retenciones y solicitudes. Consulta responsables funcionales para seleccionarlos en formularios. |
| tesoreria_cpp | Tesoreria CPP (prueba) | Registra y edita pagos, aplicaciones y asientos; consulta los documentos, proveedores, retenciones y solicitudes necesarios. |
| auditor_cpp | Auditor CPP (prueba) | Consulta las diez tablas funcionales y el historial de auditoría; no modifica nada. |
| admin | Administrador CPP | Cuenta existente; administra los módulos y los permisos. Su contraseña no fue cambiada por esta carga. |

V=ver, C=crear, E=editar, X=eliminar. Un guion significa sin acceso.

| Módulo | Consulta | Operador | Tesorería | Auditor | Administrador |
| --- | --- | --- | --- | --- | --- |
| Proveedores | V | VCE | V | V | VCEX |
| Centros de costo | V | VCE | - | V | VCEX |
| Documentos de compra | V | VCE | V | V | VCEX |
| Detalles de compra | V | VCE | V | V | VCEX |
| Pagos bancarios | V | - | VCE | V | VCEX |
| Retenciones ISR | V | VCE | V | V | VCEX |
| Contraseñas/solicitudes de pago | V | VCE | V | V | VCEX |
| Documentos por liquidar | V | - | VCE | V | VCEX |
| Asientos contables | V | - | VCE | V | VCEX |
| Responsables funcionales Oracle | - | V | - | V | VCEX |
| Auditoría | - | - | - | V | V |
| Siete módulos de seguridad SQL | - | - | - | - | VCEX |

Los permisos restringen módulos y acciones. Dentro de un módulo permitido se consultan sus registros; no se implementa separación de filas por sucursal, empresa o propietario. La tabla USUARIO de Oracle contiene responsables funcionales, no cuentas de login. Solo SQL Server autentica a los usuarios de la aplicación.

## Prueba manual

1. Abrir http://127.0.0.1:5173. Cerrar sesión antes de cambiar de usuario o usar una ventana privada independiente.
2. Entrar con consulta_cpp: deben aparecer nueve módulos y no deben existir botones de crear, editar o eliminar. Administración y Auditoría no están disponibles.
3. Entrar con operador_cpp: deben aparecer siete módulos. En proveedores o documentos sí hay crear/editar; pagos, liquidaciones, asientos y administración quedan fuera. No puede eliminar.
4. Entrar con tesoreria_cpp: deben aparecer ocho módulos. Solo pagos, liquidaciones y asientos permiten crear/editar. Documentos y proveedores son de consulta. No puede eliminar ni administrar seguridad.
5. Entrar con auditor_cpp: deben aparecer once módulos, incluida Auditoría. Todos son de lectura; Administración no aparece.
6. Volver a admin para consultar las nuevas cuentas, roles, perfiles y permisos. No cambiar permisos de la cuenta propia para demostrar restricciones.

Los recorridos de ayuda se muestran según los módulos permitidos y pueden omitirse. La primera visita de cada usuario en el navegador puede abrir su bienvenida.

## Comprobaciones automáticas ejecutadas

`npm.cmd run test:profiles` usa ambos pools reales y rutas HTTP Fastify sin mocks. Para cada cuenta comprueba las 18 rutas de lectura y las 54 combinaciones de crear/editar/eliminar: 72 por cuenta, 288 en total. Las escrituras autorizadas con un cuerpo vacío son rechazadas por validación (400); las no autorizadas se rechazan por permisos (403). Ninguna prueba usa un ID real para los intentos inválidos de eliminación.

También se probaron listado de módulos, resumen, logout y revocación de sesión. El operador creó/editó un proveedor temporal y Tesorería creó/editó un pago relacionado con él; el DELETE de esas cuentas fue rechazado. La auditoría conservó los IDs reales de sus actores de aplicación. Una herramienta de mantenimiento retiró solo esos dos fixtures, comprobando su marca antes de eliminar y auditando el retiro. Quedaron seis eventos de auditoría de prueba. Se verificaron además los cuatro logins por red a través del proxy real y sus menús, cerrando esas sesiones al terminar. Los perfiles y usuarios de prueba sí permanecen para la demostración.

Evidencia detallada sin contraseñas en docs/evidence/profile-accounts.json, fuera de Git. La prueba automática no equivale a afirmar revisión visual de las pantallas en un navegador.

## Reproducción y retiro

`npm.cmd run auth:profiles -- --apply` ejecuta los seeds SQL 060/061 de manera transaccional. Si el archivo cifrado ya existe, comprueba la identidad y permisos existentes sin duplicar ni reemplazar contraseñas. Si ya hay nombres coincidentes sin ese manifiesto, se detiene para revisión. Guarda la recuperación cifrada antes del commit y no imprime secretos. No volver a ejecutar bootstrap.

Para retirar accesos al terminar: ver database/sqlserver/rollback/060_profile_accounts.md. Desactivar los cuatro usuarios desde la cuenta administradora conserva la trazabilidad y revoca sus sesiones. No borrar logins de base de datos ni reutilizar estas contraseñas para otros servicios.
