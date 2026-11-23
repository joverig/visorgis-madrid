@echo off
rem Descarga el termino municipal (OSM) y comprueba que anos del PNOA y de la Comunidad tienen imagen sobre Madrid.
rem Resultados: carpeta comprobaciones\  y  www\datos_propios\termino_municipal_osm.geojson
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0comprobar_fuentes.ps1"
pause
