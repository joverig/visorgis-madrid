@echo off
rem Descarga OpenLayers y las capabilities de la Comunidad de Madrid a www\lib y www\data
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0descargar_recursos.ps1"
pause
