import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { Chart, registerables } from 'chart.js';
import pool from "../bd/db.js";
import { erro, aviso, mostrarTabela, traduzirErro, Cor } from "../crud/terminal.js";

Chart.register(...registerables);

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
        valor: 'chamados_atendidos',
        legenda: 'Chamados atendidos'
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
        valor: 'total_chamados',
        legenda: 'Total de chamados'
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
        valor: 'vezes_sugerido',
        legenda: 'Vezes sugerido pela IA'
    }
];

const fundoBranco = {
    id: 'fundoBranco',
    beforeDraw: grafico => {
        grafico.ctx.save();
        grafico.ctx.fillStyle = 'white';
        grafico.ctx.fillRect(0, 0, grafico.width, grafico.height);
        grafico.ctx.restore();
    }
};

function abrirArquivo(caminho) {
    const comando = process.platform === 'win32' ? `start "" "${caminho}"`
        : process.platform === 'darwin' ? `open "${caminho}"` : `xdg-open "${caminho}"`;
    exec(comando, () => {});
}

export async function gerarGrafico(linhas, consulta, indice) {
    const canvas = createCanvas(1000, 550);
    const grafico = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: linhas.map(l => String(l[consulta.rotulo])),
            datasets: [{
                label: consulta.legenda,
                data: linhas.map(l => Number(l[consulta.valor]) || 0),
                backgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: false,
            animation: false,
            plugins: {
                title: { display: true, text: `Consulta ${indice + 1}: ${consulta.titulo}`, font: { size: 18 } }
            },
            scales: {
                y: { beginAtZero: true, suggestedMax: Math.max(...linhas.map(l => Number(l[consulta.valor]) || 0)) + 1, ticks: { precision: 0 }, title: { display: true, text: consulta.legenda } },
                x: { title: { display: true, text: consulta.rotulo } }
            }
        },
        plugins: [fundoBranco]
    });
    const pasta = new URL('./graficos/', import.meta.url);
    await fs.mkdir(pasta, { recursive: true });
    const arquivo = fileURLToPath(new URL(`consulta_${indice + 1}.png`, pasta));
    await fs.writeFile(arquivo, await canvas.encode('png'));
    grafico.destroy();
    return arquivo;
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
        if (resultado.rows.length > 0) {
            const arquivo = await gerarGrafico(resultado.rows, consulta, indice);
            aviso(`Gráfico gerado com Chart.js: ${arquivo}`);
            abrirArquivo(arquivo);
        }
        return resultado.rows;
    } catch (err) {
        erro('Erro na consulta: ' + traduzirErro(err));
        return [];
    }
}
