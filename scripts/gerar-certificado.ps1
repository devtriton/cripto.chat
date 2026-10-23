# ============================================================
# cripto.chat - Gerador de certificado SSL autoassinado
# Habilita o servidor HTTPS (porta 3443) para instalar o PWA
# no celular pela rede local (Chrome exige HTTPS para o prompt).
#
# Uso:  powershell -File scripts/gerar-certificado.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

# Localiza o openssl (Git for Windows em primeiro lugar)
$gitOpenssl = "C:\Program Files\Git\usr\bin\openssl.exe"
$openssl = if (Test-Path $gitOpenssl) { $gitOpenssl }
           elseif (Get-Command openssl -ErrorAction SilentlyContinue) { (Get-Command openssl).Source }
           else { Write-Host "ERRO: OpenSSL nao encontrado. Instale o Git for Windows."; exit 1 }

Write-Host "OpenSSL: $openssl"

$sslDir = Join-Path $PSScriptRoot "..\server\ssl"
if (-not (Test-Path $sslDir)) { New-Item -ItemType Directory -Path $sslDir | Out-Null }
$sslDir = (Resolve-Path $sslDir).Path

$keyPath  = Join-Path $sslDir "key.pem"
$certPath = Join-Path $sslDir "cert.pem"

# Coleta IPs da rede local para incluir no certificado (SAN)
$ips = @("127.0.0.1")
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*" } |
  ForEach-Object { $ips += $_.IPAddress }
$ips = $ips | Select-Object -Unique

$san = "DNS:localhost"
foreach ($ip in $ips) { $san += ",IP:$ip" }

Write-Host "SAN (alternativas de nome): $san"

# Gera chave + certificado (validade 825 dias, maximo aceito por Chrome/Apple)
# EAP=Continue: o openssl emite progresso no stderr — nao deve interromper o script
$ErrorActionPreference = 'Continue'
& $openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes `
  -keyout $keyPath -out $certPath `
  -subj "/CN=cripto.chat/O=cripto.chat/C=BR" `
  -addext "subjectAltName=$san" 2>"$sslDir\openssl.log" | Out-Null
$ErrorActionPreference = 'Stop'

if ((Test-Path $keyPath) -and (Test-Path $certPath)) {
  Write-Host ""
  Write-Host "Certificado gerado com sucesso:"
  Write-Host "  $keyPath"
  Write-Host "  $certPath"
  Write-Host ""
  Write-Host "Reinicie o servidor: o HTTPS (porta 3443) sera ativado."
  Write-Host "No celular, aceite o aviso de certificado (Avancado -> Continuar)."
} else {
  Write-Host "ERRO: falha ao gerar o certificado."
  exit 1
}
