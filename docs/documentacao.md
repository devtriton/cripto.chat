# 📖 Documentação do cripto.chat

**Guia de uso do chat da aula.**

> Este guia foi escrito com palavras simples, para crianças a partir de 5 anos.
> Se você ainda está aprendendo a ler, peça para um adulto ler junto com você.

---

## 1. O que é o cripto.chat?

O cripto.chat é uma **sala de conversa pela internet**, feita para a aula.

Nele você pode:

- 💬 conversar com os colegas da turma;
- 🔐 enviar mensagens **trancadas com uma chave** (isso se chama criptografia);
- 👀 ver o que um "servidor" consegue — e o que ele **não** consegue — ler.

---

## 2. Antes de começar

Você precisa de três coisas:

1. Um computador ou um celular com internet.
2. O seu **e-mail** (o endereço que contém um `@`, como `nome@exemplo.com`).
3. Permissão de um adulto.

---

## 3. Como entrar — passo a passo

Faça assim, nesta ordem:

1. Abra o endereço do chat no navegador.
2. Escreva o seu **e-mail** no quadradinho.
3. Clique no botão **Enviar Código**.
4. Pegue o **código de 6 números** (veja o passo 4 abaixo).
5. Escreva esses 6 números na tela de verificação.
6. Clique em **Verificar e Entrar**. 🎉 Pronto! Você entrou.

> ⏳ O código vale por **5 minutos**. Se o tempo acabar, clique em **Enviar Código** de novo para pegar um código novo.

> 📱 **No celular:** o endereço pode mudar sozinho para começar com `https://` e aparecer um aviso de segurança. É normal. Toque em **Avançados** e depois em **Continuar**. Isso acontece só na primeira vez.

---

## 4. De onde vem o código?

Existem **duas formas** de receber o código. A escolhida depende do **MODO DEMO**:

- **📧 Por e-mail (MODO DEMO desligado):** o código chega na sua caixa de entrada (procure também na pasta de *spam*). **Nada aparece na tela.**
- **🖥️ Na tela (MODO DEMO ligado):** o código aparece escrito na própria tela, em números grandes e verdes. **Nenhum e-mail é enviado.**

### Como saber se o MODO DEMO está ligado?

Na **tela de login** existe um botão:

- **MODO DEMO ON** (verde) → o modo demo está **ligado**: o código aparece na tela.
- **MODO DEMO OFF** (laranja) → o modo demo está **desligado**: o código vai por e-mail.

Ao ligar ou desligar, **o botão muda sozinho** — não aparece nenhuma mensagem de alerta.

> 👩‍🏫 Só o professor pode ligar e desligar o MODO DEMO, com a **senha mestre**.
> Ele clica no botão **MODO DEMO OFF** (na tela de login) e digita a senha.

---

## 5. As salas são para todo mundo

Esta é uma regra muito importante do cripto.chat:

- **Todas as salas são públicas.**
- Quando alguém cria uma sala, **ela aparece para todos os alunos que fizeram login**.
- Não existem salas com senha nem salas escondidas.
- Qualquer colega logado pode clicar e entrar.

Dessa forma, todo mundo encontra a sala da turma sem precisar de um código secreto.

---

## 6. Como criar uma sala

Na aba **Salas de Bate-Papo** aparecem dois quadros, um abaixo do outro:

1. **Criar Nova Sala** (em cima): escreva o nome da sala e clique em **Criar Sala**, tudo na mesma linha.
2. **Salas Disponíveis** (embaixo): lista de salas que já existem.

Passos para criar:

1. Clique na aba **Salas de Bate-Papo**.
2. No quadro **Criar Nova Sala**, escreva um nome — por exemplo: `Turma Cripto 2026`.
3. Clique no botão verde **Criar Sala**.
4. A sala nasce e você já entra nela.

> 💡 A sala aparece para todos os colegas logados. Chame a turma para entrar!

---

## 7. Como entrar numa sala que já existe

1. Olhe o quadro **Salas Disponíveis** (embaixo do quadro de criar sala).
2. Veja o nome da sala e quantas pessoas estão lá.
3. **Clique no nome da sala.** Você entra e já pode conversar.

---

