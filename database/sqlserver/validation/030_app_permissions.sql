-- SOLO LECTURA. Ejecutar localmente; no publicar resultados con usuarios reales.
-- No consulta PASSWORD_HASH, CORREO ni contrasenas.
DECLARE @Schema sysname;
SELECT @Schema=s.name FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
WHERE t.name=N'USUARIO' AND s.name IN (N'dbo',N'SEGURIDAD_PROVEEDORES');
IF (SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
    WHERE t.name=N'USUARIO' AND s.name IN (N'dbo',N'SEGURIDAD_PROVEEDORES'))<>1
  THROW 51060, 'Schema de seguridad no visible o ambiguo.',1;
DECLARE @Sql nvarchar(max)=N'SELECT u.ID_USUARIO, u.USUARIO_LOGIN, u.ESTADO AS USUARIO_ACTIVO,
       r.NOMBRE_ROL, ur.ESTADO AS ASIGNACION_ROL_ACTIVA, r.ESTADO AS ROL_ACTIVO,
       p.NOMBRE_PERFIL, rp.ESTADO AS ASIGNACION_PERFIL_ACTIVA, p.ESTADO AS PERFIL_ACTIVO,
       m.RUTA, m.ESTADO AS MENU_ACTIVO,
       pm.PUEDE_VER, pm.PUEDE_CREAR, pm.PUEDE_EDITAR, pm.PUEDE_ELIMINAR
FROM dbo.USUARIO AS u
LEFT JOIN dbo.USUARIO_ROL AS ur ON ur.ID_USUARIO=u.ID_USUARIO
LEFT JOIN dbo.ROL AS r ON r.ID_ROL=ur.ID_ROL
LEFT JOIN dbo.ROL_PERFIL AS rp ON rp.ID_ROL=r.ID_ROL
LEFT JOIN dbo.PERFIL AS p ON p.ID_PERFIL=rp.ID_PERFIL
LEFT JOIN dbo.PERFIL_MENU AS pm ON pm.ID_PERFIL=p.ID_PERFIL
LEFT JOIN dbo.MENU AS m ON m.ID_MENU=pm.ID_MENU
ORDER BY u.ID_USUARIO, r.ID_ROL, p.ID_PERFIL, m.ORDEN, m.ID_MENU;
';
SET @Sql=REPLACE(@Sql,N'dbo.',QUOTENAME(@Schema)+N'.');
EXEC sys.sp_executesql @Sql;
