@echo off
echo ========================================
echo  OBJ-EDU: Criptografia em Pratica
echo ========================================
echo.
echo Instalando dependencias do servidor...
cd server
call npm install
echo.
echo Iniciando servidor...
echo.
echo Abra http://localhost:3000 no navegador
echo Para multiplos usuarios, abra varias abas/janelas
echo ========================================
call npm start
pause
