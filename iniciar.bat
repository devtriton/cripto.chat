@echo off
chcp 65001 >nul
title cripto.chat - Servidor
cd /d "%~dp0"

echo ==========================================
echo   cripto.chat - Iniciando servidor
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale em https://nodejs.org e execute este arquivo novamente.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/3] Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Dependencias OK.
)

echo [2/3] Sincronizando arquivos publicos...
node scripts\sync-public.js

echo [3/3] Iniciando servidor (HTTP 3000 + HTTPS 3443)...
echo.
echo   O navegador abrira em http://localhost:3000
echo   No celular, use o endereco "HTTPS na rede local" mostrado abaixo.
echo   O certificado e gerado/renovado automaticamente.
echo.

start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
node server\server.js

echo.
echo Servidor encerrado.
pause
