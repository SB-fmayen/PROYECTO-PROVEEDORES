SELECT USER AS CURRENT_USER FROM DUAL;
SELECT SYS_CONTEXT('USERENV','CON_NAME') AS CON_NAME FROM DUAL;
SELECT owner, table_name FROM all_tables WHERE owner='ADMIN_CU_PROVEEDORES' ORDER BY table_name;
SELECT COUNT(*) AS TOTAL_USER_TRIGGERS FROM user_triggers;
SELECT COUNT(*) AS VISIBLE_OWNER_TRIGGERS FROM all_triggers WHERE owner='ADMIN_CU_PROVEEDORES';
-- Solo lectura. Ejecutar con acceso al diccionario del esquema propietario.
SELECT SYS_CONTEXT('USERENV','SESSION_USER') AS SESSION_USER,
       SYS_CONTEXT('USERENV','CON_NAME') AS CONTAINER_NAME FROM DUAL;
SELECT owner, table_name, column_id, column_name, data_type, data_length,
       data_precision, data_scale, nullable, data_default, identity_column
FROM all_tab_columns WHERE owner = 'ADMIN_CU_PROVEEDORES'
ORDER BY table_name, column_id;
SELECT owner, constraint_name, table_name, constraint_type, r_owner,
       r_constraint_name, delete_rule, status
FROM all_constraints WHERE owner = 'ADMIN_CU_PROVEEDORES';
SELECT owner, constraint_name, table_name, column_name, position
FROM all_cons_columns WHERE owner = 'ADMIN_CU_PROVEEDORES';
SELECT sequence_owner, sequence_name, increment_by
FROM all_sequences WHERE sequence_owner = 'ADMIN_CU_PROVEEDORES';
SELECT table_schema, table_name, grantee, privilege FROM all_tab_privs
WHERE table_schema = 'ADMIN_CU_PROVEEDORES';
-- ALL_TRIGGERS solo muestra objetos visibles; cero no certifica ausencia sin acceso suficiente.
SELECT owner, trigger_name, status FROM all_triggers
WHERE owner IN ('ADMIN_CU_PROVEEDORES','CRUD_PROVEEDORES');
-- Como propietario: SELECT COUNT(*) AS TOTAL_TRIGGERS FROM USER_TRIGGERS;