## 8. Como sair de uma sala — e a regra da sala vazia

Para sair:

- Clique na **seta ←** que fica ao lado do nome da sala, no topo do chat.

Agora a regra da sala vazia:

- Se **a última pessoa sair**, a sala **deixa de existir**.
- Ela não fica aparecendo na lista para ninguém.
- Se a turma quiser usar de novo, basta **criar a sala outra vez**.

> 🧹 Assim o chat não fica cheio de salas vazias e abandonadas.

---

## 9. Como conversar com os colegas

Escreva a mensagem no quadradinho grande e clique em **Enviar** (ou tecle *Enter*).

Você tem **três jeitos** de falar:

- **💬 Normal:** todo mundo na sala lê a mensagem.
- **@Nome:** mensagem **direta**. Exemplo: `@Maria, vem aqui!`. Só a Maria lê.
- **#Nome:** **menção**. Todo mundo vê, mas o nome da pessoa fica destacado em amarelo.

---

## 10. O cadeado da mensagem (criptografia)

Antes de enviar, você escolhe o **cadeado** (o algoritmo) e, se precisar, a **chave**:

- **Sem criptografia:** mensagem aberta, igual a um cartão sem envelope.
- **Cifra de César:** desloca as letras. Chave = quantas casas pular.
- **Cifra de Vigenère:** usa uma palavra-chave.
- **XOR:** mistura a mensagem com a chave, bit a bit.
- **AES-256-GCM:** cadeado forte de verdade.
- **E2E — RSA-2048** e **ECC P-256:** a chave fica **só no seu navegador**.

> 🧪 Quer testar antes de mandar? Abra a aba **Demonstração Criptografia** e brinque com os algoritmos.

---

## 11. A Sala ADM (o olho do servidor)

O botão **Sala ADM** (no topo) mostra **o que o servidor vê**:

- 🟢 Mensagem **sem criptografia** → o servidor lê normalmente.
- 🟡 Mensagem com **criptografia simétrica** (César, Vigenère, XOR, AES) → nesta demonstração a chave viaja junto, então o servidor consegue abrir.
- 🔴 Mensagem **E2E** (RSA ou ECC) → o servidor vê só letras embaralhadas e **não pode ler**.

> Essa aba é ótima para a aula: mostra na prática que **quem guarda a chave manda no conteúdo**.

---

## 12. As 4 regras do chat

1. **Salas públicas:** todas as salas aparecem para todos os alunos logados.
2. **Sala vazia some:** se o último participante sair, a sala é apagada.
3. **30 minutos parado = sair:** quem fica **30 minutos sem interagir** é desconectado da sala e do chat.
4. **Respeito:** trate bem os colegas. A sala é de todos.

> ⏱️ Para voltar depois dos 30 minutos, é só fazer login de novo — leva 10 segundos (passo 3).

---

## 13. Probleminhas comuns (e como resolver)

- **Apareceu "Serviço de email não configurado":** peça ao professor para ativar o **MODO DEMO**.
- **Não recebi o código por e-mail:** confira a pasta *spam*, peça o código de novo e use dentro de 5 minutos.
- **O código não entra:** ele tem **6 números**. Veja se digitou todos.
- **A sala sumiu da lista:** ficou vazia e foi apagada. Crie uma sala nova.
- **Fui desconectado sozinho:** foram os 30 minutos de inatividade. Entre novamente.
- **A logo está vermelha e piscando:** o servidor está **desconectado** (OFF). Peça ao professor para verificar se o servidor está ligado e confira sua conexão com a internet. Quando conectar, a borda fica **verde** (ON).
- **O botão 📱 Instalar só mostra instruções:** o site foi aberto em `http://`. Use o endereço com `https://` (ou deixe o redirecionamento automático acontecer).
- **O Chrome diz que não é possível instalar:** falta o endereço seguro (HTTPS). Peça ao professor o endereço `https://IP-DO-PC:3443`.
- **Apareceu "Sua conexão não é particular":** é o certificado da rede local. Toque em **Avançados → Continuar** (só na primeira vez).
- **O ícone do app ficou antigo:** desinstale o app, limpe o cache do navegador e instale de novo.
- **O app não mostrou a versão nova:** toque no botão **🔄** no topo, ou feche e abra o app, ou puxe a tela para baixo no navegador.

