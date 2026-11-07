# Revertir la carga académica

Ejecutar `npm.cmd run db:seed:academic -- --rollback` desde la raíz.

Requiere el manifiesto local `.local/academic-load-2026-11-07.json`. El comando compara cada fila con su snapshot, rechaza datos modificados y elimina únicamente los IDs de esta carga, en una transacción con auditoría explícita de DELETE. Las FK impiden eliminar filas con nuevas dependencias. Si algo falla, se revierte todo. No borra auditoría ni reinicia secuencias. No hay DELETE masivo, recreación de tablas o cambios de permisos.

No reconstruir el manifiesto adivinando IDs. Conservarlo localmente; contiene referencias y snapshots y está excluido de Git. El comando de carga conserva un estado prepared antes de confirmar, de modo que un fallo de escritura del archivo posterior al commit no pierde los IDs necesarios para recuperación. Si el estado del commit es incierto, verificar la base antes de reintentar.
