@echo off
cd /d "%~dp0"
echo Magus Art - abre http://127.0.0.1:4173/admin/ no navegador.
echo Mantem esta janela aberta enquanto utilizas o gestor.
where node >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" tools/server.js
  ) else (
    echo Instala Node.js 20 ou superior para abrir o gestor.
  )
) else (
  node tools/server.js
)
pause
