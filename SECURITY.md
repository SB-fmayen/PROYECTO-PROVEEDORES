# Seguridad

Este repositorio contiene un prototipo académico. Reportar una vulnerabilidad mediante el canal privado de seguridad de GitHub si está habilitado. En caso contrario, abrir un issue sin datos sensibles solicitando un canal privado; no publicar credenciales, hashes, cookies, capturas de usuarios o cadenas de conexión.

## Publicación

- `.env`, `.local/`, perfiles de navegador, logs, evidencias JSON locales, dependencias y compilaciones se excluyen del control de versiones.
- La carga académica usa SQL con binds, genera IDs en Oracle y registra cambios y auditoría en una misma transacción. No altera PK/FK, usuarios, roles ni grants. Las cuentas contables DEMO y constancias ACAD son ilustrativas.
- `npm run security:scan` comprueba los archivos permitidos y busca secretos locales conocidos, tokens comunes, claves privadas y hashes exportados. Revisar también el diff antes de cada publicación; un escáner no detecta todos los secretos posibles.
- GitHub Actions usa permisos de lectura, acciones fijadas a commits y no necesita secretos ni acceso a las bases para pruebas unitarias y build. La auditoría npm de producción falla ante vulnerabilidades high/critical.
- No añadir volcados de BD, contraseñas, credenciales iniciales cifradas, manifests de carga o filas de negocio al repositorio público. Los JSON de `docs/mer/final` describen únicamente columnas y relaciones.

## Ejecución

La recuperación local de una contraseña olvidada se documenta en docs/RECUPERAR_ACCESO.md. Exige API detenida, cuenta administradora activa, entrada oculta y hash Argon2id. No ofrece un endpoint de reset sin autenticación ni exporta credenciales. El comando del acceso inicial verifica que ese acceso siga vigente antes de mostrarlo.

Usar una cuenta de BD con los permisos mínimos del módulo; no usar SYS, sa ni cuentas propietarias como conexión de la aplicación. La API consulta permisos en cada operación y el frontend no conecta a las bases. Las contraseñas de aplicación se almacenan con Argon2id; las cookies son HttpOnly/SameSite y los tokens se revocan al cerrar sesión o cambiar contraseña.

El pool de la API requiere `SQLSERVER_AUTH=sql`. La modalidad Windows de los diagnósticos no equivale a soporte Windows en el pool. Configurar cifrado y certificados válidos según el entorno. El modo local puede usar un certificado de desarrollo confiado explícitamente; no trasladar esa excepción a un despliegue público.

Mantener el servidor en localhost durante la validación. Un despliegue público requiere HTTPS, `SESSION_SECURE=true`, certificado SQL validado y almacén compartido de sesiones si se usa más de un proceso. Las sesiones actuales son en memoria. No exponer el servidor de desarrollo a Internet.

Los permisos de BD sobre auditoría reflejan el requisito académico; la API expone ese módulo únicamente para lectura. La auditoría de aplicación cubre sus escrituras y las herramientas de mantenimiento incluidas; no cubre escrituras directas realizadas desde otras herramientas.
