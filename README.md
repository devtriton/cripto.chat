# cripto.chat — Criptografia em Prática

Sistema de comunicação segura com demonstração prática de criptografia.
Funciona como **site** e como **app instalável (PWA)** no celular e no computador —
uma alternativa à Play Store: o app é instalado direto do navegador, sem loja.

---

## 🚀 Início rápido (professores)

### Windows — 1 clique

Dê **duplo clique em `iniciar.bat`**. Ele:

1. confere se o Node.js está instalado;
2. instala as dependências na primeira execução;
3. sincroniza os arquivos públicos;
4. sobe o servidor (HTTP + HTTPS);
5. abre o navegador em `http://localhost:3000`.

O terminal fica aberto mostrando os endereços e os logs. Para encerrar, feche a janela
ou pressione `Ctrl+C`.

### Qualquer sistema (manual)

```bash
npm install
npm start
```

O `npm start` executa automaticamente o `scripts/sync-public.js` (copia `index.html`,
`manifest.json`, `sw.js`, `version.json`, `icons/` e `docs/` da raiz para
`server/public/`, a pasta servida ao navegador). Sincronização manual: `npm run sync`.

### Endereços

| Endereço | Para que serve |
|---|---|
| `http://localhost:3000` | Uso local no PC (desenvolvimento) |
| `https://localhost:3443` | Versão segura (PWA instalável) |
| `http://192.168.x.x:3000` | Acesso pela rede local → **redireciona sozinho** para HTTPS |
| `https://192.168.x.x:3443` | Versão segura na rede (celulares instalam o app por aqui) |

> 🔒 O certificado é **autoassinado e gerado automaticamente** na primeira execução.
> No celular, o Chrome mostra um aviso uma única vez:
> **Avançados → Continuar para o endereço**. Depois disso o acesso é direto.

---

## 🔐 HTTPS automático

O Chrome só permite **instalar o PWA** em *contextos seguros* (HTTPS ou localhost).
Para isso, o servidor cuida de tudo sozinho:

- **Gera** o certificado em `server/ssl/` (`key.pem` + `cert.pem`) se ele não existir.
- **Regenera** automaticamente quando:
  - o **IP da máquina mudou** (compara o campo SAN do certificado com os IPs atuais);
  - o certificado está a **menos de 7 dias** de expirar;
  - o arquivo está corrompido.
- Usa o OpenSSL do **Git for Windows** (ou o que estiver no PATH, ou `OPENSSL_PATH`).
- **Redireciona** acessos HTTP feitos pela rede (IP) para o HTTPS equivalente.
  `localhost` permanece em HTTP para não atrapalhar testes locais.
- Escuta **HTTP na porta 3000** e **HTTPS na porta 3443** ao mesmo tempo, com o mesmo
  código de arquivos estáticos e o mesmo servidor WebSocket (`ws://` e `wss://`).
- As conexões WebSocket usam automaticamente o protocolo da página
  (`wss://` quando a página é HTTPS).

### Variáveis de ambiente úteis

