import pool from "../bd/db.js";
import { erro, mostrarTabela, traduzirErro, Cor } from "../crud/terminal.js";

export const CONSULTAS = [
    {
        titulo: 'Desempenho dos técnicos',
        objetivo: 'Quantidade de chamados atendidos por cada técnico (com o departamento) e a nota média de avaliação dada pelos lojistas.',
        tabelas: 'tecnico, departamento, chamado',
        sql: `SELECT t.nome AS tecnico,
       d.nome AS departamento,
       COUNT(c.id_chamado)::int AS chamados_atendidos,
       ROUND(AVG(c.nota_avaliacao), 1) AS nota_media
FROM tecnico t
JOIN departamento d ON d.id_departamento = t.id_departamento
LEFT JOIN chamado c ON c.id_tecnico = t.id_tecnico
GROUP BY t.nome, d.nome
ORDER BY chamados_atendidos DESC, t.nome`,
        rotulo: 'tecnico',
        valor: 'chamados_atendidos'
    },
    {
        titulo: 'Chamados por categoria e situação',
        objetivo: 'Total de chamados de cada categoria de problema e quantos deles ainda não foram fechados, para saber onde está a maior demanda.',
        tabelas: 'categoria, chamado, status',
        sql: `SELECT cat.nome AS categoria,
       COUNT(c.id_chamado)::int AS total_chamados,
       COUNT(c.id_chamado) FILTER (WHERE s.nome <> 'Fechado')::int AS em_aberto
FROM categoria cat
LEFT JOIN chamado c ON c.id_categoria = cat.id_categoria
LEFT JOIN status s ON s.id_status = c.id_status
GROUP BY cat.nome
ORDER BY total_chamados DESC, cat.nome`,
        rotulo: 'categoria',
        valor: 'total_chamados'
    },
    {
        titulo: 'Efetividade da IA na base de conhecimento',
        objetivo: 'Para cada artigo: quantas vezes a IA sugeriu, a similaridade média das sugestões e quantas foram marcadas como úteis pelos técnicos.',
        tabelas: 'artigo, sugere, categoria',
        sql: `SELECT a.titulo AS artigo,
       cat.nome AS categoria,
       COUNT(s.id_chamado)::int AS vezes_sugerido,
       ROUND(AVG(s.similaridade), 4) AS similaridade_media,
       COUNT(*) FILTER (WHERE s.foi_util)::int AS marcadas_uteis
FROM artigo a
JOIN categoria cat ON cat.id_categoria = a.id_categoria
LEFT JOIN sugere s ON s.id_artigo = a.id_artigo
GROUP BY a.titulo, cat.nome
ORDER BY vezes_sugerido DESC, a.titulo`,
        rotulo: 'artigo',
        valor: 'vezes_sugerido'
    }
];

export function desenharGrafico(linhas, rotulo, valor, tituloGrafico) {
    const largura = 40;
    const maximo = Math.max(...linhas.map(l => Number(l[valor]) || 0), 1);
    const tamanhoRotulo = Math.min(Math.max(...linhas.map(l => String(l[rotulo]).length)), 32);
    console.log(`\n${Cor.NEGRITO}Gráfico de barras: ${tituloGrafico}${Cor.FIM}`);
    console.log(`${' '.repeat(tamanhoRotulo)} ┌${'─'.repeat(largura + 8)}`);
    for (const l of linhas) {
        const numero = Number(l[valor]) || 0;
        const barra = '█'.repeat(Math.round((numero / maximo) * largura));
        let texto = String(l[rotulo]);
        if (texto.length > tamanhoRotulo) texto = texto.slice(0, tamanhoRotulo - 3) + '...';
        console.log(`${texto.padStart(tamanhoRotulo)} │${Cor.CABECALHO}${barra}${Cor.FIM} ${numero}`);
    }
    console.log(`${' '.repeat(tamanhoRotulo)} └${'─'.repeat(largura + 8)}`);
}

export async function executarConsulta(indice) {
    const consulta = CONSULTAS[indice];
    try {
        console.log(`\n${Cor.CABECALHO}${Cor.NEGRITO}Consulta ${indice + 1}: ${consulta.titulo}${Cor.FIM}`);
        console.log(`${Cor.AMARELO}Objetivo:${Cor.FIM} ${consulta.objetivo}`);
        console.log(`${Cor.AMARELO}Tabelas:${Cor.FIM} ${consulta.tabelas}`);
        console.log(`${Cor.AMARELO}SQL:${Cor.FIM}\n${consulta.sql}`);
        const resultado = await pool.query(consulta.sql);
        console.log(`\n${Cor.NEGRITO}Resultado (forma tabular):${Cor.FIM}`);
        mostrarTabela(resultado.rows);
        if (resultado.rows.length > 0) desenharGrafico(resultado.rows, consulta.rotulo, consulta.valor, `${consulta.valor} por ${consulta.rotulo}`);
        return resultado.rows;
    } catch (err) {
        erro('Erro na consulta: ' + traduzirErro(err));
        return [];
    }
}
