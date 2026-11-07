# Revisión del proyecto contra el PDF - 2026-11-07

## Actualización posterior a la revisión inicial

El usuario autorizó llenar las cuatro tablas vacías y preparar los MER finales. Se completaron 10 retenciones, 10 solicitudes, 10 liquidaciones y 20 líneas contables, con 50 eventos de auditoría en la misma transacción. Se verificaron snapshots persistidos, proveedor de documento/pago, conciliación de importes, balance por documento/pago y rechazo de recarga. Son datos académicos identificados; no operaciones fiscales reales.

Los MER finales están en docs/mer/final en PDF vectorial, SVG, DOT, Mermaid y catálogo de estructura. Las cuatro páginas de PDF fueron renderizadas y revisadas. La guía docs/VALIDACION_POR_PERFILES.md prepara la revisión de UI y perfiles para la siguiente sesión solicitada por el usuario.

Pasaron 24 pruebas, build, escáner de publicación y npm audit de producción (cero vulnerabilidades reportadas). Los pendientes documentales siguen siendo Excel de INSERT dinámicos, DDL originales completos, reproducción en VM, acreditación de schema/dueño SQL y evidencia de Canvas. El diagnóstico siguiente se conserva como fotografía anterior a estas correcciones; sus conteos de cero ya no describen el estado actual.

## Dictamen

El prototipo está implementado y las comprobaciones actuales pasan, pero la entrega académica todavía no puede declararse completa. Faltan archivos obligatorios de reproducción y carga masiva, hay cuatro tablas funcionales vacías y quedan evidencias de administración y diagramas por cerrar.

Fuente de requisitos: `PROYECTO DE BASE DE DATOS I.pdf`, tres páginas completas revisadas por extracción y renderizado. El PDF indica entrega final el 07-11-2026; también advierte que las fechas pueden cambiar. No se verificó Canvas ni una eventual modificación del calendario.

## Dónde se quedó

El último estado documentado es del 04-11-2026. Se terminaron autenticación, sesiones, permisos por acción, CRUD de diez tablas Oracle y siete tablas SQL Server, consulta de auditoría y frontend con 18 módulos. El último trabajo incorporó ayudas por módulo, recorridos con Driver.js, referencias buscables y controles de estados y permisos.

La revisión visual del frontend sigue pendiente. La aplicación es un mantenimiento de registros: no se debe asumir generación automática de asientos o aplicación automática de pagos. El PDF no exige expresamente esas automatizaciones ni exige triggers.

