/**
 * cripto.chat — Servidor WebSocket com Login por Email + OTP
 * 
 * Fluxo de autenticação:
 * 1. Usuário informa email
 * 2. Servidor gera código de 6 dígitos e envia por email (SMTP)
 * 3. Usuário digita o código recebido
 * 4. Servidor valida e registra o usuário
 * 
 * Configuração de email:
 * - Defina as variáveis de ambiente SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - Sem configuração, o código é exibido no console (modo demo)
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// Carregar variáveis de ambiente do arquivo .env (apenas local)
// O .env fica em server/.env → caminho ABSOLUTO para não depender da pasta
// de onde o node foi chamado (npm start na raiz, Render, Plesk, etc.)
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  // dotenv não instalado - usar variáveis de ambiente do sistema
}

// ============================================================
// MODO DEMO - Configuração com senha
// ============================================================

const DEMO_CONFIG_FILE = path.join(__dirname, 'demo-config.json');

function lerDemoConfig() {
  try {
    const data = JSON.parse(fs.readFileSync(DEMO_CONFIG_FILE, 'utf8'));
    return data;
  } catch (e) {
    return { senhaHash: '', modoDemo: false };
  }
}

function salvarDemoConfig(config) {
  fs.writeFileSync(DEMO_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function validarSenhaDemo(senha) {
  const config = lerDemoConfig();
  const hash = crypto.createHash('sha256').update(senha).digest('hex');
  return hash === config.senhaHash;
}

function isModoDemo() {
  return lerDemoConfig().modoDemo === true;
}

// ============================================================
// CONFIGURAÇÃO DE EMAIL (SMTP)
// ============================================================

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'cripto.chat <noreply@cripto.chat>'
};

const emailConfigurado = !!(SMTP_CONFIG.user && SMTP_CONFIG.pass);

let transporter = null;
if (emailConfigurado) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: { user: SMTP_CONFIG.user, pass: SMTP_CONFIG.pass }
    });
    console.log('[EMAIL] SMTP configurado para:', SMTP_CONFIG.user);
  } catch (e) {
    console.warn('[EMAIL] nodemailer não instalado. Execute: npm install nodemailer');
  }
}

async function enviarEmailOTP(email, codigo, nome) {
  // PRODUÇÃO: Se SMTP não estiver configurado, rejeita o envio
  if (!transporter) {
    throw new Error('SMTP nãoConfigureido. Defina as variáveis SMTP_HOST, SMTP_USER e SMTP_PASS.');
  }
  try {
    await transporter.sendMail({
      from: SMTP_CONFIG.from,
      to: email,
      subject: 'Seu código de acesso - cripto.chat',
      text: `Olá ${nome}, seu código de acesso é: ${codigo}`,
      html: `<h2>cripto.chat — Código de Acesso</h2><p>Olá <strong>${nome}</strong>,</p><p>Seu código de acesso é: <strong style="font-size: 24px; color: #00d4ff;">${codigo}</strong></p><p>Este código expira em 5 minutos.</p>`
    });
    console.log(`[EMAIL] Código enviado para ${email}`);
  } catch (e) {
    console.error('[EMAIL] Erro ao enviar:', e.message);
    throw e;
  }
}

// ============================================================
// ESTADO DO SERVIDOR
// ============================================================

const salas = new Map();       // salaId -> { nome, usuarios: Set } — TODAS as salas são públicas
const usuarios = new Map();    // email -> { ws, nome, salaAtual, lastActivity, entrouEmSalaEm }
const salaAdmWs = new Set();   // Conexões da sala ADM
const otps = new Map();        // email -> { codigo, nome, expira }
const chavesPublicas = new Map(); // email -> { chavePublica, nome } — chaves RSA públicas (E2E). O servidor NUNCA recebe chaves privadas.
const chavesPublicasECC = new Map(); // email -> { chavePublica, nome } — chaves ECDH P-256 públicas (E2E). O servidor NUNCA recebe chaves privadas.

// UM usuário pode ter VÁRIAS conexões abertas ao mesmo tempo (ex.: aba normal +
// aba da SALA ADM, ou duas abas do navegador). Guardamos todas elas: antes, a
// conexão nova "roubava" a antiga e a aba que ficava órfã deixava de receber
// eventos da sala (parecia que "ninguém atualizava nada").
const conexoes = new Map();       // email -> Set<ws>

function registrarConexao(email, ws) {
  if (!conexoes.has(email)) conexoes.set(email, new Set());
  conexoes.get(email).add(ws);
}

// Envia uma mensagem para TODAS as conexões de um usuário (exceto a indicada)
function enviarParaUsuario(email, msg, exceto = null) {
  const conjunto = conexoes.get(email);
  if (!conjunto) return false;
  const texto = JSON.stringify(msg);
  let enviou = false;
  for (const c of conjunto) {
    if (c !== exceto && c.readyState === WebSocket.OPEN) {
      c.send(texto);
      enviou = true;
    }
  }
  return enviou;
}

// Remove uma conexão; retorna true quando o usuário ficou SEM NENHUMA conexão
function removerConexao(email, ws) {
  const conjunto = conexoes.get(email);
  if (!conjunto) return true;
  conjunto.delete(ws);
  if (conjunto.size === 0) { conexoes.delete(email); return true; }
  return false;
}

// ============================================================
// SERVIDOR HTTP (arquivos estáticos servidos de public/)
// ============================================================

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8'
};

// Localiza a pasta pública (prioriza server/public, com fallback automático)
let PUBLIC_DIR = path.resolve(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) {
  const fallbackRoot = path.resolve(__dirname, '..', 'public');
  if (fs.existsSync(fallbackRoot)) {
    PUBLIC_DIR = fallbackRoot;
  }
}

// ============================================================
// CERTIFICADO SSL AUTOMÁTICO
// Gera/renova sozinho o certificado autoassinado quando:
//  - ainda não existe;
//  - o IP da máquina mudou (SAN desatualizado);
//  - está perto de expirar (< 7 dias);
//  - o arquivo está inválido.
// O professor não precisa rodar nenhum comando manual.
// ============================================================

const SSL_DIR = path.join(__dirname, 'ssl');
const SSL_AUTO = !process.env.SSL_CERT_PATH && !process.env.SSL_KEY_PATH;
const SSL_KEY = process.env.SSL_KEY_PATH
  ? path.resolve(process.env.SSL_KEY_PATH)
  : path.join(SSL_DIR, 'key.pem');
const SSL_CERT = process.env.SSL_CERT_PATH
  ? path.resolve(process.env.SSL_CERT_PATH)
  : path.join(SSL_DIR, 'cert.pem');
const HTTPS_PORT = process.env.HTTPS_PORT === undefined ? 3443 : Number(process.env.HTTPS_PORT);
let HTTPS_ATIVO = false;

function encontrarOpenSSL() {
  const candidatos = [
    process.env.OPENSSL_PATH,
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe'
  ].filter(Boolean);
  for (const c of candidatos) {
    if (fs.existsSync(c)) return c;
  }
  const teste = spawnSync('openssl', ['version'], { encoding: 'utf8' });
  if (!teste.error && teste.status === 0) return 'openssl';
  return null;
}

function ipsLocais() {
  const lista = ['127.0.0.1'];
  const interfaces = os.networkInterfaces();
  for (const nome of Object.keys(interfaces)) {
    for (const iface of interfaces[nome]) {
      if (iface.family === 'IPv4' && !iface.internal) lista.push(iface.address);
    }
  }
  return [...new Set(lista)];
}

function certificadoPrecisaRenovar() {
  try {
    if (!fs.existsSync(SSL_KEY) || !fs.existsSync(SSL_CERT)) return 'ausente';
    const cert = new crypto.X509Certificate(fs.readFileSync(SSL_CERT));
    const validadeMs = new Date(cert.validTo).getTime() - Date.now();
    if (validadeMs < 7 * 24 * 60 * 60 * 1000) return 'expirando';
    const san = cert.subjectAltName || '';
    for (const ip of ipsLocais()) {
      if (san.indexOf('IP Address:' + ip) === -1) return 'ip-novo (' + ip + ')';
    }
    return null;
  } catch (e) {
    return 'invalido';
  }
}

function garantirCertificado() {
  // Certificado fornecido externamente (ex.: Let's Encrypt em produção)
  if (!SSL_AUTO) {
    if (fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
      console.log('[HTTPS] Usando certificado configurado via SSL_KEY_PATH/SSL_CERT_PATH.');
      return true;
    }
    console.warn('[HTTPS] SSL_KEY_PATH/SSL_CERT_PATH definidos, mas arquivos não encontrados.');
    return false;
  }

  const motivo = certificadoPrecisaRenovar();
  if (!motivo) {
    console.log('[HTTPS] Certificado válido para os IPs atuais.');
    return true;
  }

  console.log(`[HTTPS] Gerando certificado automático (motivo: ${motivo})...`);
  const openssl = encontrarOpenSSL();
  if (!openssl) {
    console.warn('[HTTPS] OpenSSL não encontrado. Instale o Git for Windows (https://git-scm.com) para HTTPS automático.');
    return fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT);
  }

  if (!fs.existsSync(SSL_DIR)) fs.mkdirSync(SSL_DIR, { recursive: true });
  const san = ['DNS:localhost', ...ipsLocais().map(ip => 'IP:' + ip)].join(',');
  const r = spawnSync(openssl, [
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-days', '825', '-nodes',
    '-keyout', SSL_KEY, '-out', SSL_CERT,
    '-subj', '/CN=cripto.chat/O=cripto.chat/C=BR',
    '-addext', 'subjectAltName=' + san
  ], { encoding: 'utf8' });

  if (r.status !== 0 || !fs.existsSync(SSL_CERT)) {
    console.warn('[HTTPS] Falha ao gerar certificado:', (r.stderr || '').trim().split('\n').slice(-2).join(' '));
    return fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT);
  }
  console.log('[HTTPS] Certificado gerado com sucesso para:', san);
  return true;
}

const requestHandler = (req, res) => {
  // Health check (Render): responde 200 sem depender de arquivos estáticos
  const caminhoHealth = (req.url || '').split('?')[0];
  if (caminhoHealth === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({ status: 'ok', uptime: Math.round(process.uptime()) }));
    return;
  }

  // Rede local via HTTP → redireciona automaticamente para HTTPS.
  // O Chrome só permite instalar o PWA em contexto seguro (HTTPS).
  // Não redireciona atrás de proxy reverso (Render/Plesk): nesse caso o
  // TLS já é terminado externamente e o redirect para :3443 quebraria o site.
  if (HTTPS_ATIVO && !req.socket.encrypted && !req.headers['x-forwarded-proto']) {
    const hostname = (req.headers.host || '').split(':')[0];
    const ehLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (hostname && !ehLocal) {
      res.writeHead(302, { Location: `https://${hostname}:${HTTPS_PORT}${req.url}` });
      res.end();
      return;
    }
  }

  // Trata apenas requisições GET e HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Método não permitido');
    return;
  }

  // Remove querystring antes de comparar ("/" e "/?adm=1" servem o index.html)
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  
  // SEGURANÇA: Sanitiza contra Path Traversal
  // Impede qualquer acesso fora da pasta public (ex: /../.env, /../server.js, etc.)
  const safeRelativePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.resolve(PUBLIC_DIR, '.' + safeRelativePath);
  
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Proibido: Acesso negado fora da pasta pública.');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Não encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    };
    // HTML/JSON files: no cache (always fetch latest version)
    if (ext === '.html' || ext === '.json') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }
    // JS/CSS: cache but revalidate
    if (ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'no-cache, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
};

const server = http.createServer(requestHandler);

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[ERRO] A porta ${process.env.PORT || 3000} já está em uso.`);
    console.error('[ERRO] Já existe um cripto.chat rodando. Feche a outra janela ou reinicie o computador.');
    process.exit(1);
  }
  console.error('[ERRO] Servidor HTTP:', e.message);
});

// ============================================================
// SERVIDOR WEBSOCKET
// ============================================================

const wss = new WebSocket.Server({ server });

// Conexões do servidor HTTPS (preenchido lá no final; null quando ausente)
let wssSecure = null;

// Lista TODAS as conexões WebSocket (HTTP + HTTPS)
function todasConexoesWs() {
  const lista = [...wss.clients];
  if (wssSecure) lista.push(...wssSecure.clients);
  return lista;
}

function broadcast(salaId, msg, exceto = null) {
  const sala = salas.get(salaId);
  if (!sala) return;
  for (const userEmail of sala.usuarios) {
    // Envia para TODAS as abas/conexões daquele usuário
    enviarParaUsuario(userEmail, msg, exceto);
  }
}

// Enviar mensagem a TODOS os usuários conectados
function broadcastTodos(msg, exceto = null) {
  for (const email of conexoes.keys()) {
    enviarParaUsuario(email, msg, exceto);
  }
}

// Lista das salas abertas (formato do client) — todas são públicas
function listaSalasPublicas() {
  const lista = [];
  for (const [id, sala] of salas) {
    lista.push({ salaId: id, nome: sala.nome, usuarios: sala.usuarios.size });
  }
  return lista;
}

// Avisar todos os clientes para atualizarem a lista de salas públicas
function avisarAtualizacaoSalas() {
  broadcastTodos({ tipo: 'atualizar_salas' });
}

// Enviar a um cliente todas as chaves públicas E2E conhecidas
function enviarChavesPublicas(ws) {
  const chaves = [...chavesPublicas.entries()].map(([email, v]) => ({ email, chavePublica: v.chavePublica, nome: v.nome }));
  ws.send(JSON.stringify({ tipo: 'lista_chaves', chaves }));
  const chavesEcc = [...chavesPublicasECC.entries()].map(([email, v]) => ({ email, chavePublica: v.chavePublica, nome: v.nome }));
  ws.send(JSON.stringify({ tipo: 'lista_chaves_ecc', chaves: chavesEcc }));
}

// Remove um usuário de uma sala; se a sala ficar vazia, é apagada permanentemente
function removerUsuarioDaSala(salaId, email) {
  const sala = salas.get(salaId);
  if (!sala) return;
  sala.usuarios.delete(email);
  const agora = new Date().toISOString();
  broadcast(salaId, { tipo: 'usuario_saiu', salaId, email, dataHora: agora });
  
  if (sala.usuarios.size === 0) {
    // Sala sem usuários online → apagada permanentemente
    salas.delete(salaId);
    console.log(`[SALA] "${sala.nome}" (${salaId}) apagada — sem usuários online`);
  }
  
  avisarAtualizacaoSalas();
}

function enviarParaAdm(msg) {
  // Tipo exclusivo 'visao_adm': o cliente que está na sala E na ADM não duplica a mensagem no chat
  for (const ws of salaAdmWs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ ...msg, tipo: 'visao_adm' }));
    }
  }
}

// ============================================================
// GERAR CÓDIGO OTP
// ============================================================

function gerarOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function solicitarOTP(email) {
  const codigo = gerarOTP();
  const nome = email.split('@')[0].replace(/[._]/g, ' ').replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase());
  
  otps.set(email, {
    codigo,
    nome,
    expira: Date.now() + 5 * 60 * 1000  // 5 minutos de validade
  });
  
  // Enviar por email (ou exibir no console em modo demo)
  console.log(`[cripto.chat] OTP para ${email}: ${codigo}`);
  
  return { nome, emailResult: enviarEmailOTP(email, codigo, nome) };
}

function verificarOTP(email, codigo) {
  const otp = otps.get(email);
  if (!otp) return null;
  if (Date.now() > otp.expira) {
    otps.delete(email);
    return null;
  }
  if (otp.codigo !== codigo) return null;
  
  otps.delete(email); // OTP é único, remove após uso
  return { nome: otp.nome };
}

// ============================================================
// HANDLERS DE MENSAGENS WEBSOCKET
// ============================================================

function handleWsConnection(ws) {
  ws.isAdm = false;
  ws.email = null;
  ws._missedPings = 0;

  ws.on('message', (raw) => {
    // Proteção contra payloads excessivos (máximo 64 KB)
    if (raw.length > 65536) {
      ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Mensagem muito grande (máximo 64KB).' }));
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return; // Ignora pacotes que não sejam JSON válido
    }
    
    // QUALQUER mensagem recebida confirma que o cliente está ativo
    ws._missedPings = 0;

    // Ações permitidas ANTES do login (públicas). Todo o resto exige sessão
    // autenticada — evita "fantasmas" entrando em salas sem email.
    const TIPOS_PUBLICOS = [
      'solicitar_otp', 'verificar_otp', 'restaurar_sessao',
      'verificar_demo', 'habilitar_demo', 'desabilitar_demo',
      'heartbeat', 'heartbeat_ack', 'ping', 'pong'
    ];
    if (!ws.email && !TIPOS_PUBLICOS.includes(data.tipo)) {
      ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Sessão não autenticada. Faça login novamente.' }));
      return;
    }
    
    switch (data.tipo) {

      // --------------------------------------------------------
      // HEARTBEAT / KEEP-ALIVE BIDIRECIONAL
      // --------------------------------------------------------
      case 'heartbeat':
      case 'ping': {
        ws._missedPings = 0;
        ws.send(JSON.stringify({ tipo: 'heartbeat_ack', timestamp: Date.now() }));
        break;
      }

      case 'heartbeat_ack':
      case 'pong': {
        ws._missedPings = 0;
        break;
      }
      
      // --------------------------------------------------------
      // MODO DEMO: Habilitar/Desabilitar com senha mestre
      // --------------------------------------------------------
      case 'habilitar_demo': {
        const { senha } = data;
        if (validarSenhaDemo(senha)) {
          const config = lerDemoConfig();
          config.modoDemo = true;
          salvarDemoConfig(config);
          ws.send(JSON.stringify({ tipo: 'demo_status', ativo: true, mensagem: 'Modo demo HABILITADO para todos.' }));
          console.log('[MODO DEMO] Habilitado por ' + ws.email);
        } else {
          ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Senha mestre incorreta.' }));
        }
        break;
      }
      
      case 'desabilitar_demo': {
        const { senha } = data;
        if (validarSenhaDemo(senha)) {
          const config = lerDemoConfig();
          config.modoDemo = false;
          salvarDemoConfig(config);
          ws.send(JSON.stringify({ tipo: 'demo_status', ativo: false, mensagem: 'Modo demo DESABILITADO.' }));
          console.log('[MODO DEMO] Desabilitado por ' + ws.email);
        } else {
          ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Senha mestre incorreta.' }));
        }
        break;
      }
      
      case 'verificar_demo': {
        ws.send(JSON.stringify({ tipo: 'demo_status', ativo: isModoDemo(), mensagem: isModoDemo() ? 'Modo demo está ATIVO' : 'Modo demo está INATIVO' }));
        break;
      }
      
      // --------------------------------------------------------
      // LOGIN PASSO 1: Solicitar OTP
      // --------------------------------------------------------
      case 'solicitar_otp': {
        const { email } = data;
        const codigo = gerarOTP();
        const nome = email.split('@')[0].replace(/[._]/g, ' ').replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase());
        
        otps.set(email, {
          codigo,
          nome,
          expira: Date.now() + 5 * 60 * 1000
        });
        
        console.log(`[cripto.chat] OTP para ${email}: ${codigo}`);
        
        // Verificar se modo demo está ativo
        const demoAtivo = isModoDemo();
        
        // MODO DEMO: exibir código na tela (sem envio por email)
        if (demoAtivo) {
          ws.send(JSON.stringify({
            tipo: 'otp_enviado',
            email,
            nome,
            demo: true,
            codigo: codigo,
            mensagem: 'Modo demo: código exibido na tela'
          }));
          break;
        }
        
        // PRODUÇÃO: enviar por email
        enviarEmailOTP(email, codigo, nome)
          .then(() => {
            ws.send(JSON.stringify({
              tipo: 'otp_enviado',
              email,
              nome,
              demo: false,
              mensagem: `Código enviado para ${email} (válido por 5 minutos)`
            }));
          })
          .catch(err => {
            // PRODUÇÃO: rejeitar se SMTP não configurado
            ws.send(JSON.stringify({
              tipo: 'erro',
              mensagem: 'Serviço de email não configurado. Ative o MODO DEMO (botão MODO DEMO no topo da tela) para ver o código na tela, ou configure o SMTP (SMTP_USER e SMTP_PASS).'
            }));
          });
        break;
      }
      
      // --------------------------------------------------------
      // LOGIN PASSO 2: Verificar OTP e registrar usuário
      // --------------------------------------------------------
      case 'verificar_otp': {
        const { email, codigo } = data;
        const result = verificarOTP(email, codigo);
        
        if (!result) {
          ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Código inválido ou expirado.' }));
          return;
        }
        
        // Registrar usuário (mantém as outras abas já conectadas com este email)
        const usuarioLogin = usuarios.get(email);
        const agora = new Date();
        if (usuarioLogin) { 
            usuarioLogin.ws = ws; 
            usuarioLogin.nome = result.nome; 
            usuarioLogin.lastActivity = agora;
        } else usuarios.set(email, { ws, nome: result.nome, salaAtual: null, lastActivity: agora, entrouEmSalaEm: null });
        registrarConexao(email, ws);
        ws.email = email;
        
        ws.send(JSON.stringify({
          tipo: 'registrado',
          email,
          nome: result.nome,
          mensagem: `Bem-vindo, ${result.nome}!`
        }));
        
        // Enviar chaves públicas E2E já conhecidas (para poder cifrar mensagens ponta a ponta)
        enviarChavesPublicas(ws);
        
        console.log(`[LOGIN] ${result.nome} (${email}) autenticou via OTP`);
        break;
      }
      
      // --------------------------------------------------------
      // RESTAURAR SESSÃO (após atualizar a página)
      // --------------------------------------------------------
      case 'restaurar_sessao': {
        const { email, nome } = data;
        if (!email) break;
        const nomeUser = nome || email.split('@')[0];
        // Re-registrar usuário com a nova conexão ws.
        // IMPORTANTE: não zera a sala atual nem apaga as outras abas conectadas.
        const usuarioExistente = usuarios.get(email);
        const agora = new Date();
        if (usuarioExistente) {
          usuarioExistente.ws = ws;
          if (nome) usuarioExistente.nome = nome;
          usuarioExistente.lastActivity = agora;
        } else {
          usuarios.set(email, { ws, nome: nomeUser, salaAtual: null, lastActivity: agora, entrouEmSalaEm: null });
        }
        registrarConexao(email, ws);
        ws.email = email;
        ws.send(JSON.stringify({
          tipo: 'registrado',
          email,
          nome: nomeUser,
          mensagem: `Bem-vindo de volta, ${nome || email}!`
        }));
        // Enviar chaves públicas E2E já conhecidas
        enviarChavesPublicas(ws);
        console.log(`[SESSÃO] ${nome || email} (${email}) restaurou sessão`);
        break;
      }
      
      // --------------------------------------------------------
      // PUBLICAR CHAVE PÚBLICA RSA (E2E)
      // O servidor guarda e distribui apenas a chave PÚBLICA.
      // A chave privada nunca sai do computador do usuário.
      // --------------------------------------------------------
      case 'publicar_chave': {
        if (!data.chavePublica || !ws.email) break;
        const nomeUser = usuarios.get(ws.email)?.nome || ws.email;
        chavesPublicas.set(ws.email, { chavePublica: data.chavePublica, nome: nomeUser });
        broadcastTodos({ tipo: 'chave_publica', email: ws.email, nome: nomeUser, chavePublica: data.chavePublica });
        console.log(`[E2E] Chave pública de ${ws.email} publicada`);
        break;
      }

      // --------------------------------------------------------
      // PUBLICAR CHAVE PÚBLICA ECDH P-256 (ECC / ponta a ponta)
      // O servidor guarda e distribui apenas a chave PÚBLICA.
      // A chave privada nunca sai do computador do usuário.
      // --------------------------------------------------------
      case 'publicar_chave_ecc': {
        if (!data.chavePublica || !ws.email) break;
        const nomeUser = usuarios.get(ws.email)?.nome || ws.email;
        chavesPublicasECC.set(ws.email, { chavePublica: data.chavePublica, nome: nomeUser });
        broadcastTodos({ tipo: 'chave_publica_ecc', email: ws.email, nome: nomeUser, chavePublica: data.chavePublica });
        console.log(`[ECC] Chave pública P-256 de ${ws.email} publicada`);
        break;
      }
      
      // --------------------------------------------------------
      // ALTERAR NOME DE USUÁRIO (email permanece o mesmo)
      // --------------------------------------------------------
      case 'alterar_nome': {
        const { email, nome } = data;
        if (!email || !nome) break;
        const user = usuarios.get(email);
        if (user) {
          user.nome = nome;
          ws.send(JSON.stringify({ tipo: 'nome_alterado', email, nome }));
          console.log(`[USUÁRIO] ${email} agora se chama "${nome}"`);
        }
        break;
      }
      
      // --------------------------------------------------------
      // CRIAR SALA
      // --------------------------------------------------------
      case 'criar_sala': {
        const { nome } = data;
        const salaId = gerarIdSala();
        
        salas.set(salaId, {
          nome,
          usuarios: new Set([ws.email]),
          criador: ws.email
        });
        
        const user = usuarios.get(ws.email);
        if (user) { 
            user.salaAtual = salaId; 
            user.entrouEmSalaEm = new Date();
        }
        ws.entrouEmSala = true; // esta conexão está dentro de uma sala
        
        const agoraCriacao = new Date().toISOString();
        ws.send(JSON.stringify({
          tipo: 'sala_criada',
          salaId,
          nome,
          dataHora: agoraCriacao
        }));
        
        // Avisar todos os clientes para atualizarem a lista de salas
        avisarAtualizacaoSalas();
        
        console.log(`[SALA] ${nome} (${salaId}) criada por ${ws.email}`);
        break;
      }
      
      // --------------------------------------------------------
      // ENTRAR EM SALA
      // --------------------------------------------------------
      case 'entrar_sala': {
        const { salaId } = data;
        const sala = salas.get(salaId);
        
        if (!sala) {
          ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Sala não encontrada' }));
          return;
        }
        
        // Remover do usuário de sala anterior (apaga a sala se ficar vazia)
        const user = usuarios.get(ws.email);
        if (user && user.salaAtual) {
          removerUsuarioDaSala(user.salaAtual, ws.email);
        }
        
        sala.usuarios.add(ws.email);
        if (user) { 
            user.salaAtual = salaId; 
            user.entrouEmSalaEm = new Date();
        }
        ws.entrouEmSala = true; // esta conexão está dentro de uma sala
        
        // Notificar todos da sala
        const agora = new Date().toISOString();
        broadcast(salaId, {
          tipo: 'usuario_entrou',
          salaId,
          email: ws.email,
          nome: user?.nome,
          dataHora: agora
        });
        
        const agoraEntrada = new Date().toISOString();
        // Enviar lista de usuários para quem entrou
        ws.send(JSON.stringify({
          tipo: 'sala_info',
          salaId,
          nome: sala.nome,
          usuarios: Array.from(sala.usuarios).map(email => ({
            email,
            nome: usuarios.get(email)?.nome
          })),
          dataHora: agoraEntrada
        }));
        
        // Atualizar a lista de salas de todos
        avisarAtualizacaoSalas();
        
        console.log(`[SALA] ${ws.email} entrou em ${sala.nome} em ${new Date().toISOString()}`);
        break;
      }
      
      // --------------------------------------------------------
      // MENSAGEM NA SALA (pública ou criptografada)
      // --------------------------------------------------------
      case 'mensagem': {
        const user = usuarios.get(ws.email);
        if (!user || !user.salaAtual) return;
        user.lastActivity = new Date();
        
        const salaId = user.salaAtual;
        const sala = salas.get(salaId);
        if (!sala) return;
        
        const msg = {
          tipo: 'mensagem',
          id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
          de: ws.email,
          nome: user.nome,
          salaId,
          salaNome: sala.nome,
          dataHora: new Date().toISOString(),
          criptografada: data.criptografada || false,
          algoritmo: data.algoritmo || null,
          chave: data.chave || null,          // simétrica: a chave viaja com a mensagem (servidor PODE descriptografar)
          e2e: data.e2e || false,             // ponta a ponta: servidor NÃO consegue descriptografar
          ecc: data.ecc || false,             // ponta a ponta ECC: ECDH P-256 + AES-GCM (servidor NÃO consegue descriptografar)
          blocos: data.blocos || null,        // E2E: { email: ciphertext } por destinatário
          semChave: data.semChave || [],      // E2E: quem NÃO tem chave pública (não recebeu)
          texto: data.texto,
          mencoes: data.mencoes || []
        };
        
        // O servidor apenas repassa. Se criptografado, ele vê o ciphertext.
        broadcast(salaId, msg);
        enviarParaAdm(msg);
        
        const e2eInfo = data.e2e ? (Array.isArray(data.semChave)
          ? (data.semChave.length ? ` [sem chave: ${data.semChave.join(', ')}]` : '')
          : ' [CLIENTE ANTIGO: sem campo semChave]') : '';
        console.log(`[MSG] ${user.nome} em ${sala.nome}${data.ecc ? ' [E2E:ECC]' : data.e2e ? ' [E2E:RSA]' : data.criptografada ? ' [CRIPTOGRAFADA: ' + data.algoritmo + ']' : ' [CLARA]'}${e2eInfo}`);
        break;
      }
      
      // --------------------------------------------------------
      // MENSAGEM DIRETA (@usuario)
      // --------------------------------------------------------
      case 'mensagem_direta': {
        const user = usuarios.get(ws.email);
        if (user) user.lastActivity = new Date();
        const { paraEmail, texto, criptografada, algoritmo } = data;
        
        const msg = {
          tipo: 'mensagem_direta',
          id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
          de: ws.email,
          nome: usuarios.get(ws.email)?.nome,
          para: paraEmail,
          dataHora: new Date().toISOString(),
          criptografada: criptografada || false,
          algoritmo: algoritmo || null,
          chave: data.chave || null,     // simétrica: chave junto (servidor pode ler)
          e2e: data.e2e || false,        // ponta a ponta
          ecc: data.ecc || false,        // ponta a ponta ECC (ECDH P-256)
          blocos: data.blocos || null,   // E2E: { email: ciphertext }
          semChave: data.semChave || [], // E2E: quem NÃO tem chave pública (não recebeu)
          mencoes: data.mencoes || [],
          texto
        };
        
        // Enviar ao destinatário (todas as abas dele)
        enviarParaUsuario(paraEmail, msg);
        
        // Enviar ao remetente (para exibição no próprio chat)
        enviarParaUsuario(ws.email, msg);
        
        // ADM vê apenas o que passa pelo servidor
        enviarParaAdm({ ...msg, privada: true });
        
        const e2eInfoDm = data.e2e ? (Array.isArray(data.semChave)
          ? (data.semChave.length ? ` [sem chave: ${data.semChave.join(', ')}]` : '')
          : ' [CLIENTE ANTIGO: sem campo semChave]') : '';
        console.log(`[DM] ${ws.email} -> ${paraEmail}${data.ecc ? ' [E2E:ECC]' : data.e2e ? ' [E2E:RSA]' : criptografada ? ' [CRIPTOGRAFADA]' : ' [CLARA]'}${e2eInfoDm}`);
        break;
      }
      
      // --------------------------------------------------------
      // E2E: destinatário reportou que NÃO conseguiu decifrar
      // (ex.: chave privada ausente neste navegador) → avisa o remetente
      // --------------------------------------------------------
      case 'e2e_falha_leitura': {
        const relator = usuarios.get(ws.email);
        // Avisa o REMETENTE original (em todas as abas dele)
        enviarParaUsuario(data.paraEmail, {
          tipo: 'e2e_falha_leitura',
          msgId: data.msgId,
          quem: relator?.nome || ws.email
        });
        console.log(`[E2E] ${relator?.nome || ws.email} NÃO conseguiu decifrar mensagem de ${data.paraEmail} (sem chave privada neste navegador)`);
        break;
      }
      
      // --------------------------------------------------------
      // ENTRAR NA SALA ADM (visão do servidor)
      // --------------------------------------------------------
      case 'entrar_adm': {
        salaAdmWs.add(ws);
        ws.isAdm = true;
        ws.send(JSON.stringify({
          tipo: 'adm_conectado',
          mensagem: 'Você está na Sala ADM - visão do servidor. Mensagens criptografadas aparecem como texto cifrado.'
        }));
        console.log(`[ADM] ${ws.email} entrou na sala ADM`);
        break;
      }
      
      // --------------------------------------------------------
      // LISTAR SALAS (apenas públicas)
      // --------------------------------------------------------
      case 'listar_salas': {
        ws.send(JSON.stringify({ tipo: 'lista_salas', salas: listaSalasPublicas() }));
        break;
      }
      
      // --------------------------------------------------------
      // SAIR DA SALA
      // --------------------------------------------------------
      case 'sair_sala': {
        const user = usuarios.get(ws.email);
        if (user && user.salaAtual) {
          const salaId = user.salaAtual;
          const salaNome = salas.get(salaId)?.nome || salaId;
          const entrouEm = user.entrouEmSalaEm ? new Date(user.entrouEmSalaEm).toISOString() : 'desconhecido';
          console.log(`[SALA] ${ws.email} saiu de "${salaNome}" (${salaId}) em ${new Date().toISOString()} — entrou em ${entrouEm}`);
          removerUsuarioDaSala(user.salaAtual, ws.email);
          user.salaAtual = null;
          user.entrouEmSalaEm = null;
        }
        ws.entrouEmSala = false;
        break;
      }
    }
  });
  
  ws.on('close', () => {
    salaAdmWs.delete(ws);
    if (!ws.email) return;

    const user = usuarios.get(ws.email);
    const ficouSemConexoes = removerConexao(ws.email, ws);

    // O usuário ainda tem OUTRAS abas/conexões abertas → continua online
    if (!ficouSemConexoes) {
      if (user && user.ws === ws) {
        const restantes = conexoes.get(ws.email);
        user.ws = restantes ? restantes.values().next().value : null; // outra aba assume
      }
      // Se ESTA aba era a que estava numa sala, só remove da sala se NENHUMA
      // outra conexão do MESMO usuário estiver nessa sala.
      // Isso evita o bug onde uma aba caindo expulsa o usuário mesmo com outras abas na sala.
      if (user && user.salaAtual && ws.entrouEmSala) {
        const conjunto = conexoes.get(ws.email);
        let outraNaSala = false;
        if (conjunto) {
          for (const c of conjunto) {
            if (c !== ws && c.entrouEmSala && c.salaAtual === user.salaAtual) {
              outraNaSala = true;
              break;
            }
          }
        }
        if (!outraNaSala) {
          removerUsuarioDaSala(user.salaAtual, ws.email);
          user.salaAtual = null;
        }
      }
      console.log(`[SESSÃO] ${ws.email}: uma aba desconectou — outras conexões continuam online`);
      return;
    }

    // Última conexão do usuário → sai da sala e é apagado
    if (user) {
      if (user.salaAtual) removerUsuarioDaSala(user.salaAtual, ws.email);
      usuarios.delete(ws.email);
    }
    console.log(`[LOGOUT] ${ws.email} desconectou`);
  });
}

// A mesma rotina atende conexões ws:// (HTTP) e wss:// (HTTPS)
wss.on('connection', handleWsConnection);

// ============================================================
// HEARTBEAT com payload real — mantém conexão viva (Render / Plesk / Nginx)
// ============================================================
// Envia heartbeat a cada 15s; tolera até 4 sem resposta (~60s de silêncio absoluto)
const HEARTBEAT_INTERVAL = 15000;   // envia heartbeat a cada 15s
const MAX_MISSED_PINGS = 4;         // tolera até 4 heartbeats perdidos (~60s)

function iniciarHeartbeat() {
  setInterval(() => {
    todasConexoesWs().forEach((ws) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (ws._missedPings === undefined) ws._missedPings = 0;
      ws._missedPings++;
      if (ws._missedPings > MAX_MISSED_PINGS) {
        console.log(`[HEARTBEAT] Fechando conexão ociosa/morta: ${ws.email || 'sem-email'} (sem resposta por 60s)`);
        return ws.terminate();
      }
      try {
        // Heartbeat com payload JSON real (gera tráfego detectado por proxies reversos)
        ws.send(JSON.stringify({
          tipo: 'heartbeat',
          timestamp: Date.now(),
          serverTime: new Date().toISOString()
        }));
      } catch (e) { ws.terminate(); }
    });
  }, HEARTBEAT_INTERVAL);
}

iniciarHeartbeat();

// ============================================================
// TIMEOUT DE INATIVIDADE (30 min sem interação → sai da sala E faz LOGOFF)
// ============================================================
const INATIVIDADE_MAX_MS = 30 * 60 * 1000; // 30 minutos sem interação
const CHECK_INTERVAL_MS = 30 * 1000;       // verifica a cada 30 segundos

function iniciarTimeoutInatividade() {
  setInterval(() => {
    const agora = Date.now();
    for (const [email, user] of usuarios.entries()) {
      if (!user.lastActivity) continue; // sem registro de atividade
      
      const inativoHa = agora - new Date(user.lastActivity).getTime();
      if (inativoHa >= INATIVIDADE_MAX_MS) {
        const salaId = user.salaAtual;
        const sala = salaId ? salas.get(salaId) : null;
        const salaNome = sala?.nome || salaId || 'nenhuma';
        const entrouEm = user.entrouEmSalaEm ? new Date(user.entrouEmSalaEm).toISOString() : 'desconhecido';
        const ultimaAtividade = user.lastActivity ? new Date(user.lastActivity).toISOString() : 'desconhecida';
        
        console.log(`[TIMEOUT LOGOFF] ${email} desconectado por inatividade de ${Math.round(inativoHa / 60000)} min — última interação em ${ultimaAtividade}`);
        
        // 1. Se estava em sala, remove da sala e avisa os demais participantes
        if (salaId) {
          removerUsuarioDaSala(salaId, email);
          user.salaAtual = null;
          user.entrouEmSalaEm = null;
        }

        // 2. Notifica todas as conexões/abas do usuário que ocorreu o logoff automático
        const conjunto = conexoes.get(email);
        if (conjunto) {
          for (const ws of conjunto) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ 
                tipo: 'timeout_logoff', 
                email,
                mensagem: 'Sua sessão foi encerrada por inatividade (30 minutos sem interação no chat). Digite seu e-mail para entrar novamente.' 
              }));
              ws.email = null;
              ws.entrouEmSala = false;
            }
          }
        }

        // 3. Remove o usuário dos registros ativos do servidor (logoff completo)
        usuarios.delete(email);
        conexoes.delete(email);
      }
    }
  }, CHECK_INTERVAL_MS);
}

iniciarTimeoutInatividade();

// ============================================================
// UTILITÁRIOS
// ============================================================

function gerarIdSala() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

const PORTA = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (isNaN(Number(PORTA))) {
  // Socket UNIX / Named Pipe (utilizado pelo Phusion Passenger no Plesk / cPanel)
  server.listen(PORTA, () => {
    console.log('========================================');
    console.log('  cripto.chat: Servidor de Criptografia');
    console.log(`  Rodando no socket do Plesk/Passenger: ${PORTA}`);
    console.log('========================================');
  });
} else {
  // Porta TCP normal (localhost, VPS ou Docker)
  server.listen(Number(PORTA), HOST, () => {
    console.log('========================================');
    console.log('  cripto.chat: Servidor de Criptografia');
    console.log(`  Rodando em http://localhost:${PORTA}`);
    console.log(`  Host: ${HOST}`);
    console.log('========================================');
    
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`  Acesso na rede local: http://${iface.address}:${PORTA}`);
        }
      }
    }
  });
}

// ============================================================
// SERVIDOR HTTPS (certificado autoassinado gerado automaticamente)
// O Chrome só dispara o prompt de instalação PWA (beforeinstallprompt)
// em contextos seguros: HTTPS ou localhost. Com este servidor na porta
// 3443 e o redirecionamento automático, o professor só precisa abrir
// o endereço do sistema — a instalação fica disponível pelo botão.
// ============================================================

if (!isNaN(Number(PORTA)) && HTTPS_PORT > 0) {
  if (garantirCertificado()) {
    try {
      const https = require('https');
      const httpsServer = https.createServer(
        { key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) },
        requestHandler
      );
      wssSecure = new WebSocket.Server({ server: httpsServer });
      wssSecure.on('connection', handleWsConnection);

      httpsServer.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
          console.warn(`[HTTPS] Porta ${HTTPS_PORT} já está em uso — HTTPS não iniciado (HTTP continua ativo).`);
        } else {
          console.warn('[HTTPS] Erro no servidor HTTPS:', e.message);
        }
      });

      httpsServer.listen(HTTPS_PORT, HOST, () => {
        HTTPS_ATIVO = true; // ativa o redirecionamento HTTP → HTTPS
        console.log('----------------------------------------');
        console.log(`  HTTPS: https://localhost:${HTTPS_PORT}  (PWA instalável)`);
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
              console.log(`  HTTPS na rede local: https://${iface.address}:${HTTPS_PORT}`);
            }
          }
        }
        console.log('  Acesso HTTP na rede é redirecionado para HTTPS automaticamente.');
        console.log('  Certificado autoassinado — aceite o aviso uma vez por aparelho.');
        console.log('----------------------------------------');
      });
    } catch (e) {
      console.warn('[HTTPS] Falha ao iniciar servidor HTTPS:', e.message);
    }
  } else {
    console.log('[HTTPS] HTTPS (PWA instalável) desativado — certificado indisponível.');
    console.log('[HTTPS] Instale o Git for Windows ou defina OPENSSL_PATH.');
  }
}
