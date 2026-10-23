/**
 * scripts/sync-public.js — Mantém a pasta server/public igual à raiz.
 *
 * Por que existe:
 * - A RAIZ (index.html, manifest.json, sw.js, icons/, docs/) é a fonte
 *   única de verdade: é o que o GitHub Pages publica.
 * - server/public/ é a cópia que o servidor Node (Render/Plesk/local)
 *   entrega ao navegador (express.static aponta para server/public).
 *
 * Sem este script as duas cópias divergiam e o servidor ficava servindo
 * uma versão antiga ("pasta errada").
 *
 * Uso: npm run sync  (roda sozinho antes de npm start e após npm ci)
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'server', 'public');

const ARQUIVOS = ['index.html', 'manifest.json', 'sw.js', 'version.json'];
const PASTAS = ['icons', 'docs'];

let falhas = 0;

function copiarArquivo(rel) {
    const origem = path.join(RAIZ, rel);
    if (!fs.existsSync(origem)) {
        console.warn('[sync] Aviso: não existe na raiz ->', rel);
        falhas++;
        return;
    }
    const destino = path.join(DESTINO, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.copyFileSync(origem, destino);
    console.log('[sync] ok ->', rel);
}

function copiarPasta(rel) {
    const origem = path.join(RAIZ, rel);
    if (!fs.existsSync(origem)) {
        console.warn('[sync] Aviso: não existe na raiz ->', rel + '/');
        falhas++;
        return;
    }
    fs.cpSync(origem, path.join(DESTINO, rel), { recursive: true });
    console.log('[sync] ok ->', rel + '/');
}

console.log('[sync] Sincronizando raiz -> server/public');
ARQUIVOS.forEach(copiarArquivo);
PASTAS.forEach(copiarPasta);
console.log(falhas ? `[sync] Concluído com ${falhas} aviso(s).` : '[sync] Concluído.');
