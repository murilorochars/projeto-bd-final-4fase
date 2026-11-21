
import ollama from 'ollama';

export async function ollamaEmbed(input) {
    const resposta = await ollama.embed({
        model: 'nomic-embed-text',
        input
    });
    return resposta.embeddings[0];
}