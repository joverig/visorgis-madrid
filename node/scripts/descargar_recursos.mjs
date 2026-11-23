#!/usr/bin/env node
/*
 * Descarga a local lo que el visor puede tener en disco:
 *   1. OpenLayers (lib/ol/ol.js y ol.css): así no dependes del CDN.
 *   2. Capabilities WMTS de la Comunidad de Madrid (2,5 MB): se recortan
 *      a las ortofotos históricas y se guardan en data/cm_capabilities.xml
 *      + data/capas_cm.json. Solo van a la línea temporal (y al XML) las capas
 *      que tienen texto en js/capas.js → textosCM.
 *
 * Los mapas en sí (teselas WMS/WMTS) se siguen pidiendo a los servidores
 * oficiales del IGN y de la Comunidad.
 *
 * Uso:  node scripts/descargar_recursos.mjs   (o  npm run setup)
 * Requiere Node 18+ (fetch nativo).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'www');
const OL_VERSION = '10.5.0';
const OL_FILES = {
  'lib/ol/ol.js': `https://cdn.jsdelivr.net/npm/ol@${OL_VERSION}/dist/ol.js`,
  'lib/ol/ol.css': `https://cdn.jsdelivr.net/npm/ol@${OL_VERSION}/ol.css`,
};
const CM_CAPS = 'https://idem.comunidad.madrid/visor/release/vgcm/statics/capabilities/produccion/srvimagenes2_visorcartografia2.xml';
// Años a partir de los cuales ya hay PNOA del IGN en la línea temporal
const CM_ANIO_MAX = 2003;

async function bajar(url, tipo = 'text') {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} en ${url}`);
  return tipo === 'buffer' ? Buffer.from(await r.arrayBuffer()) : r.text();
}
async function guardar(rel, contenido) {
  const ruta = join(RAIZ, rel);
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, contenido);
  console.log('  ✔', rel, `(${(Buffer.byteLength(contenido) / 1024).toFixed(0)} KB)`);
}

async function descargarOL() {
  console.log(`OpenLayers ${OL_VERSION}`);
  for (const [rel, url] of Object.entries(OL_FILES)) await guardar(rel, await bajar(url, 'buffer'));
}

function primerTexto(bloque, etiqueta) {
  const m = bloque.match(new RegExp(`<(?:ows:)?${etiqueta}[^>]*>([\\s\\S]*?)</(?:ows:)?${etiqueta}>`));
  return m ? m[1].trim() : null;
}
function extraerAnio(title, id) {
  const t = (title || '').match(/^\s*(1[89]\d\d|20\d\d)\b/);
  if (t) return +t[1];
  // p.ej. fotosAereasHistoricas_1950-1959_1956-CT-50cm-mosaico -> 1956
  const i = (id || '').match(/_(1[89]\d\d|20\d\d)(?!-\d{4}_)(?=[-_])/g);
  return i ? +i[i.length - 1].slice(1, 5) : null;
}

export function procesarCapabilities(xml, seleccion = []) {
  const bloques = xml.match(/<Layer>[\s\S]*?<\/Layer>/g) || [];
  const capas = [];
  const guardados = [];
  for (const b of bloques) {
    const identifier = primerTexto(b, 'Identifier');
    const title = primerTexto(b, 'Title');
    const anio = extraerAnio(title, identifier);
    if (!identifier || !anio) continue;
    if (anio > CM_ANIO_MAX && !seleccion.includes(identifier)) continue; // posteriores a 2003: solo las elegidas
    if (/IRG|infr|falso|NDVI/i.test(identifier + ' ' + title)) continue; // infrarrojos fuera
    if (!/foto|orto|vuelo|aere/i.test(identifier + ' ' + title)) continue; // solo imágenes
    const activa = !seleccion.length || seleccion.includes(identifier);
    capas.push({ identifier, title, anio, activa });
    if (activa) guardados.push(b);
  }
  capas.sort((a, b) => a.anio - b.anio);
  // XML recortado: cabecera + capas elegidas + TileMatrixSets
  let recortado = xml;
  if (bloques.length) {
    const ini = xml.indexOf(bloques[0]);
    const finUltimo = xml.lastIndexOf(bloques[bloques.length - 1]) + bloques[bloques.length - 1].length;
    recortado = xml.slice(0, ini) + guardados.join('\n') + xml.slice(finUltimo);
  }
  return { capas, recortado, total: bloques.length };
}

async function descargarCM() {
  console.log('Comunidad de Madrid · ortofotos históricas');
  const xml = await bajar(CM_CAPS);
  const js = await readFile(join(RAIZ, 'js', 'capas.js'), 'utf8').catch(() => '');
  const seleccion = [...js.matchAll(/'(fotosAereas[^']+)'\s*:\s*\{/g)].map((m) => m[1]);
  const { capas, recortado, total } = procesarCapabilities(xml, seleccion);
  const activas = capas.filter((c) => c.activa);
  console.log(`  ${total} capas en el servicio, ${capas.length} históricas; ${activas.length} en la línea temporal (textosCM):`);
  activas.forEach((c) => console.log(`    ${c.anio}  ${c.title}`));
  await guardar('data/cm_capabilities.xml', recortado);
  await guardar('data/capas_cm.json', JSON.stringify(capas, null, 2));
}

async function main() {
  let ok = true;
  for (const [nombre, fn] of [['OpenLayers', descargarOL], ['Comunidad de Madrid', descargarCM]]) {
    try { await fn(); } catch (e) { ok = false; console.error(`  ✘ ${nombre}: ${e.message}`); }
  }
  console.log(ok ? '\nListo. Arranca con: npm start' : '\nTerminado con avisos (el visor funciona igualmente con CDN / sin capas CM).');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