---

## 14. 📱 Instalar o app no celular

O cripto.chat pode virar um **app** no celular — como os apps da loja, mas instalado
direto pelo navegador. Ele ganha um **ícone na tela inicial** e abre em tela cheia.

O botão fica **no topo, ao lado da logo**:

- **📱 Instalar** → o app ainda **não está instalado** neste aparelho.
- **📱 Abrir app** → o app **já está instalado**; toque para abrir.
- **Sem botão** → você já está **dentro do app**. 🎉
- **✕** → esconde o botão nesta sessão; ele volta quando você sair e entrar de novo.

> 💡 O botão aparece só no navegador. Dentro do app ele não existe.

### No Android (Chrome)

1. Abra o endereço do chat. Se ele começar com `https://`, ótimo — é o endereço seguro.
2. Na primeira vez, aceite o aviso: **Avançados → Continuar**.
3. Entre com seu e-mail.
4. Toque em **📱 Instalar**.
5. Confirme no quadro que aparecer. Pronto: o ícone está na tela inicial.

### No iPhone ou iPad (Safari)

1. Abra o endereço no **Safari**.
2. Toque no botão **Compartilhar** (o quadradinho com uma seta para cima).
3. Role a lista e toque em **Adicionar à Tela de Início**.
4. Toque em **Adicionar**. O ícone aparece na tela inicial.

> 🍎 O iPhone não tem o quadro automático de instalação; por isso usamos os passos acima.

### Atualizações do app

Quando o professor publica uma versão nova:

- aparece um botão **🔄** no topo — toque nele para atualizar;
- ou **feche e abra** o app;
- no navegador, **puxe a tela para baixo** para atualizar.

---

## 15. Para o professor

### Como rodar o projeto

**Windows — 1 clique:** dê duplo clique em **`iniciar.bat`**. Ele instala as
dependências na primeira vez, sincroniza os arquivos, liga o servidor e abre o navegador.

**Manual:**

1. `npm install` (na pasta do projeto)
2. `npm start`
3. Abra `http://localhost:3000` em duas ou mais abas para simular vários alunos.

### Endereços do sistema

| Endereço | Uso |
|---|---|
| `http://localhost:3000` | No próprio PC (testes) |
| `https://localhost:3443` | Versão segura no PC (instalar o app) |
| `http://IP-DO-PC:3000` | Na rede → redireciona sozinho para HTTPS |
| `https://IP-DO-PC:3443` | **Endereço usado pelos alunos no celular** |

> O IP do PC aparece no terminal quando o servidor inicia.

### HTTPS e o aviso de certificado

- O servidor **gera o certificado sozinho** (em `server/ssl/`) e o **renova
  automaticamente** quando o IP do PC muda ou quando está perto de expirar.
- Como é um certificado **autoassinado** (rede local, sem domínio), o celular mostra
  **um aviso uma única vez**: **Avançados → Continuar**.
- **Recomendação:** deixe o PC servidor com **IP fixo** (reserva no roteador).
  Assim o aviso não volta a aparecer.
- Para instalar sem aviso nenhum, use um endereço com domínio real e certificado
  Let's Encrypt (`SSL_KEY_PATH` e `SSL_CERT_PATH` no `server/.env`).
- Em hospedagem que já cuida do TLS (Render/Plesk), defina `HTTPS_PORT=0` para não
  abrir a porta HTTPS local.

### Entrega de código OTP

- **Por e-mail (padrão):** configure no arquivo `server/.env` as variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`.
- **Modo demo (opcional):** o código aparece na tela, sem envio. Ligue pelo botão **MODO DEMO** na tela de login, com a **senha mestre** (padrão: `cripto2024` — troque-a em `server/demo-config.json`, campo `senhaHash`, que é o hash SHA-256 da senha).

### Instalação do app pelos alunos (PWA)

- **Android:** acessar `https://IP-DO-PC:3443`, aceitar o certificado e tocar em **📱 Instalar**.
- **iPhone/iPad:** **Compartilhar → Adicionar à Tela de Início → Adicionar**.
- O botão **📱 Abrir app** aparece quando o app já está instalado e o site é aberto no navegador; dentro do app o botão fica oculto.
- O botão **🔄** aparece quando há versão nova; tocar nele atualiza. O app também verifica atualizações ao voltar o foco para a tela e, no celular, ao puxar para atualizar.
- Se o Chrome não oferecer instalação no menu, o motivo é acesso em HTTP: use o endereço HTTPS.

