# Descargas y comprobaciones para el visor (lo lanza 2_Descargar_y_comprobar.bat).
#   1. Termino municipal de Madrid (OpenStreetMap, via Nominatim)
#        -> www\datos_propios\termino_municipal_osm.geojson
#   2. Capas del PNOA historico del IGN: que anos hay y cuales tienen imagen sobre Madrid
#        -> comprobaciones\pnoa_capas.txt, comprobaciones\pnoa_madrid.csv y una muestra .jpg por ano
#   3. Todas las capas historicas de la Comunidad de Madrid (tambien las posteriores a 2003)
#        -> comprobaciones\cm_capas_todas.txt
# Rutas relativas a esta carpeta. No modifica el visor: solo descarga y deja informes.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Drawing

$raiz = $PSScriptRoot
$salida = Join-Path $raiz 'comprobaciones'
$muestras = Join-Path $salida 'pnoa_muestras'
New-Item -ItemType Directory -Force -Path $muestras | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Bajar([string]$url) {
    $wc = New-Object System.Net.WebClient
    # Nominatim exige un User-Agent que identifique la aplicacion
    $wc.Headers.Add('User-Agent', 'visorgis_madrid/1.0 (github.com/joverig/visorgis-madrid)')
    $wc.Proxy = [System.Net.WebRequest]::GetSystemWebProxy()
    $wc.Proxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials
    try { return ,$wc.DownloadData($url) } finally { $wc.Dispose() }
}
function Escribir([string]$ruta, [string]$texto) { [System.IO.File]::WriteAllText($ruta, $texto, $utf8) }

# ---------------------------------------------------------------- 1. Termino municipal
Write-Host '1. Termino municipal de Madrid (OpenStreetMap)'
try {
    $url = 'https://nominatim.openstreetmap.org/search?q=Madrid&countrycodes=es&featureType=city' +
           '&polygon_geojson=1&polygon_threshold=0.0003&format=geojson&limit=1'
    $json = $utf8.GetString((Bajar $url))
    $destino = Join-Path $raiz 'www\datos_propios\termino_municipal_osm.geojson'
    Escribir $destino $json
    $obj = $json | ConvertFrom-Json
    $f = $obj.features[0]
    Write-Host ("   OK: {0} (osm {1}), geometria {2}" -f $f.properties.display_name, $f.properties.osm_id, $f.geometry.type)
} catch { Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red }

