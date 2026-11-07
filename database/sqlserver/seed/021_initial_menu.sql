-- Plantilla de auth:bootstrap dentro de la misma transacción que la cuenta.
-- Parámetros: @name varchar(100), @route varchar(200), @position int,
-- @profile int y @write bit. Los módulos se toman del catálogo verificado.
DECLARE @menu int;
INSERT INTO dbo.MENU (NOMBRE_MENU,RUTA,ORDEN,ESTADO)
VALUES (@name,@route,@position,1);
SET @menu=CONVERT(int,SCOPE_IDENTITY());
INSERT INTO dbo.PERFIL_MENU (ID_PERFIL,ID_MENU,PUEDE_VER,PUEDE_CREAR,PUEDE_EDITAR,PUEDE_ELIMINAR)
VALUES (@profile,@menu,1,@write,@write,@write);
