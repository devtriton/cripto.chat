# OBJ-EDU: Criptografia em Prática

Objeto Educacional para demonstração de criptografia e comunicação segura.

## Como Executar

### 1. Instalar dependências do servidor

```bash
cd server
npm install
```

### 2. Iniciar o servidor

```bash
npm start
```

O servidor iniciará em `http://localhost:3000`

### 3. Abrir no navegador

Abra `http://localhost:3000` em duas ou mais abas/janelas para simular múltiplos usuários.

## Funcionalidades

### Autenticação
- Login com nome e email (sem senha)
- Para demonstração: use o código `123456` quando solicitado

### Salas de Bate-Papo
- **Pública**: qualquer usuário pode entrar listando as salas disponíveis
- **Privada**: requer código da sala + senha definida pelo criador
- Cada usuário guarda suas mensagens no localStorage (sem banco de dados central)

### Mensagens
- **Normal**: visível para todos na sala
- **Com @usuario**: mensagem direta (privada)
- **Com #usuario**: menção pública (todos veem, usuário é destacado)

### Criptografia
O usuário escolhe o algoritmo antes de enviar:
- **Sem criptografia**: texto claro (visível para todos e para o ADM)
- **Cifra de César**: deslocamento de letras por N posições
- **Cifra de Vigenère**: usa palavra-chave para variar deslocamento
- **XOR**: operação bit a bit com chave
- **AES-256**: criptografia forte (simplificada para demonstração)

### Sala ADM
Representa a visão do servidor:
- **Mensagem sem criptografia**: aparece em texto claro (verde)
- **Mensagem criptografada**: aparece cifrada (vermelho) - o servidor não tem a chave

## Demonstração para Apresentação

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

### Cenário 3: Sala Privada
1. Crie sala privada com senha "abc123"
2. Compartilhe código + senha com colega
3. Colega entra usando código + senha
4. Pessoas de fora não veem a sala

## Estrutura do Projeto

```
OBJ-EDU/
├── index.html          # Interface completa (HTML+CSS+JS)
├── server/
│   ├── server.js       # Servidor WebSocket + HTTP
│   └── mail-config.js  # Config OTP por email (opcional)
└── README.md
```

## GitHub Pages

O projeto está disponível em: **https://devtriton.github.io/OBJ-EDU/**

No GitHub Pages, o sistema funciona em modo `BroadcastChannel`:
- Abra a página em **múltiplas abas ou janelas** do navegador
- Cada aba representa um usuário diferente
- As mensagens são trocadas entre as abas sem servidor

### Como fazer deploy de atualizações

```bash
git add .
git commit -m "descricao das mudancas"
git push origin master
```

O GitHub Pages atualiza automaticamente em ~1 minuto após o push.

## Conceitos Educacionais Demonstrados

1. **Criptografia Simétrica**: mesma chave para cifrar e decifrar
2. **Confidencialidade**: sem a chave, não é possível ler a mensagem
3. **Canal inseguro**: o servidor "confiável" não consegue ler mensagens criptografadas
4. **Força Bruta**: César é vulnerável (só 26 chaves), AES é seguro (2^256 chaves)
5. **Autenticação**: salas privadas protegidas por senha
