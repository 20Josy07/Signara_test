# Entrenar GCN+LSTM (usa el venv automaticamente)
# Uso: cd sign_ai; .\train.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$py = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
    Write-Host "No hay venv. Ejecuta primero: .\setup.ps1"
    exit 1
}

& $py 06_gnn_train.py @args
