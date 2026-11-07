-- Solo metadatos; autenticacion Windows. No lee filas de usuarios ni hashes.
SET NOCOUNT ON;
SELECT DB_NAME() AS database_name,SUSER_SNAME() AS login_name,
 CAST(SERVERPROPERTY('IsIntegratedSecurityOnly') AS int) AS windows_only,
 CASE CAST(SERVERPROPERTY('IsIntegratedSecurityOnly') AS int) WHEN 1 THEN 'Windows only' WHEN 0 THEN 'Mixed Mode' ELSE 'Unknown' END AS authentication_mode,
 HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION') AS can_view_definition,
 IS_SRVROLEMEMBER('sysadmin') AS is_sysadmin;
SELECT s.name AS schema_name,t.name AS table_name,c.column_id,c.name AS column_name,
 SCHEMA_NAME(ty.schema_id) AS type_schema,ty.name AS data_type,c.max_length,c.precision,c.scale,
 c.is_nullable,c.is_identity,ic.seed_value,ic.increment_value,c.collation_name,c.is_computed,
 cc.definition AS computed_definition,cc.is_persisted,dc.name AS default_name,dc.definition AS default_definition,
 c.is_rowguidcol,c.is_filestream,c.is_sparse,c.generated_always_type_desc
FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id
LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id
LEFT JOIN sys.computed_columns cc ON cc.object_id=c.object_id AND cc.column_id=c.column_id
LEFT JOIN sys.identity_columns ic ON ic.object_id=c.object_id AND ic.column_id=c.column_id
WHERE t.name IN ('USUARIO','ROL','PERFIL','MENU','USUARIO_ROL','ROL_PERFIL','PERFIL_MENU')
ORDER BY s.name,t.name,c.column_id;
SELECT OBJECT_SCHEMA_NAME(k.parent_object_id) AS schema_name,OBJECT_NAME(k.parent_object_id) AS table_name,
 k.name,k.type_desc,i.name AS index_name,c.name AS column_name,ix.key_ordinal,ix.is_descending_key
FROM sys.key_constraints k JOIN sys.indexes i ON i.object_id=k.parent_object_id AND i.index_id=k.unique_index_id
JOIN sys.index_columns ix ON ix.object_id=i.object_id AND ix.index_id=i.index_id
JOIN sys.columns c ON c.object_id=ix.object_id AND c.column_id=ix.column_id ORDER BY schema_name,table_name,k.name,ix.key_ordinal;
SELECT f.name,OBJECT_SCHEMA_NAME(f.parent_object_id) AS parent_schema,OBJECT_NAME(f.parent_object_id) AS parent_table,
 pc.name AS parent_column,OBJECT_SCHEMA_NAME(f.referenced_object_id) AS referenced_schema,
 OBJECT_NAME(f.referenced_object_id) AS referenced_table,rc.name AS referenced_column,fc.constraint_column_id,
 f.update_referential_action_desc,f.delete_referential_action_desc,f.is_disabled,f.is_not_trusted
FROM sys.foreign_keys f JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=f.object_id
JOIN sys.columns pc ON pc.object_id=fc.parent_object_id AND pc.column_id=fc.parent_column_id
JOIN sys.columns rc ON rc.object_id=fc.referenced_object_id AND rc.column_id=fc.referenced_column_id ORDER BY f.name,fc.constraint_column_id;
SELECT OBJECT_SCHEMA_NAME(i.object_id) AS schema_name,OBJECT_NAME(i.object_id) AS table_name,i.name,i.type_desc,
 i.is_unique,i.is_primary_key,i.is_unique_constraint,i.is_disabled,i.has_filter,i.filter_definition,
 ic.key_ordinal,ic.index_column_id,ic.is_included_column,ic.is_descending_key,c.name AS column_name
FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id
LEFT JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
LEFT JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id ORDER BY schema_name,table_name,i.index_id,ic.index_column_id;
SELECT OBJECT_SCHEMA_NAME(parent_object_id) AS schema_name,OBJECT_NAME(parent_object_id) AS table_name,name,definition,is_disabled,is_not_trusted FROM sys.check_constraints;
SELECT name,type_desc,authentication_type_desc FROM sys.database_principals WHERE type IN ('R','S','U','G','E','X');
SELECT r.name AS role_name,m.name AS member_name FROM sys.database_role_members rm JOIN sys.database_principals r ON r.principal_id=rm.role_principal_id JOIN sys.database_principals m ON m.principal_id=rm.member_principal_id;
SELECT p.state_desc,p.permission_name,p.class_desc,p.major_id,p.minor_id,gr.name AS grantee,gt.name AS grantor,
 CASE WHEN p.class=1 THEN OBJECT_SCHEMA_NAME(p.major_id) END AS object_schema,
 CASE WHEN p.class=1 THEN OBJECT_NAME(p.major_id) END AS object_name
FROM sys.database_permissions p JOIN sys.database_principals gr ON gr.principal_id=p.grantee_principal_id JOIN sys.database_principals gt ON gt.principal_id=p.grantor_principal_id;
SELECT * FROM sys.fn_my_permissions(NULL,'DATABASE');
SELECT r.name AS role_name,m.name AS member_name FROM sys.server_role_members rm JOIN sys.server_principals r ON r.principal_id=rm.role_principal_id JOIN sys.server_principals m ON m.principal_id=rm.member_principal_id;
SELECT p.state_desc,p.permission_name,p.class_desc,gr.name AS grantee FROM sys.server_permissions p JOIN sys.server_principals gr ON gr.principal_id=p.grantee_principal_id;
SELECT name,parent_class_desc,OBJECT_SCHEMA_NAME(parent_id) AS schema_name,OBJECT_NAME(parent_id) AS table_name,is_disabled FROM sys.triggers;
SELECT COUNT(*) AS total_database_triggers FROM sys.triggers;
SELECT name,is_disabled FROM sys.server_triggers;
SELECT COUNT(*) AS total_server_triggers FROM sys.server_triggers;
-- Lista completa para evaluacion semantica: un nombre por si solo no prueba almacenamiento de hashes.
SELECT OBJECT_SCHEMA_NAME(c.object_id) AS schema_name,c.name AS column_name,ty.name AS data_type,c.max_length,c.is_nullable
FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.name='USUARIO';
SELECT requested.name AS requested_table,s.name AS schema_name,t.object_id
FROM (VALUES ('USUARIO'),('ROL'),('PERFIL'),('MENU'),('USUARIO_ROL'),('ROL_PERFIL'),('PERFIL_MENU')) requested(name)
LEFT JOIN sys.tables t ON t.name=requested.name LEFT JOIN sys.schemas s ON s.schema_id=t.schema_id;
