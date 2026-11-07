export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
// El caso de uso debe ejecutar tanto la mutación como la auditoría dentro de work.
export async function atomic<T>(transaction: Transaction, work: () => Promise<T>): Promise<T> {
  try {
    const result = await work();
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
