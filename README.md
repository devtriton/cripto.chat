# cripto.chat — Criptografia em Prática

**Chat educacional para demonstrar criptografia em sala de aula.** Funciona no
navegador e pode ser instalado como app (PWA) no celular ou no computador, sem
passar pela loja de aplicativos.

> **Este é o manual do professor.** Ele ensina a baixar, instalar e usar o
> cripto.chat no seu computador. Você não precisa saber programar.

**Demonstração online:** <https://devtriton.github.io/cripto.chat/>
*(serve para conhecer a interface; para a aula com vários aparelhos, instale
localmente)*

> ### Instalação rápida (Windows)
>
> 1. Baixe o ZIP:
>    **<https://github.com/devtriton/cripto.chat/archive/refs/heads/master.zip>**
>    (ou abra o repositório → **Code** → **Download ZIP**).
> 2. Extraia o ZIP e dê **dois cliques em `iniciar.bat`**.
> 3. Abra <http://localhost:3000> e entre com qualquer e-mail: o código de
>    acesso aparece na tela.
>
> Você precisa do **Node.js** instalado (<https://nodejs.org>). O `iniciar.bat`
> **não instala o Node.js**: ele apenas verifica se já está instalado. Para
> instalar o app no celular, instale também o **Git for Windows**. O passo a
> passo completo está abaixo.

---

## Sumário

1. [O que é o cripto.chat](#1-o-que-é-o-criptochat)
2. [Antes de começar](#2-antes-de-começar)
3. [Baixar o projeto](#3-baixar-o-projeto)
4. [Instalar no Windows (1 clique)](#4-instalar-no-windows-1-clique)
5. [Instalar no macOS ou Linux](#5-instalar-no-macos-ou-linux)
6. [Primeiro acesso (MODO DEMO)](#6-primeiro-acesso-modo-demo)
7. [Usar no celular e instalar como app](#7-usar-no-celular-e-instalar-como-app)
8. [Se algo der errado](#8-se-algo-der-errado)
9. [Roteiro rápido para a aula](#9-roteiro-rápido-para-a-aula)
10. [Funcionalidades](#10-funcionalidades)
11. [Privacidade e LGPD](#11-privacidade-e-lgpd)
12. [Para mantenedores](#12-para-mantenedores)

---

## 1. O que é o cripto.chat?

O cripto.chat é uma sala de conversa em tempo real criada para a aula. Os alunos
trocam mensagens e escolhem, antes de enviar, como elas serão protegidas: sem
criptografia, Cifra de César, Vigenère, XOR, AES-256 ou ponta a ponta
(RSA-2048 / ECC P-256).

O diferencial é a **Sala ADM**: uma aba que mostra exatamente o que o servidor
consegue ver em cada modo. O aluno não apenas ouve a explicação — ele observa
a mensagem legível, a chave que viaja junto ou o texto cifrado que o servidor
não consegue abrir.

O app funciona de duas formas:

| Forma | Endereço | O que funciona |
|---|---|---|
| **Online (demonstração)** | <https://devtriton.github.io/cripto.chat/> | Guia, demonstração e conversa entre abas do mesmo navegador. Não há servidor. |
| **Local (completo)** | `http://localhost:3000` | Login por código, salas entre computadores e celulares, Sala ADM e instalação como app. |

> Para a aula com a turma, use a **versão local**. A versão online serve para
> conhecer o projeto e testar a interface sem instalar nada.

---

## 2. Antes de começar

| Item | Obrigatório? | Para que serve | Onde obter |
|---|---|---|---|
| Computador com Windows, macOS ou Linux | Sim | Rodar o servidor da turma | — |
| **Node.js 20 ou superior (LTS)** | Sim | Liga o servidor do chat | <https://nodejs.org> |
| **Git for Windows** | Recomendado no Windows | Traz o OpenSSL usado no certificado HTTPS | <https://git-scm.com> |
| Internet | Só na instalação | Baixar as dependências (e enviar e-mail, se configurado) | — |
| Celulares ou tablets | Opcional | Entrar na mesma rede e instalar o app | Mesma rede Wi-Fi do PC |

**Tempo estimado:** 5 a 10 minutos na primeira vez.

Observações importantes:

- Não é preciso saber programar nem usar o terminal. No Windows, tudo é feito
  com dois cliques.
- **O Node.js é instalado manualmente**, pelo site oficial. O `iniciar.bat` não
  instala o Node.js: ele apenas verifica se ele já está no computador.
- O primeiro start baixa as dependências do projeto (algumas dezenas de MB).
  Depois disso, o chat funciona sem internet, desde que os aparelhos estejam na
  mesma rede.
- No Windows, **instale o Git for Windows** se quiser que os celulares
  instalem o app. Sem ele, o chat funciona no PC, mas o HTTPS automático
  (necessário para instalar o PWA) fica indisponível.
- Em computadores da escola, pode ser necessário pedir ao setor de TI para
  liberar a instalação do Node.js e as portas **3000** e **3443**.

---

## 3. Baixar o projeto

### Opção A — Baixar o ZIP (mais fácil)

> **Atalho:** [baixar o ZIP diretamente](https://github.com/devtriton/cripto.chat/archive/refs/heads/master.zip).

1. Abra **<https://github.com/devtriton/cripto.chat>** (ou use o atalho acima).
2. Clique no botão verde **Code** → **Download ZIP**.
3. Salve o arquivo e **extraia** o conteúdo (botão direito → **Extrair tudo…**).
4. Escolha uma pasta simples, de preferência sem acentos nem espaços:
   `C:\cripto.chat`.
5. Abra a pasta e confirme que o arquivo **`iniciar.bat`** está lá.

> **Importante:** não execute o app de dentro do ZIP. O Windows permite
> visualizar os arquivos sem extrair, mas o servidor precisa deles gravados no
> disco. Extraia primeiro.

### Opção B — Clonar com Git

Se você já usa Git:

```bash
git clone https://github.com/devtriton/cripto.chat.git
cd cripto.chat
```

> O ZIP do GitHub pode criar uma pasta chamada `cripto.chat-master`. O nome não
> importa; o que importa é que `iniciar.bat` esteja dentro dela.

O download **não inclui** a pasta `node_modules` (dependências) nem o arquivo
`server/.env` (configuração de e-mail). O primeiro start instala as
dependências; o `.env` é opcional, porque o **MODO DEMO já vem ligado**.

---

## 4. Instalar no Windows (1 clique)

1. Abra a pasta do projeto.
2. Dê **duplo clique em `iniciar.bat`**.
3. Se o Windows perguntar algo, permita a execução.
   - Se aparecer o aviso do **Firewall do Windows**, marque **Rede privada** e
     clique em **Permitir acesso**. Isso é necessário para os celulares
     entrarem.
4. Aguarde. Na primeira vez, a janela mostra a instalação das dependências e
   pode levar de 1 a 3 minutos.
5. O navegador abre sozinho em **<http://localhost:3000>**.
6. **Deixe a janela preta aberta** enquanto estiver usando o chat. Para
   encerrar, feche a janela ou pressione `Ctrl+C`.

A janela do servidor mostra os endereços. Anote o endereço **HTTPS na rede
local**, parecido com:

```text
HTTPS na rede local: https://192.168.0.60:3443
```

É esse endereço que os celulares vão usar.

| Endereço | Para que serve |
|---|---|
| `http://localhost:3000` | Uso no próprio PC |
| `https://localhost:3443` | Versão segura no próprio PC (PWA instalável) |
| `http://192.168.x.x:3000` | Acesso pela rede → redireciona sozinho para HTTPS |
| `https://192.168.x.x:3443` | Versão segura na rede (celulares instalam o app por aqui) |

### O que o `iniciar.bat` faz

| Etapa | O que acontece |
|---|---|
| 1 | Confere se o Node.js está instalado |
| 2 | Instala as dependências na primeira execução (`npm install`) |
| 3 | Sincroniza os arquivos que o servidor entrega |
| 4 | Sobe o servidor HTTP (porta 3000) e HTTPS (porta 3443) |
| 5 | Abre o navegador em `http://localhost:3000` |

Se a janela abrir e fechar na hora, veja a seção
[8. Se algo der errado](#8-se-algo-der-errado).

### Instalar sem o `iniciar.bat`

Abra o **Prompt de Comando** na pasta do projeto (digite `cmd` na barra de
endereço do Explorador e pressione Enter) e execute:

```bat
npm install
npm start
```

O resultado é o mesmo. O `npm start` também sincroniza os arquivos antes de
subir o servidor.

---

## 5. Instalar no macOS ou Linux

1. Instale o **Node.js LTS** em <https://nodejs.org>.
2. Abra o Terminal na pasta do projeto.
3. Execute:

```bash
npm install
npm start
```

4. Abra **<http://localhost:3000>** no navegador.
5. Para encerrar, pressione `Ctrl+C`.

No macOS e no Linux, o OpenSSL normalmente já está disponível para gerar o
certificado HTTPS. Se o servidor avisar que não encontrou o OpenSSL ou que não
conseguiu gerar o certificado, instale-o pelo gerenciador de pacotes da sua
distribuição (ou pelo Homebrew, no macOS) e inicie de novo. Se o executável não
estiver no `PATH`, defina `OPENSSL_PATH` com o caminho completo.

---

## 6. Primeiro acesso (MODO DEMO)

O repositório já vem com o **MODO DEMO ligado**: o código de acesso aparece na
tela, sem precisar configurar e-mail. É o melhor caminho para a primeira aula.

1. Abra **<http://localhost:3000>**.
2. Leia e aceite o aviso de **privacidade e consentimento**.
   - **Aceitar e continuar** usa as opções marcadas (inclusive lembrar o
     e-mail, se você marcar).
   - **Aceitar só o essencial** faz o mesmo, sem lembrar o e-mail.
   - **Rejeitar** bloqueia as salas; o Guia Educacional continua disponível.
3. Digite um e-mail de teste (por exemplo, `professor@escola.com`) e clique em
   **Enviar Código**. Use um e-mail diferente para cada participante.
4. O código de **6 dígitos** aparece na própria tela. Digite-o.
5. Responda à **confirmação de idade**. Menores de 16 anos precisam do nome,
   e-mail e autorização de um responsável; sem isso, podem usar o Guia e a
   Demonstração (as salas ficam bloqueadas).
6. Pronto: crie uma sala ou entre em uma existente.

> **Senha do MODO DEMO:** se o modo estiver desligado, o botão
> **MODO DEMO DESLIGADO** (na tela de login) pede a senha mestre. A senha
> padrão é **`cripto2024`**. Ela pode ser trocada em
> `server/demo-config.json` — veja
> [MANUTENCAO.md](MANUTENCAO.md#5-modo-demo-e-senha-mestre).

### Envio real de código por e-mail (opcional)

Para usar e-mails de verdade, copie `server/.env.example` para `server/.env` e
preencha os dados SMTP. No Gmail, use uma **senha de app** de 16 caracteres,
não a senha normal da conta. Depois, reinicie o servidor.

Sem SMTP configurado, o envio por e-mail é recusado com a mensagem
*"Serviço de email não configurado"*. Nesse caso, use o MODO DEMO.

> O arquivo `server/.env` está no `.gitignore` e **nunca** deve ser publicado.

---

## 7. Usar no celular e instalar como app

O celular precisa estar na **mesma rede Wi-Fi** do computador que está rodando
o servidor.

1. No computador, veja na janela preta o endereço **HTTPS na rede local**
   (ex.: `https://192.168.0.60:3443`).
2. No celular, abra esse endereço no **Chrome** (Android) ou **Safari**
   (iPhone/iPad).
3. Na primeira vez, o navegador avisa que o certificado não é confiável. Isso é
   normal em rede local. Toque em **Avançados** → **Continuar para o
   endereço** (ou equivalente).
4. Faça login normalmente.
5. Instale o app:
   - **Android (Chrome):** toque em **📱 Instalar** e confirme.
   - **iPhone/iPad (Safari):** toque em **Compartilhar** (□↑) →
     **Adicionar à Tela de Início** → **Adicionar**.
   - **Computador (Chrome/Edge):** use o ícone de instalação na barra de
     endereço ou o botão **📱 Instalar**.

Depois de instalado, o app abre em tela cheia, com ícone próprio, sem a barra
do navegador.

> **Não use `localhost` no celular.** `localhost` significa "este aparelho". No
> celular, use o IP do computador (o endereço `192.168.x.x` ou `10.x.x.x`).

### Se o celular não abrir o endereço

- Confirme que os dois estão na **mesma rede** (não adianta um no Wi-Fi e outro
  no 4G).
- No Windows, permita o Node.js no **Firewall** para **redes privadas**.
- Muitas redes de escola usam **isolamento de clientes**: os aparelhos não se
  enxergam. Nesse caso, use um roteador/hotspot do professor ou peça ao TI para
  liberar a comunicação entre os aparelhos.
- Se o PC tiver várias placas de rede (Wi-Fi e cabo), experimente o outro
  endereço IP mostrado na janela preta.

---

## 8. Se algo der errado

| Problema | O que fazer |
|---|---|
| O `iniciar.bat` diz que o Node.js não foi encontrado | Instale o Node.js LTS em <https://nodejs.org>, feche e abra a janela e tente de novo. |
| A janela preta abre e fecha sozinha | Abra o Prompt de Comando na pasta e rode `iniciar.bat` ou `npm start` para ler o erro. |
| "A porta 3000 já está em uso" / "Já existe um cripto.chat rodando" | Feche a outra janela do servidor. Se não achar, reinicie o computador. |
| O navegador não abre sozinho | Abra manualmente <http://localhost:3000>. |
| A página fica carregando ou não abre | Confira se a janela preta mostra `Rodando em http://localhost:3000`. Se não, veja o erro nela. |
| A primeira instalação falhou | Verifique a internet e tente `npm install` de novo. Em rede com proxy, configure o npm. |
| O celular não acessa | Mesma rede Wi-Fi; firewall liberado para rede privada; use o IP correto; veja o isolamento de clientes. |
| "Sua conexão não é particular" | Normal com certificado autoassinado. **Avançados → Continuar** (uma vez por aparelho). |
| O botão **Instalar** só mostra instruções | A página está em HTTP pela rede. Use `https://IP:3443`. No iPhone, a instalação é manual pelo menu Compartilhar. |
| O código de 6 dígitos não aparece | O MODO DEMO pode estar desligado ou o servidor caiu. Veja a logo (vermelha = sem conexão), recarregue e confira o modo. |
| O e-mail com o código não chega | Sem SMTP configurado, use o MODO DEMO. Se configurou, confira a senha de app e a caixa de spam. |
| O app continua na versão antiga | Toque no **🔄** no topo, feche e abra o app, ou puxe para atualizar. Se persistir, desinstale e instale de novo. |
| A logo fica vermelha e piscando | O servidor está desligado ou a rede caiu. Verifique a janela preta e a conexão. |
| O certificado parou de valer depois de trocar o IP | Reinicie o servidor (ele regenera) e aceite o aviso de novo nos aparelhos. |
| "npm não é reconhecido" | O Node.js não está no PATH. Reinstale marcando a opção de adicionar ao PATH ou reinicie o PC. |

---

## 9. Roteiro rápido para a aula

### Preparação (5 minutos antes)

1. Ligue o computador e execute o `iniciar.bat`.
2. Abra `http://localhost:3000` e faça login com um e-mail de professor.
3. Crie a sala **Turma A**.
4. Deixe a janela preta aberta e anote o endereço HTTPS da rede.
5. Peça aos alunos para acessar o endereço no celular ou em outro computador.

### Demonstração 1 — o servidor lê tudo (texto claro)

1. Aluno A e aluno B entram na mesma sala.
2. Aluno A escolhe **Sem criptografia** e envia "A prova é amanhã".
3. Abra a **Sala ADM** (botão no topo; no celular, no menu ☰).
4. A mensagem aparece em texto claro, destacada em **verde**: o servidor viu
   tudo.

### Demonstração 2 — a chave viaja junto (César)

1. Aluno A escolhe **Cifra de César**, chave `3`, e envia `OLA`.
2. Na Sala ADM, a mensagem aparece com o texto cifrado e a chave `3`.
3. Clique em **🔓 Descriptografar**: o servidor lê `OLA`.
4. Aluno B vê a mensagem já descriptografada: a chave chegou junto no pacote.
5. Explique: a chave viajou junto com a mensagem; por isso o servidor também
   consegue abrir.

### Demonstração 3 — ponta a ponta (E2E)

1. Aluno A escolhe **E2E — RSA-2048** ou **E2E — ECC P-256**.
2. Envie uma mensagem.
3. Na Sala ADM, ela aparece em **vermelho**, cifrada, sem botão para abrir.
4. Explique: a chave privada nunca saiu do navegador do aluno. O servidor viu
   apenas o texto cifrado.

### Demonstração 4 — sala vazia desaparece

1. Todos saem da sala **Turma A**.
2. A sala some da lista de salas.
3. Explique: o servidor não guarda histórico nem salas vazias.

### Regras que os alunos precisam saber

- **30 minutos sem interagir** → logout automático.
- **Um e-mail por vez**: o mesmo e-mail não pode estar logado em dois aparelhos
  ao mesmo tempo (abas do mesmo navegador são permitidas).
- **Nomes únicos**: se dois alunos tiverem o mesmo nome, o sistema acrescenta um
  número (`Maria`, `Maria2`…).
- **Mensagens não ficam salvas**: ao sair da sala, o histórico desaparece. Se
  precisar de registro, use o botão 🖨️ para imprimir o relatório.
- **@nome** envia mensagem direta; **#nome** menciona em público.

### Conceitos que a aula demonstra

1. **Criptografia simétrica**: a mesma chave cifra e decifra.
2. **Confidencialidade**: sem a chave, não é possível ler a mensagem.
3. **Canal inseguro**: o servidor não consegue ler mensagens E2E.
4. **Força bruta**: César cai com 26 tentativas; AES-256 é inviável.
5. **Autenticação**: login por e-mail + código OTP de 6 dígitos.
6. **HTTPS e certificados**: o cadeado do navegador protege a conexão.
7. **PWA**: instalar um site como app, sem loja de aplicativos.
8. **Troca de chaves**: como dois dispositivos chegam ao mesmo segredo sem
   enviá-lo pela rede (ECDH na demonstração; Diffie–Hellman com números
   pequenos no Guia).

---

## 10. Funcionalidades

### Autenticação e salas

- Login com e-mail + código OTP de 6 dígitos (validade de 5 minutos).
- **MODO DEMO:** o código aparece na tela, sem envio de e-mail.
- **Somente salas públicas**: não existem salas privadas nem salas com senha.
- A lista de salas é enviada a todos os usuários logados.
- **Sala vazia é excluída**: se o último participante sair, a sala deixa de
  existir.
- **30 minutos de inatividade**: o usuário é desconectado e faz logoff.
- O servidor não guarda banco de dados nem histórico. O navegador mantém apenas
  uma cópia local (últimas 200 mensagens) para o relatório.

### Mensagens

- **Normal**: visível para todos na sala.
- **Com `@usuario`**: mensagem direta (só o destinatário lê).
- **Com `#usuario`**: menção pública (todos veem, o usuário é destacado).

### Criptografia

| Opção no combo | Chave | A Sala ADM consegue ler? |
|---|---|---|
| Sem criptografia | — | **Sim**, em texto claro (verde) |
| Cifra de César | deslocamento (0–25) | **Sim**, porque a chave viaja junto |
| Cifra de Vigenère | palavra-chave | **Sim**, porque a chave viaja junto |
| XOR | chave de texto | **Sim**, porque a chave viaja junto |
| AES-256-GCM | senha | **Sim na demonstração**, porque a chave viaja junto |
| E2E — RSA-2048 | par de chaves | **Não**: só a chave privada do navegador abre |
| E2E — ECC P-256 | par de chaves | **Não**: só a chave privada do navegador abre |

> No AES da demonstração, a chave é enviada junto para que os colegas consigam
> ler. Em um sistema real, a chave nunca viajaria com a mensagem.

### Interface e recursos

- Layout responsivo para celular e computador.
- Instalação como app (PWA) ao lado da logo, quando o navegador permite.
- Indicador de conexão na logo: borda e brilho **verdes** (online) ou
  **vermelhos piscando** (offline).
- Botão 🖨️ para imprimir o relatório da conversa.
- **Guia Educacional** e **📖 Doc** disponíveis antes e depois do login.
- Recuperação automática da sessão e da sala quando o celular volta do segundo
  plano.
- Proteções de sessão: F5/Ctrl+R bloqueados, logout apenas pelo botão **Sair** e
  logoff automático por inatividade.

### Guia do aluno

O texto do **📖 Doc** fica em `docs/documentacao.md`, escrito com palavras
simples para crianças a partir de 5 anos. A página também tem o botão
**Gerar PDF**. Para alterar o guia, edite apenas esse arquivo e rode
`npm run sync`.

---

## 11. Privacidade e LGPD

O cripto.chat foi pensado para uso escolar e segue, de forma proporcional ao
projeto, o **Marco Civil da Internet (Lei 12.965/2014)**, a **LGPD (Lei
13.709/2018)** e a **Lei 15.211/2025 (ECA Digital)**.

### O que o app faz

- **Consentimento no primeiro acesso:** aceitar tudo, aceitar só o essencial ou
  rejeitar. Quem rejeita não faz login, mas continua podendo ler o Guia
  Educacional.
- **Sem cookies:** o site não usa cookies. Um aviso informativo e fechável
  explica que apenas o `localStorage` do navegador é usado.
- **Conversas não são armazenadas:** o servidor mantém salas, usuários e
  mensagens apenas em memória. Ao sair da sala (ou quando ela fica vazia), o
  histórico desaparece.
- **Confirmação de idade após o login:** 18+, 16–17 ou menos de 16. Menores de
  16 precisam de autorização de um responsável (nome, e-mail e declaração); sem
  ela, ficam em **modo leitura** (Guia/Demonstração, salas bloqueadas).
- **Painel 🔒 Privacidade:** mostra o consentimento e a idade, permite revisar a
  escolha, abrir o documento completo, pedir exclusão no servidor e apagar os
  dados do navegador.
- **Registro de auditoria:** o servidor grava `server/consentimentos.jsonl`
  (uma linha por aceite/recusa/idade), com retenção de **6 meses**.

### Quem é o controlador (importante para quem instala)

O cripto.chat é um projeto educacional de código aberto. O autor **não é
controlador** dos dados das instalações feitas por terceiros e **não tem
acesso** a elas.

**Quem instala e mantém uma cópia é o controlador dos dados** perante a LGPD
(art. 5º, VI) — em geral a escola, a instituição, o professor ou a pessoa que
disponibilizou o endereço. Essa pessoa ou instituição deve:

1. **divulgar um canal de contato** para pedidos de privacidade (o documento e
   o app não trazem um e-mail fixo justamente porque cada instalação é
   autônoma);
2. **manter visível o crédito de autoria** ao desenvolvedor, como consta no
   rodapé e na tela de login: *“Desenvolvido por Marlon Antonio Stoeberl — Rio
   Negro, Paraná”*;
3. responder aos pedidos de titulares e responsáveis e aplicar a exclusão dos
   registros.

O crédito de autoria não transfere ao autor a responsabilidade pelo tratamento
de dados nem a condição de controlador.

### Documento completo

O texto jurídico (Termos de Uso, Política de Privacidade, Cookies, ECA Digital,
Marco Civil, direitos do titular e histórico de versões) fica em
**`privacidade.html`**, publicado junto com o app e linkado no modal de
consentimento, na tela de login e no rodapé.

### Exclusão de registros (responsável)

```bash
# resumo (e-mails mascarados)
node scripts/limpar-consentimentos.js --listar

# apagar os registros de um titular (ou do responsável)
node scripts/limpar-consentimentos.js --email=aluno@exemplo.com

# apagar tudo
node scripts/limpar-consentimentos.js --todos
```

> **Limite declarado:** a verificação de idade é **declaratória**. O projeto não
> coleta documentos, não usa reconhecimento facial e não consulta bases
> externas. O uso em sala de aula deve ser acompanhado pelo professor.

---

## 12. Para mantenedores

Os detalhes técnicos (scripts, HTTPS automático, variáveis de ambiente,
estrutura, deploy e atualização do PWA) estão em
**[MANUTENCAO.md](MANUTENCAO.md)**.

Resumo rápido:

- `npm start` sobe o servidor e sincroniza `server/public`; `npm run sync` faz
  apenas a sincronização.
- Antes de publicar, atualize `index.html` (`APP_VERSION`/`APP_BUILD`), `sw.js`
  (`APP_VERSION`/`CACHE_NAME`) e `version.json`, e rode o sync.
- **GitHub Pages** funciona sem servidor (abas via `BroadcastChannel`).
  **Render** já está configurado em `render.yaml`. **VPS/Plesk** usa
  `SSL_KEY_PATH`/`SSL_CERT_PATH` com Let's Encrypt.
- Nunca versione `server/.env`, `server/ssl/` nem
  `server/consentimentos.jsonl` — eles já estão no `.gitignore`.

---

## Créditos

**Desenvolvido por Marlon Antonio Stoeberl — Rio Negro, Paraná.**

Projeto educacional para demonstração de criptografia em sala de aula, no
contexto da Licenciatura em Computação da **UTFPR — Universidade Tecnológica
Federal do Paraná**.
