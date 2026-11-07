import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
// Opcional: npm install --no-save @viz-js/viz; no es dependencia de la app.
const require = createRequire(import.meta.url);
const { instance } = require(process.env.MER_VIZ_MODULE || '@viz-js/viz');
const viz = await instance();
const oracle = JSON.parse(await readFile('docs/evidence/oracle.json', 'utf8'));
const sql = JSON.parse(await readFile('docs/evidence/sqlserver.json', 'utf8'));
const dest = 'docs/mer/final'; await mkdir(dest, { recursive: true });
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const ocols = oracle.results.find(r => r.query.includes('FROM all_tab_columns')).rows;
const okeys = oracle.results.find(r => r.query.includes('FROM all_constraints')).rows;
const okcols = oracle.results.find(r => r.query.includes('FROM all_cons_columns')).rows;
const oid = name => okeys.find(k => k.CONSTRAINT_NAME === name);
const orows = ocols.map(c => ({ table: c.TABLE_NAME, column: c.COLUMN_NAME,
  type: c.DATA_TYPE + (c.DATA_TYPE === 'VARCHAR2' ? `(${c.DATA_LENGTH} BYTE)` : c.DATA_PRECISION ? `(${c.DATA_PRECISION},${c.DATA_SCALE ?? 0})` : ''),
  nullable: c.NULLABLE === 'Y', identity: c.IDENTITY_COLUMN === 'YES',
  pk: okcols.some(k => k.TABLE_NAME === c.TABLE_NAME && k.COLUMN_NAME === c.COLUMN_NAME && oid(k.CONSTRAINT_NAME)?.CONSTRAINT_TYPE === 'P'),
  fk: okcols.some(k => k.TABLE_NAME === c.TABLE_NAME && k.COLUMN_NAME === c.COLUMN_NAME && oid(k.CONSTRAINT_NAME)?.CONSTRAINT_TYPE === 'R') }));
const orels = okeys.filter(k => k.CONSTRAINT_TYPE === 'R').map(k => {
  const child = okcols.find(c => c.CONSTRAINT_NAME === k.CONSTRAINT_NAME);
  const parent = okcols.find(c => c.CONSTRAINT_NAME === k.R_CONSTRAINT_NAME);
  if (!child || !parent) throw new Error('FK metadata incomplete');
  return { name: k.CONSTRAINT_NAME, child: child.TABLE_NAME, childCol: child.COLUMN_NAME, parent: parent.TABLE_NAME, parentCol: parent.COLUMN_NAME };
});
const srows = sql.recordsets[1].map(c => ({ table: c.table_name, column: c.column_name,
  type: c.data_type + (['varchar','nvarchar','char'].includes(c.data_type) ? `(${c.max_length === -1 ? 'MAX' : c.max_length})` : ['decimal','numeric'].includes(c.data_type) ? `(${c.precision},${c.scale})` : ''),
  nullable: c.is_nullable, identity: c.is_identity,
  pk: sql.recordsets[2].some(k => k.table_name === c.table_name && k.column_name === c.column_name && k.type_desc === 'PRIMARY_KEY_CONSTRAINT'),
  fk: sql.recordsets[3].some(k => k.parent_table === c.table_name && k.parent_column === c.column_name) }));
