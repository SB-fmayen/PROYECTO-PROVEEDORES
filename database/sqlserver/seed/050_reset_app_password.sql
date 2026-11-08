-- Solo recuperacion local desde auth:reset, con API detenida.
-- Binds: hash Argon2id nuevo, ID y hash previo para detectar cambios concurrentes.
-- El wrapper adapta dbo al schema configurado. No se crean cuentas ni permisos.
UPDATE dbo.USUARIO
SET PASSWORD_HASH=@hash
WHERE ID_USUARIO=@id AND ESTADO=1
  AND CONVERT(varbinary(255),PASSWORD_HASH)=CONVERT(varbinary(255),@oldHash);
