#!/usr/bin/env node
// Servidor estático mínimo, sin dependencias.  Uso: node server.mjs [puerto]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', 'www');
const PUERTO = +(process.argv[2] || process.env.PORT || 8080);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.tif': 'image/tiff', '.ico': 'image/x-icon', '.geojson': 'application/geo+json',
};

createServer(async (req, res) => {
  try {
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const fichero = normalize(join(RAIZ, ruta));
    if (!fichero.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
    if (!(await stat(fichero)).isFile()) throw new Error();
    res.writeHead(200, { 'Content-Type': MIME[extname(fichero).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache' });
    res.end(await readFile(fichero));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}).listen(PUERTO, () => console.log(`visorgis_madrid en http://localhost:${PUERTO}`));
