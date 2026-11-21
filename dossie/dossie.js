import { CONSULTAS, executarConsulta } from "./graficos.js";
import { perguntar, pausar, erro, titulo, Cor } from "../crud/terminal.js";

export async function menuRelatorios() {
    while (true) {
        titulo('RELATÓRIOS GERENCIAIS (CONSULTAS + GRÁFICOS)');
        CONSULTAS.forEach((c, i) => console.log(`  ${i + 1}. ${c.titulo}`));
        console.log(`  4. Gerar todos os relatórios`);
        console.log('  0. Voltar');
        const op = await perguntar(`${Cor.NEGRITO}Escolha: ${Cor.FIM}`);
        if (op === '0') return;
        if (op === '4') {
            for (let i = 0; i < CONSULTAS.length; i++) await executarConsulta(i);
        } else if (CONSULTAS[Number(op) - 1]) {
            await executarConsulta(Number(op) - 1);
        } else {
            erro('Opção inválida.');
            continue;
        }
        await pausar();
    }
}
