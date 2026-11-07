# Modelos entidad relación finales

Verificados el 07-11-2026 contra los metadatos consultados de ambas bases. Incluyen todas las tablas, columnas, tipos, PK/FK, identidad y nulabilidad visibles. No contienen filas de negocio, credenciales ni valores de hashes.

El MER SQL ya representa SEGURIDAD_PROVEEDORES tras la migración confirmada y verificada; su propietario es ADMIN_SEGURIDAD_PROVEEDORES. Para regenerar únicamente ese modelo: `node scripts/export-mer.mjs sqlserver` y `python scripts/export-mer-pdf.py sqlserver`.

| Motor | Entidades | Columnas | Relaciones | Entrega |
| --- | ---: | ---: | ---: | --- |
| Oracle | 11 | 76 | 11 | [PDF final](final/MER-oracle-final.pdf), [SVG](final/oracle.svg), [Mermaid](oracle.md) |
| SQL Server | 7 | 33 | 6 | [PDF final](final/MER-sqlserver-final.pdf), [SVG](final/sqlserver.svg), [Mermaid](sqlserver.md) |

Cada PDF contiene el diagrama vectorial y una segunda página con el catálogo exacto de FK. La primera página tiene tamaño amplio para conservar la legibilidad al ampliar o imprimir; usar ajustar a página si se imprime en A4. En los extremos: círculo significa opcional, barra significa uno y pata de cuervo significa muchos. Una FK nullable permite cero o un padre; las restantes requieren uno. Una relación permite cero o muchos hijos. Las marcas NN e ID indican NOT NULL e identity. Las PK compuestas de las tablas de relación SQL se muestran en sus dos columnas.

Se conservan DOT y Mermaid editables, SVG y catálogos JSON de estructura. Los catálogos provienen de metadatos, no de inferencias sobre nombres. No hay relaciones físicas entre motores. La tabla de auditoría no tiene FK de negocio y registra el actor de aplicación en snapshots JSON.

## Volver a generar

1. `npm run db:inspect` renueva la evidencia local, que se excluye de Git.
2. Instalar Graphviz/WASM de forma opcional fuera del flujo de ejecución de la app: `npm install --no-save --package-lock=false @viz-js/viz@3.25.0`.
3. `node scripts/export-mer.mjs` genera fuentes y SVG a partir de esa evidencia. También admite `MER_VIZ_MODULE` apuntando al módulo disponible en un entorno de herramientas.
4. Con Python y reportlab instalados, `python scripts/export-mer-pdf.py` genera los PDF vectoriales. Revisar ambas páginas de cada PDF antes de entregar.

Estos archivos no crean diagramas internos en Oracle SQL Developer o SSMS. Para una demostración nativa, usar el explorador de tablas y FK existentes o hacer ingeniería inversa en SQL Developer Data Modeler. En SSMS usar View Dependencies o el diseñador de diagramas solo si el administrador lo habilita; no crear sysdiagrams ni conceder privilegios adicionales para la aplicación.
