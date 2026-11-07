// Generado de metadatos Oracle verificados el 2026-11-04T03:05:23.125Z. No contiene datos de negocio.
export interface ResourceField { name: string; type: 'number' | 'date' | 'text' | 'boolean'; maxBytes: number | null; precision: number | null; scale: number | null; nullable: boolean; identity: boolean; primaryKey: boolean; reference: string | null; generated?: boolean; }
export interface ResourceDefinition { table: string; slug: string; label: string; readOnly: boolean; fields: ResourceField[]; }
export const resources: ResourceDefinition[] = [
  {
    "table": "PROVEEDOR",
    "slug": "proveedores",
    "label": "Proveedores",
    "readOnly": false,
    "fields": [
      {
        "name": "IDPROVEEDOR",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "NIT",
        "type": "text",
        "maxBytes": 15,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "RAZONSOCIAL",
        "type": "text",
        "maxBytes": 150,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "DIRECCION",
        "type": "text",
        "maxBytes": 200,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "TIPOCONTRIBUYENTE",
        "type": "text",
        "maxBytes": 30,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "ESTADO",
        "type": "text",
        "maxBytes": 15,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "SALDOACTUAL",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "CENTRO_COSTO",
    "slug": "centros-costo",
    "label": "Centros de costo",
    "readOnly": false,
    "fields": [
      {
        "name": "IDCENTROCOSTO",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "NOMBRE",
        "type": "text",
        "maxBytes": 100,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "TIPO",
        "type": "text",
        "maxBytes": 30,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "DESCRIPCION",
        "type": "text",
        "maxBytes": 200,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "DOCUMENTO_COMPRA",
    "slug": "documentos-compra",
    "label": "Documentos de compra",
    "readOnly": false,
    "fields": [
      {
        "name": "IDDOCUMENTOCOMPRA",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "IDPROVEEDOR",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "proveedores"
      },
      {
        "name": "IDCENTROCOSTO",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "centros-costo"
      },
      {
        "name": "TIPODOCUMENTO",
        "type": "text",
        "maxBytes": 30,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "SERIE",
        "type": "text",
        "maxBytes": 10,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "NUMERODOCUMENTO",
        "type": "text",
        "maxBytes": 20,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "FECHAEMISION",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "FECHAVENCIMIENTO",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "SUBTOTAL",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "IVA",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "TOTAL",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "ESTADO",
        "type": "text",
        "maxBytes": 15,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "DETALLE_DOCUMENTO_COMPRA",
    "slug": "detalles",
    "label": "Detalles de compra",
    "readOnly": false,
    "fields": [
      {
        "name": "IDDETALLE",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "IDDOCUMENTOCOMPRA",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "documentos-compra"
      },
      {
        "name": "DESCRIPCION",
        "type": "text",
        "maxBytes": 200,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "CANTIDAD",
        "type": "number",
        "maxBytes": null,
        "precision": 10,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "PRECIOUNITARIO",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "MONTO",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "PAGO_BANCARIO",
    "slug": "pagos-bancarios",
    "label": "Pagos bancarios",
    "readOnly": false,
    "fields": [
      {
        "name": "IDPAGO",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "IDPROVEEDOR",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "proveedores"
      },
      {
        "name": "TIPOPAGO",
        "type": "text",
        "maxBytes": 20,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "NUMERODOCUMENTO",
        "type": "text",
        "maxBytes": 20,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "FECHA",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "MONTO",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "BANCO",
        "type": "text",
        "maxBytes": 50,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "ESTADO",
        "type": "text",
        "maxBytes": 20,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "RETENCION_ISR",
    "slug": "retenciones-isr",
    "label": "Retenciones ISR",
    "readOnly": false,
    "fields": [
      {
        "name": "IDRETENCION",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "IDDOCUMENTOCOMPRA",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "documentos-compra"
      },
      {
        "name": "MONTORETENIDO",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "FECHA",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "NUMEROCONSTANCIA",
        "type": "text",
        "maxBytes": 20,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "CONTRASENA_PAGO",
    "slug": "contrasenas-pago",
    "label": "Contraseñas de pago",
    "readOnly": false,
    "fields": [
      {
        "name": "IDCONTRASENA",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "IDDOCUMENTOCOMPRA",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "documentos-compra"
      },
      {
        "name": "IDUSUARIO",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "usuarios-negocio"
      },
      {
        "name": "FECHASOLICITUD",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "FECHAVENCIMIENTO",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "ESTADO",
        "type": "text",
        "maxBytes": 15,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "DOCUMENTO_POR_LIQUIDAR",
    "slug": "documentos-por-liquidar",
    "label": "Documentos por liquidar",
    "readOnly": false,
    "fields": [
      {
        "name": "IDLIQUIDACION",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "IDPAGO",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "pagos-bancarios"
      },
      {
        "name": "IDDOCUMENTOCOMPRA",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "documentos-compra"
      },
      {
        "name": "MONTOAPLICADO",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "SALDOPENDIENTE",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "FECHALIQUIDACION",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "ASIENTO_CONTABLE",
    "slug": "asientos-contables",
    "label": "Asientos contables",
    "readOnly": false,
    "fields": [
      {
        "name": "IDASIENTO",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "IDDOCUMENTOCOMPRA",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": false,
        "reference": "documentos-compra"
      },
      {
        "name": "IDPAGO",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": "pagos-bancarios"
      },
      {
        "name": "FECHA",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "CUENTACONTABLE",
        "type": "text",
        "maxBytes": 20,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "DEBE",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "HABER",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 2,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "PERIODO",
        "type": "text",
        "maxBytes": 10,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "USUARIO",
    "slug": "usuarios-negocio",
    "label": "Responsables de negocio",
    "readOnly": false,
    "fields": [
      {
        "name": "IDUSUARIO",
        "type": "number",
        "maxBytes": null,
        "precision": null,
        "scale": 0,
        "nullable": false,
        "identity": true,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "NOMBRE",
        "type": "text",
        "maxBytes": 100,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "ROL",
        "type": "text",
        "maxBytes": 50,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "ESTADO",
        "type": "text",
        "maxBytes": 15,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  },
  {
    "table": "LOG_AUDITORIA_ODC",
    "slug": "auditoria",
    "label": "Auditoría",
    "readOnly": true,
    "fields": [
      {
        "name": "ID_AUDITORIA",
        "type": "number",
        "maxBytes": null,
        "precision": 12,
        "scale": 0,
        "nullable": false,
        "identity": false,
        "primaryKey": true,
        "reference": null
      },
      {
        "name": "NOMBRE_TABLA",
        "type": "text",
        "maxBytes": 50,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "OPERACION",
        "type": "text",
        "maxBytes": 20,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "USUARIO_DB",
        "type": "text",
        "maxBytes": 100,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "FECHA_HORA",
        "type": "date",
        "maxBytes": null,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "ID_REGISTRO",
        "type": "text",
        "maxBytes": 100,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "DATOS_ANTERIORES",
        "type": "text",
        "maxBytes": 4000,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "DATOS_NUEVOS",
        "type": "text",
        "maxBytes": 4000,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "IP_ORIGEN",
        "type": "text",
        "maxBytes": 50,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      },
      {
        "name": "HOST_ORIGEN",
        "type": "text",
        "maxBytes": 255,
        "precision": null,
        "scale": null,
        "nullable": true,
        "identity": false,
        "primaryKey": false,
        "reference": null
      }
    ]
  }
];
