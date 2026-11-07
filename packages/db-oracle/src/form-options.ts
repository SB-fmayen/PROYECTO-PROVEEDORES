import oracledb from 'oracledb';
import type { ResourceDefinition } from '../../shared/src/resources.js';
import { categoricalFields } from '../../shared/src/form-options.js';

export async function getFormOptions(pool: oracledb.Pool, resource: ResourceDefinition): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  const connection = await pool.getConnection();
  connection.callTimeout = 10000;
  try {
    for (const field of resource.fields.filter(item => item.type === 'text' && categoricalFields.has(item.name))) {
      const values = await connection.execute<{ VALUE: string }>(`SELECT DISTINCT ${field.name} AS VALUE FROM ADMIN_CU_PROVEEDORES.${resource.table}
        WHERE ${field.name} IS NOT NULL ORDER BY ${field.name} FETCH FIRST 100 ROWS ONLY`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      result[field.name] = values.rows?.map(row => row.VALUE) ?? [];
    }
    return result;
  } finally { await connection.close(); }
}
