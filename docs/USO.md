# Uso local

## Preparación de bases

Las conexiones del `.env`, la columna PASSWORD_HASH y las diez identities Oracle ya quedaron corregidas y verificadas. El administrador de aplicación ya está creado. No hay scripts de corrección pendientes en este entorno. No sobrescribir `.env` ni copiar secretos a capturas/chats. Los pasos siguientes son para reproducir la preparación en otra instalación, no para volver a realinear este entorno automáticamente.

1. En SQL Server, como administrador de CuentasPorPagarDB, ejecutar `database/sqlserver/schema/010_password_hash.sql` y luego `database/sqlserver/validation/010_password_hash.sql`. Solo agrega PASSWORD_HASH varchar(255) nullable; no cambia PK/FK. El login de aplicación no tiene ALTER y no debe recibirlo.
2. En Oracle, como ADMIN_CU_PROVEEDORES dentro de FREEPDB1, ejecutar `database/oracle/schema/020_sync_identity.sql` durante una ventana sin escrituras. La prueba detectó que CENTRO_COSTO generó 1 pese a que ya existía; seis tablas contienen carga con IDs manuales. El script realinea generadores y conserva valores, PK/FK y modo BY DEFAULT. DDL confirma implícitamente; no reiniciar contadores hacia atrás. Ver notas en `database/oracle/rollback/020_sync_identity.md`.
3. En una instalación con seguridad vacía, ejecutar `npm.cmd run auth:bootstrap`. Inicializa en una única transacción administrador, rol, perfil, 18 menús y permisos por acción. Ejecuta los SQL parametrizados de database/sqlserver/seed, no crea logins de base y rechaza cuentas existentes. SQL Server conserva solo Argon2id. La contraseña inicial aleatoria se conserva cifrada en `.local/initial-admin.enc.json` (AES-256-GCM, clave derivada por scrypt del password de conexión SQL). No se guarda contraseña de aplicación en `.env`.

No hay migraciones automáticas al instalar o iniciar. Las operaciones DML usan el usuario mínimo configurado. La aplicación nunca crea triggers.

## Iniciar

Desde la raíz, en dos terminales:

```powershell
npm.cmd run dev:api
```

```powershell
npm.cmd run dev:web
```

Abrir http://localhost:5173. Para consultar las credenciales iniciales, ejecutar en su terminal local `npm.cmd run auth:credential -- --show`. Requiere una terminal interactiva y no admite redirección a archivo; el agente no ejecuta este comando mostrando secretos. No usar las credenciales de conexión de las bases para el login de aplicación. WEB_ORIGIN debe coincidir exactamente con el origen abierto; localhost y 127.0.0.1 son orígenes diferentes. El servidor valida Origin en todas las mutaciones, incluido login.

Cambiar la contraseña desde Administración > Usuarios después del primer acceso. La sesión se cerrará y deberá entrar con la nueva contraseña. El archivo cifrado conserva solo el acceso inicial: puede retirarlo después de cambiar la contraseña. Si cambia el secreto de conexión SQL, ese archivo ya no se podrá descifrar; no afecta el hash de aplicación ni su contraseña actual.

El frontend se compila y sirve con proxy a la API. Reiniciar dev:web después de modificar la interfaz. La API observa JavaScript compilado: ejecutar compile:api después de editar TypeScript. El puerto de API se toma de API_PORT para ambos procesos. SQL Server usa puerto dinámico, que puede cambiar al reiniciar el servicio; no depende de SQL Browser si se indica SQLSERVER_PORT.

## Flujo

