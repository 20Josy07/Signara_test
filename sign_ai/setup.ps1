# Entorno Python para sign_ai (Windows)
# Uso: cd sign_ai; .\setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "Creando venv..."
    py -3.11 -m venv venv
}

Write-Host "Instalando dependencias..."
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\pip.exe install -r requirements_api.txt pandas scikit-learn

Write-Host ""
Write-Host "Listo. Activa el entorno con:"
Write-Host "  .\venv\Scripts\Activate.ps1"
Write-Host ""
Write-Host "Luego:"
Write-Host "  python 08_import_msl150.py --npy-dir C:\Users\josya\Desktop\MSL-150-Dataset\data\sample_npy"
Write-Host "  python 06_gnn_train.py"
Write-Host "  uvicorn api:app --port 8080"
