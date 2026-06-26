# Entorno Python para sign_ai (Windows)
# Uso: cd sign_ai; .\setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "Creando venv..."
    py -3.11 -m venv venv
}

Write-Host "Instalando dependencias de entrenamiento..."
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\pip.exe install -r requirements_train.txt

Write-Host ""
Write-Host "Listo. Para entrenar:"
Write-Host "  .\train.ps1"
Write-Host ""
Write-Host "O activa el venv manualmente:"
Write-Host "  .\venv\Scripts\Activate.ps1"
Write-Host "  python 06_gnn_train.py"
