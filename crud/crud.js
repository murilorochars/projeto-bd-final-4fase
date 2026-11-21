import fs from 'node:fs/promises';
import pool from "../bd/db.js";
import { perguntar, confirmar, sucesso, erro, aviso, mostrarTabela, traduzirErro, Cor } from "./terminal.js";
import { gerarEmbeddingRegistro } from "../rag/rag.js";

export const TABELAS = {
    departamento: {
        pk: ['id_departamento'], exibir: 'nome',
        campos: [
            { nome: 'nome', tipo: 'texto', obrigatorio: true },
            { nome: 'descricao', tipo: 'texto' }
        ]
    },
    tecnico: {
        pk: ['id_tecnico'], exibir: 'nome',
        campos: [
            { nome: 'nome', tipo: 'texto', obrigatorio: true },
            { nome: 'email', tipo: 'texto', obrigatorio: true },
            { nome: 'ativo', tipo: 'bool' },
            { nome: 'id_departamento', tipo: 'fk', ref: 'departamento', obrigatorio: true }
        ]
    },
    loja: {
        pk: ['id_loja'], exibir: 'nome_loja',
        campos: [
            { nome: 'nome_loja', tipo: 'texto', obrigatorio: true },
            { nome: 'nome_lojista', tipo: 'texto', obrigatorio: true },
            { nome: 'email', tipo: 'texto', obrigatorio: true },
            { nome: 'telefone', tipo: 'texto' }
        ]
    },
    categoria: {
        pk: ['id_categoria'], exibir: 'nome',
        campos: [
            { nome: 'nome', tipo: 'texto', obrigatorio: true },
            { nome: 'descricao', tipo: 'texto' }
        ]
    },
    prioridade: {
        pk: ['id_prioridade'], exibir: 'nome',
        campos: [
            { nome: 'nome', tipo: 'texto', obrigatorio: true },
            { nome: 'nivel', tipo: 'int', obrigatorio: true },
            { nome: 'prazo_sla_horas', tipo: 'int', obrigatorio: true }
        ]
    },
    status: {
        pk: ['id_status'], exibir: 'nome',
        campos: [
            { nome: 'nome', tipo: 'texto', obrigatorio: true },
            { nome: 'descricao', tipo: 'texto' }
        ]
    },
    artigo: {
        pk: ['id_artigo'], exibir: 'titulo', embedding: true,
        campos: [
            { nome: 'titulo', tipo: 'texto', obrigatorio: true },
            { nome: 'conteudo', tipo: 'texto', obrigatorio: true },
            { nome: 'id_categoria', tipo: 'fk', ref: 'categoria', obrigatorio: true }
        ]
    },
    chamado: {
        pk: ['id_chamado'], exibir: 'motivo', embedding: true,
        campos: [
            { nome: 'motivo', tipo: 'texto', obrigatorio: true },
            { nome: 'descricao', tipo: 'texto', obrigatorio: true },
            { nome: 'id_loja', tipo: 'fk', ref: 'loja', obrigatorio: true },
            { nome: 'id_categoria', tipo: 'fk', ref: 'categoria', obrigatorio: true },
            { nome: 'id_prioridade', tipo: 'fk', ref: 'prioridade', obrigatorio: true },
            { nome: 'id_status', tipo: 'fk', ref: 'status', obrigatorio: true },
            { nome: 'id_tecnico', tipo: 'fk', ref: 'tecnico' },
            { nome: 'nota_avaliacao', tipo: 'int', soAtualizar: true },
            { nome: 'comentario_avaliacao', tipo: 'texto', soAtualizar: true }
        ]
    },
    mensagem: {
        pk: ['id_mensagem'], exibir: 'conteudo',
        campos: [
            { nome: 'conteudo', tipo: 'texto', obrigatorio: true },
            { nome: 'autor_tipo', tipo: 'opcao', opcoes: ['LOJISTA', 'TECNICO'], obrigatorio: true },
            { nome: 'id_chamado', tipo: 'fk', ref: 'chamado', obrigatorio: true }
        ]
    },
    anexo: {
        pk: ['id_anexo'], exibir: 'nome_arquivo',
        campos: [
            { nome: 'nome_arquivo', tipo: 'texto', obrigatorio: true },
            { nome: 'caminho_arquivo', tipo: 'texto', obrigatorio: true },
            { nome: 'id_mensagem', tipo: 'fk', ref: 'mensagem', obrigatorio: true }
        ]
    },
    historico_status: {
        pk: ['id_historico'], exibir: 'observacao',
        campos: [
            { nome: 'id_chamado', tipo: 'fk', ref: 'chamado', obrigatorio: true },
            { nome: 'id_status_anterior', tipo: 'fk', ref: 'status' },
            { nome: 'id_status_novo', tipo: 'fk', ref: 'status', obrigatorio: true },
            { nome: 'id_tecnico', tipo: 'fk', ref: 'tecnico' },
            { nome: 'observacao', tipo: 'texto' }
        ]
    },
    solucao: {
        pk: ['id_solucao'], exibir: 'descricao',
        campos: [
            { nome: 'descricao', tipo: 'texto', obrigatorio: true },
            { nome: 'id_chamado', tipo: 'fk', ref: 'chamado', obrigatorio: true }
        ]
    },
    sugere: {
        pk: ['id_chamado', 'id_artigo'], exibir: 'similaridade',
        campos: [
            { nome: 'id_chamado', tipo: 'fk', ref: 'chamado', obrigatorio: true },
            { nome: 'id_artigo', tipo: 'fk', ref: 'artigo', obrigatorio: true },
            { nome: 'foi_util', tipo: 'bool' },
            { nome: 'id_tecnico', tipo: 'fk', ref: 'tecnico' }
        ]
    }
};

