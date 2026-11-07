import oracledb from 'oracledb';
import { resources } from '../../shared/src/resources.js';

export interface DashboardItem { slug: string; label: string; count: number; amount: number | null; amountLabel: string | null; }
const amounts: Record<string, { column: string; label: string }> = {
  proveedores: { column: 'SALDOACTUAL', label: 'Saldo registrado' },
  'documentos-compra': { column: 'TOTAL', label: 'Total de documentos' },
  'pagos-bancarios': { column: 'MONTO', label: 'Total de pagos registrados' },
  'retenciones-isr': { column: 'MONTORETENIDO', label: 'Total retenido' }
};
export async function getDashboard(pool: oracledb.Pool, permissions: ReadonlySet<string>): Promise<DashboardItem[]> {
  const connection = await pool.getConnection();
  connection.callTimeout = 10000;
  try {
    const result: DashboardItem[] = [];
    for (const resource of resources.filter(item => permissions.has(`${item.slug}.read`))) {
      const amount = amounts[resource.slug];
      const query = `SELECT COUNT(*) AS TOTAL${amount ? `, NVL(SUM(${amount.column}),0) AS AMOUNT` : ''} FROM ADMIN_CU_PROVEEDORES.${resource.table}`;
      const data = await connection.execute<{ TOTAL: number; AMOUNT?: number }>(query, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      result.push({ slug: resource.slug, label: resource.label, count: data.rows?.[0]?.TOTAL ?? 0, amount: data.rows?.[0]?.AMOUNT ?? null, amountLabel: amount?.label ?? null });
    }
    return result;
  } finally { await connection.close(); }
}
