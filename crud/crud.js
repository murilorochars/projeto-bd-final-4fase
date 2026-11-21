import pool from "../bd/db.js";

export async function exemplodepadraodefuncao(nome) {
    try {
        const resultado = await pool.query(
            `INSERT INTO demonstração (nome)
             VALUES ($1)
             RETURNING *`,
            [nome]
        );

        console.log('Registro inserido:', resultado.rows[0]);
        return resultado.rows[0];
    } catch (err) {
        console.log('Erro no INSERT:', err.message);
        throw err;
    }
}