# ---------------------------------------------------------------- 2. PNOA historico
Write-Host '2. PNOA historico del IGN'
$wms = 'https://www.ign.es/wms/pnoa-historico'
$nombres = @()
try {
    $caps = $utf8.GetString((Bajar "$wms`?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0"))
    Escribir (Join-Path $salida 'pnoa_capabilities.xml') $caps
    $nombres = @([regex]::Matches($caps, '<Name>([^<]+)</Name>') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
    Escribir (Join-Path $salida 'pnoa_capas.txt') ($nombres -join "`r`n")
    Write-Host "   $($nombres.Count) capas en el servicio (lista en comprobaciones\pnoa_capas.txt)"
} catch { Write-Host "   ERROR capabilities: $($_.Exception.Message)" -ForegroundColor Red }

# Capas a probar: todas las PNOA<ano> del servicio (o 2004-2025 si no se pudo leer)
$probar = @($nombres | Where-Object { $_ -match '^PNOA\d{4}' })
if ($probar.Count -eq 0) { $probar = 2004..2025 | ForEach-Object { "PNOA$_" } }

# Recuadro de 4 x 4 km centrado en la Puerta del Sol (EPSG:3857)
$bbox = '-414300,4924500,-410300,4928500'
$filas = @('capa;http;bytes;pixeles_blancos_pct;variacion;veredicto')
foreach ($capa in $probar) {
    $u = "$wms`?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=$capa&STYLES=&CRS=EPSG:3857&BBOX=$bbox&WIDTH=256&HEIGHT=256&FORMAT=image/jpeg"
    $http = 'OK'; $bytes = 0; $blanco = ''; $var = ''; $veredicto = ''
    try {
        $datos = Bajar $u
        $bytes = $datos.Length
        [System.IO.File]::WriteAllBytes((Join-Path $muestras "$capa.jpg"), $datos)
        try {
            $ms = New-Object System.IO.MemoryStream(,$datos)
            $img = [System.Drawing.Bitmap]::FromStream($ms)
            $n = 0; $nb = 0; $suma = 0.0; $suma2 = 0.0
            for ($x = 4; $x -lt $img.Width; $x += 8) {
                for ($y = 4; $y -lt $img.Height; $y += 8) {
                    $c = $img.GetPixel($x, $y); $l = ($c.R + $c.G + $c.B) / 3.0
                    $n++; $suma += $l; $suma2 += $l * $l
                    if ($c.R -gt 245 -and $c.G -gt 245 -and $c.B -gt 245) { $nb++ }
                }
            }
            $img.Dispose(); $ms.Dispose()
            $media = $suma / $n
            $blanco = [math]::Round(100.0 * $nb / $n, 1)
            $var = [math]::Round([math]::Sqrt([math]::Max(0, $suma2 / $n - $media * $media)), 1)
            $veredicto = if ($blanco -gt 90 -or $var -lt 3) { 'SIN IMAGEN' } elseif ($blanco -gt 20) { 'PARCIAL' } else { 'CON IMAGEN' }
        } catch { $veredicto = 'NO ES IMAGEN (error del servidor?)' }
    } catch { $http = 'ERROR'; $veredicto = $_.Exception.Message }
    $filas += "$capa;$http;$bytes;$blanco;$var;$veredicto"
    Write-Host ("   {0,-14} {1}" -f $capa, $veredicto)
}
Escribir (Join-Path $salida 'pnoa_madrid.csv') ($filas -join "`r`n")

# ---------------------------------------------------------------- 3. Comunidad de Madrid
Write-Host '3. Capas historicas de la Comunidad de Madrid (todas)'
try {
    $cm = 'https://idem.comunidad.madrid/visor/release/vgcm/statics/capabilities/produccion/srvimagenes2_visorcartografia2.xml'
    $xml = $utf8.GetString((Bajar $cm))
    $lineas = foreach ($b in [regex]::Matches($xml, '<Layer>[\s\S]*?</Layer>')) {
        $id = [regex]::Match($b.Value, '<(?:ows:)?Identifier[^>]*>([\s\S]*?)</(?:ows:)?Identifier>').Groups[1].Value.Trim()
        $ti = [regex]::Match($b.Value, '<(?:ows:)?Title[^>]*>([\s\S]*?)</(?:ows:)?Title>').Groups[1].Value.Trim()
        "$ti`t$id"
    }
    Escribir (Join-Path $salida 'cm_capas_todas.txt') (($lineas | Sort-Object) -join "`r`n")
    Write-Host "   $(@($lineas).Count) capas (lista en comprobaciones\cm_capas_todas.txt)"
} catch { Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red }

# ---------------------------------------------------------------- 4. Cobertura de los vuelos del IGN sobre el municipio
# Rejilla de 5 x 5 celdas sobre el termino municipal; cada celda se pide aparte y se mira si viene en blanco.
Write-Host '4. Cobertura de los vuelos del IGN sobre el municipio (rejilla 5x5, tarda unos minutos: no cierres la ventana)'
$vuelos = @('AMS_1956-1957','Interministerial_1973-1986','Nacional_1981-1986','OLISTAT') +
          @($probar | Where-Object { $_ -match '^PNOA(2006|2009|2011|2014|2017|2020|2023)$' })
$x0 = -420700; $x1 = -399000; $y0 = 4910000; $y1 = 4937000   # aprox. -3.78/-3.58, 40.33/40.52
$filas = @('capa;celdas_con_imagen;celdas_total;cobertura_pct')
foreach ($capa in $vuelos) {
    $con = 0; $tot = 0
    for ($i = 0; $i -lt 5; $i++) {
        for ($j = 0; $j -lt 5; $j++) {
            $ax = $x0 + ($x1 - $x0) * $i / 5; $bx = $x0 + ($x1 - $x0) * ($i + 1) / 5
            $ay = $y0 + ($y1 - $y0) * $j / 5; $by = $y0 + ($y1 - $y0) * ($j + 1) / 5
            $u = "$wms`?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=$capa&STYLES=&CRS=EPSG:3857&BBOX=$ax,$ay,$bx,$by&WIDTH=64&HEIGHT=64&FORMAT=image/jpeg"
            $tot++
            try {
                $datos = Bajar $u
                $ms = New-Object System.IO.MemoryStream(,$datos)
                $img = [System.Drawing.Bitmap]::FromStream($ms)
                $nb = 0; $n = 0
                for ($x = 2; $x -lt $img.Width; $x += 6) { for ($y = 2; $y -lt $img.Height; $y += 6) {
                    $c = $img.GetPixel($x, $y); $n++
                    if ($c.R -gt 245 -and $c.G -gt 245 -and $c.B -gt 245) { $nb++ } } }
                $img.Dispose(); $ms.Dispose()
                if ($nb / $n -lt 0.5) { $con++ }
            } catch { }
        }
    }
    $pct = [math]::Round(100.0 * $con / $tot)
    $filas += "$capa;$con;$tot;$pct"
    Write-Host ("   {0,-28} {1,3}% del municipio" -f $capa, $pct)
}
Escribir (Join-Path $salida 'cobertura_vuelos.csv') ($filas -join "`r`n")

Write-Host "`nListo. Resultados en comprobaciones\ y el termino en www\datos_propios\" -ForegroundColor Green
