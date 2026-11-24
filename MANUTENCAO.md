# Manutenção e implantação — cripto.chat

Documento técnico para quem vai **manter, publicar ou adaptar** o cripto.chat.
Para baixar, instalar e usar em sala de aula, veja o **[README.md](README.md)**.

---

## Sumário

1. [Requisitos e scripts](#1-requisitos-e-scripts)
2. [Estrutura do projeto](#2-estrutura-do-projeto)
3. [HTTPS automático](#3-https-automático)
4. [Variáveis de ambiente](#4-variáveis-de-ambiente)
5. [MODO DEMO e senha mestre](#5-modo-demo-e-senha-mestre)
6. [Versão e atualização do PWA](#6-versão-e-atualização-do-pwa)
7. [Deploy](#7-deploy)
8. [LGPD e registros de consentimento](#8-lgpd-e-registros-de-consentimento)
9. [Checklist de publicação](#9-checklist-de-publicação)
10. [Problemas técnicos comuns](#10-problemas-técnicos-comuns)

---

## 1. Requisitos e scripts

- **Node.js 18 ou superior** (recomendado: LTS 20, 22 ou 24).
- **npm** (vem com o Node.js).
- **Git for Windows** (opcional; fornece o `openssl.exe` usado no HTTPS
  automático no Windows).
- **OpenSSL** no `PATH` ou apontado por `OPENSSL_PATH`, para gerar o
  certificado autoassinado.
- **`sharp`** (devDependency), necessário apenas para regenerar os ícones.

### Scripts npm

| Comando | O que faz |
|---|---|
| `npm start` | Sincroniza `server/public` e sobe o servidor (HTTP 3000 + HTTPS 3443) |
| `npm run dev` | Igual ao `npm start` (sem watch) |
| `npm run sync` | Copia a raiz para `server/public` |
| `npm run limpar:consent` | Exclusão de registros de consentimento (LGPD) |
| `node generate-icons.js` | Regenera os PNGs a partir de `icons/icon.svg` |

O `npm start` executa automaticamente o `prestart` → `scripts/sync-public.js`
→ `server/server.js`. O `postinstall` também roda o sync após `npm install`.

### Sincronização (`scripts/sync-public.js`)

A **raiz** é a fonte única de verdade (é o que o GitHub Pages publica).
`server/public/` é a cópia que o servidor Node entrega ao navegador.

O script copia:

- arquivos: `index.html`, `privacidade.html`, `manifest.json`, `sw.js`,
  `version.json`;
- pastas: `icons/`, `docs/`.

Rode `npm run sync` sempre que alterar qualquer um desses arquivos na raiz.
Sem isso, o servidor continua entregando a versão antiga.

> A pasta `docs/` é copiada inteira. Se você adicionar documentos que não devem
> ser públicos, mantenha-os fora de `docs/`.

---

## 2. Estrutura do projeto

```text
cripto.chat/
├── index.html                    # Interface completa (fonte única)
├── privacidade.html              # Termos, LGPD, cookies e ECA Digital
├── manifest.json                 # Manifesto PWA
├── sw.js                         # Service Worker (cache e atualização)
├── version.json                  # Versão checada pelo app
├── icons/                        # Ícones PWA (192/512, normal e maskable)
├── docs/
│   ├── documentacao.md           # Guia de uso exibido na página Documentação
│   └── Projeto/                  # Material acadêmico do projeto
├── scripts/
│   ├── sync-public.js            # Raiz → server/public
│   ├── limpar-consentimentos.js  # Exclusão de registros (LGPD)
│   └── gerar-certificado.ps1     # Regenera o certificado manualmente (Windows)
├── server/
│   ├── server.js                 # HTTP + HTTPS + WebSocket, OTP, salas e ADM
│   ├── .env.example              # Modelo de configuração (SMTP, portas, SSL)
│   ├── demo-config.json          # Senha mestre (hash) + flag do MODO DEMO
│   ├── ssl/                      # Certificado gerado (não versionado)
│   ├── public/                   # Cópia servida (gerada pelo sync)
│   └── consentimentos.jsonl      # Auditoria LGPD (gerada; não versionada)
├── iniciar.bat                   # Início em 1 clique (Windows)
├── generate-icons.js             # Regenera os ícones PNG
├── render.yaml                   # Deploy no Render
├── package.json
├── README.md                     # Manual do professor
├── MANUTENCAO.md                 # Este documento
└── .gitignore
```

As pastas `tarefas/` e `Objeto Educacional/` são materiais acadêmicos e **não**
fazem parte do aplicativo. Elas não entram no `sync-public.js`.

---

## 3. HTTPS automático

O Chrome só permite **instalar o PWA** em contextos seguros (HTTPS ou
localhost). Para isso, o servidor cuida de tudo sozinho.

### Como funciona

- **Gera** o certificado em `server/ssl/` (`key.pem` + `cert.pem`) se ele não
  existir.
- **Regenera** automaticamente quando:
  - o **IP da máquina mudou** (compara o campo SAN do certificado com os IPs
    atuais);
  - o certificado está a **menos de 7 dias** de expirar;
  - o arquivo está corrompido.
- Usa o OpenSSL do **Git for Windows**, o que estiver no `PATH` ou o caminho
  definido em `OPENSSL_PATH`.
- **Redireciona** acessos HTTP feitos pela rede (IP) para o HTTPS equivalente.
  `localhost` permanece em HTTP para não atrapalhar testes locais.
- Escuta **HTTP na porta 3000** e **HTTPS na porta 3443** ao mesmo tempo, com o
  mesmo código de arquivos estáticos e o mesmo servidor WebSocket.
- As conexões WebSocket usam automaticamente o protocolo da página (`ws://` ou
  `wss://`).

### Quando o HTTPS não sobe

Se o OpenSSL não for encontrado, o servidor continua em HTTP e mostra:

```text
[HTTPS] HTTPS (PWA instalável) desativado — certificado indisponível.
[HTTPS] Instale o Git for Windows ou defina OPENSSL_PATH.
```

Nesse caso, o chat funciona na rede, mas a instalação como app fica
indisponível.

### Produção (domínio real, sem aviso de certificado)

- **Render/Plesk/proxy reverso:** o TLS já é terminado pela plataforma. Defina
  `HTTPS_PORT=0` para não abrir a porta 3443 com certificado autoassinado.
- **VPS com domínio:** aponte `SSL_KEY_PATH` e `SSL_CERT_PATH` para os arquivos
  do Let's Encrypt (Certbot). A instalação do app fica **100% silenciosa**, sem
  aviso.
- **Rede local (escola):** recomenda-se **IP fixo** (reserva DHCP) no PC
  servidor. Se o IP mudar, o certificado é regenerado, mas os celulares
  precisam aceitar o aviso de novo.

---

## 4. Variáveis de ambiente

As variáveis são lidas de `server/.env` (ou do ambiente do processo). O arquivo
`server/.env` está no `.gitignore` e **nunca** deve ser versionado.

| Variável | Padrão | Efeito |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `HOST` | `0.0.0.0` | Interface de escuta |
| `HTTPS_PORT` | `3443` | Porta HTTPS (`0` desativa o HTTPS local) |
| `SSL_KEY_PATH` | — | Caminho de uma chave real (ex.: Let's Encrypt) |
| `SSL_CERT_PATH` | — | Caminho do certificado real correspondente |
| `OPENSSL_PATH` | — | Caminho do `openssl.exe`, se não estiver no `PATH` |
| `SMTP_HOST` | — | Servidor SMTP |
| `SMTP_PORT` | `587` | Porta SMTP |
| `SMTP_SECURE` | `false` | `true` para TLS direto (porta 465) |
| `SMTP_USER` | — | Usuário SMTP |
| `SMTP_PASS` | — | Senha ou senha de app |
| `SMTP_FROM` | — | Remetente exibido |
| `NODE_ENV` | — | `production` em produção |
| `RENDER_EXTERNAL_HOSTNAME` | — | Hostname público no Render |

Para configurar o envio real de e-mail:

1. Copie `server/.env.example` para `server/.env`.
2. Preencha `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`.
   - No Gmail, use uma **senha de app** de 16 caracteres (não a senha da
     conta).
3. Reinicie o servidor.

Sem SMTP configurado, o envio por e-mail é recusado com a mensagem
*"Serviço de email não configurado"*. Nesse caso, use o MODO DEMO.

---

## 5. MODO DEMO e senha mestre

O MODO DEMO exibe o código OTP na própria tela, sem enviar e-mail. O estado
fica em `server/demo-config.json`:

```json
{
  "senhaHash": "87e415918dd9ffda454cd5398c9ba6c69fb5a44a3865caceb5e75d8ace34e9aa",
  "modoDemo": true,
  "descricao": "Modo demo = codigo OTP exibido na tela..."
}
```

- `modoDemo`: liga (`true`) ou desliga (`false`) o modo.
- `senhaHash`: SHA-256 da senha mestre usada para ligar/desligar o modo.
- **Senha padrão:** `cripto2024`.

Para trocar a senha, gere o hash e grave em `senhaHash`:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('NOVA_SENHA').digest('hex'))"
```

O botão do MODO DEMO só aparece na tela de login e quando o servidor está
conectado.

---

## 6. Versão e atualização do PWA

### Os três arquivos que precisam ficar sincronizados

Ao publicar mudanças, mantenha os três atualizados:

1. `index.html` → `APP_VERSION` / `APP_BUILD`
2. `sw.js` → `APP_VERSION` e `CACHE_NAME` (incremente `v11`, `v12`, …)
3. `version.json` → `version` / `build`

Depois rode `npm run sync` (ou `npm start`, que já sincroniza).

### Como o app se atualiza

- O app verifica `version.json` ao abrir.
- Quando há versão nova, surge o botão **🔄** no topo (e/ou o app recarrega
  sozinho).
- Ao voltar o foco para a página (ou `visibilitychange`), a atualização é
  verificada.
- No celular, **puxar para atualizar** também dispara a checagem.
- O Service Worker faz `skipWaiting` + `controllerchange` e recarrega
  automaticamente.

### Como o botão "Abrir app" funciona

O botão fica ao lado da logo, no topo, e aparece **somente no navegador**
(nunca dentro do app instalado):

| Estado detectado | Botão | Ação |
|---|---|---|
| App não instalado | **📱 Instalar** | Instala (prompt nativo do Chrome/Edge) |
| App já instalado, aberto no navegador | **📱 Abrir app** | Abre a versão instalada e tenta fechar a aba |
| Dentro do app (standalone) | *oculto* | — |
| Usuário clicou no **✕** | *oculto na sessão* | Volta após logout/login |

O navegador **não oferece API** para iniciar um PWA instalado nem para fechar
uma aba que não foi aberta por script. A implementação usa o melhor caminho por
plataforma:

- **Android (Chrome/Edge, HTTPS):** `intent://` apontando para o escopo do
  WebAPK. O Android entrega o link ao app instalado; se o app não responder, o
  `browser_fallback_url` devolve `?abrir=app&falhou=1` e o app mostra as
  instruções ("abra pelo ícone na tela inicial").
- **iPhone/iPad:** overlay com instruções (o Safari não permite iniciar o PWA
  por link) e botão **Fechar esta aba**.
- **Desktop:** overlay sugerindo **Abrir no app** da barra de endereço ou o
  atalho instalado no sistema.

Sempre que possível o código chama `window.close()`. Ele **só funciona** em
abas abertas por script; nas demais, o overlay informa que é preciso fechar pela
**✕** da aba. Ao carregar `?abrir=app` dentro do app instalado, a URL é limpa
com `history.replaceState` para não deixar parâmetros visíveis.

---

## 7. Deploy

### GitHub Pages (modo BroadcastChannel)

O projeto está disponível em **<https://devtriton.github.io/cripto.chat/>**.

No GitHub Pages não há servidor: as abas conversam via `BroadcastChannel`.

- Abra a página em **múltiplas abas ou janelas**.
- Cada aba representa um usuário diferente.
- As mensagens são trocadas entre as abas sem servidor.

```bash
git add .
git commit -m "descricao das mudancas"
git push origin master
```

O GitHub Pages atualiza automaticamente em ~1 minuto após o push.

### Render

Já configurado em `render.yaml`:

- build: `npm ci`
- start: `node server/server.js`
- health check: `/health`
- `HTTPS_PORT=0` (TLS terminado pelo proxy do Render)

Configure as variáveis SMTP no painel do Render, se quiser envio real de
e-mail.

### VPS/Plesk com domínio

- Use `SSL_KEY_PATH`/`SSL_CERT_PATH` com Let's Encrypt (Certbot) para
  instalação do app sem aviso de certificado.
- Em Plesk/Passenger, o servidor aceita um socket UNIX/named pipe em `PORT`
  (quando `PORT` não é numérico).
- Atrás de proxy reverso, o redirecionamento HTTP → HTTPS é desativado quando
  existe `x-forwarded-proto`, para não quebrar o site.

### Rede local (escola)

- Use `iniciar.bat` no Windows.
- Libere o Node.js no firewall para **redes privadas**.
- Prefira **IP fixo** (reserva DHCP) no PC servidor.
- Evite redes com **isolamento de clientes** (os aparelhos não se enxergam).

---

## 8. LGPD e registros de consentimento

- O servidor grava `server/consentimentos.jsonl` (uma linha por
  aceite/recusa/idade).
- A retenção é de **6 meses**; a limpeza roda na inicialização e a cada 24
  horas.
- O arquivo contém dado pessoal e **não deve ser versionado**.

```bash
# resumo (e-mails mascarados)
node scripts/limpar-consentimentos.js --listar

# apagar os registros de um titular (ou do responsável)
node scripts/limpar-consentimentos.js --email=aluno@exemplo.com

# apagar tudo
node scripts/limpar-consentimentos.js --todos
```

**Quem instala e mantém uma cópia é o controlador dos dados** perante a LGPD.
O autor do software não é controlador e não tem acesso às instalações de
terceiros. O documento completo (Termos, Privacidade, Cookies e ECA Digital)
fica em `privacidade.html`.

---

## 9. Checklist de publicação

- [ ] Versão atualizada em `index.html`, `sw.js` e `version.json`.
- [ ] `CACHE_NAME` do Service Worker incrementado.
- [ ] `npm run sync` executado (ou `npm start`).
- [ ] Login com MODO DEMO testado.
- [ ] Sala com dois usuários testada.
- [ ] Sala ADM testada (texto claro, simétrica e E2E).
- [ ] Atualização do PWA testada no celular.
- [ ] `server/.env`, `server/ssl/` e `server/consentimentos.jsonl` fora do
      commit.
- [ ] Documento `privacidade.html` revisado, se houve mudança de tratamento de
      dados.

---

## 10. Problemas técnicos comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `EADDRINUSE` na porta 3000 | Outra instância do servidor | Feche a outra janela/processo ou reinicie o PC |
| HTTPS não inicia | OpenSSL não encontrado | Instale o Git for Windows ou defina `OPENSSL_PATH` |
| Certificado inválido após mudar o IP | IP novo fora do SAN | Reinicie o servidor (regenera sozinho) |
| PWA continua na versão antiga | Service Worker em cache | Toque no **🔄**, feche/abra o app, limpe o cache ou reinstale |
| SMTP recusa o envio | Sem credenciais ou senha de app incorreta | Configure `SMTP_*` em `server/.env` ou use o MODO DEMO |
| Servidor entrega versão antiga | `sync-public.js` não rodou | Execute `npm run sync` |
| Celular não acessa a rede local | Firewall ou isolamento de clientes | Permita rede privada; use hotspot/roteador próprio |
| `npm install` falha | Sem internet ou proxy | Verifique a conexão e a configuração de proxy do npm |
