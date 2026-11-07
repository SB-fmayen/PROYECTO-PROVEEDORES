# Verificación de la entrega

## Actualización 2026-11-07

Cierre posterior del traslado real: el usuario confirmó simulación v2 y aplicación 040 en SSMS. Se verificaron 7 tablas con el schema y dueño nuevos, 7 PK, 6 FK, 35 grants de roles, conteos de seguridad conservados, 69 permisos efectivos del administrador y lecturas reales de los siete módulos sin hashes. La API se configuró localmente para el schema nuevo y las pruebas de código siguen pasando (26). El MER SQL se regeneró y revisó en sus dos páginas. No se afirma prueba de login con la contraseña vigente ni validación visual de UI: quedan para el usuario y sus perfiles.

Comprobación HTTP posterior desde http://127.0.0.1:5173: frontend 200 HTML, ready 200 JSON, modules/me sin sesión 401 JSON y logout sin sesión 204 con el origen permitido. El origen localhost diferente recibió 403. Se eligió 127.0.0.1 porque localhost:5173 estaba resolviendo otra aplicación por IPv6. No se detuvieron procesos de otros proyectos ni se utilizaron contraseñas de usuarios para esta comprobación.

Preparación posterior de schema SQL: 26 pruebas aprobadas (incluyen restricción del identificador y paginación parametrizada en el schema nuevo), build y escáner correctos. Contra SQL Server real se comprobaron el hash-schema, permisos efectivos y lecturas de los siete módulos con dbo. La vista previa de 040 devolvió las siete tablas sin modificaciones; PARSEONLY aceptó los tres scripts SQL nuevos/actualizados. Esto no prueba la ejecución de ALTER SCHEMA: falta la sesión administradora. La prueba previa detectó y corrigió una incompatibilidad de collation en la comparación EXCEPT; no se cambió la collation de la base.

24 pruebas aprobadas y build correcto. npm audit de producción reportó cero vulnerabilidades; security:scan aprobó la lista de publicación sin coincidencias de secretos locales o patrones de credenciales. No se repitió la prueba HTTP integral: la evidencia del 04-11 se conserva como histórica.

La carga académica confirmada tiene 50 filas y 50 eventos de auditoría. Una segunda conexión verificó los 50 snapshots persistidos, cero discrepancias de proveedor entre documento y pago, cero diferencias entre retención + aplicación + saldo y total, y balance debe/haber por documento/pago. Se confirmó el rechazo de una recarga por manifiesto existente (salida 1 esperada, sin nuevas escrituras). Los detalles y el manifiesto permanecen en .local; el repositorio solo contiene resúmenes y metadatos de estructura.

Los PDF finales de ambos MER se renderizaron y revisaron en sus cuatro páginas. La revisión visual de la aplicación y la demostración con perfiles existentes quedan para la sesión posterior solicitada por el usuario; no se confunden con la revisión de diagramas.

Pruebas realizadas contra Oracle FREEPDB1 y SQL Server CuentasPorPagarDB configurados localmente. No se crean triggers ni se modifican PK/FK. Los secretos y hashes no se incluyen en este informe.

| Comprobación | Resultado |
| --- | --- |
| npm.cmd test | 24 pruebas correctas, 0 fallos |
| npm.cmd run build | TypeScript y frontend compilados |
| db:inspect | Metadatos reales de ambas bases capturados sin errores |
| db:verify:oracle | Once consultas reales y acceso a secuencia correctos |
| db:verify:transactions | Creación temporal de diez tablas funcionales, FK, auditoría y rollback correctos |
| test:integral | 15 grupos de comprobaciones HTTP con repositorios y bases reales, sin mocks |
| Proxy/frontend por HTTP de red | live 200, ready 200, login 200, módulos 200 (18), resumen 200 (11), logout 204, sesión cerrada 401 |

## Prueba integral

- Administrador existente con hash Argon2id y contraseña inicial local cifrada, no en texto plano.
- El seed rechaza reinicializar una seguridad con usuarios; las cuentas se conservan.
- Login real, cookie HttpOnly/SameSite, token fuera del JSON y rotación de sesión.
- Mensaje común para password incorrecto y usuario inexistente.
- Lecturas de los 18 módulos sin exponer PASSWORD_HASH; resumen con datos Oracle reales.
- Protección ante desactivación propia.
- Un usuario de consulta puede leer y no puede escribir ni administrar.
- Cambios de actividad en rol, perfil, menú, usuario-rol y rol-perfil eliminan permisos inmediatamente. PUEDE_VER se verifica por acción.
- Cambiar contraseña revoca sesiones; la contraseña anterior deja de funcionar. Desactivar usuario revoca acceso.
- Create/read/update/delete de las diez tablas Oracle con IDs generados por la base y referencias reales entre fixtures.
- Las FK rechazan referencias inexistentes y eliminación de registros relacionados; no se aceptan IDs manuales.
- Treinta eventos de auditoría por ejecución confirmada, con las operaciones INSERT/UPDATE/DELETE y usuario real de aplicación.
- Create/read/update/delete de las siete tablas SQL, incluidas las claves compuestas de relaciones.
- Rechazo de Origin ajeno; límite de cinco intentos de login por minuto y cliente; logout revocado en servidor.

Los fixtures de negocio y seguridad se retiran en orden de dependencias. Solo se borran registros creados por la prueba. La auditoría se conserva: dos ejecuciones integrales dejaron 60 eventos de prueba. La evidencia de cada ejecución se guarda en docs/evidence/integral.json (la última reemplaza el informe anterior).

La prueba transaccional independiente fuerza un ORA-12899 real en el INSERT de auditoría y verifica que ni el proveedor ni su auditoría quedan persistidos tras rollback. No depende de un mock. Las secuencias/identities consumen valores incluso si se revierte la transacción.

## Alcance y límites

Actualización de experiencia de usuario 2026-11-04: siete pruebas nuevas comprueban serialización de false, interruptores apagados, conservación de valores legados y fechas, controles accesibles renderizados, etiquetas por nombre para referencias, ayuda específica de 19 pantallas, recorridos limitados a permisos y bienvenida recordada por usuario. El endpoint de opciones rechaza cuentas sin sesión o sin permiso. Las consultas de opciones se comprobaron contra las diez tablas Oracle, exclusivamente en lectura. Estos controles no equivalen a probar visualmente el recorrido en un navegador.

La prueba HTTP integral usa Fastify.inject con pools reales, y se complementó con peticiones de red al proxy local. Las pruebas unitarias sí usan dobles en casos aislados; no suministran datos a la funcionalidad final.

No se certifica verificación visual/DOM en navegador. El navegador aislado de este entorno no logra cargar y no se pudo instalar un runner por restricciones de red. El frontend compila y sirve sus recursos; queda una revisión manual de presentación/interacción en navegador del usuario.

Los metadatos consultados muestran cero triggers visibles. El usuario confirmó como propietario cero triggers en ambas bases; el agente no creó ni alteró ninguno. La ausencia global no se infiere solo de visibilidad limitada.

Para repetir las pruebas: consultar docs/USO.md. Después de cambiar la contraseña inicial usar test:integral -- --prompt para introducir la nueva contraseña sin eco ni almacenamiento.
