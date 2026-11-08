-- Las acciones de administracion y eliminacion quedan apagadas en las cuentas de prueba.
INSERT dbo.PERFIL_MENU(ID_PERFIL,ID_MENU,PUEDE_VER,PUEDE_CREAR,PUEDE_EDITAR,PUEDE_ELIMINAR)
VALUES(@profileId,@menuId,@read,@create,@update,0);
