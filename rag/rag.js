
import ollama from 'ollama';
import pool from "../bd/db.js";
import { perguntar, confirmar, pausar, sucesso, erro, aviso, titulo, mostrarTabela, traduzirErro, Cor } from "../crud/terminal.js";

export async function ollamaEmbed(input) {
    const resposta = await ollama.embed({
        model: 'nomic-embed-text',
        input
    });
    return resposta.embeddings[0];
}

function textoArtigo(a) {
    return `search_document: ${a.titulo}. ${a.conteudo}`;
}

function textoChamado(c) {
    return `search_query: ${c.motivo}. ${c.descricao}`;
}

export async function gerarEmbeddingRegistro(tabela, id) {
    try {
        if (tabela === 'artigo') {
            const r = await pool.query(`SELECT titulo, conteudo FROM artigo WHERE id_artigo = $1`, [id]);
            const vetor = await ollamaEmbed(textoArtigo(r.rows[0]));
            await pool.query(`UPDATE artigo SET embedding = $1 WHERE id_artigo = $2`, [vetor, id]);
        } else {
            const r = await pool.query(`SELECT motivo, descricao FROM chamado WHERE id_chamado = $1`, [id]);
            const vetor = await ollamaEmbed(textoChamado(r.rows[0]));
            await pool.query(`UPDATE chamado SET embedding = $1 WHERE id_chamado = $2`, [vetor, id]);
        }
        aviso(`Embedding gerado pelo Ollama (nomic-embed-text) para ${tabela} ${id}.`);
        return true;
    } catch (err) {
        erro(`Não foi possível gerar o embedding de ${tabela} ${id} (o Ollama está rodando?): ${err.message}`);
        return false;
    }
}

export async function gerarEmbeddingsPendentes() {
    let total = 0;
    try {
        const artigos = await pool.query(`SELECT id_artigo FROM artigo WHERE embedding IS NULL ORDER BY id_artigo`);
        for (const a of artigos.rows) if (await gerarEmbeddingRegistro('artigo', a.id_artigo)) total++;
        const chamados = await pool.query(`SELECT id_chamado FROM chamado WHERE embedding IS NULL ORDER BY id_chamado`);
        for (const c of chamados.rows) if (await gerarEmbeddingRegistro('chamado', c.id_chamado)) total++;
        await pool.query(
            `UPDATE sugere s SET similaridade = ROUND(similaridade_cosseno(c.embedding, a.embedding)::numeric, 4)
             FROM chamado c, artigo a
             WHERE c.id_chamado = s.id_chamado AND a.id_artigo = s.id_artigo
               AND c.embedding IS NOT NULL AND a.embedding IS NOT NULL`
        );
        sucesso(`${total} embedding(s) gerado(s) e similaridades da tabela sugere recalculadas.`);
    } catch (err) {
        erro('Erro ao gerar embeddings: ' + traduzirErro(err));
    }
    return total;
}

export async function buscarArtigosSemelhantes(vetor, limite = 3) {
    const resultado = await pool.query(
        `SELECT a.id_artigo, a.titulo, cat.nome AS categoria, cat.id_categoria,
                ROUND(similaridade_cosseno($1::real[], a.embedding)::numeric, 4) AS similaridade
         FROM artigo a
         JOIN categoria cat ON cat.id_categoria = a.id_categoria
         WHERE a.embedding IS NOT NULL
         ORDER BY similaridade DESC
         LIMIT $2`,
        [vetor, limite]
    );
    return resultado.rows;
}

export async function buscarChamadosSemelhantes(vetor, ignorar = null, limite = 3) {
    const resultado = await pool.query(
        `SELECT c.id_chamado, c.motivo, s.nome AS status, cat.nome AS categoria, cat.id_categoria,
                p.nome AS prioridade, p.id_prioridade,
                ROUND(similaridade_cosseno($1::real[], c.embedding)::numeric, 4) AS similaridade,
                (SELECT string_agg(so.descricao, ' | ') FROM solucao so WHERE so.id_chamado = c.id_chamado) AS solucao_aplicada
         FROM chamado c
         JOIN status s ON s.id_status = c.id_status
         JOIN categoria cat ON cat.id_categoria = c.id_categoria
         JOIN prioridade p ON p.id_prioridade = c.id_prioridade
         WHERE c.embedding IS NOT NULL AND ($2::int IS NULL OR c.id_chamado <> $2)
         ORDER BY similaridade DESC
         LIMIT $3`,
        [vetor, ignorar, limite]
    );
    return resultado.rows;
}

async function salvarSugestoes(idChamado, artigos) {
    for (const a of artigos) {
        await pool.query(
            `INSERT INTO sugere (id_chamado, id_artigo, similaridade)
             VALUES ($1, $2, $3)
             ON CONFLICT (id_chamado, id_artigo)
             DO UPDATE SET similaridade = EXCLUDED.similaridade, data_sugestao = CURRENT_TIMESTAMP`,
            [idChamado, a.id_artigo, a.similaridade]
        );
    }
}

