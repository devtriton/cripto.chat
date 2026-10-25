/**
 * scripts/limpar-consentimentos.js — Exclusão de registros (LGPD art. 18)
 *
 * O servidor grava um registro mínimo por aceite/recusa/idade em
 * server/consentimentos.jsonl (retenção de 6 meses). Este script permite
 * atender pedidos de exclusão feitos pelo titular ou pelo responsável.
 *
 * Uso:
 *   node scripts/limpar-consentimentos.js --email=aluno@exemplo.com
 *   node scripts/limpar-consentimentos.js --todos
 *   node scripts/limpar-consentimentos.js --listar
 *
 * Opções:
 *   --email=...   remove os registros daquele e-mail (e do responsável)
 *   --todos       remove o arquivo inteiro (use com cautela)
 *   --listar      mostra um resumo (sem exibir dados pessoais completos)
 *   --sim         não pede confirmação (para automação)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ARQUIVO = path.resolve(__dirname, '..', 'server', 'consentimentos.jsonl');
const argumentos = process.argv.slice(2);

function obterOpcao(nome) {
    const prefixo = '--' + nome + '=';
    const encontrado = argumentos.find((a) => a.startsWith(prefixo));
    return encontrado ? encontrado.slice(prefixo.length).trim() : null;
}

function temFlag(nome) {
    return argumentos.includes('--' + nome);
}

function mascararEmail(email) {
    if (!email || email.indexOf('@') === -1) return email || '(vazio)';
    const [usuario, dominio] = email.split('@');
    const visivel = usuario.slice(0, 2);
    return visivel + '***@' + dominio;
}

function lerRegistros() {
    if (!fs.existsSync(ARQUIVO)) return [];
    const conteudo = fs.readFileSync(ARQUIVO, 'utf8');
    return conteudo
        .split(/\r?\n/)
        .filter((linha) => linha.trim())
        .map((linha) => {
            try { return JSON.parse(linha); }
            catch (e) { return null; }
        })
        .filter(Boolean);
}

function confirmar(pergunta) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(pergunta + ' [s/N] ', (resposta) => {
            rl.close();
            resolve(/^s/i.test(resposta.trim()));
        });
    });
}

async function principal() {
    if (temFlag('listar')) {
        const registros = lerRegistros();
        console.log('Arquivo:', ARQUIVO);
        console.log('Total de registros:', registros.length);
        const porTipo = {};
        const porEmail = new Map();
        registros.forEach((r) => {
            porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1;
            if (r.email) {
                const atual = porEmail.get(r.email) || { total: 0, ultimo: '' };
                atual.total++;
                if (!atual.ultimo || r.registradoEm > atual.ultimo) atual.ultimo = r.registradoEm;
                porEmail.set(r.email, atual);
            }
        });
        console.log('Por tipo:', porTipo);
        if (porEmail.size) {
            console.log('E-mails distintos:', porEmail.size);
            [...porEmail.entries()]
                .sort((a, b) => (a[1].ultimo < b[1].ultimo ? 1 : -1))
                .slice(0, 50)
                .forEach(([email, info]) => {
                    console.log('  -', mascararEmail(email), '| registros:', info.total, '| último:', info.ultimo);
                });
        }
        return;
    }

    const email = obterOpcao('email');
    const todos = temFlag('todos');

    if (!email && !todos) {
        console.log('Nada a fazer. Use --email=aluno@exemplo.com, --todos ou --listar.');
        console.log('Exemplo: node scripts/limpar-consentimentos.js --email=aluno@exemplo.com');
        process.exitCode = 1;
        return;
    }

    if (!fs.existsSync(ARQUIVO)) {
        console.log('Nenhum registro encontrado (arquivo não existe).');
        return;
    }

    const registros = lerRegistros();

    if (todos) {
        if (!temFlag('sim')) {
            const ok = await confirmar('Apagar TODOS os ' + registros.length + ' registros de consentimento?');
            if (!ok) { console.log('Cancelado.'); return; }
        }
        fs.unlinkSync(ARQUIVO);
        console.log('Arquivo removido:', ARQUIVO);
        return;
    }

    const alvo = email.toLowerCase();
    const restantes = [];
    let removidos = 0;
    registros.forEach((r) => {
        const mesmoTitular = (r.email || '').toLowerCase() === alvo;
        const mesmoResponsavel = (r.responsavelEmail || '').toLowerCase() === alvo;
        if (mesmoTitular || mesmoResponsavel) removidos++;
        else restantes.push(r);
    });

    if (!removidos) {
        console.log('Nenhum registro encontrado para', email);
        return;
    }

    if (!temFlag('sim')) {
        const ok = await confirmar('Remover ' + removidos + ' registro(s) de ' + email + '?');
        if (!ok) { console.log('Cancelado.'); return; }
    }

    const temporario = ARQUIVO + '.tmp';
    fs.writeFileSync(temporario, restantes.map((r) => JSON.stringify(r)).join('\n') + (restantes.length ? '\n' : ''));
    fs.renameSync(temporario, ARQUIVO);
    console.log('Removidos', removidos, 'registro(s). Restantes:', restantes.length);
}

principal().catch((e) => {
    console.error('Erro:', e.message);
    process.exitCode = 1;
});
