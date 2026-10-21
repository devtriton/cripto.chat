/**
 * cripto.chat - Servidor WebSocket com Login por Email + OTP
 * Render Ready - Zero Nginx, Zero Config Externa
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

// Carregar variáveis de ambiente do arquivo .env (apenas local)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv não instalado - usar variáveis de ambiente do sistema
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const RENDER_HOST = process.env.RENDER_EXTERNAL_HOSTNAME || `localhost:${PORT}`;
const BASE_URL = process.env.RENDER_EXTERNAL_HOSTNAME
  ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
  : `http://localhost:${PORT}`;

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
    throw new Error('SMTP não configurado. Defina as variáveis SMTP_HOST, SMTP_USER e SMTP_PASS.');
  }
  try {
    await transporter.sendMail({
      from: SMTP_CONFIG.from,
      to: email,
      subject: 'Seu código de acesso - cripto.chat',
      text: `Olá ${nome}, seu código de acesso é: ${codigo}`,
      html: `<h2>cripto.chat — Código de Acesso</h2><p>Olá <strong>${nome}</strong>,</p><p>Seu código de acesso é: <strong style="font-size: 24px; color: #00d4ff;">${codigo}</strong></p><p>Este código expira em 5 minutos.</p>`
    });
  } catch (e) {
    console.error('[EMAIL] Falha ao enviar:', e);
    throw e;
  }
}

// ============================================================
// HTTP SERVER + WEBSOCKET
// ============================================================

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

// ============================================================
// MIDDLEWARE HTTP - HEADERS ANTI-CACHE + COMPRESSION
// ============================================================

// Helmet + Compression
const helmet = require('helmet');
const compression = require('compression');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: IS_PRODUCTION ? { maxAge: 31536000 } : false
}));
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: IS_PRODUCTION ? { maxAge: 31536000 } : false
}));

// Cache Headers por tipo
app.use((req, res, next) => {
  // HTML - SEMPRE FRESH
  if (req.path === '/' || req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // Service Worker - SEMPRE FRESH
  if (req.path === '/sw.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Service-Worker-Allowed', '/');
  }
  // Manifest - Cache curto
  if (req.path === '/manifest.json') {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  // Service Worker - SEMPRE FRESH
  if (req.path === '/sw.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Service-Worker-Allowed', '/');
  }
  // Assets estáticos - Cache longo
  if (req.path.startsWith('/icons/') || req.path.startsWith('/icons/')) {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  }
  next();
});

// Compression
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy (Render usa proxy)
app.set('trust proxy', 1);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ============================================================
// STATIC FILES + CACHE HEADERS
// ============================================================

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    } else if (path.includes('/icons/')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    } else if (path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (path.endsWith('.json')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  })
});

app.use(express.static(publicDir));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ============================================================
// KEEP-ALIVE INTERNO (Render Free Tier - 14 min)
// ============================================================

const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 min

if (IS_PRODUCTION && process.env.RENDER_EXTERNAL_HOSTNAME) {
  setInterval(async () => {
    try {
      const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/health`;
      const response = await fetch(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/health`);
      console.log('[Keep-Alive] Ping:', response.status, new Date().toISOString());
    } catch (e) { console.warn('[Keep-Alive] Falha:', e.message); }
  }, KEEP_ALIVE_INTERVAL);

  console.log('[Keep-Alive] Ativado - ping a cada 14 min para Render');
}

// ============================================================
// WEBSOCKET SERVER - ROBUSTO PARA MOBILE
// ============================================================

const WebSocket = require('ws');
const http = require('http');
const WebSocket = require('ws');

const server = http.createServer(app);
const wss = new WebSocket.Server({
  server,
  clientTracking: true,
  maxPayload: 16 * 1024 * 1024,
  handshakeTimeout: 10000
});

const HEARTBEAT_INTERVAL = 30000; // 30s
const MAX_MISSED_PINGS = 3;

// Heartbeat tolerante para mobile
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.isAlive === false) {
      ws.missedPings = (ws.missedPings || 0) + 1;
      if (ws.missedPings >= 3) return ws.terminate();
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) { ws.terminate(); }
  };
}, 30000);

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.missedPings = 0;

  ws.on('pong', () => { ws.isAlive = true; ws.missedPings = 0; });
  ws.on('close', (code, reason) => console.log('[WS] Desconectado:', ws.email || 'anon', 'code:', code));
  ws.on('error', (e) => console.error('[WS Error]', e.message));
  ws.on('pong', () => { ws.isAlive = true; ws.missedPings = 0; });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      // Seu processamento de mensagem existente aqui
    } catch (e) { console.error('[WS] Parse error:', e); }
  });
});

// Heartbeat tolerante para mobile
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.isAlive === false) {
      ws.missedPings = (ws.missedPings || 0) + 1;
      if (ws.missedPings >= 3) return ws.terminate();
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) { ws.terminate(); }
  };
}, 30000);

// ============================================================
// KEEP-ALIVE INTERNO (Render Free Tier - 14 min)
// ============================================================

const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000;

if (IS_PRODUCTION && process.env.RENDER_EXTERNAL_HOSTNAME) {
  setInterval(async () => {
    try {
      await fetch(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/health`);
      console.log('[Keep-Alive] Ping:', new Date().toISOString());
    } catch (e) { console.warn('[Keep-Alive] Falha:', e.message); }
  }, KEEP_ALIVE_INTERVAL);
  console.log('[Keep-Alive] Ativado - ping a cada 14 min para Render');
}

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('  cripto.chat: Servidor de Criptografia');
  console.log(`  Rodando em http://localhost:${PORT}`);
  console.log(`  Host: 0.0.0.0`);
  console.log('========================================');
});
`, 'utf8');
console.log('server.js atualizado com sucesso');