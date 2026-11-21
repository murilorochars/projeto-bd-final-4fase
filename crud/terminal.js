import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export const Cor = {
    CABECALHO: '\x1b[96m',
    VERDE: '\x1b[92m',
    VERMELHO: '\x1b[91m',
    AMARELO: '\x1b[93m',
    NEGRITO: '\x1b[1m',
    FIM: '\x1b[0m'
};

const rl = readline.createInterface({ input, output });
const linhas = [];
const esperando = [];
let fechado = false;

rl.on('line', linha => {
    if (esperando.length > 0) esperando.shift()(linha);
    else linhas.push(linha);
});

rl.on('close', () => {
    fechado = true;
    while (esperando.length > 0) esperando.shift()('0');
});

export async function perguntar(texto) {
    output.write(texto);
    if (linhas.length > 0) return linhas.shift().trim();
    if (fechado) return '0';
    const resposta = await new Promise(resolve => esperando.push(resolve));
    return resposta.trim();
}

export async function confirmar(texto) {
    const resposta = await perguntar(`${texto} (s/n): `);
    return resposta.toLowerCase() === 's';
}

export async function pausar() {
    await perguntar(`\n${Cor.AMARELO}Pressione ENTER para voltar ao menu...${Cor.FIM}`);
}

export function fecharTerminal() {
    rl.close();
}

export function sucesso(msg) {
    console.log(`${Cor.VERDE}${msg}${Cor.FIM}`);
}

export function erro(msg) {
    console.log(`${Cor.VERMELHO}${msg}${Cor.FIM}`);
}

export function aviso(msg) {
    console.log(`${Cor.AMARELO}${msg}${Cor.FIM}`);
}

export function titulo(msg) {
    console.log(`\n${Cor.CABECALHO}${Cor.NEGRITO}${'='.repeat(60)}\n${msg.padStart(30 + Math.floor(msg.length / 2))}\n${'='.repeat(60)}${Cor.FIM}`);
}

export function mostrarTabela(linhas) {
    if (!linhas || linhas.length === 0) {
        aviso('Nenhum registro encontrado.');
        return;
    }
    const formatadas = linhas.map(linha => {
        const nova = {};
        for (const [coluna, valor] of Object.entries(linha)) {
            if (Array.isArray(valor)) nova[coluna] = `[vetor ${valor.length} dims]`;
            else if (valor instanceof Date) nova[coluna] = valor.toLocaleString('pt-BR');
            else if (typeof valor === 'string' && valor.length > 45) nova[coluna] = valor.slice(0, 42) + '...';
            else nova[coluna] = valor;
        }
        return nova;
    });
    console.table(formatadas);
}

export function traduzirErro(err) {
    switch (err.code) {
        case '23503':
            if (err.message.includes('update or delete')) return `Não é possível excluir: existem registros que dependem deste (${err.table ? 'tabela ' + err.table : 'dependência'}). Exclua ou altere os dependentes antes.`;
            return 'Chave estrangeira inválida: o registro referenciado não existe.';
        case '23505': return `Valor duplicado: ${err.detail || 'já existe um registro com esse valor único.'}`;
        case '23502': return `Campo obrigatório não informado: ${err.column}.`;
        case '23514': return `Valor fora da regra (CHECK): ${err.constraint}.`;
        case '22P02': return 'Formato de valor inválido (ex.: texto em campo numérico).';
        case '42P01': return 'Tabela não existe. Rode a opção de criar as tabelas primeiro.';
        case '42P07': return 'As tabelas já existem. Elimine as tabelas antes de criar de novo.';
        default: return err.message;
    }
}
