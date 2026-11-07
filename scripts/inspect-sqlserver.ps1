param([switch]$HealthOnly)
$ErrorActionPreference = 'Stop'
$connection = $null
try {
  $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $sqlHost = if ($env:SQLSERVER_HOST) { $env:SQLSERVER_HOST } else { 'localhost' }
  $sqlInstance = if ($env:SQLSERVER_INSTANCE) { $env:SQLSERVER_INSTANCE } else { 'SQLEXPRESS' }
  $builder['Data Source'] = if ($env:SQLSERVER_PORT) { "tcp:$sqlHost,$($env:SQLSERVER_PORT)" } else { "$sqlHost\$sqlInstance" }
  $builder['Initial Catalog'] = if ($env:SQLSERVER_DATABASE) { $env:SQLSERVER_DATABASE } else { 'CuentasPorPagarDB' }
  $builder['Integrated Security'] = $true
  $builder['Encrypt'] = $env:SQLSERVER_ENCRYPT -ne 'false'
  $builder['TrustServerCertificate'] = $env:SQLSERVER_TRUST_CERTIFICATE -eq 'true'
  $builder['Connect Timeout'] = 5
  $connection = New-Object System.Data.SqlClient.SqlConnection $builder.ConnectionString
  $connection.Open()
  $command = $connection.CreateCommand()
  $command.CommandTimeout = 20
  if ($HealthOnly) { $command.CommandText = "SELECT DB_NAME() AS database_name, SUSER_SNAME() AS login_name, CAST(SERVERPROPERTY('IsIntegratedSecurityOnly') AS int) AS windows_only" }
  else { $command.CommandText = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../database/sqlserver/validation/001_inspect.sql') -Raw }
  $adapter = New-Object System.Data.SqlClient.SqlDataAdapter $command
  $dataset = New-Object System.Data.DataSet
  [void]$adapter.Fill($dataset)
  $sets = @()
  foreach ($table in $dataset.Tables) {
    $rows = @()
    foreach ($row in $table.Rows) {
      $item = [ordered]@{}
      foreach ($column in $table.Columns) { $value=$row[$column.ColumnName]; if ($value -is [DBNull]) { $value=$null }; $item[$column.ColumnName]=$value }
      $rows += $item
    }
    $sets += ,$rows
  }
  $directory = Join-Path $PSScriptRoot '../docs/evidence'
  [void](New-Item -ItemType Directory -Path $directory -Force)
  $name = if ($HealthOnly) { 'sqlserver-health.json' } else { 'sqlserver.json' }
  [ordered]@{ capturedAt=[DateTime]::UtcNow.ToString('o'); authentication='Windows'; recordsets=$sets } | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $directory $name) -Encoding UTF8
  Write-Output "SQL Server: conexion Windows correcta; evidencia en docs/evidence/$name"
} catch {
  $cause=$_.Exception
  while ($cause.InnerException) { $cause=$cause.InnerException }
  $code = if ($cause -is [System.Data.SqlClient.SqlException]) { $cause.Number } else { $cause.GetType().Name }
  Write-Output "SQL Server: conexion/inspeccion fallida; codigo=$code. No se confirma modo de autenticacion ni esquema."
  exit 1
} finally { if ($connection) { $connection.Dispose() } }