### Indicação de conexão (logo)

- A logo `🔐 cripto.chat` tem **borda e brilho** que mostram o status do servidor:
  - 🟢 **verde** = servidor **ON** (conectado);
  - 🔴 **vermelho piscando** = servidor **OFF** (sem conexão).
- Aparece em todas as telas, inclusive na de login.

### Proteções de sessão

- **F5 / Ctrl+R** são bloqueados silenciosamente para não derrubar a sala sem querer.
- **Recarregar** pelo botão do navegador, fechar a aba ou puxar para atualizar mostra
  o **diálogo nativo de confirmação** (exigência de segurança do navegador — não é
  possível removê-lo).
- **Logout** só pelo botão **Sair** (com confirmação quando está em uma sala) ou por
  **30 minutos** de inatividade.

### Atualização de versão (mantenedores)

Ao publicar mudanças, mantenha estes arquivos sincronizados:

1. `index.html` → `APP_VERSION` e `APP_BUILD`
2. `sw.js` → `APP_VERSION` e `CACHE_NAME` (incremente `v1`, `v2`, …)
3. `version.json` → `version` e `build`

Depois rode `npm run sync` (o `npm start` já faz isso).

### Regras já implementadas

- Somente **salas públicas** (não há salas privadas).
- A **lista de salas é enviada a todos** os usuários logados (atualização automática).
- **30 minutos** de inatividade → logoff e saída da sala.
- **Sala vazia** → apagada do servidor.
- OTP por e-mail **ou** exibido na tela no modo demo.

### Arquivos importantes

- `docs/documentacao.md` — este documento (fonte única).
- `npm run sync` — copia a raiz para `server/public` (pasta servida pelo servidor). Roda sozinho no `npm start`.
- `server/ssl/` — certificado autoassinado gerado e renovado automaticamente.
- `scripts/gerar-certificado.ps1` — regeneração manual do certificado (opcional).
- `iniciar.bat` — início em 1 clique no Windows.
- `version.json`, `APP_VERSION` (`index.html`) e `CACHE_NAME` (`sw.js`) — controle de versão e atualização do app.

---

## 16. Glossário — palavras difíceis explicadas

- **Chat:** conversa pela internet, escrita.
- **E-mail:** o seu endereço na internet, que contém o caractere @ (exemplo: `nome@exemplo.com`).
- **Código OTP:** um código de 6 números, usado **uma vez só** para provar que o e-mail é seu.
- **Criptografia:** transformar a mensagem em código para só quem tem a chave entender.
- **Chave:** a palavra ou o número que trancou e destranca a mensagem.
- **Servidor:** o computador que guarda as salas e repassa as mensagens para todo mundo.
- **Sala pública:** sala que qualquer pessoa logada pode ver e entrar.
- **MODO DEMO:** modo em que o código aparece na tela em vez de ir por e-mail.
- **Inatividade:** ficar parado, sem escrever nem clicar — aqui, 30 minutos.
- **App (PWA):** um site que pode ser instalado no celular ou no computador, com ícone próprio e tela cheia, sem precisar de loja de aplicativos.
- **HTTPS:** versão **segura** do endereço do site, que começa com `https://` e mostra um cadeado.
- **Certificado:** o "documento de identidade" que o site apresenta para provar que a conexão é segura. Na rede da escola ele é criado pelo próprio servidor.
- **Atualização:** quando o app recebe uma versão nova; acontece pelo botão **🔄**, ao fechar e abrir o app ou ao puxar a tela para baixo.

---

**© 2026 cripto.chat — Projeto educacional de criptografia**
Licenciatura em Computação
UTFPR — Universidade Tecnológica Federal do Paraná
Marlon Antonio Stoeberl — Rio Negro, Paraná
