export interface ProfilePolicy {
  login: string; name: string; role: string; profile: string;
  read: string[]; write: string[];
}
const business = ['proveedores','centros-costo','documentos-compra','detalles','pagos-bancarios','retenciones-isr','contrasenas-pago','documentos-por-liquidar','asientos-contables'];
export const profilePolicies: ProfilePolicy[] = [
  { login: 'consulta_cpp', name: 'Prueba Consulta CPP', role: 'Consulta CPP (prueba)', profile: 'Consulta CPP (prueba)', read: business, write: [] },
  { login: 'operador_cpp', name: 'Prueba Operador CPP', role: 'Operador CPP (prueba)', profile: 'Operador CPP (prueba)',
    read: ['proveedores','centros-costo','documentos-compra','detalles','retenciones-isr','contrasenas-pago','usuarios-negocio'],
    write: ['proveedores','centros-costo','documentos-compra','detalles','retenciones-isr','contrasenas-pago'] },
  { login: 'tesoreria_cpp', name: 'Prueba Tesoreria CPP', role: 'Tesoreria CPP (prueba)', profile: 'Tesoreria CPP (prueba)',
    read: ['proveedores','documentos-compra','detalles','retenciones-isr','contrasenas-pago','pagos-bancarios','documentos-por-liquidar','asientos-contables'],
    write: ['pagos-bancarios','documentos-por-liquidar','asientos-contables'] },
  { login: 'auditor_cpp', name: 'Prueba Auditor CPP', role: 'Auditor CPP (prueba)', profile: 'Auditor CPP (prueba)', read: [...business,'usuarios-negocio','auditoria'], write: [] }
];
export function expectedProfilePermissions(policy: ProfilePolicy): string[] {
  return [...policy.read.map(slug => `${slug}.read`), ...policy.write.flatMap(slug => [`${slug}.create`,`${slug}.update`])].sort();
}
