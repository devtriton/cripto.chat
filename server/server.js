/**
 * OBJ-EDU: Servidor WebSocket para demonstração de Criptografia
 * 
 * PRINCÍPIO FUNDAMENTAL:
 * - O servidor NUNCA descriptografa mensagens
 * - Se o usuário criptografa, o servidor vê apenas o texto cifrado
 * - A sala ADM exibe o que o servidor "vê" (texto cifrado sem chave)
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================
// ESTADO DO SERVIDOR (em memória, sem banco de dados)
// ============================================================

const salas = new Map();      // salaId -> { nome, publica, usuarios: Set, senhaHash }
const usuarios = new Map();   // email -> { ws, nome, salaAtual }
const salaAdmWs = new Set();  // Conexões da sala ADM

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
  const filePath = path.join(__dirname, '..', 'client', req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  
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
    const user = usuarios.get(userEmail);
    if (user && user.ws !== exceto && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify(msg));
    }
  }
}

function enviarParaAdm(msg) {
  for (const ws of salaAdmWs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const data = JSON.parse(raw);
    
    switch (data.tipo) {
      
      // --------------------------------------------------------
      // AUTENTICAÇÃO: registro de usuário via email
      // --------------------------------------------------------
      case 'registrar': {
        const { email, nome } = data;
        usuarios.set(email, { ws, nome, salaAtual: null });
        ws.email = email;
        ws.send(JSON.stringify({ 
          tipo: 'registrado', 
          email, 
          nome,
          mensagem: `Bem-vindo, ${nome}!` 
        }));
        console.log(`[LOGIN] ${nome} (${email}) conectou`);
        break;
      }
      
      // --------------------------------------------------------
      // CRIAR SALA
      // --------------------------------------------------------
      case 'criar_sala': {
        const { nome, publica, senha } = data;
        const salaId = gerarIdSala();
        
        salas.set(salaId, {
          nome,
          publica: publica !== false,
          senha: senha || null,        // para salas privadas
          usuarios: new Set([ws.email]),
          criador: ws.email
        });
        
        const user = usuarios.get(ws.email);
        if (user) user.salaAtual = salaId;
        
        ws.send(JSON.stringify({
          tipo: 'sala_criada',
          salaId,
          nome,
          publica: publica !== false
        }));
        
        console.log(`[SALA] ${nome} (${salaId}) criada por ${ws.email}`);
        break;
      }
      
      // --------------------------------------------------------
      // ENTRAR EM SALA
      // --------------------------------------------------------
      case 'entrar_sala': {
        const { salaId, senha } = data;
        const sala = salas.get(salaId);
        
        if (!sala) {
          ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Sala não encontrada' }));
          return;
        }
        
        // Sala privada exige senha
        if (!sala.publica && sala.senha !== senha) {
          ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Senha incorreta para sala privada' }));
          return;
        }
        
        // Remover do usuário de sala anterior
        const user = usuarios.get(ws.email);
        if (user && user.salaAtual) {
          const salaAntiga = salas.get(user.salaAtual);
          if (salaAntiga) salaAntiga.usuarios.delete(ws.email);
        }
        
        sala.usuarios.add(ws.email);
        if (user) user.salaAtual = salaId;
        
        // Notificar todos da sala
        broadcast(salaId, {
          tipo: 'usuario_entrou',
          email: ws.email,
          nome: user?.nome
        });
        
        // Enviar lista de usuários para quem entrou
        ws.send(JSON.stringify({
          tipo: 'sala_info',
          salaId,
          nome: sala.nome,
          publica: sala.publica,
          usuarios: Array.from(sala.usuarios).map(email => ({
            email,
            nome: usuarios.get(email)?.nome
          }))
        }));
        
        console.log(`[SALA] ${ws.email} entrou em ${sala.nome}`);
        break;
      }
      
      // --------------------------------------------------------
      // MENSAGEM NA SALA (pública ou criptografada)
      // --------------------------------------------------------
      case 'mensagem': {
        const user = usuarios.get(ws.email);
        if (!user || !user.salaAtual) return;
        
        const salaId = user.salaAtual;
        const sala = salas.get(salaId);
        if (!sala) return;
        
        const msg = {
          tipo: 'mensagem',
          de: ws.email,
          nome: user.nome,
          salaId,
          salaNome: sala.nome,
          dataHora: new Date().toISOString(),
          criptografada: data.criptografada || false,
          algoritmo: data.algoritmo || null,
          texto: data.texto,           // texto original OU cifrado
          mencoes: data.mencoes || []  // usuários mencionados com #
        };
        
        // === DEMONSTRAÇÃO DA CRIPTOGRAFIA ===
        // O servidor apenas repassa. Se criptografado, ele vê o ciphertext.
        // A sala ADM também recebe o que o servidor "vê".
        
        broadcast(salaId, msg);
        enviarParaAdm(msg);  // ADM vê exatamente o que passa pelo servidor
        
        console.log(`[MSG] ${user.nome} em ${sala.nome}${data.criptografada ? ' [CRIPTOGRAFADA: ' + data.algoritmo + ']' : ' [CLARA]'}`);
        break;
      }
      
      // --------------------------------------------------------
      // MENSAGEM DIRETA (@usuario)
      // --------------------------------------------------------
      case 'mensagem_direta': {
        const { paraEmail, texto, criptografada, algoritmo } = data;
        
        const msg = {
          tipo: 'mensagem_direta',
          de: ws.email,
          nome: usuarios.get(ws.email)?.nome,
          para: paraEmail,
          dataHora: new Date().toISOString(),
          criptografada: criptografada || false,
          algoritmo: algoritmo || null,
          texto
        };
        
        // Enviar ao destinatário
        const destino = usuarios.get(paraEmail);
        if (destino && destino.ws.readyState === WebSocket.OPEN) {
          destino.ws.send(JSON.stringify(msg));
        }
        
        // Enviar ao remetente (para exibição no próprio chat)
        ws.send(JSON.stringify(msg));
        
        // ADM vê apenas o que passa pelo servidor (texto cifrado se criptografado)
        enviarParaAdm({ ...msg, privada: true });
        
        console.log(`[DM] ${ws.email} -> ${paraEmail}${criptografada ? ' [CRIPTOGRAFADA]' : ' [CLARA]'}`);
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
        const lista = [];
        for (const [id, sala] of salas) {
          if (sala.publica) {
            lista.push({ salaId: id, nome: sala.nome, usuarios: sala.usuarios.size });
          }
        }
        ws.send(JSON.stringify({ tipo: 'lista_salas', salas: lista }));
        break;
      }
      
      // --------------------------------------------------------
      // SAIR DA SALA
      // --------------------------------------------------------
      case 'sair_sala': {
        const user = usuarios.get(ws.email);
        if (user && user.salaAtual) {
          const sala = salas.get(user.salaAtual);
          if (sala) {
            sala.usuarios.delete(ws.email);
            broadcast(sala, { tipo: 'usuario_saiu', email: ws.email });
          }
          user.salaAtual = null;
        }
        break;
      }
    }
  });
  
  ws.on('close', () => {
    const user = usuarios.get(ws.email);
    if (user && user.salaAtual) {
      const sala = salas.get(user.salaAtual);
      if (sala) {
        sala.usuarios.delete(ws.email);
        broadcast(sala, { tipo: 'usuario_saiu', email: ws.email });
      }
    }
    salaAdmWs.delete(ws);
    console.log(`[LOGOUT] ${ws.email} desconectou`);
  });
});

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
server.listen(PORTA, () => {
  console.log('========================================');
  console.log('  OBJ-EDU: Servidor de Criptografia');
  console.log(`  Rodando em http://localhost:${PORTA}`);
  console.log('========================================');
});