const srels = sql.recordsets[3].map(k => ({ name: k.name, child: k.parent_table, childCol: k.parent_column, parent: k.referenced_table, parentCol: k.referenced_column }));
const sqlSchemas = [...new Set(sql.recordsets[1].map(c => c.schema_name))];
if (sqlSchemas.length !== 1 || !['dbo', 'SEGURIDAD_PROVEEDORES'].includes(sqlSchemas[0])) throw new Error('SQL schema ambiguous');
for (const [engine, rows, rels, title, subtitle] of [
  ['oracle', orows, orels, 'Oracle | Cuentas por pagar', 'ADMIN_CU_PROVEEDORES - 11 tablas - 11 relaciones FK'],
  ['sqlserver', srows, srels, 'SQL Server | Seguridad de aplicacion', `CuentasPorPagarDB / ${sqlSchemas[0]} - 7 tablas - 6 relaciones FK`]
]) {
  const tables = [...new Set(rows.map(r => r.table))].sort();
  const dot = ['digraph MER {', 'graph [rankdir=LR, bgcolor="white", pad=0.4, nodesep=0.6, ranksep=1.2, splines=polyline, fontname="Arial", labelloc=t, labeljust=l, fontsize=26, label="' + title + '\\n' + subtitle + '\\nVerificado 2026-11-07 | PK: primaria, FK: foranea, NN: obligatorio, ID: identity"];',
    'node [shape=plain, fontname="Arial"];', 'edge [color="#64748b", arrowsize=0.7, fontname="Arial", fontsize=10];'];
  for (const table of tables) {
    dot.push(`"${table}" [label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="7" COLOR="#cbd5e1"><TR><TD COLSPAN="3" BGCOLOR="#16324f"><FONT COLOR="white"><B>${esc(table)}</B></FONT></TD></TR>` +
      rows.filter(r => r.table === table).map(r => `<TR><TD ALIGN="LEFT" PORT="${r.column}">${esc(r.column)}</TD><TD ALIGN="LEFT">${esc(r.type)}</TD><TD ALIGN="LEFT">${[r.pk && 'PK', r.fk && 'FK', !r.nullable && 'NN', r.identity && 'ID'].filter(Boolean).join(' ')}</TD></TR>`).join('') + '</TABLE>>];');
  }
  for (const r of rels) {
    const nullable = rows.find(c => c.table === r.child && c.column === r.childCol)?.nullable;
    dot.push(`"${r.parent}" -> "${r.child}" [dir=both, arrowtail=${nullable ? 'odottee' : 'teetee'}, arrowhead=odotcrow, tooltip="${esc(r.name)}: ${r.childCol} -> ${r.parentCol}"];`);
  }
  dot.push('}');
  const source = dot.join('\n');
  await writeFile(`${dest}/${engine}.dot`, source);
  const rendered = viz.renderString(source, { format: 'svg', engine: 'dot' });
  await writeFile(`${dest}/${engine}.svg`, rendered);
  const dictionary = { engine, verifiedAt: '2026-11-07', tables: tables.map(name => ({ name, columns: rows.filter(r => r.table === name).map(({ table, ...r }) => r) })), relations: rels };
  await writeFile(`${dest}/${engine}-schema.json`, JSON.stringify(dictionary, null, 2));
  const mermaid = ['erDiagram'];
  for (const table of tables) {
    mermaid.push(`  ${table} {`);
    for (const c of rows.filter(r => r.table === table)) mermaid.push(`    ${c.type.replaceAll(' BYTE', '')} ${c.column}${c.pk || c.fk ? ' ' + [c.pk && 'PK', c.fk && 'FK'].filter(Boolean).join(',') : ''}`);
    mermaid.push('  }');
  }
  for (const rel of rels) {
    const nullable = rows.find(c => c.table === rel.child && c.column === rel.childCol)?.nullable;
    mermaid.push(`  ${rel.parent} ${nullable ? 'o|' : '||'}--o{ ${rel.child} : ${rel.name}`);
  }
  await writeFile(`${dest}/${engine}.mmd`, mermaid.join('\n') + '\n');
  await writeFile(`docs/mer/${engine}.md`, `# MER final ${engine}\n\nVerificado el 2026-11-07 contra metadatos de la base. Tipos, claves y nulabilidad completos en [el catalogo](final/${engine}-schema.json).\n\n[PDF final](final/MER-${engine}-final.pdf) | [SVG](final/${engine}.svg) | [Fuente DOT](final/${engine}.dot) | [Fuente Mermaid](final/${engine}.mmd)\n\n\x60\x60\x60mermaid\n${mermaid.join('\n')}\n\x60\x60\x60\n\nSin FK entre motores. La auditoria se registra desde la aplicacion; no se crean triggers. USUARIO de Oracle representa responsables funcionales; USUARIO de SQL Server autentica cuentas de aplicacion.\n`);
  console.log(`${engine}: ${tables.length} tablas, ${rows.length} columnas, ${rels.length} relaciones; DOT y SVG exportados.`);
}
