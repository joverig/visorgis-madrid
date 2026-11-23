@echo off
rem Arranca visorgis_madrid en http://localhost:8080/ (Ctrl+C para pararlo)
rem Usa el PHP portable del entorno VisorGIS (..\VisorGIS\php) solo como servidor estatico.
set "PHP=%~dp0..\VisorGIS\php\php.exe"
if not exist "%~dp0www\index.html" (echo Falta el codigo en www & pause & exit /b 1)
if not exist "%~dp0www\lib\ol\ol.js" echo Aviso: sin www\lib\ol, se usara OpenLayers del CDN. Ejecuta 1_Descargar_recursos.bat
if not exist "%~dp0www\data\capas_cm.json" echo Aviso: sin www\data, no saldran las ortofotos de la Comunidad. Ejecuta 1_Descargar_recursos.bat
if exist "%PHP%" (
  start "" "http://localhost:8080/"
  "%PHP%" -n -S localhost:8080 -t "%~dp0www"
  exit /b
)
where node >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8080/"
  node "%~dp0node\server.mjs" 8080
  exit /b
)
echo No hay servidor: falta ..\VisorGIS\php\php.exe (1_Instalar_PHP.bat de VisorGIS) y no hay Node.
pause
