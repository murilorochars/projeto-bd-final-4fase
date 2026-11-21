import pool, { ping } from "./bd/db.js";
import { criarTabelas, eliminarTabelas, rodarSeed, selecionarTabela, inserirRegistro, atualizarRegistro, excluirRegistro, listarRegistros } from "./crud/crud.js";
import { gerarEmbeddingsPendentes, painelIA } from "./rag/rag.js";
import { menuRelatorios } from "./dossie/dossie.js";
import { perguntar, confirmar, pausar, fecharTerminal, erro, aviso, Cor } from "./crud/terminal.js";

async function operacaoCrud(funcao) {
    const tabela = await selecionarTabela();
    if (!tabela) return;
    await funcao(tabela);
}

async function menu() {
    await ping();
    while (true) {
        console.log(`\n${Cor.CABECALHO}${Cor.NEGRITO}${'='.repeat(60)}`);
        console.log('SMARTECH - SISTEMA INTELIGENTE DE CHAMADOS TÉCNICOS'.padStart(55));
        console.log(`${'='.repeat(60)}${Cor.FIM}`);

        console.log(`\n${Cor.AMARELO}[ SETUP DO BANCO DE DADOS ]${Cor.FIM}`);
        console.log('  1. Criar tabelas (rodar o schema)');
        console.log('  2. Eliminar todas as tabelas');
        console.log('  3. Rodar seed (dados iniciais + embeddings)');

        console.log(`\n${Cor.VERDE}[ OPERAÇÕES (CRUD) ]${Cor.FIM}`);
        console.log('  4. Inserir registro');
        console.log('  5. Atualizar registro');
        console.log('  6. Excluir registro');

        console.log(`\n${Cor.CABECALHO}[ RELATÓRIOS ]${Cor.FIM}`);
        console.log('  7. Gerar relatórios (consultas + gráficos)');

        console.log(`\n${Cor.VERDE}[ CONSULTAS ]${Cor.FIM}`);
        console.log('  8. Consultar registros de uma tabela');

        console.log(`\n${Cor.AMARELO}[ INTELIGÊNCIA ARTIFICIAL ]${Cor.FIM}`);
        console.log('  9. Assistente de IA (embeddings com Ollama)');

        console.log(`\n${Cor.VERMELHO}  0. Sair${Cor.FIM}`);
        console.log('-'.repeat(60));

        const opcao = await perguntar(`${Cor.NEGRITO}Escolha uma opção: ${Cor.FIM}`);

        if (opcao === '1') {
            await criarTabelas();
        } else if (opcao === '2') {
            if (await confirmar('Tem certeza que quer apagar TODAS as tabelas?')) await eliminarTabelas();
        } else if (opcao === '3') {
            if (await rodarSeed()) {
                aviso('Gerando os embeddings da base de conhecimento e dos chamados no Ollama...');
                await gerarEmbeddingsPendentes();
            }
        } else if (opcao === '4') {
            await operacaoCrud(inserirRegistro);
        } else if (opcao === '5') {
            await operacaoCrud(atualizarRegistro);
        } else if (opcao === '6') {
            await operacaoCrud(excluirRegistro);
        } else if (opcao === '7') {
            await menuRelatorios();
            continue;
        } else if (opcao === '8') {
            await operacaoCrud(listarRegistros);
        } else if (opcao === '9') {
            await painelIA();
            continue;
        } else if (opcao === '0') {
            console.log('Saindo do sistema...');
            break;
        } else {
            erro('Opção inválida.');
            continue;
        }
        await pausar();
    }
    fecharTerminal();
    await pool.end();
}

await menu();
