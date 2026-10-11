@echo off
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8080"
echo Jogo Madeireiro rodando em http://localhost:8080 - feche esta janela para parar.
node servir.js
