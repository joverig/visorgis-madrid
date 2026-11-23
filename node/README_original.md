# visorgis_madrid · Madrid en el tiempo

Visor web con OpenLayers que recorre la evolución de Madrid desde 1622 hasta hoy.
Abajo hay un slider temporal que funde una época con la siguiente.

## Arranque en local

```bash
npm run setup   # descarga OpenLayers a lib/ y las ortofotos históricas de la Comunidad a data/
npm start       # http://localhost:8080
```

No hay dependencias npm: basta con Node 18 o superior. El visor también arranca sin
`npm run setup`, cargando OpenLayers desde el CDN, pero entonces no salen las ortofotos de la Comunidad.
Ábrelo siempre por `http://` y no con doble clic (`file://`), porque si no el navegador bloquea los `fetch` de `data/`.

## Controles
- Slider: arrastra para fundir entre años. También puedes hacer clic en cualquier marca.
- ▶ / espacio: reproduce la secuencia completa. ← →: año anterior o siguiente.
- "Ir a…": lugares guardados (Sol, Castellana, Ensanche, PAU…).
- Panel: ortofoto actual en gris de fondo y calles actuales encima.
- La URL guarda la capa, el centro y el zoom (`#capa=texeira&z=16&c=-3.70,40.41`), así que puedes compartir enlaces.

## Fuentes (todas abiertas, CC BY 4.0)

| Época | Servicio | Capas |
|---|---|---|
| 1622–1960 planos | WMS IGN `https://www.ign.es/wms/planos` | mancelliMadrid, texeira, chalmadrierMadrid, espinosaMadrid, geometricoMadrid, madozMadrid, ibanezMadrid, facundoMadrid, nunezMadrid, ayuntamientoMadrid, parcelarioMadrid |
| c. 1875 alrededores | WMS IGN `https://www.ign.es/wms/primera-edicion-mtn` | MTN50 |
| 1927–2003 ortofotos | WMTS Comunidad de Madrid (IDEM) `srvimagenes2/ogc/wmts/visorcartografia2` | detectadas por `npm run setup` → `data/capas_cm.json` |
| 1956–2024 ortofotos | WMS IGN `https://www.ign.es/wms/pnoa-historico` | AMS_1956-1957, Interministerial_1973-1986, Nacional_1981-1986, OLISTAT, PNOA20xx |
| Hoy | WMTS IGN `pnoa-ma` + `ign-base` (calles) | OI.OrthoimageCoverage, IGNBaseOrto |

## Personalizar
- **Añadir o quitar años:** edita `js/capas.js`. Cada entrada lleva `anio` (para ordenar), `etiqueta`, `tipo` (`plano` o `foto`) y `fuente` (`wms` o `xyz`).
- **Ocultar una ortofoto de la Comunidad:** pon `"activa": false` en `data/capas_cm.json`.
- **Capas propias en local** (un GeoTIFF georreferenciado, por ejemplo): conviértelas a teselas con
  `gdal2tiles.py --xyz -z 12-18 mi_plano.tif data/tiles/mi_plano` y añádelas en `capas.js` con
  `fuente: { type: 'xyz', url: 'data/tiles/mi_plano/{z}/{x}/{y}.png' }`.

## Producción
Es un sitio 100 % estático (`index.html`, `css/`, `js/`, `lib/`, `data/`). Basta con copiarlo a cualquier
servidor web (IIS, nginx, Azure Static Web Apps…). `server.mjs` solo sirve para desarrollo.
Hay que mantener las atribuciones del IGN y de la Comunidad de Madrid.
