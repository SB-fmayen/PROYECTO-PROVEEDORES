import { readFile, writeFile } from 'node:fs/promises';
// Generar una simulacion del script real: mismos pasos, siempre ROLLBACK.
let source = await readFile('database/sqlserver/schema/040_security_schema.sql', 'utf8');
source = source.replace('DECLARE @Apply bit=0, @Reverse bit=0;', 'DECLARE @Apply bit=1, @Reverse bit=0;');
source = source.replace('DECLARE @sql nvarchar(max),@Name sysname,@Id int,@Rows bigint,@Lock int;',
  "DECLARE @sql nvarchar(max),@Name sysname,@Id int,@Rows bigint,@Lock int;\nDECLARE @Phase nvarchar(100)=N'inicio';");
for (const [anchor, phase] of [
  ['  DECLARE lock_tables CURSOR', 'bloquear tablas'],
  ['  IF @Reverse=0\n', 'crear propietario y schema'],
  ['  DECLARE move_tables CURSOR', 'trasladar tablas'],
  ['  -- Verificar el traslado ANTES', 'verificar traslado completo'],
  ['  DECLARE restore_permissions CURSOR', 'restaurar permisos con propietario actual'],
  ['  IF EXISTS(SELECT object_id,grantee', 'comparar permisos y claves'],
  ['  DECLARE verify_tables CURSOR', 'verificar tablas y conteos']
]) {
  if (!source.includes(anchor)) throw new Error(`Missing diagnostic anchor: ${phase}`);
  source = source.replace(anchor, `  SET @Phase=N'${phase}';\n${anchor}`);
}
source = source.replaceAll('EXEC sys.sp_executesql @sql;', "RAISERROR(N'%s',10,1,@sql) WITH NOWAIT;\n    EXEC sys.sp_executesql @sql;");
source = source.replace("  COMMIT;\n  SELECT N'CONFIRMADO' AS estado,@Target AS schema_actual,@Reverse AS es_reversion;",
  "  ROLLBACK;\n  SELECT N'SIMULACION CORRECTA - CAMBIOS REVERTIDOS' AS estado,@Source AS schema_actual;");
source = source.replace("  PRINT 'Actualizar SQLSERVER_SCHEMA en .env al schema actual y reiniciar la API. No ejecutar bootstrap.';",
  "  PRINT 'No cambiar .env: esta prueba revierte todos los cambios.';");
source = source.replace('  IF XACT_STATE()<>0 ROLLBACK;\n  THROW;',
  "  SELECT @Phase AS ETAPA_DEL_ERROR,@sql AS ULTIMA_INSTRUCCION,ERROR_NUMBER() AS CODIGO,ERROR_MESSAGE() AS MENSAJE;\n"
  + "  SELECT t.name,s.name AS schema_durante_prueba FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id\n"
  + "    WHERE t.name IN ('USUARIO','ROL','PERFIL','MENU','USUARIO_ROL','ROL_PERFIL','PERFIL_MENU');\n"
  + "  IF XACT_STATE()<>0 ROLLBACK;\n  PRINT 'Diagnostico terminado: transaccion revertida; no cambiar .env.';\n  THROW;");
if (/\bCOMMIT\s*;/i.test(source)) throw new Error('Diagnostic must never commit');
if (!source.includes('SIMULACION CORRECTA - CAMBIOS REVERTIDOS')) throw new Error('Missing rollback result');
source = '-- DIAGNOSTICO 041 v2: ejecutar archivo completo en SSMS como administrador.\n'
  + '-- Siempre revierte. No cambiar variables ni .env; mantener API detenida.\n'
  + "PRINT N'DIAGNOSTICO 041 v2 - OTORGANTE SEGUN PROPIETARIO ACTUAL';\n" + source;
await writeFile('database/sqlserver/validation/041_diagnose_schema.sql', source);
console.log('Diagnostico 041 v2 generado; no contiene COMMIT.');