export async function criarTabelas() {
    try {
        const ddl = await fs.readFile(new URL('../bd/ddlschema.sql', import.meta.url), 'utf-8');
        await pool.query(ddl);
        sucesso('Tabelas criadas com sucesso a partir do bd/ddlschema.sql!');
    } catch (err) {
        erro('Erro ao criar tabelas: ' + traduzirErro(err));
    }
}

export async function eliminarTabelas() {
    try {
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        aviso('Banco limpo. Todas as tabelas foram eliminadas.');
    } catch (err) {
        erro('Erro ao eliminar tabelas: ' + traduzirErro(err));
    }
}

export async function rodarSeed() {
    try {
        const seed = await fs.readFile(new URL('../seed.sql', import.meta.url), 'utf-8');
        await pool.query(seed);
        sucesso('Seed carregada: 2 registros em cada tabela.');
        return true;
    } catch (err) {
        erro('Erro ao rodar a seed: ' + traduzirErro(err));
        return false;
    }
}

export async function selecionarTabela() {
    const nomes = Object.keys(TABELAS);
    console.log(`\n${Cor.CABECALHO}Tabelas:${Cor.FIM}`);
    nomes.forEach((nome, i) => console.log(`  ${String(i + 1).padStart(2)}. ${nome}`));
    const op = await perguntar('Escolha a tabela (0 para voltar): ');
    const tabela = nomes[parseInt(op) - 1];
    if (!tabela) return null;
    return tabela;
}

export async function listarRegistros(tabela) {
    try {
        const meta = TABELAS[tabela];
        const resultado = await pool.query(`SELECT * FROM ${tabela} ORDER BY ${meta.pk.join(', ')}`);
        console.log(`\n${Cor.NEGRITO}Registros de ${tabela}:${Cor.FIM}`);
        mostrarTabela(resultado.rows);
        return resultado.rows;
    } catch (err) {
        erro('Erro ao consultar: ' + traduzirErro(err));
        return [];
    }
}

async function mostrarOpcoesFk(ref) {
    const meta = TABELAS[ref];
    const pk = meta.pk[0];
    const resultado = await pool.query(`SELECT ${pk} AS id, ${meta.exibir} AS descricao FROM ${ref} ORDER BY ${pk}`);
    if (resultado.rows.length === 0) {
        aviso(`  (nenhum registro em ${ref} — cadastre um ${ref} antes)`);
        return;
    }
    resultado.rows.forEach(r => {
        const texto = String(r.descricao ?? '');
        console.log(`    ${r.id} - ${texto.length > 50 ? texto.slice(0, 47) + '...' : texto}`);
    });
}