- Acceder con la cuenta de aplicación. Los módulos y botones dependen de permisos por acción.
- Resumen: conteos e importes registrados de los módulos Oracle que el usuario puede consultar, sin datos simulados ni inferir saldos pendientes a partir de estados no especificados.
- Proveedores y demás módulos funcionales: listar, buscar, crear, editar, ver y eliminar. Las PK se generan en Oracle, nunca se calculan en la API. FK inválidas o relaciones que impiden eliminar devuelven conflicto.
- Formularios de referencias: listas por nombre y referencia, con búsqueda de hasta cien coincidencias por consulta y conservación de la selección actual. No es necesario escribir el ID. La cuenta requiere permiso de lectura del módulo de referencia; la base sigue verificando la FK.
- Tipos, bancos, roles funcionales y estados de texto ofrecen sugerencias y valores reales ya registrados. Otro valor permite ampliar la clasificación sin perder datos legados. Son ayudas de interfaz, no enums ni restricciones nuevas de BD.
- Los estados booleanos usan Activo/Inactivo; los permisos usan interruptores Permitido/No permitido. Se envían booleanos JSON reales, incluidos los valores false. Los estados de texto Oracle conservan sus valores y no se convierten en booleanos.
- Auditoría: consulta de historial y snapshots anteriores/posteriores con identificador del usuario de aplicación. Solo lectura, aunque se asignen bits de escritura en SQL Server.
- Administración: usuarios, roles, perfiles, menús y sus relaciones. Para dar acceso: crear usuario con contraseña de al menos 12 caracteres, asignar rol activo, relacionar un perfil activo y conceder acciones por menú. USUARIO_ROL y ROL_PERFIL también deben estar activos. RUTA debe ser la ruta exacta de un módulo conocido, por ejemplo `/proveedores` o `/admin/usuarios`.
- Las tablas USUARIO de Oracle y SQL Server son independientes: la primera contiene responsables funcionales; la segunda autentica. No se supone igualdad entre sus IDs.
- No hay permisos heredados por nombres de rol ni por visibilidad de menú. Cambios de actividad y permisos se consultan en cada petición. Cambiar una contraseña desde administración revoca las sesiones de ese usuario; no se permite eliminar/desactivar la cuenta propia.

## Ayuda y recorridos

El botón (i) del menú y del encabezado explica para qué sirve cada módulo, sus datos y su relación con los demás. Cada explicación es específica: distingue solicitudes de pago de contraseñas de acceso, responsables funcionales de cuentas de login y registros contables de automatizaciones.

En el primer acceso de cada usuario en este navegador se inicia la bienvenida con Driver.js 1.10.2. El recorrido visita el resumen y todos los módulos que la cuenta puede consultar. Tiene Anterior, Siguiente, Omitir recorrido y cierre por Escape. No abre operaciones de guardado ni elimina datos. Recorrido completo permite repetirlo; (i) inicia la explicación del módulo.

Terminar u omitir se recuerda localmente por ID de usuario y versión del recorrido, sin cambiar la BD. Un navegador nuevo volverá a mostrar la bienvenida. Si el navegador bloquea almacenamiento, se conserva la decisión durante la sesión de la página. El recorrido espera a que React renderice el módulo antes de señalar sus controles y se destruye al cerrar sesión.

## Verificar

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run db:health:oracle
npm.cmd run db:health:sqlserver
npm.cmd run db:verify:oracle
npm.cmd run db:verify:core
npm.cmd run db:verify:transactions
npm.cmd run test:integral
```

core verifica CRUD de proveedor y auditoría en Oracle real; induce un fallo SQL real al insertar auditoría y confirma rollback de negocio y log. transactions amplía a diez tablas funcionales y valida FK. Ambos dejan huecos en secuencias; todos sus datos temporales se revierten.

test:integral usa HTTP Fastify con los repositorios y bases reales: administrador Argon2id, protección ante reinicialización, login, rotación de token, logout, límite de intentos, CSRF, permisos por toda la cadena activa, cambios de contraseña, bajas, lecturas de 18 módulos, resumen, CRUD de diez tablas Oracle y siete SQL, FK y auditoría. Retira los registros temporales propios y conserva 30 eventos de auditoría por ejecución. Sin mocks ni fallback de datos. Después de cambiar el acceso inicial: `npm.cmd run test:integral -- --prompt`, que solicita la contraseña sin mostrarla ni guardarla.

La evidencia se guarda en docs/evidence sin credenciales ni filas de negocio. La inspección de cero triggers desde un usuario limitado solo certifica visibilidad; el propietario debe confirmar ausencia global. No se han cambiado triggers existentes.

## Límites de esta entrega

Sesiones en memoria: reiniciar la API cierra sesiones; varios procesos requieren almacén compartido. El prototipo ofrece mantenimiento de registros; no genera asientos ni distribuye pagos automáticamente, ni aplica reglas tributarias no suministradas. Los importes se validan no negativos y con la escala del esquema; subtotal + IVA = total y cantidad × precio = monto cuando están presentes. El 07-11-2026 se agregó una [carga académica autorizada](CARGA_ACADEMICA.md) a cuatro tablas vacías, con referencias existentes, cuentas DEMO y auditoría. No se cambiaron los registros originales. El contexto privado y las evidencias se conservan localmente y no se publican.

El flujo de login real y las pruebas integrales pasaron. También se probó por HTTP de red a través del proxy del frontend: health/live y health/ready 200, login 200, 18 módulos, resumen con once objetos, logout 204 y sesión cerrada 401. La verificación visual automatizada no pudo ejecutarse: el navegador aislado no logra cargar y no hay un runner descargable en este entorno. La compilación y las comprobaciones HTTP no sustituyen esa revisión visual.