## Comprobaciones ejecutadas hoy

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd test` | 24 pruebas aprobadas, cero fallos |
| `npm.cmd run build` | TypeScript y compilación de frontend correctos |
| `npm.cmd run db:inspect` | Conexión e inspección de Oracle y SQL Server correctas |
| `node .build/scripts/verify-oracle.js` | Once módulos consultados correctamente y secuencia de auditoría accesible |
| Consultas adicionales de solo lectura | Versiones, tablespaces, índices, usuarios, roles, grants y cantidades verificadas |

No se repitió la prueba integral con escrituras ni la prueba transaccional. La evidencia integral anterior, del 04-11-2026, registra 15 grupos aprobados contra bases reales y retirada de fixtures; no equivale a una nueva ejecución de hoy. No se consultaron contraseñas ni se cambiaron cuentas, datos de negocio, permisos o estructuras.

## Comparación con los requisitos

| Requisito del PDF | Estado | Evidencia y límite |
| --- | --- | --- |
| Negocio en Oracle 26ai | Confirmado | El servidor informa Oracle AI Database 26ai Free 23.26.2.0.0; diez tablas funcionales y una de auditoría. El PDF usa la denominación Express/XE. |
| Seguridad en SQL Server 2025 Express | Confirmado en estructura | Express Edition, versión 17.0.1000.7; siete tablas de usuarios, roles, perfiles, menús y relaciones. |
| Actividad 1: tres tablespaces y tres usuarios Oracle | Confirmado en objetos consultados | Usuarios ADMIN_CU_PROVEEDORES, CRUD_PROVEEDORES y CONSULTA_PROVEEDORES. Tablas funcionales en TS_PROVEEDORES_DATA, auditoría en TS_PROVEEDORES_AUD, 22 índices VALID en TS_PROVEEDORES_IDX. Scripts originales ausentes. |
| Actividad 2: schema, dueño, usuario CRUD y dos roles por motor | Parcial | Oracle tiene ambos roles activos en la sesión CRUD. SQL tiene ambos roles asignados a APP_PROVEEDORES. Las siete tablas SQL usan dbo, propiedad de dbo; no queda acreditado un schema y dueño específicos del módulo. La visibilidad de la cuenta SQL no permite certificar que no existan otros usuarios. |
| Actividades 3 y 4: MER preliminar y final | Parcial | Hay dos MER Mermaid en docs/mer, compatibles con las tablas y relaciones consultadas. No se localizaron versiones preliminares ni evidencia de diagramas nativos de las herramientas de BD o una exportación final preparada para entregar. |
| Actividad 5: tablas, auditoría, PK y FK Oracle | Confirmado en BD; entrega parcial | Once PK y once FK visibles. Ubicación de datos, auditoría e índices correcta. Falta DDL original completo para replicar. |
| Actividad 6: tablas, PK y FK SQL Server | Confirmado en BD; entrega parcial | Siete tablas, siete PK y seis relaciones FK. Falta DDL original completo para replicar. |
| Actividad 7: grants y asignación de roles | Confirmado para CRUD y roles visibles | En Oracle, rol CRUD con SELECT/INSERT/UPDATE/DELETE sobre las diez tablas; consulta con SELECT; ambos roles con los cuatro permisos sobre auditoría, como solicita el PDF. Ambos roles activos en sesión CRUD. En SQL, CRUD con cuatro permisos y consulta con SELECT en las siete tablas; ambos roles asignados a APP_PROVEEDORES. Falta evidencia administrativa completa y scripts originales. |
| Actividad 8: carga masiva en todas las tablas y Excel con INSERT dinámicos | Incompleto en esta carpeta y datos actuales | No hay archivos XLSX ni scripts originales de carga. Cuatro tablas funcionales están vacías. El PDF pide al menos dos catálogos y dos tablas maestro-detalle tabulados en Excel con una columna dinámica de INSERT al final de cada hoja. |
| Prototipo IA para gestionar Oracle y SQL Server | Implementado; cierre visual pendiente | Código, 24 pruebas y build actuales correctos. La evidencia HTTP integral real es anterior. Falta comprobar visualmente formularios, navegación y recorridos. |
| Scripts de todo lo ejecutado y replicación en VM | Incompleto en esta carpeta | Solo hay cambios incrementales, validaciones y seeds de seguridad. No están los scripts completos de creación de bases/esquemas, tablespaces, usuarios, roles, grants, tablas, PK/FK, índices, auditoría y carga original. No se probó una reproducción en VM. |
| Entregas en Canvas y defensa práctica | No verificado | No hay evidencia consultada de subidas o cumplimiento de fechas. La evaluación práctica del estudiante queda fuera de esta validación técnica. |

## Datos actuales de Oracle

| Tabla | Filas |
| --- | ---: |
| PROVEEDOR | 20 |
| CENTRO_COSTO | 20 |
| USUARIO | 20 |
| DOCUMENTO_COMPRA | 19 |
| DETALLE_DOCUMENTO_COMPRA | 20 |
| PAGO_BANCARIO | 20 |
| RETENCION_ISR | 0 |
| CONTRASENA_PAGO | 0 |
| DOCUMENTO_POR_LIQUIDAR | 0 |
| ASIENTO_CONTABLE | 0 |
| LOG_AUDITORIA_ODC | 185 |

Estos conteos comprueban existencia de datos, no el origen de una carga Excel ni su integridad de negocio. No se atribuye la cantidad de documentos a una causa sin evidencia.

## Qué falta para cerrar

1. Recuperar los scripts originales citados en CODEX_CONTEXT.md: ORACLE_ROLES_PERMISOS_PROVEEDORES.sql, SQLSERVER_ROLES_PERMISOS_PROVEEDORES.sql, 02_CREAR_TABLAS_SEGURIDAD.sql y los restantes DDL y cargas. Ordenarlos y comprobar reproducción en VM sin ejecutar reconstrucciones sobre las bases actuales.
2. Recuperar y revisar Carga_Masiva_Oracle_Cuentas_Por_Pagar_CRUD.xlsx o preparar la entrega requerida con datos autorizados y fórmulas de INSERT. Completar la cobertura de las cuatro tablas vacías y guardar los INSERT en SQL. Los datos temporales de pruebas no sustituyen la carga académica.
3. Obtener evidencia como administrador del dueño/schema SQL y usuarios nombrados. El uso actual de dbo no demuestra por sí solo la creación del schema específico pedido; resolver este punto contra el script original y el criterio del docente antes de plantear migraciones.
4. Preparar los MER finales de ambos motores y comprobar su presentación en las herramientas de BD. Conservar la evidencia preliminar si existe.
5. Revisar la aplicación visualmente y realizar una demostración con usuario administrador y usuario de consulta. Repetir la prueba integral con la contraseña vigente mediante entrada oculta cuando se haga el cierre funcional.
6. Comprobar los archivos efectivamente entregados en Canvas y practicar las consultas y operaciones de la defensa.

## Evidencia y límites

- Evidencia de esta revisión: docs/evidence/revision-requisitos-2026-11-07.json.
- Inspecciones actualizadas: docs/evidence/oracle.json y sqlserver.json.
- Consultas Oracle actualizadas: docs/evidence/oracle-integration.json.
- Histórico: ESTADO.md, docs/PRUEBAS.md y docs/evidence/integral.json.
- Diagramas existentes: docs/mer/oracle.md y docs/mer/sqlserver.md.
- USER_TRIGGERS y objetos visibles consultados reportan cero triggers. La cuenta Oracle no tiene acceso a DBA_ROLE_PRIVS (ORA-00942), y SQL no tiene VIEW DEFINITION global; no se certifica visibilidad administrativa total. Los roles activos y permisos visibles sí se verificaron.
- Los archivos faltantes se consideran ausentes únicamente de esta carpeta revisada, no de otros equipos o entregas anteriores.
- La raíz actual no tiene repositorio .git; no fue posible determinar un último commit o cambios mediante Git.

No se asigna un porcentaje ni una nota: el PDF combina entrega documental, funcionamiento y evaluación práctica, y faltan evidencias para medirlos como una sola cifra.