function converter(campo, texto) {
    if (texto === '') return null;
    if (campo.tipo === 'int' || campo.tipo === 'fk') {
        const n = Number(texto);
        if (!Number.isInteger(n)) throw new Error(`"${campo.nome}" precisa ser um número inteiro.`);
        return n;
    }
    if (campo.tipo === 'bool') {
        const t = texto.toLowerCase();
        if (['s', 'sim', 'true', 't'].includes(t)) return true;
        if (['n', 'nao', 'não', 'false', 'f'].includes(t)) return false;
        throw new Error(`"${campo.nome}" aceita s ou n.`);
    }
    if (campo.tipo === 'opcao') {
        const valor = texto.toUpperCase();
        if (!campo.opcoes.includes(valor)) throw new Error(`"${campo.nome}" aceita: ${campo.opcoes.join(', ')}.`);
        return valor;
    }
    return texto;
}

async function lerCampo(campo, atual) {
    if (campo.tipo === 'fk') {
        console.log(`  ${Cor.AMARELO}${campo.nome} → registros de ${campo.ref}:${Cor.FIM}`);
        await mostrarOpcoesFk(campo.ref);
    }
    let dica = '';
    if (campo.tipo === 'bool') dica = ' (s/n)';
    if (campo.tipo === 'opcao') dica = ` (${campo.opcoes.join('/')})`;
    const marcador = campo.obrigatorio ? '*' : '';
    const textoAtual = atual !== undefined ? ` [atual: ${atual ?? 'vazio'}]` : '';
    while (true) {
        const texto = await perguntar(`  ${campo.nome}${marcador}${dica}${textoAtual}: `);
        if (atual !== undefined && texto === '') return { manter: true };
        try {
            const valor = converter(campo, texto);
            if (valor === null && campo.obrigatorio) {
                erro('  Campo obrigatório.');
                continue;
            }
            return { valor };
        } catch (e) {
            erro('  ' + e.message);
        }
    }
}

async function lerChave(tabela) {
    const meta = TABELAS[tabela];
    const valores = [];
    for (const coluna of meta.pk) {
        const texto = await perguntar(`Informe ${coluna}: `);
        const n = Number(texto);
        if (!Number.isInteger(n)) {
            erro('Chave inválida.');
            return null;
        }
        valores.push(n);
    }
    return valores;
}

function filtroChave(tabela, inicio = 1) {
    return TABELAS[tabela].pk.map((coluna, i) => `${coluna} = $${i + inicio}`).join(' AND ');
}

export async function inserirRegistro(tabela) {
    const meta = TABELAS[tabela];
    console.log(`\n${Cor.NEGRITO}Novo registro em ${tabela}${Cor.FIM} (* = obrigatório, ENTER = vazio)`);
    const colunas = [];
    const valores = [];
    for (const campo of meta.campos.filter(c => !c.soAtualizar)) {
        const { valor } = await lerCampo(campo);
        if (valor !== null) {
            colunas.push(campo.nome);
            valores.push(valor);
        }
    }
    try {
        let sql;
        if (tabela === 'sugere') {
            colunas.push('similaridade');
            sql = `INSERT INTO sugere (${colunas.join(', ')})
                   VALUES (${valores.map((_, i) => `$${i + 1}`).join(', ')},
                   COALESCE((SELECT ROUND(similaridade_cosseno(c.embedding, a.embedding)::numeric, 4)
                             FROM chamado c, artigo a WHERE c.id_chamado = $1 AND a.id_artigo = $2), 0))
                   RETURNING *`;
        } else {
            sql = `INSERT INTO ${tabela} (${colunas.join(', ')})
                   VALUES (${valores.map((_, i) => `$${i + 1}`).join(', ')})
                   RETURNING *`;
        }
        const resultado = await pool.query(sql, valores);
        const novo = resultado.rows[0];
        if (tabela === 'chamado') {
            await pool.query(
                `INSERT INTO historico_status (id_chamado, id_status_anterior, id_status_novo, id_tecnico, observacao)
                 VALUES ($1, NULL, $2, $3, 'Abertura do chamado')`,
                [novo.id_chamado, novo.id_status, novo.id_tecnico]
            );
        }
        if (meta.embedding) await gerarEmbeddingRegistro(tabela, novo[meta.pk[0]]);
        sucesso('Registro inserido:');
        mostrarTabela([novo]);
        return novo;
    } catch (err) {
        erro('Erro no INSERT: ' + traduzirErro(err));
        return null;
    }
}