function mostrarSugestoes(artigos, chamados) {
    console.log(`\n${Cor.CABECALHO}${Cor.NEGRITO}Artigos da base de conhecimento mais parecidos:${Cor.FIM}`);
    mostrarTabela(artigos.map(a => ({ id_artigo: a.id_artigo, titulo: a.titulo, categoria: a.categoria, similaridade: a.similaridade })));
    console.log(`\n${Cor.CABECALHO}${Cor.NEGRITO}Chamados anteriores mais parecidos (e a solução aplicada):${Cor.FIM}`);
    mostrarTabela(chamados.map(c => ({ id_chamado: c.id_chamado, motivo: c.motivo, status: c.status, similaridade: c.similaridade, solucao_aplicada: c.solucao_aplicada ?? '-' })));
}

async function escolherDaLista(sql, rotulo, sugerido) {
    const r = await pool.query(sql);
    r.rows.forEach(l => console.log(`    ${l.id} - ${l.nome}`));
    const dica = sugerido ? ` [ENTER = sugestão da IA: ${sugerido.id} - ${sugerido.nome}]` : '';
    while (true) {
        const texto = await perguntar(`  ${rotulo}${dica}: `);
        if (texto === '' && sugerido) return sugerido.id;
        const id = Number(texto);
        if (r.rows.some(l => l.id === id)) return id;
        erro('  Opção inválida.');
    }
}

