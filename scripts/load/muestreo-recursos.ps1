param(
  [string]$OutFile,
  [int]$Minutes = 36,
  [int]$Port = 3100
)

# Muestrea cada 30 s: memoria y CPU del proceso que escucha en el puerto del backend de prueba,
# y memoria usada por Redis (desde dentro del contenedor). Las conexiones de Postgres se miden
# aparte, ver README.md, porque el comando con comillas no sale bien desde PowerShell.
"ts,backend_pid,backend_ws_mb,backend_private_mb,backend_cpu_s,redis_used_memory_bytes" | Out-File -FilePath $OutFile -Encoding utf8

$end = (Get-Date).AddMinutes($Minutes)
while ((Get-Date) -lt $end) {
  $ts = (Get-Date).ToString('s')
  $pidVal = ''; $ws = ''; $priv = ''; $cpu = ''
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    $pidVal = [int]$conn.OwningProcess
    $proc = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
    if ($proc) {
      $ws = [math]::Round($proc.WorkingSet64 / 1MB, 1)
      $priv = [math]::Round($proc.PrivateMemorySize64 / 1MB, 1)
      $cpu = [math]::Round($proc.CPU, 1)
    }
  }
  $rd = docker exec redis sh -c 'redis-cli --no-auth-warning -a "$REDIS_PASSWORD" info memory | grep "^used_memory:" | cut -d: -f2' 2>$null | Select-Object -First 1
  "$ts,$pidVal,$ws,$priv,$cpu,$rd" | Add-Content -Path $OutFile -Encoding utf8
  Start-Sleep -Seconds 30
}
"fin" | Add-Content -Path $OutFile -Encoding utf8