async function statusFechado(idStatus) {
    const resultado = await pool.query(`SELECT nome FROM status WHERE id_status = $1`, [idStatus]);
    return resultado.rows[0] && resultado.rows[0].nome.toLowerCase().startsWith('fechado');
}

export async function atualizarRegistro(tabela) {
    const meta = TABELAS[tabela];
    await listarRegistros(tabela);
    const chave = await lerChave(tabela);
    if (!chave) return null;
    try {
        const busca = await pool.query(`SELECT * FROM ${tabela} WHERE ${filtroChave(tabela)}`, chave);
        if (busca.rows.length === 0) {
            aviso('Registro não encontrado.');
            return null;
        }
        const atual = busca.rows[0];
        console.log(`\n${Cor.NEGRITO}Atualizando ${tabela}${Cor.FIM} (ENTER mantém o valor atual)`);
        const sets = [];
        const valores = [];
        for (const campo of meta.campos) {
            if (meta.pk.includes(campo.nome)) continue;
            const resposta = await lerCampo(campo, atual[campo.nome]);
            if (resposta.manter) continue;
            valores.push(resposta.valor);
            sets.push(`${campo.nome} = $${valores.length}`);
        }
        if (sets.length === 0) {
            aviso('Nada foi alterado.');
            return atual;
        }
        const novoStatus = tabela === 'chamado' ? valores[sets.findIndex(s => s.startsWith('id_status '))] : undefined;
        if (tabela === 'chamado' && novoStatus !== undefined && novoStatus !== atual.id_status) {
            if (await statusFechado(novoStatus)) {
                const sol = await pool.query(`SELECT COUNT(*)::int AS total FROM solucao WHERE id_chamado = $1`, [atual.id_chamado]);
                if (sol.rows[0].total === 0) {
                    erro('Regra de negócio: um chamado não pode ser fechado sem uma solução registrada. Cadastre uma solução antes.');
                    return null;
                }
                sets.push('data_fechamento = CURRENT_TIMESTAMP');
            } else {
                sets.push('data_fechamento = NULL');
            }
        }
        const resultado = await pool.query(
            `UPDATE ${tabela} SET ${sets.join(', ')} WHERE ${filtroChave(tabela, valores.length + 1)} RETURNING *`,
            [...valores, ...chave]
        );
        const novo = resultado.rows[0];
        if (tabela === 'chamado' && novoStatus !== undefined && novoStatus !== atual.id_status) {
            const obs = await perguntar('Observação da mudança de status (ENTER para pular): ');
            await pool.query(
                `INSERT INTO historico_status (id_chamado, id_status_anterior, id_status_novo, id_tecnico, observacao)
                 VALUES ($1, $2, $3, $4, $5)`,
                [novo.id_chamado, atual.id_status, novo.id_status, novo.id_tecnico, obs || null]
            );
            aviso('Mudança de status registrada no historico_status.');
        }
        const mudouTexto = sets.some(s => /^(titulo|conteudo|motivo|descricao) /.test(s));
        if (meta.embedding && mudouTexto) await gerarEmbeddingRegistro(tabela, novo[meta.pk[0]]);
        sucesso('Registro atualizado:');
        mostrarTabela([novo]);
        return novo;
    } catch (err) {
        erro('Erro no UPDATE: ' + traduzirErro(err));
        return null;
    }
}

export async function excluirRegistro(tabela) {
    await listarRegistros(tabela);
    const chave = await lerChave(tabela);
    if (!chave) return false;
    if (tabela === 'chamado') aviso('Atenção: excluir o chamado apaga junto mensagens, anexos, histórico, soluções e sugestões (ON DELETE CASCADE).');
    if (!(await confirmar('Confirma a exclusão?'))) return false;
    try {
        const resultado = await pool.query(`DELETE FROM ${tabela} WHERE ${filtroChave(tabela)} RETURNING *`, chave);
        if (resultado.rowCount === 0) {
            aviso('Registro não encontrado.');
            return false;
        }
        sucesso('Registro excluído:');
        mostrarTabela(resultado.rows);
        return true;
    } catch (err) {
        erro('Erro no DELETE: ' + traduzirErro(err));
        return false;
    }
}
