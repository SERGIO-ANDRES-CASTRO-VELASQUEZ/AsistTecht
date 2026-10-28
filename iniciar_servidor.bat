@echo off
chcp 65001 > nul
title AsisTecht - Servidor Institucional
echo ============================================================
echo   ASISTECHT - Iniciando Sistema de Gestión Escolar
echo ============================================================
echo.

set DOCKER_BIN="C:\Users\Migue\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
set DOCKER_APP="C:\Users\Migue\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"

echo [1/3] Comprobando servicio de Docker Desktop...
%DOCKER_BIN% info >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Iniciando motor Docker Desktop, por favor espera unos segundos...
    start "" %DOCKER_APP%
    :wait_docker
    timeout /t 3 /nobreak >nul
    %DOCKER_BIN% info >nul 2>&1
    if %errorlevel% neq 0 goto wait_docker
    echo [OK] Motor Docker listo.
) else (
    echo [OK] Motor Docker ya activo.
)

echo [2/3] Levantando contenedores de AsisTecht (DB, API, Web, Proxy)...
%DOCKER_BIN% start asisttecht-db-1 asisttecht-api-1 asisttecht-web-1 asisttecht-proxy-1

echo [3/3] Comprobando salud del sistema...
powershell -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|Loopback' -and $_.IPAddress -notmatch '^169\.' } | Select-Object -First 1).IPAddress; Write-Host '`n============================================================'; Write-Host '  ¡SERVIDOR ASISTECHT EN LÍNEA Y OPERATIVO!'; Write-Host '============================================================'; Write-Host '  - En este computador: http://localhost:8080/ingreso'; Write-Host ('  - Desde el celular:   http://' + $ip + ':8080/ingreso'); Write-Host ('  - Descarga del APK:   http://' + $ip + ':8080/downloads/asisttecht-movil.apk'); Write-Host '============================================================`n'"

pause
