# MER final sqlserver

Verificado el 2026-11-07 contra metadatos de la base. Tipos, claves y nulabilidad completos en [el catalogo](final/sqlserver-schema.json).

[PDF final](final/MER-sqlserver-final.pdf) | [SVG](final/sqlserver.svg) | [Fuente DOT](final/sqlserver.dot) | [Fuente Mermaid](final/sqlserver.mmd)

```mermaid
erDiagram
  MENU {
    int ID_MENU PK
    varchar(100) NOMBRE_MENU
    varchar(200) RUTA
    int ORDEN
    bit ESTADO
  }
  PERFIL {
    int ID_PERFIL PK
    varchar(80) NOMBRE_PERFIL
    varchar(250) DESCRIPCION
    bit ESTADO
  }
  PERFIL_MENU {
    int ID_PERFIL PK,FK
    int ID_MENU PK,FK
    bit PUEDE_VER
    bit PUEDE_CREAR
    bit PUEDE_EDITAR
    bit PUEDE_ELIMINAR
  }
  ROL {
    int ID_ROL PK
    varchar(80) NOMBRE_ROL
    varchar(250) DESCRIPCION
    bit ESTADO
  }
  ROL_PERFIL {
    int ID_ROL PK,FK
    int ID_PERFIL PK,FK
    bit ESTADO
  }
  USUARIO {
    int ID_USUARIO PK
    varchar(100) NOMBRE
    varchar(50) USUARIO_LOGIN
    varchar(120) CORREO
    bit ESTADO
    datetime2 FECHA_CREACION
    varchar(255) PASSWORD_HASH
  }
  USUARIO_ROL {
    int ID_USUARIO PK,FK
    int ID_ROL PK,FK
    datetime2 FECHA_ASIGNACION
    bit ESTADO
  }
  MENU ||--o{ PERFIL_MENU : FK_PERFIL_MENU_MENU
  PERFIL ||--o{ PERFIL_MENU : FK_PERFIL_MENU_PERFIL
  PERFIL ||--o{ ROL_PERFIL : FK_ROL_PERFIL_PERFIL
  ROL ||--o{ ROL_PERFIL : FK_ROL_PERFIL_ROL
  ROL ||--o{ USUARIO_ROL : FK_USUARIO_ROL_ROL
  USUARIO ||--o{ USUARIO_ROL : FK_USUARIO_ROL_USUARIO
```

Sin FK entre motores. La auditoria se registra desde la aplicacion; no se crean triggers. USUARIO de Oracle representa responsables funcionales; USUARIO de SQL Server autentica cuentas de aplicacion.
