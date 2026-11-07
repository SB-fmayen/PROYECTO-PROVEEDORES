# Reversión de realineación identity

No se ofrece un reinicio hacia atrás: podría volver a generar claves ya existentes. Esta operación solo realinea generadores con los datos actuales; no cambia datos, tipos, PK/FK ni modo BY DEFAULT. Oracle confirma DDL implícitamente y los valores de secuencia consumidos no son transaccionales. Si se interrumpe, revisar metadatos y repetir la realineación durante una ventana sin escrituras. No restaurar contadores antiguos en una base que ya recibió escrituras.
