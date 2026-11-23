# Madrid en el tiempo · visorgis_madrid

Visor web de la evolución histórica de Madrid: una línea temporal con fundido entre
**recreaciones medievales** (s. IX – 1566), **planos históricos** (1622 – 1960) y
**fotografía aérea** (1927 – hoy), superpuestos a la ortofoto actual.

**Ver online:** https://joverig.github.io/visorgis-madrid/

## Funciones
- Slider temporal con fundido entre épocas, reproducción automática y atajos de teclado
  (← → año, espacio reproducir, H comparar con hoy).
- Botón **Ver hoy** para alternar entre la época elegida y la ortofoto actual.
- Control de **opacidad** para ver la época sobre la ortofoto actual.
- Texto de contexto histórico para cada paso, con qué buscar en el mapa.
- Capa de **límites, puertas e hitos** con fecha sobre todos los años: el límite vigente en continuo,
  los anteriores en discontinuo (murallas, cercas, Ensanche y término municipal provisional).
- Diseño adaptado a móvil (panel inferior desplegable, línea temporal desplazable).
- El estado (capa, zoom y centro) se guarda en la URL para compartir vistas.

## Estructura
- `www/` — el visor (HTML + CSS + JS, sin build). Es lo que se publica.
  - `js/capas.js` — pasos de la línea temporal y textos.
  - `js/visor.js` — lógica (OpenLayers 10, build UMD).
  - `lib/ol/` — OpenLayers en local.
  - `data/` — capabilities WMTS de la Comunidad de Madrid recortadas.
  - `datos_propios/recintos_madrid.geojson` — límites, puertas e hitos con fecha (`desde`/`hasta`); trazados aproximados.
- `1_Descargar_recursos.bat`, `descargar_recursos.ps1` — regeneran `lib/` y `data/` (Windows).
- `Arrancar_visor.bat` — servidor local en http://localhost:8080/.
- `node/` — alternativa con Node 18+ (`npm run setup`, `npm start`).

## Publicación
GitHub Pages sirve la rama `gh-pages`, que contiene una copia de `www/`.

## Fuentes y atribuciones
- Planos históricos, PNOA histórico, PNOA de máxima actualidad, MTN50 1ª edición e IGN Base:
  © Instituto Geográfico Nacional (CNIG), CC BY 4.0.
- Ortofotos históricas: © Comunidad de Madrid (IDEM), CC BY 4.0.
- Recreaciones medievales: elaboración propia, **trazado aproximado y orientativo**, a partir de
  bibliografía (Gea Ortigas y Castellanos Oñate; Malalana Ureña; Comunidad de Madrid,
  *Ruta arqueológica Madrid medieval*). No tienen valor arqueológico.
- [OpenLayers](https://openlayers.org/) (BSD-2-Clause).

## Licencia
Código bajo licencia MIT. Los datos cartográficos mantienen la licencia de su fuente.
