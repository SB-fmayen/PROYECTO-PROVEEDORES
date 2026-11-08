# Retirar accesos de prueba

Entrar con el administrador actual y desactivar únicamente los usuarios consulta_cpp, operador_cpp, tesoreria_cpp y auditor_cpp desde Administración > Usuarios. La API revoca sus sesiones. Esto conserva las referencias a sus IDs en auditoría y evita borrar trazabilidad. No desactivar admin ni tocar roles/logins de base de datos.

Las cuentas se crearon solo mediante INSERT y tienen un rol/perfil propio por usuario. No se modificaron cuentas previas. Si se desea retirar también su configuración, revisar sus relaciones antes de eliminar nada; se recomienda mantenerla inactiva para la demostración académica.

El archivo .local/profile-accounts.enc.json contiene los accesos cifrados y sus IDs; nunca publicarlo ni reconstruirlo adivinando IDs. Una recarga verifica la identidad y los permisos de las cuentas existentes, sin duplicarlas o reemplazar sus contraseñas. Cambios posteriores desde administración pueden hacer que la verificación requiera revisión manual.
