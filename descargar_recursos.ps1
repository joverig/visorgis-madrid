# Descarga a www\ lo que el visor puede tener en disco (equivale a "npm run setup", sin Node):
#   1. OpenLayers 10.5.0 -> www\lib\ol\ol.js y ol.css (asi no depende del CDN)
#   2. Capabilities WMTS de la Comunidad de Madrid, recortadas a las ortofotos historicas
#      -> www\data\cm_capabilities.xml + www\data\capas_cm.json (solo las capas con texto en js\capas.js -> textosCM)
# Las teselas se siguen pidiendo en directo al IGN y a la Comunidad.
# Uso: 1_Descargar_recursos.bat (rutas relativas a esta carpeta)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$raiz = $PSScriptRoot
$www  = Join-Path $raiz 'www'
$olVersion = '10.5.0'
$olFicheros = [ordered]@{
    'lib\ol\ol.js'  = "https://cdn.jsdelivr.net/npm/ol@$olVersion/dist/ol.js"
    'lib\ol\ol.css' = "https://cdn.jsdelivr.net/npm/ol@$olVersion/ol.css"
}
$cmCaps   = 'https://idem.comunidad.madrid/visor/release/vgcm/statics/capabilities/produccion/srvimagenes2_visorcartografia2.xml'
$cmAnioMax = 2003   # desde 2004 la linea temporal usa el PNOA del IGN
# Seleccion curada: las capas que tienen texto en www\js\capas.js (textosCM). Solo esas van al XML.
$seleccion = @([regex]::Matches((Get-Content (Join-Path $www 'js\capas.js') -Raw -Encoding UTF8), "'(fotosAereas[^']+)'\s*:\s*\{") | ForEach-Object { $_.Groups[1].Value })
$utf8 = New-Object System.Text.UTF8Encoding($false)   # UTF-8 sin BOM

function Bajar([string]$url) {
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add('User-Agent', 'visorgis_madrid')
    $wc.Proxy = [System.Net.WebRequest]::GetSystemWebProxy()
    $wc.Proxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials
    try { return ,$wc.DownloadData($url) } finally { $wc.Dispose() }
}
function Guardar([string]$rel, [byte[]]$bytes) {
    $ruta = Join-Path $www $rel
    $dir = Split-Path $ruta -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    [System.IO.File]::WriteAllBytes($ruta, $bytes)
    Write-Host ('  OK {0} ({1:N0} KB)' -f $rel, ($bytes.Length / 1KB))
}
function PrimerTexto([string]$bloque, [string]$etiqueta) {
    $m = [regex]::Match($bloque, "<(?:ows:)?$etiqueta[^>]*>([\s\S]*?)</(?:ows:)?$etiqueta>")
    if ($m.Success) { return $m.Groups[1].Value.Trim() } else { return $null }
}
function ExtraerAnio([string]$titulo, [string]$id) {
    $t = [regex]::Match("$titulo", '^\s*(1[89]\d\d|20\d\d)\b')
    if ($t.Success) { return [int]$t.Groups[1].Value }
    # p.ej. fotosAereasHistoricas_1950-1959_1956-CT-50cm-mosaico -> 1956
    $i = [regex]::Matches("$id", '_(1[89]\d\d|20\d\d)(?!-\d{4}_)(?=[-_])')
    if ($i.Count -gt 0) { return [int]$i[$i.Count - 1].Groups[1].Value }
    return $null
}

$ok = $true

Write-Host "OpenLayers $olVersion"
try {
    foreach ($rel in $olFicheros.Keys) { Guardar $rel (Bajar $olFicheros[$rel]) }
} catch { $ok = $false; Write-Host "  ERROR OpenLayers: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host 'Comunidad de Madrid - ortofotos historicas'
try {
    $xml = $utf8.GetString((Bajar $cmCaps))
    $bloques = [regex]::Matches($xml, '<Layer>[\s\S]*?</Layer>')
    $capas = @(); $elegidos = @()
    foreach ($b in $bloques) {
        $txt = $b.Value
        $id = PrimerTexto $txt 'Identifier'
        $titulo = PrimerTexto $txt 'Title'
        $anio = ExtraerAnio $titulo $id
        $elegida = $seleccion -contains $id
        if (-not $id -or -not $anio) { continue }
        if ($anio -gt $cmAnioMax -and -not $elegida) { continue }   # posteriores a 2003: solo las elegidas
        if ("$id $titulo" -match '(?i)IRG|infr|falso|NDVI') { continue }       # infrarrojos fuera
        if ("$id $titulo" -notmatch '(?i)foto|orto|vuelo|aere') { continue }   # solo imagenes
        $activa = ($seleccion.Count -eq 0) -or ($seleccion -contains $id)
        $capas += [pscustomobject][ordered]@{ identifier = $id; title = $titulo; anio = $anio; activa = $activa }
        if ($activa) { $elegidos += $txt }
    }
    $capas = @($capas | Sort-Object anio)
    # XML recortado: cabecera + capas elegidas + TileMatrixSets
    $recortado = $xml
    if ($bloques.Count -gt 0) {
        $ini = $bloques[0].Index
        $ult = $bloques[$bloques.Count - 1]
        $fin = $ult.Index + $ult.Length
        $recortado = $xml.Substring(0, $ini) + ($elegidos -join "`n") + $xml.Substring($fin)
    }
    Write-Host "  $($bloques.Count) capas en el servicio, $($capas.Count) historicas; $($elegidos.Count) en la linea temporal (textosCM de capas.js):"
    foreach ($c in ($capas | Where-Object { $_.activa })) { Write-Host "    $($c.anio)  $($c.title)" }
    Guardar 'data\cm_capabilities.xml' $utf8.GetBytes($recortado)
    $json = ConvertTo-Json -InputObject $capas -Depth 3
    if ($capas.Count -eq 0) { $json = '[]' }
    Guardar 'data\capas_cm.json' $utf8.GetBytes($json)
} catch { $ok = $false; Write-Host "  ERROR Comunidad de Madrid: $($_.Exception.Message)" -ForegroundColor Red }

if ($ok) { Write-Host "`nListo. Arranca con Arrancar_visor.bat" -ForegroundColor Green }
else { Write-Host "`nTerminado con avisos (el visor funciona igualmente con CDN / sin capas de la Comunidad)." -ForegroundColor Yellow }
