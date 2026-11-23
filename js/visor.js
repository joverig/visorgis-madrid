/* visorgis_madrid · lógica del visor (OpenLayers, build UMD global `ol`) */
(function () {
  'use strict';

  const C = window.VISOR_CONFIG;
  const $ = (s) => document.querySelector(s);
  const estado = { v: 0, idxMostrado: -1, reproduciendo: false, verHoy: false };
  let capas = [];
  let map, view, capaFondo, capaCalles, grupoHistorico;

  /* ---------- Fuentes ---------- */
  function crearSource(c) {
    const f = c.fuente;
    const comunes = { attributions: c.atribucion, transition: 0 };
    if (f.type === 'wms') {
      return new ol.source.TileWMS(Object.assign({
        url: f.url,
        params: {
          LAYERS: f.layers, VERSION: f.version || '1.3.0', STYLES: '',
          FORMAT: f.format || 'image/png', TRANSPARENT: true,
        },
      }, comunes));
    }
    if (f.type === 'xyz') {
      return new ol.source.XYZ(Object.assign({ url: f.url, maxZoom: f.maxZoom || 20 }, comunes));
    }
    if (f.type === 'wmts-opts') {
      return new ol.source.WMTS(Object.assign({}, f.options, comunes));
    }
    throw new Error('Tipo de fuente no soportado: ' + f.type);
  }

  /* ---------- Recreaciones vectoriales (antes de 1622) ---------- */
  // Un único origen GeoJSON compartido; cada paso dibuja su fase rellena,
  // las fases anteriores en discontinuo y las puertas hasta esa fase.
  const fuentesGeojson = {};
  function fuenteGeojson(url) {
    if (!fuentesGeojson[url]) {
      fuentesGeojson[url] = new ol.source.Vector({ url, format: new ol.format.GeoJSON() });
    }
    return fuentesGeojson[url];
  }
  function estiloRecreacion(fase) {
    const S = ol.style;
    const actual = new S.Style({
      fill: new S.Fill({ color: 'rgba(214, 120, 64, 0.30)' }),
      stroke: new S.Stroke({ color: '#e98a4f', width: 3.5 }),
    });
    const anterior = new S.Style({
      stroke: new S.Stroke({ color: 'rgba(245, 225, 190, 0.85)', width: 2, lineDash: [7, 6] }),
    });
    const cacheTxt = {};
    const etiqueta = (nombre, hito, zoom) => {
      const k = nombre + hito + (zoom >= 16);
      if (!cacheTxt[k]) {
        cacheTxt[k] = new S.Style({
          image: new S.Circle({ radius: hito ? 6 : 4.5,
            fill: new S.Fill({ color: hito ? '#f3d27a' : '#e98a4f' }),
            stroke: new S.Stroke({ color: '#1a1816', width: 1.5 }) }),
          text: zoom >= 16 || hito ? new S.Text({
            text: nombre, offsetY: -14, font: (hito ? '600 13px' : '12px') + ' "Segoe UI", sans-serif',
            fill: new S.Fill({ color: '#fff7ea' }), stroke: new S.Stroke({ color: '#1a1816', width: 3.5 }),
          }) : undefined,
        });
      }
      return cacheTxt[k];
    };
    return (feat, res) => {
      const f = feat.get('fase');
      if (f > fase) return null;
      if (feat.get('tipo') === 'recinto') return f === fase ? actual : anterior;
      const zoom = view ? view.getZoomForResolution(res) : 16;
      return etiqueta(feat.get('nombre'), feat.get('tipo') === 'hito', zoom);
    };
  }

  /* ---------- Ortofotos históricas de la Comunidad de Madrid (opcional) ---------- */
  async function cargarCapasCM() {
    try {
      const r = await fetch('data/capas_cm.json', { cache: 'no-store' });
      if (!r.ok) return [];
      const lista = await r.json();
      const xr = await fetch('data/cm_capabilities.xml', { cache: 'no-store' });
      if (!xr.ok) return [];
      const caps = new ol.format.WMTSCapabilities().read(await xr.text());
      const optsFn = (ol.source.WMTS && ol.source.WMTS.optionsFromCapabilities) ||
                     (ol.source.wmts && ol.source.wmts.optionsFromCapabilities);
      if (!optsFn) { console.warn('optionsFromCapabilities no disponible'); return []; }
      const salida = [];
      // Si capas.js trae textos para la Comunidad, solo se usan esas capas (selección curada)
      const textos = C.textosCM || {};
      const curada = Object.keys(textos).length > 0;
      for (const l of lista.filter((x) => (curada ? textos[x.identifier] : x.activa !== false))) {
        let opts = null;
        for (const ms of ['EPSG3857', 'MD:GoogleMapsCompatible', 'OGC:1.0:GoogleMapsCompatible']) {
          try {
            const o = optsFn(caps, { layer: l.identifier, matrixSet: ms });
            if (o && o.matrixSet === ms) { opts = o; break; }
          } catch (e) { /* probar siguiente */ }
        }
        if (!opts) { console.warn('Sin TileMatrixSet 3857 para', l.identifier); continue; }
        const t = textos[l.identifier] || {};
        salida.push({
          id: 'cm_' + l.anio, anio: l.anio + 0.5, etiqueta: t.etiqueta || String(l.anio),
          titulo: t.titulo || l.title, tipo: 'foto',
          descripcion: t.descripcion || 'Ortofoto histórica de la Comunidad de Madrid (' + l.title + ').',
          fuente: { type: 'wmts-opts', options: opts },
          atribucion: '© Comunidad de Madrid · IDEM, CC BY 4.0',
        });
      }
      console.info('Ortofotos de la Comunidad de Madrid añadidas:', salida.length);
      return salida;
    } catch (e) {
      console.info('Sin ortofotos de la Comunidad (ejecuta 1_Descargar_recursos.bat y abre con Arrancar_visor.bat):', e.message);
      return [];
    }
  }

  /* ---------- Carga de teselas (indicador) ---------- */
  let pendientes = 0;
  function engancharCarga(source) {
    const ind = $('#cargando');
    const upd = () => ind.classList.toggle('visible', pendientes > 0);
    source.on('tileloadstart', () => { pendientes++; upd(); });
    const fin = () => { pendientes = Math.max(0, pendientes - 1); upd(); };
    source.on('tileloadend', fin);
    source.on('tileloaderror', fin);
  }

  const esMovil = () => window.matchMedia('(max-width: 760px), (max-height: 500px)').matches;

  /* ---------- Mapa ---------- */
  function crearMapa() {
    view = new ol.View({
      center: ol.proj.fromLonLat(C.centro), zoom: C.zoom,
      minZoom: C.minZoom, maxZoom: C.maxZoom,
    });

    capaFondo = new ol.layer.Tile({
      className: 'capa-fondo', zIndex: 0, preload: 1,
      source: new ol.source.XYZ({ url: C.fondo.url, attributions: C.fondo.atribucion }),
    });
    capaCalles = new ol.layer.Tile({
      className: 'capa-calles', zIndex: 50, visible: false, opacity: 0.85,
      source: new ol.source.XYZ({ url: C.calles.url, attributions: C.calles.atribucion }),
    });

    capas.forEach((c, k) => {
      if (c.fuente.type === 'geojson') {
        c.layer = new ol.layer.Vector({
          source: fuenteGeojson(c.fuente.url), style: estiloRecreacion(c.fuente.fase),
          visible: false, zIndex: 10, declutter: true,
        });
      } else {
        const src = crearSource(c);
        engancharCarga(src);
        c.layer = new ol.layer.Tile({ source: src, visible: false, zIndex: 10, preload: 0 });
      }
      c.layer.set('idx', k);
    });

    // Todas las capas de la línea temporal en un grupo: así se ocultan de golpe con "Ver hoy"
    grupoHistorico = new ol.layer.Group({ layers: capas.map((c) => c.layer), zIndex: 10 });

    map = new ol.Map({
      target: 'mapa',
      view,
      layers: [capaFondo, grupoHistorico, capaCalles],
    });
    map.addControl(new ol.control.ScaleLine({ units: 'metric' }));
    // Atribuciones plegables en pantallas pequeñas
    map.getControls().forEach((ctl) => {
      if (ctl instanceof ol.control.Attribution) {
        const ajustar = () => { const m = esMovil(); ctl.setCollapsible(m); ctl.setCollapsed(m); };
        ajustar();
        window.matchMedia('(max-width: 760px), (max-height: 500px)').addEventListener('change', ajustar);
      }
    });
    map.on('moveend', guardarHash);
  }

  /* ---------- Línea temporal ---------- */
  function construirTimeline() {
    const n = capas.length;
    const slider = $('#slider');
    slider.min = 0; slider.max = n - 1; slider.step = 0.01;
    const marcas = $('#marcas');
    marcas.innerHTML = '';
    document.documentElement.style.setProperty('--n-marcas', n);
    capas.forEach((c, k) => {
      const m = document.createElement('button');
      m.className = 'marca ' + c.tipo + (k % 2 ? ' abajo' : '');
      m.style.left = (n > 1 ? (k / (n - 1)) * 100 : 0) + '%';
      m.title = c.titulo;
      m.innerHTML = '<span class="punto"></span><span class="txt">' + c.etiqueta + '</span>';
      m.addEventListener('click', () => { parar(); animarA(k); });
      marcas.appendChild(m);
    });
  }

  function aplicar(v) {
    if (estado.verHoy) verHoy(false);
    const n = capas.length;
    v = Math.max(0, Math.min(n - 1, v));
    estado.v = v;
    const i = Math.floor(v);
    const f = +(v - i).toFixed(3);
    capas.forEach((c, k) => {
      const L = c.layer;
      if (k === i) { L.setVisible(true); L.setOpacity(1); L.setZIndex(10); }
      else if (k === i + 1 && f > 0) { L.setVisible(true); L.setOpacity(f); L.setZIndex(11); }
      else L.setVisible(false);
    });
    $('#slider').value = v;
    const idx = f >= 0.5 ? i + 1 : i;
    if (idx !== estado.idxMostrado) mostrarInfo(idx);
  }

  /* ---------- Comparar con hoy ---------- */
  // Oculta la capa histórica y muestra la ortofoto actual en color; otro clic (o H) la devuelve.
  function verHoy(activar) {
    if (activar === estado.verHoy) return;
    estado.verHoy = activar;
    grupoHistorico.setVisible(!activar);
    capaFondo.setVisible(activar || $('#chk-fondo').checked || grupoHistorico.getOpacity() < 1);
    document.body.classList.toggle('ver-hoy', activar);
    const b = $('#hoy');
    if (activar) {
      b.textContent = 'Ver ' + capas[estado.idxMostrado].etiqueta;
      b.title = 'Volver a ' + capas[estado.idxMostrado].titulo + ' (H)';
      $('#anio').textContent = 'Hoy';
    } else {
      b.textContent = 'Ver hoy';
      b.title = 'Comparar con la ortofoto actual (H)';
      mostrarInfo(estado.idxMostrado);
    }
    b.classList.toggle('activo', activar);
  }

  function mostrarInfo(idx) {
    estado.idxMostrado = idx;
    const c = capas[idx];
    $('#anio').textContent = c.etiqueta;
    $('#titulo').textContent = c.titulo;
    const d = $('#descripcion');
    d.innerHTML = '';
    [].concat(c.descripcion || []).forEach((txt) => {
      const p = document.createElement('p');
      if (/^En el mapa:/.test(txt)) {
        p.className = 'en-mapa';
        p.innerHTML = '<b>En el mapa:</b> ';
        p.appendChild(document.createTextNode(txt.replace(/^En el mapa:\s*/, '')));
      } else p.textContent = txt;
      d.appendChild(p);
    });
    d.scrollTop = 0;
    $('.panel-cuerpo').scrollTop = 0;
    centrarMarca(idx);
    $('#fuente').textContent = c.atribucion || '';
    const t = $('#tipo');
    t.textContent = { plano: 'Plano histórico', foto: 'Fotografía aérea',
      recreacion: 'Recreación aproximada' }[c.tipo] || '';
    t.className = 'tipo ' + c.tipo;
    document.querySelectorAll('.marca').forEach((m, k) => m.classList.toggle('activa', k === idx));
    guardarHash();
  }

  // En móvil la línea temporal se desplaza: mantener visible el año activo
  function centrarMarca(idx) {
    const pista = $('.pista-scroll');
    const m = document.querySelectorAll('.marca')[idx];
    if (!pista || !m || pista.scrollWidth <= pista.clientWidth) return;
    const x = m.offsetLeft - pista.clientWidth / 2;
    pista.scrollTo({ left: x, behavior: estado.reproduciendo ? 'smooth' : 'auto' });
  }

  /* ---------- Animación y reproducción ---------- */
  let rafAnim = null;
  function animarA(objetivo, ms = 450) {
    cancelAnimationFrame(rafAnim);
    const desde = estado.v, t0 = performance.now();
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      aplicar(desde + (objetivo - desde) * e);
      if (p < 1) rafAnim = requestAnimationFrame(paso);
    };
    rafAnim = requestAnimationFrame(paso);
  }

  let rafPlay = null, ultimo = 0, espera = 0;
  function reproducir() {
    const n = capas.length;
    if (estado.v >= n - 1) aplicar(0);
    estado.reproduciendo = true;
    $('#play').textContent = '❚❚';
    $('#play').title = 'Pausa (espacio)';
    espera = C.pausaSeg;
    ultimo = performance.now();
    const tick = (t) => {
      if (!estado.reproduciendo) return;
      const dt = (t - ultimo) / 1000; ultimo = t;
      if (espera > 0) espera -= dt;
      else {
        const sig = Math.floor(estado.v + 1e-6) + 1;
        let v = estado.v + dt / C.transicionSeg;
        if (v >= sig) { v = sig; espera = C.pausaSeg; }
        aplicar(v);
        if (v >= n - 1) { parar(); return; }
      }
      rafPlay = requestAnimationFrame(tick);
    };
    rafPlay = requestAnimationFrame(tick);
  }
  function parar() {
    estado.reproduciendo = false;
    cancelAnimationFrame(rafPlay);
    $('#play').textContent = '▶';
    $('#play').title = 'Reproducir (espacio)';
  }

  /* ---------- Estado en la URL ---------- */
  let hashTimer = null;
  function guardarHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      if (!view || estado.idxMostrado < 0) return;
      const [lon, lat] = ol.proj.toLonLat(view.getCenter());
      const h = 'capa=' + capas[estado.idxMostrado].id + '&z=' + view.getZoom().toFixed(2) +
                '&c=' + lon.toFixed(5) + ',' + lat.toFixed(5);
      history.replaceState(null, '', '#' + h);
    }, 300);
  }
  function leerHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const id = p.get('capa');
    const idx = id ? capas.findIndex((c) => c.id === id) : -1;
    if (p.get('c')) {
      const [lon, lat] = p.get('c').split(',').map(Number);
      if (isFinite(lon) && isFinite(lat)) view.setCenter(ol.proj.fromLonLat([lon, lat]));
    }
    if (p.get('z') && isFinite(+p.get('z'))) view.setZoom(+p.get('z'));
    return idx;
  }

  /* ---------- Controles ---------- */
  function enlazarControles() {
    const slider = $('#slider');
    slider.addEventListener('input', () => { parar(); cancelAnimationFrame(rafAnim); aplicar(+slider.value); });
    slider.addEventListener('change', () => animarA(Math.round(+slider.value), 250));
    $('#play').addEventListener('click', () => (estado.reproduciendo ? parar() : reproducir()));
    $('#prev').addEventListener('click', () => { parar(); animarA(Math.max(0, Math.round(estado.v) - 1)); });
    $('#next').addEventListener('click', () => { parar(); animarA(Math.min(capas.length - 1, Math.round(estado.v) + 1)); });

    // Transparencia de la capa histórica (se aplica al grupo, así se mantiene al cambiar de año)
    $('#opacidad').addEventListener('input', (e) => {
      const o = +e.target.value / 100;
      grupoHistorico.setOpacity(o);
      $('#opacidad-valor').textContent = e.target.value + '%';
      document.body.classList.toggle('transparente', o < 1);
      capaFondo.setVisible(o < 1 || estado.verHoy || $('#chk-fondo').checked);
    });
    $('#opacidad').addEventListener('dblclick', (e) => { e.target.value = 100; e.target.dispatchEvent(new Event('input')); });
    $('#hoy').addEventListener('click', () => { parar(); verHoy(!estado.verHoy); });
    $('#chk-fondo').addEventListener('change', (e) => capaFondo.setVisible(e.target.checked || estado.verHoy || grupoHistorico.getOpacity() < 1));
    $('#chk-calles').addEventListener('change', (e) => capaCalles.setVisible(e.target.checked));

    const sel = $('#favoritos');
    C.favoritos.forEach((f, k) => sel.add(new Option(f.nombre, k)));
    sel.addEventListener('change', () => {
      const f = C.favoritos[+sel.value];
      if (f) view.animate({ center: ol.proj.fromLonLat(f.lonlat), zoom: f.zoom, duration: 900 });
      sel.selectedIndex = 0;
    });

    $('#plegar').addEventListener('click', () => document.body.classList.toggle('panel-plegado'));

    // Móvil: el panel es una hoja inferior; se abre tocando la cabecera o "Leer más"
    const alternarPanel = (abrir) => {
      const ab = typeof abrir === 'boolean' ? abrir : !document.body.classList.contains('panel-abierto');
      document.body.classList.toggle('panel-abierto', ab);
      $('#expandir').textContent = ab ? 'Leer menos' : 'Leer más';
      $('#expandir').setAttribute('aria-expanded', ab);
    };
    $('#panel-cabecera').addEventListener('click', () => { if (esMovil()) alternarPanel(); });
    $('#expandir').addEventListener('click', () => alternarPanel());
    $('#descripcion').addEventListener('click', () => { if (esMovil() && !document.body.classList.contains('panel-abierto')) alternarPanel(true); });
    map.on('pointerdown', () => { if (esMovil()) alternarPanel(false); });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.id === 'opacidad' ||
          e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); $('#next').click(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); $('#prev').click(); }
      else if (e.key === ' ') { e.preventDefault(); $('#play').click(); }
      else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); $('#hoy').click(); }
    });
  }

  /* ---------- Arranque ---------- */
  async function iniciar() {
    if (!window.ol) {
      document.body.innerHTML = '<p style="padding:2em">No se pudo cargar OpenLayers. Ejecuta <code>1_Descargar_recursos.bat</code> o revisa la conexión.</p>';
      return;
    }
    const cm = await cargarCapasCM();
    capas = C.capas.concat(cm).sort((a, b) => a.anio - b.anio);
    crearMapa();
    construirTimeline();
    enlazarControles();
    const idx = leerHash();
    aplicar(idx >= 0 ? idx : capas.findIndex((c) => c.id === 'texeira'));
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
