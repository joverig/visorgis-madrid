/*
 * Configuración del visor: línea temporal de Madrid.
 * Cada entrada es un "paso" del slider. Se ordenan por `anio`.
 *
 * `descripcion` puede ser un texto o una lista de párrafos. Un párrafo que empiece
 * por "En el mapa:" se muestra destacado (qué buscar en esa capa).
 *
 * Tipos de fuente soportados:
 *   - wms     : { type:'wms', url, layers, version?, format? }
 *   - xyz     : { type:'xyz', url }   (sirve también para WMTS KVP con {z}/{x}/{y})
 *   - geojson : { type:'geojson', url, fase }  (recreaciones vectoriales)
 * Las ortofotos históricas de la Comunidad de Madrid se añaden en tiempo de
 * ejecución desde data/capas_cm.json (lo genera 1_Descargar_recursos.bat); sus
 * textos están en `textosCM`, por identificador de capa.
 */
(function () {
  const IGN_PLANOS = 'https://www.ign.es/wms/planos';
  const IGN_HIST = 'https://www.ign.es/wms/pnoa-historico';
  const IGN_MTN = 'https://www.ign.es/wms/primera-edicion-mtn';
  const ATR_IGN = '© Instituto Geográfico Nacional (CNIG), CC BY 4.0';

  const plano = (id, anio, etiqueta, titulo, layers, descripcion) => ({
    id, anio, etiqueta, titulo, tipo: 'plano', descripcion,
    fuente: { type: 'wms', url: IGN_PLANOS, layers },
    atribucion: ATR_IGN + ' · Cartoteca IGN',
  });
  const vuelo = (id, anio, etiqueta, titulo, layers, descripcion) => ({
    id, anio, etiqueta, titulo, tipo: 'foto', descripcion,
    fuente: { type: 'wms', url: IGN_HIST, layers, format: 'image/jpeg' },
    atribucion: ATR_IGN + ' · PNOA histórico',
  });

  // Recreaciones de elaboración propia (vector) para antes del primer plano conservado (1622)
  const RECINTOS = 'datos_propios/recintos_madrid.geojson?v=202611230907';
  const ATR_REC = 'Recreación aproximada de elaboración propia a partir de bibliografía (Gea Ortigas, Malalana, Comunidad de Madrid). Trazado orientativo, no arqueológico. ';
  const recreacion = (id, anio, etiqueta, titulo, fase, descripcion) => ({ // fase: solo orden
    id, anio, etiqueta, titulo, tipo: 'recreacion', descripcion,
    fuente: { type: 'vacia' }, // lo dibuja la capa de perímetros (VISOR_CONFIG.perimetros)
    atribucion: ATR_REC,
  });

  /* ---------- PNOA: un texto por año ---------- */
  const textosPNOA = {
    2006: [
      'Primera ortofoto del Plan Nacional de Ortofotografía Aérea sobre Madrid, que desde entonces fotografía el país cada dos o tres años. Madrid en plena obra: las excavaciones del soterramiento de la M-30 abren una herida a lo largo del Manzanares, del puente de Segovia a Legazpi, y en el Paseo de la Castellana se levantan las Cuatro Torres sobre la antigua Ciudad Deportiva del Real Madrid. En febrero se inaugura la Terminal 4 de Barajas, diseñada por Richard Rogers y Estudio Lamela.',
      'La ciudad olímpica es el gran proyecto político (candidaturas a 2012 y 2016), y la vivienda alcanza precios récord. Los PAU empiezan a llenarse de bloques de manzana cerrada con piscina interior.',
      'En el mapa: la T4 al este de Barajas, la herida de la M-30 junto al río y las grúas en la Castellana norte.',
    ],
    2009: [
      'Primer vuelo tras el estallido de la burbuja inmobiliaria. Sobre la M-30 soterrada avanzan las obras de Madrid Río y la construcción se frena en seco: se acabaron las grúas en los nuevos barrios.',
      'Muchas promociones de los PAU (Sanchinarro, Las Tablas, Montecarmelo, Ensanche de Vallecas) se quedan a medio hacer y los ensanches del sureste se paralizan antes de empezar. Madrid acumula una de las deudas municipales más altas de Europa por las grandes obras de la década, y la ciudad pierde la candidatura olímpica de 2016.',
      'En el mapa: compara los PAU con 2006 y fíjate en las parcelas que siguen vacías; aparecerán así durante años.',
    ],
    2011: [
      'Lo peor de la crisis: apenas se inician viviendas y el paro se dispara. Pero el gran cambio de la ciudad central ya es visible: Madrid Río, un parque de diez kilómetros sobre la M-30 soterrada, se inaugura entre 2010 y 2011 y devuelve el Manzanares a los madrileños.',
      'En mayo de 2011 el 15-M llena la Puerta del Sol de acampadas y asambleas, y Madrid se convierte en escenario de un ciclo de protestas que cambiará la política española. La red de Metro ha crecido enormemente desde 1995 y une ya los municipios del sur metropolitano.',
      'En el mapa: el río vuelve a verse verde entre el Puente del Rey y el Matadero, y Valdebebas tiene calles y parque trazados pero casi ningún edificio.',
    ],
    2014: [
      'La actividad empieza a recuperarse tímidamente. Madrid ha perdido población respecto a 2008 por la emigración y la crisis, y la ciudad se mira hacia dentro: se rehabilitan mercados, se peatonalizan calles del centro y crece el turismo.',
      'Los grandes desarrollos pendientes (Operación Chamartín, ensanches del sureste) siguen en los tribunales o en los despachos.',
      'En el mapa: compara Valdebebas y Ensanche de Vallecas con 2011; vuelven las obras.',
    ],
    2017: [
      'Recuperación inmobiliaria y nuevo impulso a la construcción. Se inaugura el estadio Metropolitano en el antiguo estadio de La Peineta (San Blas-Canillejas) y la Castellana suma la quinta torre, Caleido, en obras.',
      'Madrid entra en la etapa de las restricciones al tráfico (Madrid Central se aprobará en 2018) y el centro histórico vive una fuerte presión turística: proliferan los pisos turísticos en Centro, Lavapiés y Malasaña.',
      'En el mapa: el Metropolitano al este, y Valdebebas ya con bloques terminados.',
    ],
    2020: [
      'El año de la pandemia de COVID-19. Entre marzo y mayo el confinamiento vacía calles, aeropuerto y oficinas; IFEMA se convierte en hospital de campaña. El vuelo de esta época muestra una ciudad aparentemente igual, pero con muchos menos coches y aviones.',
      'Se aprueba definitivamente Madrid Nuevo Norte, la gran operación sobre las vías de Chamartín, y siguen creciendo los nuevos barrios del sureste.',
      'En el mapa: aparcamientos y plataformas de Barajas con aviones parados, y la playa de vías de Chamartín.',
    ],
    2023: [
      'Último vuelo del PNOA histórico sobre Madrid. La ciudad ha recuperado el pulso tras la pandemia: arrancan las obras de Madrid Nuevo Norte sobre las vías de Chamartín, el nuevo Bernabéu estrena su cubierta y los ensanches del sureste (Los Berrocales, Los Ahijones, Valdecarros) empiezan a llenarse de grúas.',
      'Madrid recibe más inmigración que nunca, sobre todo latinoamericana, y la vivienda se convierte en el gran debate de la ciudad.',
      'En el mapa: las grúas del sureste y el Bernabéu reformado en la Castellana.',
    ],
  };
  // Solo años del PNOA histórico con imagen sobre Madrid (comprobado con 2_Descargar_y_comprobar.bat);
  // lo más reciente lo da el paso 'Hoy' (PNOA de máxima actualidad)
  const pnoaAnios = [2006, 2009, 2011, 2014, 2017, 2020, 2023];

  /* ---------- Ortofotos de la Comunidad de Madrid (solo las seleccionadas en data/capas_cm.json) ---------- */
  const textosCM = {
    'fotosAereasHistoricas_1920-1929_orto-fotoplano-madrid-1927-ed50': {
      etiqueta: '1927', titulo: 'Fotoplano de Madrid (1927)',
      descripcion: [
        'La primera imagen aérea completa de la capital, un fotoplano hecho con fotografías verticales desde avión, una técnica todavía nueva en España. Es el Madrid de la dictadura de Primo de Rivera y del reinado de Alfonso XIII, con algo más de 900.000 habitantes.',
        'La Gran Vía avanza por su segundo tramo, el Metro tiene apenas ocho años, y el Ensanche de Castro está casi lleno. Más allá de las rondas empieza el extrarradio: Tetuán, Cuatro Caminos, Prosperidad o Puente de Vallecas, barrios de casas bajas que crecieron sin plan.',
        'En el mapa: la Ciudad Universitaria aún no existe (las obras empiezan en 1929) y la Castellana se acaba en los Altos del Hipódromo.',
      ],
    },
    'fotosAereasHistoricas_1940-1949_orto-1946-ed50': {
      etiqueta: '1946', titulo: 'Vuelo de 1946',
      descripcion: [
        'Madrid siete años después de la Guerra Civil. El frente estuvo en la Ciudad Universitaria, la Casa de Campo y Usera durante casi tres años, y en esta imagen todavía se adivinan ruinas, trincheras y barrios destrozados en el oeste de la ciudad.',
        'Es la posguerra del hambre y las cartillas de racionamiento. El régimen prepara el Plan Bidagor (1941-1946), que quiere una capital imperial con la Castellana como eje, mientras miles de emigrantes del campo levantan chabolas en Vallecas, Orcasitas o el Pozo del Tío Raimundo.',
        'En el mapa: la Ciudad Universitaria y el Parque del Oeste, todavía en reconstrucción.',
      ],
    },
    'fotosAereasHistoricas_1960-1969_orto-fusion-1961-1967-mapa-1976-1983-ed50': {
      etiqueta: '1961-67', titulo: 'Ortofoto de 1961-1967',
      descripcion: [
        'Los años del desarrollismo. Tras el Plan de Estabilización de 1959 la economía despega y Madrid recibe cientos de miles de emigrantes de Andalucía, Extremadura y las dos Castillas. La ciudad crece a golpe de polígonos de vivienda: Gran San Blas, Moratalaz, Saconia, Batán o Ciudad de los Ángeles.',
        'El Plan General del Área Metropolitana (1963) ordena por primera vez Madrid junto a sus municipios vecinos, y los antiguos pueblos anexionados (Carabanchel, Vallecas, Canillas, Hortaleza...) quedan engullidos por bloques.',
        'En el mapa: los polígonos de bloques en hilera y las torres del este, sobre lo que en 1956 eran campos.',
      ],
    },
    'fotosAereasHistoricas_1970-1979_1972-CT-30cm-bn-mosaico-CM-CHenares.tif': {
      etiqueta: '1972', titulo: 'Vuelo de 1972 (Comunidad y Corredor del Henares)',
      descripcion: [
        'Últimos años del franquismo. Madrid supera los tres millones de habitantes y el crecimiento salta a los municipios: Móstoles, Alcorcón, Leganés, Fuenlabrada o Getafe multiplican su población en pocos años, y el Corredor del Henares se llena de industria hasta Alcalá.',
        'Es la época del coche: se proyectan la M-30 y las grandes radiales, y AZCA empieza a convertirse en el nuevo centro de negocios de la Castellana.',
        'En el mapa: la M-30 en construcción y los nuevos barrios de Móstoles y Alcorcón al suroeste.',
      ],
    },
    'fotosAereasHistoricas_1980-1989_Orto-MD80.ecw': {
      etiqueta: '1980', titulo: 'Vuelo de 1980',
      descripcion: [
        'Madrid en la Transición. Los primeros ayuntamientos democráticos (1979), con Enrique Tierno Galván como alcalde, se encuentran una ciudad con barrios sin servicios, chabolas y un enorme déficit de zonas verdes y equipamientos.',
        'Empieza la remodelación de barrios, uno de los mayores programas de vivienda pública de Europa, y se prepara el Plan General de 1985, que apuesta por recuperar la ciudad existente en lugar de seguir creciendo. Es también el arranque de la Movida.',
        'En el mapa: la M-30 terminada y las primeras torres de AZCA.',
      ],
    },
    'fotosAereasHistoricas_1990-1999_orto-1991-ed50': {
      etiqueta: '1991', titulo: 'Vuelo de 1991',
      descripcion: [
        'Madrid se prepara para 1992, cuando será Capital Europea de la Cultura. La ciudad se ha modernizado: Torre Picasso (1988) corona AZCA, las torres KIO de Plaza de Castilla están a punto de terminarse y la M-40 empieza a construirse.',
        'La Comunidad de Madrid, creada en 1983, gana peso político y económico, y el sur metropolitano ha recibido parques, hospitales y metro ligero a la espera de Metrosur.',
        'En el mapa: las torres KIO en obra en Plaza de Castilla y los primeros tramos de la M-40.',
      ],
    },
    'fotosAereasHistoricas_1990-1999_orto-mosaico-1999-ed50': {
      etiqueta: '1999', titulo: 'Vuelo de 1999',
      descripcion: [
        'Fin de siglo y nuevo ciclo de crecimiento. El Plan General de 1997 clasifica como urbanizable casi todo el suelo libre del municipio, de donde saldrán los PAU, y la Comunidad lanza la mayor ampliación de Metro de su historia.',
        'La M-40 está cerrada y se proyectan las autopistas radiales de peaje. Barajas prepara su gran ampliación.',
        'En el mapa: los terrenos vacíos de los futuros PAU en el norte (Sanchinarro, Las Tablas) aún son campo.',
      ],
    },
    'fotosAereasHistoricas_2000-2009_orto-2001-ed50': {
      etiqueta: '2001', titulo: 'Vuelo de 2001',
      descripcion: [
        'Madrid arranca el siglo XXI con la burbuja inmobiliaria en marcha. Los PAU empiezan a urbanizarse, se construyen la M-45 y las radiales R-3 y R-5, y Metrosur (2003) está en obras uniendo Getafe, Leganés, Fuenlabrada, Móstoles y Alcorcón.',
        'La ciudad central empieza a cambiar de población: llega la inmigración latinoamericana, africana y del este de Europa, y barrios como Lavapiés o Tetuán se transforman.',
        'En el mapa: calles trazadas en los PAU del norte y obras de Metrosur al sur.',
      ],
    },
    'fotosAereasHistoricas_2000-2009_orto-mosaico-madrid-2003': {
      etiqueta: '2003', titulo: 'Vuelo de 2003',
      descripcion: [
        'Justo antes de la gran transformación de la década. Todavía se ve la Ciudad Deportiva del Real Madrid en la Castellana norte, donde se levantarán las Cuatro Torres, y la M-30 a cielo abierto junto al río.',
        'Madrid prepara la candidatura olímpica para 2012 y la Comunidad inaugura Metrosur, un anillo de 41 km bajo cinco ciudades del sur.',
        'En el mapa: la Ciudad Deportiva y la M-30 junto al Manzanares; compáralas con 2008.',
      ],
    },
    'fotosAereasHistoricas_2000-2009_orto-mosaico-2004-geomadrid-40cm-v2': {
      etiqueta: '2004', titulo: 'Ortofoto de 2004',
      descripcion: [
        'Madrid en lo más alto del ciclo inmobiliario: la capital roza los 3,1 millones de habitantes y la región crece a un ritmo que no se veía desde los años sesenta.',
        'Es el momento de los PAU del Plan General de 1997: Sanchinarro, Las Tablas, Montecarmelo, Arroyo del Fresno, Carabanchel o Ensanche de Vallecas aparecen como enormes cuadrículas de calles trazadas y manzanas a medio construir. Este año arrancan las obras de soterramiento de la M-30 y de las Cuatro Torres.',
        'En el mapa: las cuadrículas de tierra con calles asfaltadas pero sin edificios en los bordes norte y sureste.',
      ],
    },
    'fotosAereasHistoricas_2000-2009_orto-mosaico-fc5-2008-etrs89-v2': {
      etiqueta: '2008', titulo: 'Ortofoto de 2008',
      descripcion: [
        'El final del boom. Las Cuatro Torres acaban de terminarse sobre la antigua Ciudad Deportiva del Real Madrid, la Terminal 4 de Barajas lleva dos años en servicio y la M-30 ya circula bajo tierra junto al río.',
        'En septiembre quiebra Lehman Brothers y estalla la burbuja: muchas promociones de los PAU se quedan a medio hacer. Madrid acumula una de las deudas municipales más altas de Europa por las grandes obras de la década.',
        'En el mapa: las Cuatro Torres en la Castellana norte y los PAU con manzanas todavía vacías.',
      ],
    },
    'fotosAereas_orto-madrid-2013-etrs89': {
      etiqueta: '2013', titulo: 'Ortofoto de Madrid capital (9 cm)',
      descripcion: [
        'Una de las fotos aéreas más detalladas de la capital: cada píxel mide 9 cm, así que se distinguen coches, bancos y hasta pasos de cebra. Acércate todo lo que quieras.',
        'Madrid toca fondo en la crisis: paro récord, desahucios y obras paradas. En septiembre la ciudad pierde su tercera candidatura olímpica seguida (2020). Madrid Río, inaugurado dos años antes, es el gran parque nuevo de la ciudad.',
        'En el mapa: Ensanche de Vallecas y Valdebebas con calles trazadas y muchas parcelas vacías.',
      ],
    },
    'fotosAereas_orto-TM-Madrid-2019-10cm-fc10': {
      etiqueta: '2019', titulo: 'Ortofoto de Madrid capital (10 cm)',
      descripcion: [
        'Madrid en plena recuperación. Desde finales de 2018 funciona Madrid Central, la zona de bajas emisiones del centro, y la ciudad discute cómo convivir con el turismo y los pisos turísticos.',
        'El estadio Metropolitano (2017) ha transformado el este, se tramita Madrid Nuevo Norte sobre las vías de Chamartín y la quinta torre de la Castellana, Caleido, está a punto de terminarse.',
        'En el mapa: el Metropolitano en San Blas-Canillejas y Valdebebas ya lleno de bloques.',
      ],
    },
    'fotosAereas_orto-mosaico-20cm-rgb-2022': {
      etiqueta: '2022', titulo: 'Ortofoto de 2022',
      descripcion: [
        'Tras la pandemia y tras Filomena (enero de 2021), la mayor nevada en medio siglo, que tumbó cientos de miles de árboles, la ciudad recupera su ritmo. Se ha reformado la Plaza de España y avanzan las obras del nuevo Bernabéu y de la Puerta del Sol.',
        'Continúa la urbanización de Los Berrocales y Los Ahijones y el crecimiento de Valdebebas; el área metropolitana supera los 6,7 millones de habitantes.',
        'En el mapa: el Bernabéu en obras en la Castellana y las nuevas manzanas del sureste.',
      ],
    },
  };

  window.VISOR_CONFIG = {
    centro: [-3.7115, 40.4150], // entre el Palacio Real y Sol: se ven las murallas y el centro histórico
    zoom: 15,
    minZoom: 9,
    maxZoom: 20,
    perimetros: RECINTOS, // perímetros, puertas e hitos con fecha, sobre todos los años
    transicionSeg: 1.4, // duración del fundido entre dos años al reproducir
    pausaSeg: 1.8,      // tiempo que se queda en cada año al reproducir
    textosCM,

    favoritos: [
      { nombre: 'Puerta del Sol', lonlat: [-3.7038, 40.4168], zoom: 16 },
      { nombre: 'Palacio Real y Almudena', lonlat: [-3.7142, 40.4180], zoom: 16 },
      { nombre: 'Retiro y Atocha', lonlat: [-3.6880, 40.4130], zoom: 15 },
      { nombre: 'Ensanche de Salamanca', lonlat: [-3.6800, 40.4300], zoom: 15 },
      { nombre: 'Castellana / Nuevos Ministerios', lonlat: [-3.6920, 40.4460], zoom: 15 },
      { nombre: 'Plaza de Castilla / Chamartín', lonlat: [-3.6890, 40.4660], zoom: 15 },
      { nombre: 'Ciudad Universitaria', lonlat: [-3.7290, 40.4470], zoom: 15 },
      { nombre: 'Madrid Río / Manzanares', lonlat: [-3.7200, 40.4000], zoom: 15 },
      { nombre: 'Vallecas y PAU', lonlat: [-3.6100, 40.3700], zoom: 14 },
      { nombre: 'Barajas', lonlat: [-3.5700, 40.4700], zoom: 13 },
      { nombre: 'Área metropolitana', lonlat: [-3.7000, 40.4200], zoom: 11 },
    ],

    capas: [
      recreacion('antes', 500, 'Antes', 'Antes de Madrid: el valle del Manzanares', 0, [
        'Mucho antes de que existiera la ciudad, el valle del Manzanares ya estaba habitado. Sus terrazas fluviales forman uno de los conjuntos paleolíticos más importantes de Europa: durante cientos de miles de años, grupos de cazadores tallaron bifaces de sílex y cuarcita junto al río, donde abundaban elefantes, caballos y uros. En el yacimiento de San Isidro, en Carabanchel, se reconocieron en 1862 por primera vez en España herramientas del Paleolítico antiguo.',
        'Después vinieron los poblados de la Edad del Bronce y del Hierro, el territorio de los carpetanos y la romanización. Los romanos dejaron villas agrícolas en Carabanchel, Villaverde, la Casa de Campo o El Pardo, en la órbita de la gran ciudad de la zona, Complutum (Alcalá de Henares). En época visigoda hubo pequeñas aldeas y necrópolis dispersas por la región.',
        'Lo que no hubo, que se sepa, es una ciudad: no está probado que el cerro donde nacerá Mayrit tuviera un poblado estable antes del siglo IX. Las leyendas de una ciudad romana en el solar de Madrid o de un origen griego se difundieron siglos después para dar a la capital un pasado glorioso.',
        'En el mapa: los puntos marrones señalan, de forma aproximada, algunos yacimientos del valle del Manzanares.',
      ]),
      recreacion('mayrit', 870, 's. IX', 'Mayrit, la fortaleza andalusí', 1, [
        'Hacia mediados del siglo IX (entre 852 y 886) el emir de Córdoba Muhammad I manda levantar una fortaleza sobre el cerro que domina el Manzanares, donde hoy están el Palacio Real y la catedral de la Almudena. Al-Ándalus vive su época emiral y la frontera con los reinos cristianos está en el Duero; Mayrit es una pieza de la Marca Media, la red de plazas fuertes que protege Toledo de las incursiones del norte.',
        'El nombre viene probablemente del árabe "mayra" (cauce, madre de agua) unido al sufijo romance "-it": el lugar destacaba por sus arroyos y su agua subterránea, que los andalusíes aprovecharon con viajes de agua (qanats). Dentro de la muralla había una pequeña población de soldados y campesinos, una mezquita y la residencia del gobernador; fuera, huertas en la vega y caminos hacia Toledo y Talamanca.',
        'En el mapa: el recinto, de pocas hectáreas, ocupa el borde del cerro. Su resto más visible es el lienzo del Parque del Emir Mohamed I, en la Cuesta de la Vega.',
      ]),
      recreacion('cristiana', 1150, 's. XII', 'La villa cristiana y su muralla', 2, [
        'En 1085 Alfonso VI conquista Toledo y Madrid pasa a manos castellanas. La villa no es aún importante: es un núcleo agrícola y ganadero de unos pocos miles de habitantes, con población cristiana, mudéjar (musulmanes que se quedan) y judía. En 1202 Alfonso VIII le concede su Fuero, que regula la vida del concejo.',
        'A lo largo del siglo XII se levanta una muralla mucho mayor que la andalusí, que abarca las colinas de San Andrés y la Morería. Se organiza en parroquias (San Andrés, San Pedro, San Justo, Santa María, San Salvador...) cuyos nombres siguen hoy en el callejero, y en ella se reúnen las Cortes de Castilla varias veces durante la Baja Edad Media.',
        'En el mapa: las puertas de Valnadú, Guadalajara, Cerrada y Moros. La Cava Baja y la Cava de San Miguel siguen el foso exterior de la muralla, y quedan lienzos en la calle del Almendro.',
      ]),
      recreacion('arrabal', 1450, 's. XV', 'La cerca del arrabal', 3, [
        'En la Baja Edad Media la villa ha crecido fuera de sus muros. Los arrabales de San Ginés, San Martín y Santa Cruz y la explanada del mercado (la plaza del Arrabal, origen de la Plaza Mayor) se cierran con una cerca más ligera, de tapial, que sirve sobre todo para controlar quién entra y cobrar impuestos sobre las mercancías.',
        'Los Trastámara pasan largas temporadas en el Alcázar, que se amplía como residencia real, y en él vive Enrique IV. Tras la guerra civil castellana, los Reyes Católicos visitan Madrid en varias ocasiones y la villa supera ya los diez mil habitantes, con artesanos, comerciantes y una pequeña nobleza local.',
        'En el mapa: la Puerta del Sol nace aquí como una de las salidas hacia el este, junto al camino de Alcalá.',
      ]),
      recreacion('felipe2', 1566, '1566', 'Capital de la Monarquía: la cerca de Felipe II', 4, [
        'En 1561 Felipe II instala la Corte en Madrid, quizá por su posición central, su agua, sus bosques de caza y la cercanía de El Escorial, que empieza a construir en 1563. La villa no estaba preparada: pasa de unos 20.000 habitantes a más de 50.000 en una década, con funcionarios, nobles, criados, artesanos y buscavidas.',
        'La cerca de 1566 ya no es defensiva sino fiscal y sanitaria: controla las entradas de mercancías y de enfermos. Fuera de ella crecen arrabales nuevos hacia Atocha, el Prado y Lavapiés, y se construyen conventos, casas nobles y hospitales. Salvo un breve paréntesis en Valladolid (1601-1606), Madrid será desde entonces la capital.',
        'En el mapa: las puertas de Santo Domingo, Red de San Luis, Alcalá, Antón Martín, Toledo y Segovia. Es la ciudad que dibujará Mancelli pocas décadas después.',
      ]),
      plano('mancelli', 1622, '1622', 'Plano de Antonio Mancelli', 'mancelliMadrid', [
        'El plano más antiguo que se conserva de Madrid, grabado por Antonio Mancelli hacia 1622 y difundido después por el editor holandés Frederick de Wit. Gobierna Felipe IV, que acaba de subir al trono con el conde-duque de Olivares como valido; es el Siglo de Oro y la ciudad tiene más de 100.000 habitantes.',
        'Madrid es una corte de conventos, palacios, corrales de comedias y casas de un piso (las "casas a la malicia", construidas bajas para no tener que alojar funcionarios). Por sus calles viven o han vivido Cervantes, Lope de Vega, Quevedo, Góngora y Calderón. En 1619 Juan Gómez de Mora ha terminado la Plaza Mayor.',
        'En el mapa: la Plaza Mayor recién construida, el Alcázar al oeste y los huecos de huertas dentro de la cerca. Es un plano en perspectiva, no geométrico: su encaje sobre la ortofoto actual es aproximado.',
      ]),
      plano('texeira', 1656, '1656', 'Plano de Pedro Texeira', 'texeira', [
        'La "Topographia de la Villa de Madrid" del cartógrafo portugués Pedro Texeira, grabada en Amberes en 1656 en veinte hojas. Dibuja casa a casa toda la ciudad con las fachadas abatidas, hasta el punto de que se usa todavía para estudiar edificios desaparecidos.',
        'Felipe IV ha mandado construir la cerca de 1625, que marcará los límites de Madrid durante casi 250 años, y el palacio del Buen Retiro (1630-1640), un enorme conjunto de jardines y estanques al este del Prado. La monarquía vive su gran crisis (guerras en Europa, sublevaciones de Cataluña y Portugal), pero la Corte sigue gastando en fiestas, teatro y pintura: Velázquez pinta Las Meninas en el Alcázar ese mismo año.',
        'En el mapa: la cerca de 1625, el Buen Retiro con su Estanque Grande y el Prado de los Jerónimos como paseo arbolado.',
      ]),
      plano('chalmandrier', 1761, '1761', 'Plano de Nicolás Chalmandrier', 'chalmadrierMadrid', [
        'Grabado por el francés Nicolás Chalmandrier, refleja Madrid al comienzo del reinado de Carlos III, que llega de Nápoles en 1759. La ciudad tiene unos 150.000 habitantes y una fama terrible entre los viajeros extranjeros: calles sin empedrar, basura arrojada por las ventanas y ninguna iluminación nocturna.',
        'El viejo Alcázar ardió en la Nochebuena de 1734, y sobre sus ruinas se levanta el nuevo Palacio Real de Juvara y Sacchetti, que está a punto de terminarse. Carlos III traerá a Sabatini y empezará a "limpiar" la ciudad con empedrado, alcantarillas y alumbrado.',
        'En el mapa: el nuevo Palacio Real en el lugar del Alcázar y la ciudad todavía encerrada en la cerca de 1625.',
      ]),
      plano('espinosa', 1769, '1769', 'Plano de Espinosa de los Monteros', 'espinosaMadrid', [
        'El "Plano Topográfico de la Villa y Corte de Madrid" de Antonio Espinosa de los Monteros. Tras el motín de Esquilache (1766), el conde de Aranda, presidente del Consejo de Castilla, reorganiza la ciudad en cuarteles y barrios con alcaldes propios para controlar el orden público, y este plano, uno de los más precisos del siglo, sirve a esa nueva administración.',
        'Madrid vive el despotismo ilustrado: se reforman el Paseo del Prado y la Puerta de Alcalá, se crean fábricas reales (tapices, porcelana, tabaco) y se ordena la numeración de las manzanas. Goya llega a Madrid pocos años después.',
        'En el mapa: el Palacio Real terminado y los primeros trazados del Salón del Prado.',
      ]),
      plano('tomaslopez', 1785, '1785', 'Plano geométrico de Tomás López', 'geometricoMadrid', [
        'Obra del geógrafo real Tomás López, refleja el Madrid más ilustrado, al final del reinado de Carlos III, a quien se llamará "el mejor alcalde de Madrid". La ciudad ronda los 160.000 habitantes y se ha convertido en una capital europea con instituciones científicas y culturales.',
        'El Paseo del Prado se ha transformado en un gran salón urbano con las fuentes de Cibeles, Neptuno y Apolo; en 1778 se termina la Puerta de Alcalá, en 1781 el Jardín Botánico, y en 1785 se empieza el Gabinete de Ciencias Naturales que acabará siendo el Museo del Prado. También se construyen el Hospital General (hoy Museo Reina Sofía) y la Real Casa de Correos en la Puerta del Sol.',
        'En el mapa: el eje del Prado con el Botánico y la nueva Puerta de Alcalá.',
      ]),
      plano('madoz', 1848, '1848', 'Plano de Madoz y Coello', 'madozMadrid', [
        'Publicado por Francisco Coello en su Atlas de España, que acompaña al Diccionario geográfico-estadístico de Pascual Madoz. Reina Isabel II y Madrid tiene más de 200.000 habitantes. La desamortización de Mendizábal (1836) ha expropiado decenas de conventos, cuyos solares se convierten en plazas, mercados y nuevas calles: así nacen la Plaza de Oriente, la de Tirso de Molina o la del Progreso.',
        'La ciudad sigue dentro de la cerca de 1625, densa y sin espacio, pero ya se piensa en crecer. En pocos años llegarán el ferrocarril de Aranjuez (1851), el agua del Canal de Isabel II (1858) y la reforma de la Puerta del Sol (1857-1862).',
        'En el mapa: la ciudad apretada dentro de la cerca, con muy poco construido fuera de ella.',
      ]),
      plano('ibanez', 1875, '1875', 'Plano parcelario de Ibáñez de Ibero', 'ibanezMadrid', [
        'Levantado entre 1872 y 1874 por el Instituto Geográfico, recién fundado por el general Carlos Ibáñez de Ibero, es el primer parcelario científico de Madrid: cada finca medida con precisión. La cerca se derribó en 1868, tras la revolución que destronó a Isabel II, y la ciudad por fin se abre.',
        'El Ensanche de Carlos María de Castro (1860) traza una cuadrícula al norte y al este: el barrio de Salamanca, promovido por el marqués de Salamanca, Chamberí y Argüelles. Son los años del Sexenio Democrático, de Amadeo de Saboya y de la Primera República, hasta la Restauración borbónica de 1874.',
        'En el mapa: las primeras manzanas del barrio de Salamanca y de Chamberí, todavía sueltas en medio de la nueva cuadrícula.',
      ]),
      {
        id: 'mtn50', anio: 1876, etiqueta: 'c.1875', titulo: 'MTN50 1ª edición (alrededores)', tipo: 'plano',
        descripcion: [
          'La primera edición del Mapa Topográfico Nacional a escala 1:50.000, el gran proyecto cartográfico del Instituto Geográfico. La hoja de Madrid es de las primeras que se publican.',
          'A esta escala se ve lo que rodeaba la ciudad: pueblos independientes como Chamartín de la Rosa, Fuencarral, Canillas, Vicálvaro, Vallecas, Villaverde o los dos Carabancheles, unidos a Madrid por caminos y rodeados de cereal, viñas y huertas. Todos ellos serán anexionados a la capital entre 1948 y 1954.',
          'En el mapa: aléjate para ver la red de pueblos y caminos, y compárala con la mancha urbana actual.',
        ],
        fuente: { type: 'wms', url: IGN_MTN, layers: 'MTN50' },
        atribucion: ATR_IGN + ' · Primera edición MTN',
      },
      plano('facundo', 1900, '1900', 'Plano de Facundo Cañada', 'facundoMadrid', [
        'Plano de Madrid y sus alrededores de Facundo Cañada López, en el cambio de siglo. Madrid supera el medio millón de habitantes, recibe inmigración del campo y vive la llamada Edad de Plata de la cultura española, entre la crisis del 98 y la regencia de María Cristina.',
        'El Ensanche se va llenando y fuera de él crece sin control el extrarradio: Tetuán, Cuatro Caminos, Bellas Vistas o Prosperidad, barrios obreros de casas bajas sin agua ni alcantarillado. Arturo Soria construye la Ciudad Lineal (desde 1894), una utopía de casas con jardín a lo largo de un tranvía. Los tranvías eléctricos empiezan a sustituir a los de mulas.',
        'En el mapa: la Ciudad Lineal en el noreste y el extrarradio desordenado alrededor del Ensanche.',
      ]),
      plano('nunez', 1910, '1910', 'Plano de Núñez Granés', 'nunezMadrid', [
        'Pedro Núñez Granés, ingeniero municipal, firma en 1910 el proyecto de urbanización del extrarradio, que intenta ordenar los barrios crecidos fuera del Ensanche con una red de grandes vías. Ese mismo año, Alfonso XIII da el primer golpe de piqueta de la Gran Vía, que derribará más de 300 casas del centro.',
        'Madrid se moderniza: llegan la electricidad, el teléfono y el automóvil, y en 1919 se inaugurará el Metro. Es la época de la Residencia de Estudiantes y de la generación del 14 (Ortega, Marañón, Juan Ramón).',
        'En el mapa: el trazado previsto para el extrarradio sobre los barrios que ya existían.',
      ]),
      plano('ayto1929', 1929, '1929', 'Parcelario del Ayuntamiento', 'ayuntamientoMadrid', [
        'Parcelario municipal de 1929, el año del concurso internacional de anteproyectos para la urbanización de Madrid, que ganan Secundino Zuazo y el alemán Hermann Jansen con la idea de prolongar la Castellana hacia el norte.',
        'Madrid se acerca al millón de habitantes. Se termina la Telefónica en la Gran Vía, empieza la Ciudad Universitaria en la Moncloa y se desarrolla la red de Metro. Faltan dos años para la Segunda República, que impulsará escuelas, la prolongación de la Castellana y los Nuevos Ministerios.',
        'En el mapa: la Gran Vía completa hasta la plaza de España.',
      ]),
      plano('parcelario4060', 1950, '1940-60', 'Plano parcelario 1940-1960', 'parcelarioMadrid', [
        'El Madrid de la posguerra y de la autarquía. Entre 1948 y 1954 la capital anexiona trece municipios (Chamartín de la Rosa, Carabanchel Alto y Bajo, Canillas, Canillejas, Hortaleza, Barajas, Fuencarral, El Pardo, Aravaca, Vallecas, Vicálvaro y Villaverde) y pasa de 68 a más de 600 km².',
        'El Plan Bidagor (1946) organiza el crecimiento, pero no puede con la llegada masiva de emigrantes: miles de chabolas rodean la ciudad y el régimen responde con poblados de absorción y poblados dirigidos. La Castellana se prolonga hacia el norte y aparecen los primeros rascacielos, como el Edificio España (1953).',
        'En el mapa: la mancha urbana desborda el Ensanche y aparecen barrios nuevos en los antiguos pueblos anexionados.',
      ]),
      vuelo('ams1956', 1956, '1956', 'Vuelo americano (Serie B)', 'AMS_1956-1957', [
        'El vuelo realizado por el ejército de Estados Unidos en 1956-57, tras los acuerdos de 1953 que permitieron sus bases en España (Torrejón entre ellas). Es la primera imagen completa y fiable de todo el país y la referencia para estudiar el antes y el después del desarrollismo.',
        'Madrid tiene casi dos millones de habitantes. Se acaba el Santiago Bernabéu (1947), crece la Castellana norte, y en los bordes conviven chabolas, poblados dirigidos como Caño Roto o Entrevías y campos de cultivo que pronto serán barrios.',
        'En el mapa: dónde acababa la ciudad; casi todo lo que hay más allá de la futura M-30 todavía es campo.',
      ]),
      vuelo('nacional', 1984, '1981-86', 'Vuelo nacional', 'Nacional_1981-1986', [
        'El vuelo nacional de 1981-1986, los años de la consolidación democrática, la entrada en la Comunidad Europea (1986) y la Movida madrileña.',
        'Los ayuntamientos democráticos acometen la remodelación de barrios (Orcasitas, Palomeras, San Blas...) y el Plan General de 1985 se propone "recuperar" la ciudad: parques como el de la Cuña Verde o el Lineal del Manzanares, rehabilitación del centro y freno a la expansión.',
        'En el mapa: los nuevos barrios de vivienda pública que sustituyen al chabolismo.',
      ]),
      vuelo('olistat', 1997, '1997-98', 'Vuelo OLISTAT', 'OLISTAT', [
        'Ortofoto OLISTAT (1997-1998), hecha para el control de las ayudas agrarias europeas, por eso cubre muy bien el campo. Madrid sale de la crisis de principios de los noventa y entra en una década de crecimiento.',
        'Se aprueba el Plan General de 1997, que abre el suelo de los PAU, y la Comunidad prepara la gran ampliación del Metro. La M-40 se completa y Barajas se prepara para crecer.',
        'En el mapa: los terrenos de los futuros PAU todavía en cultivo.',
      ]),
      ...pnoaAnios.map((a) => vuelo('pnoa' + a, a, String(a), 'PNOA ' + a, 'PNOA' + a, textosPNOA[a])),
      {
        id: 'actual', anio: 2100, etiqueta: 'Hoy', titulo: 'PNOA de máxima actualidad', tipo: 'foto',
        descripcion: [
          'La ortofoto más reciente del IGN, que se actualiza con los últimos vuelos. Madrid ha dejado atrás la pandemia y Filomena (enero de 2021), la mayor nevada en medio siglo, que tumbó cientos de miles de árboles. La capital roza los 3,5 millones de habitantes y la región los 7, empujada por la inmigración latinoamericana y la llegada de empresas.',
          'Las grandes transformaciones siguen en los bordes: los ensanches del sureste (Los Berrocales, Los Ahijones, Valdecarros), Valdebebas y Madrid Nuevo Norte sobre las vías de Chamartín. En el centro se han reformado la Puerta del Sol, la Plaza de España y el Bernabéu, y la ciudad se debate entre turismo, vivienda y espacio público.',
          'Es la misma imagen que aparece de fondo y con el botón "Ver hoy".',
          'Usa el control de opacidad para superponer sobre ella cualquier época: con el plano de Texeira se reconocen calles que siguen igual desde el siglo XVII, y con el vuelo de 1956 se ve cuánto ha crecido la ciudad.',
        ],
        fuente: {
          type: 'xyz',
          url: 'https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&VERSION=1.0.0&Layer=OI.OrthoimageCoverage&Style=default&Format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}',
        },
        atribucion: ATR_IGN + ' · PNOA',
      },
    ],

    // Capas auxiliares (fuera de la línea temporal)
    fondo: {
      url: 'https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&VERSION=1.0.0&Layer=OI.OrthoimageCoverage&Style=default&Format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}',
      atribucion: ATR_IGN,
    },
    calles: {
      url: 'https://www.ign.es/wmts/ign-base?request=GetTile&service=WMTS&VERSION=1.0.0&Layer=IGNBaseOrto&Style=default&Format=image/png&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}',
      atribucion: ATR_IGN + ' · IGN Base',
    },
  };
})();