| Variável | Padrão | Efeito |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `HOST` | `0.0.0.0` | Interface de escuta |
| `HTTPS_PORT` | `3443` | Porta HTTPS (`0` desativa o HTTPS local) |
| `SSL_KEY_PATH` | — | Caminho de uma chave real (ex.: Let's Encrypt) |
| `SSL_CERT_PATH` | — | Caminho do certificado real correspondente |
| `OPENSSL_PATH` | — | Caminho do `openssl.exe`, se não estiver no PATH |

### Produção (domínio real, sem aviso de certificado)

- **Render/Plesk/proxy reverso:** o TLS já é terminado pela plataforma. Defina
  `HTTPS_PORT=0` para não abrir a porta 3443 com certificado autoassinado.
- **VPS com domínio:** aponte `SSL_KEY_PATH` e `SSL_CERT_PATH` para os arquivos do
  Let's Encrypt (Certbot). Aí a instalação do app é **100% silenciosa**, sem aviso.
- **Rede local (escola):** recomenda-se **IP fixo** (reserva DHCP) no PC servidor.
  Se o IP mudar, o certificado é regenerado, mas os celulares precisam aceitar o
  aviso de novo.

---

## 📱 Instalação como app (PWA)

O botão fica **ao lado da logo**, no topo, e aparece **somente no navegador**
(nunca dentro do app instalado):

| Estado detectado | Botão | Ação |
|---|---|---|
| App não instalado | **📱 Instalar** | Instala (prompt nativo do Chrome/Edge) |
| App já instalado, aberto no navegador | **📱 Abrir app** | Abre a versão instalada e tenta fechar a aba |
| Dentro do app (standalone) | *oculto* | — |
| Usuário clicou no **✕** | *oculto na sessão* | Volta após logout/login |

### Como o "Abrir app" funciona

O navegador **não oferece API** para iniciar um PWA instalado nem para fechar uma
aba que não foi aberta por script. A implementação usa o melhor caminho por
plataforma:

- **Android (Chrome/Edge, HTTPS):** `intent://` apontando para o escopo do WebAPK.
  O Android entrega o link ao app instalado; se o app não responder, o
  `browser_fallback_url` devolve `?abrir=app&falhou=1` e o app mostra as
  instruções ("abra pelo ícone na tela inicial").
- **iPhone/iPad:** overlay com instruções (o Safari não permite iniciar o PWA
  por link) e botão **Fechar esta aba**.
- **Desktop:** overlay sugerindo **Abrir no app** da barra de endereço ou o
  atalho instalado no sistema.

Sempre que possível o código chama `window.close()`. Ele **só funciona** em abas
abertas por script; nas demais o overlay informa que é preciso fechar pela **✕**
da aba. Ao carregar `?abrir=app` dentro do app instalado, a URL é limpa com
`history.replaceState` para não deixar parâmetros visíveis.

### Android (Chrome)

1. Abra `https://IP-DO-PC:3443` (o acesso HTTP pela rede já redireciona).
2. Aceite o aviso de certificado **uma vez**.
3. Faça login → toque em **📱 Instalar** → confirme no diálogo do Chrome.
4. O app aparece na tela inicial com ícone próprio e abre em tela cheia.

### iPhone / iPad (Safari)

O iOS não oferece prompt de instalação por código. O botão **📱 Instalar** mostra as
instruções: **Compartilhar (□↑) → Adicionar à Tela de Início → Adicionar**.

### Atualizações

- O app verifica `version.json` ao abrir.
- Quando há versão nova, surge o botão **🔄** no topo (e/ou o app recarrega sozinho).
- Ao voltar o foco para a página (ou `visibilitychange`), a atualização é verificada.
- No celular, **puxar para atualizar** também dispara a checagem.
- O Service Worker faz `skipWaiting` + `controllerchange` e recarrega automaticamente.

### Versão do app (mantenedores)

Ao publicar mudanças, mantenha os três sincronizados:

1. `index.html` → `APP_VERSION` / `APP_BUILD`
2. `sw.js` → `APP_VERSION` e `CACHE_NAME` (incremente `v1`, `v2`, …)
3. `version.json` → `version` / `build`

Depois rode `npm run sync` (ou `npm start`, que já sincroniza).

---

## ✨ Funcionalidades

### Autenticação
- Login com email + código OTP de 6 dígitos (validade de 5 minutos)
- **Padrão:** o código é enviado por email (SMTP)
- **Opcional (MODO DEMO):** o código é exibido na própria tela, sem envio de email
  - Ative pelo botão **MODO DEMO DESLIGADO** na tela de login, com a senha mestre
  - O botão só aparece quando o servidor está conectado
  - Senha padrão: `cripto2024` (hash SHA-256 em `server/demo-config.json`)
- Variáveis SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### Salas de Bate-Papo
- **Somente salas públicas**: não existem salas privadas nem salas com senha
- A lista de salas é enviada a todos os usuários logados
- Cada usuário guarda suas mensagens no localStorage (sem banco de dados central)

### Regras do chat
- **Sala vazia é excluída**: se o último participante sair, a sala deixa de existir
- **30 minutos de inatividade**: o usuário é desconectado da sala e faz logoff
- Salas públicas visíveis para todos os usuários autenticados
- **Um e-mail por vez**: não é possível fazer login com um e-mail que já tenha
  sessão ativa. A tentativa é recusada com aviso — feche a outra aba/aparelho e
  tente de novo. *(Abas do mesmo usuário que restauram a sessão continuam
  permitidas — necessário para refresh e para a Sala ADM.)*
- **Nomes únicos**: se o nome derivado do e-mail já existir, o sistema acrescenta
  numeração (`Maria`, `Maria2`, `Maria3`…). A mesma regra vale na troca de nome;
  o servidor devolve o nome final e o app avisa quando houve ajuste.

### Mensagens
- **Normal**: visível para todos na sala
- **Com @usuario**: mensagem direta (só o destinatário lê)
- **Com #usuario**: menção pública (todos veem, usuário é destacado)

### Criptografia
O usuário escolhe o algoritmo antes de enviar:
- **Sem criptografia**: texto claro (visível para todos e para o ADM)
- **Cifra de César**: deslocamento de letras por N posições
- **Cifra de Vigenère**: usa palavra-chave para variar deslocamento
- **XOR**: operação bit a bit com chave
- **AES-256**: criptografia forte (simplificada para demonstração)
- **E2E RSA-2048 / ECC P-256**: a chave privada nunca sai do navegador

### Sala ADM
Representa a visão do servidor:
- **Mensagem sem criptografia**: aparece em texto claro (verde)
- **Mensagem simétrica**: o servidor vê a chave que viaja junto (amarelo)
- **Mensagem E2E**: aparece cifrada (vermelho) — o servidor não tem a chave

### Proteções de sessão
- **F5 / Ctrl+R bloqueados** silenciosamente (evita recarregar e sair da sala sem querer)
- **Recarregar** pelo botão do navegador, fechar aba ou puxar para atualizar
  mostra o diálogo nativo de confirmação (exigência de segurança do navegador)
- **Logout** somente pelo botão **Sair** — e, dentro de uma sala, com confirmação
- **30 minutos** sem interação → logoff automático
- **Suspensão do celular**: quando o Android/iOS suspende o navegador/app
  (tela apagada ou segundo plano), a conexão cai e o servidor remove o usuário
  da sala — se for o último, a sala é apagada. É esperado.
- **Recuperação automática**: ao voltar ao app, o cliente testa o WebSocket
  (ping/pong), reconecta se necessário e reentra na mesma sala sozinho. Se a
  sala foi apagada, volta ao painel principal; se a sessão foi perdida, volta
  ao login.
- **O que se perde na suspensão**: apenas as mensagens trocadas durante o
  intervalo em que o aparelho esteve suspenso. O histórico que já estava na
  tela continua visível, e o envio/recebimento volta assim que reconecta —
  não há banco de dados nem histórico no servidor para reenviar o intervalo.

### Interface
- Altura do chat calculada dinamicamente (janela − topo − rodapé − padding)
- Campo de mensagem com 2 linhas; combo de criptografia + botão **Enviar** lado a lado
- Cabeçalho do chat compacto, com ícone 🖨️ para imprimir o relatório
- Logo com indicador de conexão: **borda e brilho verdes** (online) ou
  **vermelhos piscando** (offline)
- Layout responsivo para celular
- Botão de instalação do PWA ao lado da logo (ver seção acima)

---

## 🎭 Demonstração para Apresentação

### Cenário 1: Mensagem em Texto Claro
1. Abra o servidor
2. Crie uma sala pública
3. Entre com dois usuários diferentes
4. Envie mensagem sem criptografia
5. Abra a Sala ADM → mensagem aparece legível

### Cenário 2: Mensagem Criptografada
1. Escolha "Cifra de César" no combo
2. Defina chave = 3
3. Envie mensagem
4. Abra a Sala ADM → mensagem aparece cifrada (ex: "Olá" → "Rocá")
5. Para ler, o destinatário precisa: algoritmo = César, chave = 3

### Cenário 3: Sala Pública e Sala Vazia
1. Crie uma sala pública "Turma A"
2. Abra outra aba com outro usuário → a sala "Turma A" aparece na lista dele
3. Todos entram e conversam
4. Se todos saírem, a sala desaparece da lista (sala vazia = excluída)

### Cenário 4: MODO DEMO (OTP na tela)
1. Clique em **MODO DEMO DESLIGADO** (na tela de login) e digite a senha mestre
2. Faça logout e digite um email
3. O código de 6 dígitos aparece na tela (não vai por email)
4. Digite o código e entre

### Cenário 5: Inatividade de 30 minutos
1. Entre em uma sala e fique 30 minutos sem interagir
2. O servidor desconecta a sessão e avisa
3. Faça login novamente para voltar

### Cenário 6: Instalar o app no celular
1. No celular, acesse `https://IP-DO-PC:3443`
2. Aceite o certificado uma vez (Avançados → Continuar)
3. Faça login → **📱 Instalar** → confirme
4. Abra o app pela tela inicial: sem barra de navegador
5. No navegador, o botão passa a mostrar **📱 Abrir app**

---

## 📄 Documentação de Uso (página "Documentação")

Existe um guia de uso escrito com palavras simples, para alunos **a partir de 5 anos**:

- **Arquivo:** `docs/documentacao.md` (fonte única do texto)
- **Página no app:** clique em **📖 Doc** (barra superior), no botão **📖 Documentação**
  da tela de login ou na aba **Documentação** do painel.
- A página busca o arquivo e o renderiza como texto formatado (títulos, listas, citações).

Para alterar o guia, edite apenas `docs/documentacao.md` e rode `npm run sync`.

---

## 🗂️ Estrutura do Projeto

```
cripto.chat/
├── index.html                    # Interface completa (fonte única — GitHub Pages)
├── manifest.json                 # Manifesto PWA (ícones, atalhos, modo standalone)
├── sw.js                         # Service Worker (cache, offline e auto-atualização)
├── version.json                  # Versão atual (checada pelo app ao abrir)
├── icons/                        # Ícones PWA (192/512, normal e maskable)
├── docs/
│   └── documentacao.md           # Guia de uso (exibido na página Documentação)
├── scripts/
│   ├── sync-public.js            # Copia a raiz → server/public (npm run sync)
│   └── gerar-certificado.ps1     # (Opcional) regenera o certificado manualmente
├── server/
│   ├── server.js                 # HTTP + HTTPS + WebSocket, OTP, salas e ADM
│   ├── .env / .env.example       # Variáveis de ambiente (SMTP, portas, SSL)
│   ├── demo-config.json          # Senha mestre (hash) + flag do MODO DEMO
│   ├── ssl/                      # Certificado autoassinado (gerado automaticamente)
│   │   ├── key.pem
│   │   └── cert.pem
│   └── public/                   # Cópia servida pelo servidor (gerada pelo sync)
├── iniciar.bat                   # Início em 1 clique (Windows)
├── generate-icons.js             # Regenera os ícones PNG a partir de icons/icon.svg
├── render.yaml                   # Deploy no Render
├── package.json
├── README.md
├── .gitignore
└── .gitattributes
```

---

## 🌐 Deploy

### GitHub Pages (modo BroadcastChannel)

O projeto está disponível em: **https://devtriton.github.io/cripto/**

No GitHub Pages não há servidor: as abas conversam via `BroadcastChannel`.
- Abra a página em **múltiplas abas ou janelas**
- Cada aba representa um usuário diferente
- As mensagens são trocadas entre as abas sem servidor

```bash
git add .
git commit -m "descricao das mudancas"
git push origin main
```

O GitHub Pages atualiza automaticamente em ~1 minuto após o push.

### Servidor próprio

- **Windows/LAN (professores):** use `iniciar.bat`; acesse pelo IP do PC.
- **Render:** já configurado em `render.yaml`. Defina `HTTPS_PORT=0` (TLS gerenciado).
- **VPS/Plesk com domínio:** use `SSL_KEY_PATH`/`SSL_CERT_PATH` com Let's Encrypt
  para instalação do app sem aviso de certificado.

---

## 🧰 Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Botão **Instalar** só mostra instruções | Página aberta em HTTP | Use HTTPS (`https://IP:3443`). Pela rede, o redirecionamento é automático |
| Chrome não mostra "Instalar app" no menu | Site em HTTP (não é contexto seguro) | Acesse por HTTPS |
| Aviso "Sua conexão não é particular" | Certificado autoassinado | Normal em rede local: **Avançados → Continuar** (uma vez por aparelho) |
| Ícone do app continua o antigo | Cache/instalação anterior | Desinstale o app, limpe o cache do Chrome e reinstale |
| App não pega a versão nova | Service Worker em cache | Toque no **🔄** no topo, feche e abra o app, ou puxe para atualizar |
| "Já existe um cripto.chat rodando" | Porta 3000 ocupada | Feche a outra janela do servidor ou reinicie o PC |
| Logo vermelha e piscando | Servidor desconectado | Verifique se o servidor está ligado e a conexão de rede |
| Certificado deixou de valer após mudar o IP | IP novo fora do SAN | Reinicie o servidor (regenera sozinho) e aceite o aviso de novo |
| SMTP não configurado | Sem credenciais de email | Ative o MODO DEMO ou configure `SMTP_*` em `server/.env` |

---

## 🎓 Conceitos Educacionais Demonstrados

1. **Criptografia Simétrica**: mesma chave para cifrar e decifrar
2. **Confidencialidade**: sem a chave, não é possível ler a mensagem
3. **Canal inseguro**: o servidor "confiável" não consegue ler mensagens E2E
4. **Força Bruta**: César é vulnerável (só 26 chaves), AES é seguro (2^256 chaves)
5. **Autenticação**: login por email + código OTP de 6 dígitos (uso único, 5 minutos)
6. **HTTPS e certificados**: como o cadeado do navegador protege a conexão
7. **PWA**: instalar um site como app, sem loja de aplicativos
