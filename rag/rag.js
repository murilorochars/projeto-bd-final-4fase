
import ollama from 'ollama';

export async function ollamaEmbed(input) {
    const resposta = await ollama.embed({
        model: 'nomic-embed-text',
        input
    });
    return resposta.embeddings[0];
}

//aqui deve ter os controles de funções e toma de decisoes via painel
//exemplo: parecido com o projeto referncia do git 

