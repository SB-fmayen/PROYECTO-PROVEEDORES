# Recuperar el acceso de aplicación

La contraseña inicial cifrada no equivale a la contraseña actual. `auth:credential -- --show` ahora comprueba su validez contra la cuenta activa antes de mostrarla; si ya cambió, avisa sin mostrar un acceso obsoleto. Nunca recupera contraseñas posteriores desde el hash.

Si se olvidó la contraseña de una cuenta administradora:

1. Detener todos los procesos de la API para invalidar las sesiones en memoria. No detener la base. Si el agente levantó la API en segundo plano, pedirle que detenga ese proceso del proyecto.
2. En una terminal local interactiva, desde la raíz: `npm.cmd run auth:reset -- --login admin`.
3. Escribir una nueva contraseña de 12 a 256 caracteres y repetirla. La entrada no se muestra. No pasarla por argumentos, variables de entorno, archivos, capturas o chat.
4. Al confirmar la actualización, reiniciar la API y entrar en http://127.0.0.1:5173 con la nueva contraseña. No ejecutar bootstrap ni cambiar usuarios, roles o credenciales de conexión.

El comando requiere las credenciales de BD locales existentes y una cuenta activa con permiso de administración de usuarios. No habilita cuentas ni agrega permisos. Se niega a operar si la API está escuchando en su puerto configurado y comprueba otra vez antes de escribir. No debe ejecutarse mientras otro operador inicia un proceso de API. La operación afecta únicamente el hash de la cuenta elegida y comprueba el hash previo de forma binaria para rechazar cambios concurrentes. No guarda ni muestra la nueva contraseña y no actualiza el archivo del acceso inicial. Solo se conserva Argon2id en SQL Server.

La recuperación es una herramienta local de mantenimiento, no una función HTTP. Las pruebas del sistema con los perfiles existentes siguen siendo un paso separado. Si la API se ejecuta en varios puertos o equipos, detener todas sus instancias antes de recuperar acceso.
