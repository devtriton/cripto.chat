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

// Carregar variáveis de ambiente do arquivo .env (apenas local)
try {
  require('dotenv').config();
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
// SERVIDOR HTTP (arquivos estáticos)
// ============================================================

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Remove querystring antes de comparar ("/" e "/?adm=1" servem o index.html)
  const urlPath = req.url.split('?')[0];
  const filePath = path.join(__dirname, '..', urlPath === '/' ? 'index.html' : urlPath);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Não encontrado');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

// ============================================================
// SERVIDOR WEBSOCKET
// ============================================================

const wss = new WebSocket.Server({ server });

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

wss.on('connection', (ws) => {
  ws.isAdm = false;
  ws.email = null;

  ws.on('message', (raw) => {
    const data = JSON.parse(raw);
    
    // Ações permitidas ANTES do login (públicas). Todo o resto exige sessão
    // autenticada — evita "fantasmas" entrando em salas sem email.
    const TIPOS_PUBLICOS = ['solicitar_otp', 'verificar_otp', 'restaurar_sessao',
                            'verificar_demo', 'habilitar_demo', 'desabilitar_demo'];
    if (!ws.email && !TIPOS_PUBLICOS.includes(data.tipo)) {
      ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Sessão não autenticada. Faça login novamente.' }));
      return;
    }
    
    switch (data.tipo) {
      
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
        
        // MODO DEMO: exibir código na tela (prioridade sobre SMTP)
        if (demoAtivo) {
          ws.send(JSON.stringify({
            tipo: 'otp_enviado',
            email,
            nome,
            demo: true,
            codigo: codigo,
            mensagem: 'Modo demo: código exibido na tela'
          }));
          // Tenta enviar por email também, mas ignora falha (não bloqueia o demo)
          enviarEmailOTP(email, codigo, nome).catch(() => {});
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
              mensagem: 'Serviço de email não configurado. Contate o administrador.'
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
        
        ws.send(JSON.stringify({
          tipo: 'sala_criada',
          salaId,
          nome
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
        
        // Enviar lista de usuários para quem entrou
        ws.send(JSON.stringify({
          tipo: 'sala_info',
          salaId,
          nome: sala.nome,
          usuarios: Array.from(sala.usuarios).map(email => ({
            email,
            nome: usuarios.get(email)?.nome
          }))
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
});

// ============================================================
// HEARTBEAT (ping/pong) — detecta conexões mortas / mobile suspend
// ============================================================
const HEARTBEAT_INTERVAL = 25000;   // ping a cada 25s
const MAX_MISSED_PINGS = 2;         // fecha após 2 pings sem resposta (~50-75s)

function iniciarHeartbeat() {
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (ws._missedPings === undefined) ws._missedPings = 0;
      ws._missedPings++;
      if (ws._missedPings > MAX_MISSED_PINGS) {
        console.log(`[HEARTBEAT] Fechando conexão morta: ${ws.email || 'sem-email'} (missed=${ws._missedPings})`);
        return ws.terminate(); // força close → dispara ws.on('close')
      }
      try { ws.ping(); } catch (e) { ws.terminate(); }
    });
  }, HEARTBEAT_INTERVAL);
}

iniciarHeartbeat();

// ============================================================
// TIMEOUT DE INATIVIDADE (30 min sem interação → sai da sala)
// ============================================================
const INATIVIDADE_MAX_MS = 30 * 60 * 1000; // 30 minutos
const CHECK_INTERVAL_MS = 60 * 1000;       // verifica a cada 1 minuto

function iniciarTimeoutInatividade() {
  setInterval(() => {
    const agora = Date.now();
    for (const [email, user] of usuarios.entries()) {
      if (!user.salaAtual) continue; // não está em sala
      if (!user.lastActivity) continue; // sem registro de atividade
      
      const inativoHa = agora - new Date(user.lastActivity).getTime();
      if (inativoHa >= INATIVIDADE_MAX_MS) {
        const salaId = user.salaAtual;
        const sala = salas.get(salaId);
        const salaNome = sala?.nome || salaId;
        const entrouEm = user.entrouEmSalaEm ? new Date(user.entrouEmSalaEm).toISOString() : 'desconhecido';
        const ultimaAtividade = user.lastActivity ? new Date(user.lastActivity).toISOString() : 'desconhecida';
        
        console.log(`[TIMEOUT] ${email} removido da sala "${sala.nome}" (${salaId}) por inatividade de ${Math.round(inativoHa / 60000)} min — entrou em ${entrouEm}, última atividade em ${ultimaAtividade}`);
        
        removerUsuarioDaSala(salaId, email);
        user.salaAtual = null;
        user.entrouEmSalaEm = null;
        
        // Notificar conexões do usuário (outras abas) que saiu por timeout
        const conjunto = conexoes.get(email);
        if (conjunto) {
          for (const ws of conjunto) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ 
                tipo: 'timeout_sala', 
                salaId, 
                mensagem: 'Você foi removido da sala por inatividade (30 min sem interação).' 
              }));
            }
          }
        }
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

server.listen(PORTA, HOST, () => {
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