export async function abrirChamadoComIA() {
    titulo('ABRIR CHAMADO COM APOIO DA IA');
    try {
        const lojas = await pool.query(`SELECT id_loja AS id, nome_loja || ' (' || nome_lojista || ')' AS nome FROM loja ORDER BY id_loja`);
        if (lojas.rows.length === 0) {
            aviso('Cadastre uma loja antes de abrir chamados.');
            return;
        }
        console.log(`${Cor.AMARELO}Loja de origem:${Cor.FIM}`);
        const idLoja = await escolherDaLista(`SELECT id_loja AS id, nome_loja || ' (' || nome_lojista || ')' AS nome FROM loja ORDER BY id_loja`, 'id_loja');
        let motivo = '';
        while (!motivo) motivo = await perguntar('  Motivo: ');
        let descricao = '';
        while (!descricao) descricao = await perguntar('  Descreva o problema: ');
        const arquivo = await perguntar('  Anexo (nome do arquivo, ENTER para nenhum): ');

        aviso('\nGerando embedding do texto no Ollama e buscando contexto parecido no banco...');
        const vetor = await ollamaEmbed(textoChamado({ motivo, descricao }));
        const artigos = await buscarArtigosSemelhantes(vetor);
        const chamados = await buscarChamadosSemelhantes(vetor);
        mostrarSugestoes(artigos, chamados);

        const candidatos = [...artigos, ...chamados].sort((a, b) => Number(b.similaridade) - Number(a.similaridade));
        const catSugerida = candidatos[0] ? { id: candidatos[0].id_categoria, nome: candidatos[0].categoria } : null;
        const priSugerida = chamados[0] ? { id: chamados[0].id_prioridade, nome: chamados[0].prioridade } : null;

        console.log(`\n${Cor.AMARELO}Categoria:${Cor.FIM}`);
        const idCategoria = await escolherDaLista(`SELECT id_categoria AS id, nome FROM categoria ORDER BY id_categoria`, 'id_categoria', catSugerida);
        console.log(`${Cor.AMARELO}Prioridade:${Cor.FIM}`);
        const idPrioridade = await escolherDaLista(`SELECT id_prioridade AS id, nome || ' (SLA ' || prazo_sla_horas || 'h)' AS nome FROM prioridade ORDER BY id_prioridade`, 'id_prioridade', priSugerida);

        const status = await pool.query(`SELECT id_status FROM status WHERE nome ILIKE 'aberto' LIMIT 1`);
        if (status.rows.length === 0) {
            erro('Não existe o status "Aberto". Cadastre esse status antes.');
            return;
        }
        const idStatus = status.rows[0].id_status;

        const client = await pool.connect();
        let idChamado;
        try {
            await client.query('BEGIN');
            const novo = await client.query(
                `INSERT INTO chamado (motivo, descricao, embedding, id_loja, id_categoria, id_prioridade, id_status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_chamado`,
                [motivo, descricao, vetor, idLoja, idCategoria, idPrioridade, idStatus]
            );
            idChamado = novo.rows[0].id_chamado;
            const msg = await client.query(
                `INSERT INTO mensagem (conteudo, autor_tipo, id_chamado) VALUES ($1, 'LOJISTA', $2) RETURNING id_mensagem`,
                [descricao, idChamado]
            );
            if (arquivo) {
                await client.query(
                    `INSERT INTO anexo (nome_arquivo, caminho_arquivo, id_mensagem) VALUES ($1, $2, $3)`,
                    [arquivo, `uploads/chamado_${idChamado}/${arquivo}`, msg.rows[0].id_mensagem]
                );
            }
            await client.query(
                `INSERT INTO historico_status (id_chamado, id_status_anterior, id_status_novo, observacao)
                 VALUES ($1, NULL, $2, 'Abertura do chamado')`,
                [idChamado, idStatus]
            );
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        await salvarSugestoes(idChamado, artigos);
        sucesso(`\nChamado ${idChamado} aberto! Mensagem inicial${arquivo ? ', anexo' : ''}, histórico e ${artigos.length} sugestão(ões) da IA gravados.`);
    } catch (err) {
        erro('Erro ao abrir chamado: ' + traduzirErro(err));
    }
}

async function escolherChamado() {
    const r = await pool.query(
        `SELECT c.id_chamado, c.motivo, s.nome AS status, l.nome_loja AS loja
         FROM chamado c JOIN status s ON s.id_status = c.id_status JOIN loja l ON l.id_loja = c.id_loja
         ORDER BY c.id_chamado`
    );
    mostrarTabela(r.rows);
    if (r.rows.length === 0) return null;
    const id = Number(await perguntar('Informe o id_chamado: '));
    if (!r.rows.some(c => c.id_chamado === id)) {
        erro('Chamado não encontrado.');
        return null;
    }
    return id;
}

export async function consultarSugestoes() {
    titulo('BUSCA ASSISTIDA POR IA PARA UM CHAMADO');
    try {
        const id = await escolherChamado();
        if (!id) return;
        let r = await pool.query(`SELECT embedding FROM chamado WHERE id_chamado = $1`, [id]);
        if (!r.rows[0].embedding) {
            await gerarEmbeddingRegistro('chamado', id);
            r = await pool.query(`SELECT embedding FROM chamado WHERE id_chamado = $1`, [id]);
            if (!r.rows[0].embedding) return;
        }
        const vetor = r.rows[0].embedding;
        const artigos = await buscarArtigosSemelhantes(vetor);
        const chamados = await buscarChamadosSemelhantes(vetor, id);
        mostrarSugestoes(artigos, chamados);
        await salvarSugestoes(id, artigos);
        sucesso(`Sugestões de artigos gravadas na tabela sugere para o chamado ${id}.`);
    } catch (err) {
        erro('Erro na busca: ' + traduzirErro(err));
    }
}

export async function avaliarSugestao() {
    titulo('TÉCNICO AVALIA SUGESTÃO DA IA');
    try {
        const id = await escolherChamado();
        if (!id) return;
        const r = await pool.query(
            `SELECT s.id_artigo, a.titulo, s.similaridade, s.foi_util, t.nome AS avaliado_por
             FROM sugere s JOIN artigo a ON a.id_artigo = s.id_artigo
             LEFT JOIN tecnico t ON t.id_tecnico = s.id_tecnico
             WHERE s.id_chamado = $1 ORDER BY s.similaridade DESC`,
            [id]
        );
        if (r.rows.length === 0) {
            aviso('Esse chamado ainda não tem sugestões. Use a busca assistida antes.');
            return;
        }
        mostrarTabela(r.rows);
        const idArtigo = Number(await perguntar('id_artigo da sugestão: '));
        if (!r.rows.some(s => s.id_artigo === idArtigo)) {
            erro('Sugestão não encontrada.');
            return;
        }
        const tecnicos = await pool.query(`SELECT id_tecnico AS id, nome FROM tecnico WHERE ativo ORDER BY id_tecnico`);
        tecnicos.rows.forEach(t => console.log(`    ${t.id} - ${t.nome}`));
        const idTecnico = Number(await perguntar('  id_tecnico que está avaliando: '));
        if (!tecnicos.rows.some(t => t.id === idTecnico)) {
            erro('Técnico inválido.');
            return;
        }
        const util = await confirmar('  A sugestão foi útil?');
        const resultado = await pool.query(
            `UPDATE sugere SET foi_util = $1, id_tecnico = $2 WHERE id_chamado = $3 AND id_artigo = $4 RETURNING *`,
            [util, idTecnico, id, idArtigo]
        );
        sucesso('Avaliação registrada:');
        mostrarTabela(resultado.rows);
    } catch (err) {
        erro('Erro ao avaliar: ' + traduzirErro(err));
    }
}

export async function painelIA() {
    while (true) {
        titulo('ASSISTENTE DE IA (EMBEDDINGS + RAG)');
        console.log('  1. Abrir chamado com sugestão da IA (categoria, prioridade e artigos)');
        console.log('  2. Buscar artigos e chamados parecidos para um chamado existente');
        console.log('  3. Técnico avalia se a sugestão foi útil');
        console.log('  4. Gerar embeddings pendentes (artigos e chamados sem vetor)');
        console.log('  0. Voltar');
        const op = await perguntar(`${Cor.NEGRITO}Escolha: ${Cor.FIM}`);
        if (op === '1') await abrirChamadoComIA();
        else if (op === '2') await consultarSugestoes();
        else if (op === '3') await avaliarSugestao();
        else if (op === '4') await gerarEmbeddingsPendentes();
        else if (op === '0') return;
        else { erro('Opção inválida.'); continue; }
        await pausar();
    }
}
