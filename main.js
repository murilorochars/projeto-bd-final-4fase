import { ping } from "./bd/db.js";
import { ollamaEmbed } from "./rag/rag.js";
import { exemplodepadraodefuncao } from "./crud/crud.js";
await ping();

const embedding = await ollamaEmbed("problema no geteway de conexão.");
console.log("dimensões:", embedding.length);
console.log(embedding.slice(0, 5));

await exemplodepadraodefuncao("exemplo de registro");

