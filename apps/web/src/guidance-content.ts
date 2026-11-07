export interface ModuleGuide { summary: string; fields: string; workflow: string; }
export const moduleGuides: Record<string, ModuleGuide> = {
  dashboard: {
    summary: 'Este resumen reúne la información que tu cuenta puede consultar. Cada tarjeta abre un módulo y muestra cuántos registros existen.',
    fields: 'Los importes son totales registrados: no representan una conciliación automática ni un nuevo cálculo de deuda.',
    workflow: 'Empieza por proveedores y centros de costo, registra la compra y sus detalles, y después documenta pagos, retenciones y liquidaciones.'
  },
  proveedores: {
    summary: 'Aquí registras a las personas o empresas a quienes se compra o paga. Un proveedor puede tener varios documentos de compra y pagos.',
    fields: 'NIT identifica al proveedor; razón social es su nombre; tipo de contribuyente lo clasifica. El saldo actual es el saldo guardado, no un cálculo automático.',
    workflow: 'Crea el proveedor antes de registrar sus compras o pagos. Usa su nombre para seleccionarlo en los demás formularios.'
  },
  'centros-costo': {
    summary: 'Permite indicar a qué área de la organización corresponde una compra, por ejemplo administración, ventas u operación.',
    fields: 'El nombre identifica el área; tipo y descripción ayudan a clasificarla. Cada documento de compra selecciona un centro de costo.',
    workflow: 'Registra primero las áreas que utilizarás y luego elige la correspondiente al crear cada compra.'
  },
  'documentos-compra': {
    summary: 'Registra la información general de una compra: a quién se compró, a qué área corresponde y qué documento la respalda.',
    fields: 'Selecciona proveedor y centro de costo. Registra tipo, serie, número, fechas e importes. El total debe coincidir con subtotal más IVA cuando se informan los tres.',
    workflow: 'Primero crea el documento. Después registra sus conceptos en Detalles de compra. Registrar una compra no registra automáticamente un pago.'
  },
  detalles: {
    summary: 'Cada registro es un concepto o línea de un documento de compra: lo que se adquirió, su cantidad y su precio.',
    fields: 'Selecciona el documento de compra. La cantidad multiplicada por el precio unitario debe coincidir con el monto cuando se informan los tres.',
    workflow: 'Una compra puede tener varios detalles. Crea primero el documento y luego añade cada concepto aquí.'
  },
  'pagos-bancarios': {
    summary: 'Guarda el registro de un pago asociado a un proveedor. Esta pantalla documenta el pago y no ejecuta una transferencia bancaria.',
    fields: 'Selecciona proveedor, tipo de pago, banco, fecha, referencia y monto. El estado describe la situación del registro.',
    workflow: 'Después de registrar el pago, usa Documentos por liquidar para relacionarlo con las compras a las que se aplica.'
  },
  'retenciones-isr': {
    summary: 'Documenta una retención de ISR asociada a una compra y conserva la referencia de su constancia.',
    fields: 'Selecciona el documento, registra monto retenido, fecha y número de constancia. El sistema conserva el importe que ingresas; no calcula una tasa tributaria.',
    workflow: 'Crea la compra antes de registrar la retención. Verifica el importe y la constancia antes de guardar.'
  },
  'contrasenas-pago': {
    summary: 'Controla una solicitud de pago vinculada a una compra, con responsable, fechas y estado. No es una contraseña para iniciar sesión.',
    fields: 'Selecciona documento de compra y responsable de negocio. Registra solicitud, vencimiento y el estado que utiliza tu organización.',
    workflow: 'Primero deben existir el documento y el responsable. Las cuentas de acceso se administran por separado en Administración → Usuarios.'
  },
  'documentos-por-liquidar': {
    summary: 'Relaciona un pago con un documento de compra y registra cuánto se aplicó y qué saldo quedó pendiente.',
    fields: 'Selecciona el pago y el documento. Monto aplicado, saldo pendiente y fecha son datos registrados; no se recalculan automáticamente otros módulos.',
    workflow: 'Crea primero la compra y el pago. Luego documenta aquí la aplicación del pago correspondiente.'
  },
  'asientos-contables': {
    summary: 'Permite registrar movimientos contables relacionados con un documento de compra y, cuando corresponde, un pago.',
    fields: 'Selecciona el documento, el pago opcional, la cuenta contable y el período. Debe y haber son los importes del movimiento registrado.',
    workflow: 'Los asientos se mantienen manualmente. Registrar una compra o pago no genera automáticamente sus asientos.'
  },
  'usuarios-negocio': {
    summary: 'Registra a las personas responsables del proceso de pago. Se pueden seleccionar como responsables de las solicitudes de pago.',
    fields: 'Nombre, rol funcional y estado describen al responsable. Este registro no crea una cuenta de acceso ni concede permisos al sistema.',
    workflow: 'Crea aquí a los responsables que se utilizarán en Contraseñas de pago. Para permitir iniciar sesión utiliza Administración → Usuarios.'
  },
  auditoria: {
    summary: 'Muestra qué registros se crearon, cambiaron o eliminaron, cuándo sucedió y quién realizó la acción.',
    fields: 'Ver abre los datos anteriores y nuevos junto con el usuario de aplicación. El identificador del registro permite relacionar el evento con la operación.',
    workflow: 'Consulta esta pantalla para revisar cambios. El historial no se puede editar ni eliminar desde la aplicación.'
  },
  'admin/usuarios': {
    summary: 'Administra las cuentas que pueden iniciar sesión en la aplicación. Es independiente de los responsables del proceso de pago.',
    fields: 'Usuario de acceso y contraseña identifican la cuenta. Activo permite entrar; Inactivo impide el acceso. Las contraseñas nuevas requieren al menos 12 caracteres.',
    workflow: 'Después de crear la cuenta, asigna sus roles en Roles de usuarios. Cambiar su contraseña cierra sus sesiones. No puedes desactivar o eliminar tu propia cuenta.'
  },
  'admin/roles': {
    summary: 'Un rol agrupa cuentas con responsabilidades similares. Su nombre por sí solo no concede permisos.',
    fields: 'Nombre y descripción explican su propósito. Un rol inactivo deja de aportar permisos a las cuentas que lo tienen asignado.',
    workflow: 'Relaciona el rol con perfiles y asígnalo a usuarios. Los permisos efectivos se definen por las acciones permitidas en los perfiles.'
  },
  'admin/perfiles': {
    summary: 'Un perfil reúne permisos para distintas secciones de la aplicación. Los roles pueden compartir un mismo perfil.',
    fields: 'Nombre y descripción identifican el conjunto de permisos. Si está inactivo, deja de aportar acceso.',
    workflow: 'Define sus acciones en Permisos de perfiles y después vincúlalo a un rol en Perfiles de roles.'
  },
  'admin/menus': {
    summary: 'Representa las secciones a las que puede dar acceso un perfil. Crear un menú no concede automáticamente acceso a nadie.',
    fields: 'Nombre identifica la sección y ruta selecciona el módulo existente. Orden conserva su posición registrada; Activo permite que aporte acceso.',
    workflow: 'Utiliza una ruta conocida de la lista. Después concede acciones para ese menú en Permisos de perfiles.'
  },
  'admin/usuario-roles': {
    summary: 'Asigna un rol a una cuenta de acceso. Una cuenta puede tener varios roles.',
    fields: 'Selecciona usuario y rol por su nombre. La asignación debe estar activa para que aporte permisos; la fecha se registra al crearla.',
    workflow: 'Crea primero usuario y rol. Los permisos solo se aplican si también están activos el rol, su relación con el perfil, el perfil y el menú.'
  },
  'admin/rol-perfiles': {
    summary: 'Vincula un rol con uno o varios conjuntos de permisos. Así las cuentas con ese rol reciben las acciones definidas por los perfiles.',
    fields: 'Selecciona el rol y el perfil. Activo aplica la relación; Inactivo la suspende sin borrar sus registros.',
    workflow: 'Crea ambos antes de relacionarlos y verifica que el perfil ya tenga permisos de menú definidos.'
  },
  'admin/perfil-menus': {
    summary: 'Define exactamente qué puede hacer un perfil en cada módulo: ver, crear, editar o eliminar.',
    fields: 'Selecciona perfil y menú. Cada interruptor permite o deniega una acción de forma independiente. Ver no implica poder modificar.',
    workflow: 'Concede solo las acciones necesarias. Para usar las pantallas normalmente se necesita Ver. Auditoría siempre es de consulta, aunque se marquen acciones de escritura.'
  }
};
